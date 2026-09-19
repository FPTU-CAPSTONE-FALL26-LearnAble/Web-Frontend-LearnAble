# Lecturer Question UI

The Question Bank reads the deployed Render Questions API, scoped to the signed-in lecturer with `CreatedBy`. Search, topic, supported type/status filters and pagination are server queries. Subjects supply course labels; Topics supply topic metadata. Missing usage and accessibility metrics display “Not available”. Failed requests never fall back to fixtures.

Question Studio supports six types, local live preview, and a browser-local draft scoped by user ID. Diagram images are session-only object URLs; they are not saved. LaTeX uses KaTeX with trust disabled; MathML remains escaped source. Code is never executed.

Publishing, import/export, bulk mutations, Bloom templates and unavailable formatting actions display not-connected messages and never report backend success. Staff-facing question tools do not include personal voice-reading, sonification, accessibility-score or A11y-review controls. Drafts may contain assessment content: delete the saved draft before leaving a shared computer.

## Direction contract

THESIS: A scannable assessment bank and split authoring workbench follow the two supplied Stitch references.

OWN-WORLD: Existing Plus Jakarta Sans, white surfaces, navy/slate text, orange actions with navy labels, blue selection, semantic status tokens and shadcn primitives.

STORY: Find a question, start authoring, inspect student output, and preserve local work honestly.

FIRST VIEWPORT: Bank actions and four summaries precede filters and a wide table. Studio metadata and six type tiles occupy the left; student preview occupies the right.

FORM: User-pinned Stitch composition; no concept seed required. Responsive stacked editor and locally scrollable table.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
