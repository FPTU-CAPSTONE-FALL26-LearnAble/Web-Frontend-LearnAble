import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import {
  EditorSelection,
  EditorState,
  Prec,
  StateField,
  type Extension,
} from "@codemirror/state";
import {
  Decoration,
  drawSelection,
  EditorView,
  highlightActiveLine,
  highlightActiveLineGutter,
  keymap,
  lineNumbers,
  WidgetType,
} from "@codemirror/view";
import {
  defaultKeymap,
  history,
  historyKeymap,
  indentWithTab,
} from "@codemirror/commands";
import {
  bracketMatching,
  HighlightStyle,
  indentOnInput,
  indentUnit,
  syntaxHighlighting,
} from "@codemirror/language";
import { cpp } from "@codemirror/lang-cpp";
import { lintGutter, setDiagnostics, type Diagnostic } from "@codemirror/lint";
import { search, searchKeymap } from "@codemirror/search";
import { tags as t } from "@lezer/highlight";
import { cn } from "@/shared/ui/cn";

export interface CodeEditorPosition {
  line: number;
  column: number;
  /** Leading whitespace on the caret's line, tabs counted as 4. */
  indent: number;
}

export interface CodeEditorError {
  line: number;
  column?: number;
  message: string;
}

export interface CodeEditorHandle {
  focus: () => void;
  /** Moves the caret to the start of `line` and focuses the editor. */
  goToLine: (line: number) => void;
  /** Replaces the whole document as one undoable edit. */
  replaceAll: (text: string) => void;
}

export interface CodeEditorProps {
  /** Initial document; later changes come from the editor itself. */
  initialValue: string;
  label: string;
  describedBy?: string;
  readOnly?: boolean;
  /** Compile errors drawn as line markers; F8 / Shift+F8 move between them. */
  errors?: CodeEditorError[];
  onChange: (code: string) => void;
  onPositionChange?: (position: CodeEditorPosition) => void;
  onRun?: () => void;
  /** Ctrl+Shift+L: speak the caret position. */
  onSpeakPosition?: () => void;
  /** F8 / Shift+F8 landed on an error: speak it. */
  onSpeakError?: (error: CodeEditorError) => void;
  /**
   * The initial document is the untouched starter code: mark where the
   * candidate's code goes, and put the caret there when they Tab in.
   */
  markStart?: boolean;
  /** Keyboard focus landed the caret on the start marker (line is 1-based). */
  onEnterAtStart?: (line: number) => void;
  className?: string;
}

const MONO = `"IBM Plex Mono", "Cascadia Mono", Consolas, ui-monospace, monospace`;

/** Colours come from tokens; non-default themes make them all the foreground. */
const highlight = HighlightStyle.define([
  {
    tag: [
      t.keyword,
      t.controlKeyword,
      t.definitionKeyword,
      t.modifier,
      t.typeName,
      t.standard(t.typeName),
    ],
    color: "var(--code-keyword, var(--foreground))",
    fontWeight: "var(--code-keyword-weight, 700)",
  },
  {
    tag: [t.string, t.character, t.special(t.string)],
    color: "var(--code-string, var(--foreground))",
  },
  {
    tag: [t.number, t.bool, t.null],
    color: "var(--code-number, var(--foreground))",
  },
  {
    tag: [t.function(t.variableName), t.function(t.propertyName), t.macroName],
    color: "var(--code-function, var(--foreground))",
  },
  {
    tag: [t.processingInstruction, t.meta],
    color: "var(--code-preprocessor, var(--foreground))",
    fontWeight: "var(--code-keyword-weight, 700)",
  },
  {
    tag: [t.comment, t.lineComment, t.blockComment],
    color: "var(--code-comment, var(--foreground))",
    fontStyle: "italic",
  },
]);

const theme = EditorView.theme({
  "&": {
    color: "var(--foreground)",
    backgroundColor: "var(--card)",
    fontSize: "var(--text-base)",
    height: "100%",
  },
  "&.cm-focused": { outline: "3px solid var(--ring)", outlineOffset: "-3px" },
  ".cm-scroller": {
    fontFamily: MONO,
    lineHeight: "1.5",
    fontVariantLigatures: "none",
  },
  ".cm-content": { caretColor: "var(--foreground)", padding: "0.5rem 0" },
  ".cm-cursor, .cm-dropCursor": { borderLeft: "2px solid var(--foreground)" },
  ".cm-gutters": {
    backgroundColor: "var(--card)",
    color: "var(--muted-foreground)",
    borderRight: "1px solid var(--border)",
  },
  ".cm-lineNumbers .cm-gutterElement": { padding: "0 0.75em 0 1em" },
  ".cm-activeLine, .cm-activeLineGutter": {
    backgroundColor: "color-mix(in oklab, var(--muted) 55%, transparent)",
  },
  ".cm-activeLineGutter": { color: "var(--foreground)" },
  "&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection":
    { backgroundColor: "color-mix(in oklab, var(--ring) 35%, transparent)" },
  ".cm-matchingBracket": {
    backgroundColor: "transparent",
    outline: "1px solid var(--foreground)",
  },
  ".cm-lintRange-error": {
    backgroundImage: "none",
    textDecoration: "underline wavy var(--destructive)",
    textUnderlineOffset: "3px",
  },
  ".cm-panels": {
    backgroundColor: "var(--card)",
    color: "var(--foreground)",
    borderColor: "var(--border)",
  },
  ".cm-startHere": {
    display: "inline-block",
    minWidth: "2ch",
    padding: "0 0.25em",
    lineHeight: "1.25",
    textAlign: "center",
    color: "var(--foreground)",
    backgroundColor: "color-mix(in oklab, var(--ring) 18%, transparent)",
    outline: "2px solid var(--ring)",
    outlineOffset: "-2px",
    borderRadius: "3px",
  },
  ".cm-startHere-indent": { whiteSpace: "pre" },
  ".cm-tooltip": {
    backgroundColor: "var(--popover)",
    color: "var(--popover-foreground)",
    border: "1px solid var(--border)",
  },
});

function positionOf(state: EditorState): CodeEditorPosition {
  const head = state.selection.main.head;
  const line = state.doc.lineAt(head);
  const leading = /^[ \t]*/.exec(line.text)?.[0] ?? "";
  const indent = [...leading].reduce((n, ch) => n + (ch === "\t" ? 4 : 1), 0);
  return { line: line.number, column: head - line.from + 1, indent };
}

/** Where the candidate's code goes in the starter code. */
export interface StartPoint {
  /** Document offset: the start of an empty line. */
  pos: number;
  /** Indentation the first typed character gets, matching the code around it. */
  indent: string;
}

/**
 * The first empty line right after a comment (the starter's "write your code
 * here" hint), indented like that comment. `null` when the starter has none.
 */
export function findStartPoint(doc: EditorState["doc"]): StartPoint | null {
  for (let n = 1; n < doc.lines; n += 1) {
    const line = doc.line(n);
    if (!/^\s*(\/\/|\/\*)/.test(line.text)) continue;
    const next = doc.line(n + 1);
    if (next.text.trim() !== "") continue;
    return { pos: next.from, indent: /^[ \t]*/.exec(line.text)?.[0] ?? "" };
  }
  return null;
}

/** Reset reloads the starter, so the marker comes back; any other edit removes it. */
const startPointField = StateField.define<StartPoint | null>({
  create: () => null,
  update(value, tr) {
    if (tr.isUserEvent("input.reset")) return findStartPoint(tr.newDoc);
    return tr.docChanged ? null : value;
  },
  provide: (field) =>
    EditorView.decorations.from(field, (start) =>
      start
        ? Decoration.set([
            // Indent before the caret and the box after it, so the caret sits at the box.
            Decoration.widget({
              widget: new StartIndentWidget(start.indent),
              side: -1,
            }).range(start.pos),
            Decoration.widget({ widget: new StartBoxWidget(), side: 1 }).range(
              start.pos,
            ),
          ])
        : Decoration.none,
    ),
});

class StartIndentWidget extends WidgetType {
  constructor(readonly indent: string) {
    super();
  }
  eq(other: StartIndentWidget) {
    return other.indent === this.indent;
  }
  toDOM() {
    const span = document.createElement("span");
    span.setAttribute("aria-hidden", "true");
    span.className = "cm-startHere-indent";
    span.textContent = this.indent;
    return span;
  }
}

class StartBoxWidget extends WidgetType {
  eq() {
    return true;
  }
  toDOM() {
    const span = document.createElement("span");
    span.setAttribute("aria-hidden", "true");
    span.className = "cm-startHere";
    span.textContent = "…";
    return span;
  }
}

/** The first character typed at the marker gets the surrounding indentation. */
const indentAtStartPoint = EditorState.transactionFilter.of((tr) => {
  const start = tr.startState.field(startPointField, false);
  if (
    !start ||
    !start.indent ||
    !tr.docChanged ||
    !tr.isUserEvent("input.type")
  )
    return tr;
  let inserted: string | null = null;
  let other = false;
  tr.changes.iterChanges((fromA, toA, _fromB, _toB, text) => {
    if (fromA === start.pos && toA === start.pos && inserted === null)
      inserted = text.toString();
    else other = true;
  });
  if (inserted === null || other) return tr;
  const text = start.indent + (inserted as string);
  return {
    changes: { from: start.pos, insert: text },
    selection: EditorSelection.cursor(start.pos + text.length),
    userEvent: "input.type",
    scrollIntoView: true,
  };
});

function diagnosticsFor(
  state: EditorState,
  errors: CodeEditorError[],
): Diagnostic[] {
  return errors
    .filter((error) => error.line >= 1 && error.line <= state.doc.lines)
    .map((error) => {
      const line = state.doc.line(error.line);
      const from = error.column
        ? Math.min(line.from + error.column - 1, line.to)
        : line.from;
      const to = error.column ? Math.min(from + 1, line.to) : line.to;
      return {
        from,
        to: Math.max(to, from),
        severity: "error",
        message: error.message,
      };
    });
}

/**
 * Accessible C editor on CodeMirror 6. The text is real DOM, so screen readers
 * read actual lines. Tab indents; Escape then Tab leaves (CodeMirror's own
 * tab-focus escape). No bracket auto-closing: inserted characters the user
 * did not type are confusing when heard.
 */
export const CodeEditor = forwardRef<CodeEditorHandle, CodeEditorProps>(
  function CodeEditor(
    {
      initialValue,
      label,
      describedBy,
      readOnly = false,
      errors = [],
      onChange,
      onPositionChange,
      onRun,
      onSpeakPosition,
      onSpeakError,
      markStart = false,
      onEnterAtStart,
      className,
    },
    ref,
  ) {
    const hostRef = useRef<HTMLDivElement>(null);
    const viewRef = useRef<EditorView | null>(null);
    // Latest callbacks and errors, read by the long-lived editor extensions.
    const latest = useRef({
      onChange,
      onPositionChange,
      onRun,
      onSpeakPosition,
      onSpeakError,
      onEnterAtStart,
      errors,
    });
    latest.current = {
      onChange,
      onPositionChange,
      onRun,
      onSpeakPosition,
      onSpeakError,
      onEnterAtStart,
      errors,
    };

    useEffect(() => {
      const host = hostRef.current;
      if (!host) return;

      const moveToError = (direction: 1 | -1) => (view: EditorView) => {
        const list = [...latest.current.errors].sort((a, b) => a.line - b.line);
        if (!list.length) return false;
        const current = view.state.doc.lineAt(
          view.state.selection.main.head,
        ).number;
        const target =
          direction === 1
            ? (list.find((error) => error.line > current) ?? list[0])
            : ([...list].reverse().find((error) => error.line < current) ??
              list[list.length - 1]);
        if (target.line > view.state.doc.lines) return false;
        const line = view.state.doc.line(target.line);
        const pos = target.column
          ? Math.min(line.from + target.column - 1, line.to)
          : line.from;
        view.dispatch({
          selection: EditorSelection.cursor(pos),
          scrollIntoView: true,
        });
        latest.current.onSpeakError?.(target);
        return true;
      };

      // Pointer focus keeps the clicked caret; only keyboard focus jumps to the marker.
      let pointerDown = false;
      const startHere = EditorView.domEventHandlers({
        mousedown: () => {
          pointerDown = true;
        },
        focus: (_event, view) => {
          const byPointer = pointerDown;
          pointerDown = false;
          const start = view.state.field(startPointField, false);
          // Only while untouched and the caret has not been moved from the top.
          if (byPointer || !start || view.state.selection.main.head !== 0)
            return false;
          view.dispatch({
            selection: EditorSelection.cursor(start.pos),
            scrollIntoView: true,
          });
          latest.current.onEnterAtStart?.(
            view.state.doc.lineAt(start.pos).number,
          );
          return false;
        },
      });

      const extensions: Extension[] = [
        startPointField.init((state) =>
          markStart ? findStartPoint(state.doc) : null,
        ),
        indentAtStartPoint,
        startHere,
        lineNumbers(),
        highlightActiveLineGutter(),
        highlightActiveLine(),
        drawSelection(),
        history(),
        indentOnInput(),
        bracketMatching(),
        indentUnit.of("    "),
        EditorState.tabSize.of(4),
        cpp(),
        syntaxHighlighting(highlight),
        lintGutter(),
        search({ top: true }),
        theme,
        Prec.highest(
          keymap.of([
            {
              key: "Mod-Enter",
              run: () => {
                latest.current.onRun?.();
                return true;
              },
            },
            {
              key: "Mod-Shift-l",
              run: () => {
                latest.current.onSpeakPosition?.();
                return true;
              },
            },
            { key: "F8", run: moveToError(1) },
            { key: "Shift-F8", run: moveToError(-1) },
          ]),
        ),
        keymap.of([
          ...defaultKeymap,
          ...historyKeymap,
          ...searchKeymap,
          indentWithTab,
        ]),
        EditorView.contentAttributes.of({
          "aria-label": label,
          ...(describedBy ? { "aria-describedby": describedBy } : {}),
        }),
        EditorState.readOnly.of(readOnly),
        EditorView.editable.of(!readOnly),
        EditorView.updateListener.of((update) => {
          if (update.docChanged)
            latest.current.onChange(update.state.doc.toString());
          if (update.docChanged || update.selectionSet) {
            latest.current.onPositionChange?.(positionOf(update.state));
          }
        }),
      ];

      const view = new EditorView({
        parent: host,
        state: EditorState.create({ doc: initialValue, extensions }),
      });
      viewRef.current = view;
      latest.current.onPositionChange?.(positionOf(view.state));
      return () => {
        view.destroy();
        viewRef.current = null;
      };
      // The editor owns its document after mount; remount (key) to load another.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [label, describedBy, readOnly]);

    useEffect(() => {
      const view = viewRef.current;
      if (!view) return;
      view.dispatch(
        setDiagnostics(view.state, diagnosticsFor(view.state, errors)),
      );
    }, [errors]);

    useImperativeHandle(
      ref,
      () => ({
        focus: () => viewRef.current?.focus(),
        goToLine: (lineNumber) => {
          const view = viewRef.current;
          if (!view) return;
          const line = view.state.doc.line(
            Math.min(Math.max(1, lineNumber), view.state.doc.lines),
          );
          view.dispatch({
            selection: EditorSelection.cursor(line.from),
            scrollIntoView: true,
          });
          view.focus();
        },
        replaceAll: (text) => {
          const view = viewRef.current;
          if (!view) return;
          view.dispatch({
            changes: { from: 0, to: view.state.doc.length, insert: text },
            selection: EditorSelection.cursor(0),
            userEvent: "input.reset",
          });
          // Back to the starter: the caret goes where the code goes, if marked.
          const start = view.state.field(startPointField, false);
          if (start) {
            view.dispatch({
              selection: EditorSelection.cursor(start.pos),
              scrollIntoView: true,
            });
          }
          view.focus();
        },
      }),
      [],
    );

    return (
      <div ref={hostRef} className={cn("min-h-0 overflow-hidden", className)} />
    );
  },
);
