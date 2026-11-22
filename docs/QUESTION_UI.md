# IMPORTANT: THESE ARE FOR REFERENCES ONLY. USE [`DESIGN.md`](file:///d:/Study/2026_Fall/SEP490/Web-Frontend-LearnAble/DESIGN.md) FILE AS THE ONLY SOURCE OF TRUTH

# Lecturer Question UI

The Question Bank reads the deployed Render Questions API, scoped to the signed-in lecturer with `CreatedBy`. Search, topic, supported type/status filters and pagination are server queries. Subjects supply course labels; Topics supply topic metadata. Missing usage and accessibility metrics display “Not available”. Failed requests never fall back to fixtures.

Question Studio supports six types, local live preview, and a browser-local draft scoped by user ID and purpose (`exam` vs `practice`). Diagram images are session-only object URLs; they are not saved. LaTeX uses KaTeX with trust disabled; MathML remains escaped source. Code is never executed.

Publishing, import/export, bulk mutations, Bloom templates and unavailable formatting actions display not-connected messages and never report backend success. Staff-facing question tools do not include personal voice-reading, sonification, accessibility-score or A11y-review controls. Drafts may contain assessment content: delete the saved draft before leaving a shared computer.

## Direction contract

THESIS: A scannable assessment bank and split authoring workbench follow the two supplied Stitch references.

OWN-WORLD: Inter Variable typography, flat white surfaces, navy/slate text (`--color-slate-950`), orange actions (`bg-action` / `--color-orange-500`) with navy labels, blue focus rings and selection affordances, semantic status tokens, and canonical shared primitives in `src/shared/ui/primitives/`.

STORY: Find a question, start authoring, inspect student output, and preserve local work honestly.

FIRST VIEWPORT: Bank actions and four summaries precede filters and a wide table. Studio metadata and six type tiles occupy the left; student preview occupies the right.

FORM: User-pinned Stitch composition; no concept seed required. Responsive stacked editor and locally scrollable table.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
