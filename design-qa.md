# Design QA

- source visual truth path: `qa/reference-yellow.png`
- implementation screenshot path: `qa/mobile-home-500.png`
- combined comparison path: `qa/yellow-comparison.jpg`
- viewport: 500 x 1082 mobile breakpoint; additionally checked at 390 x 844 and 1280 x 900 in the in-app browser
- state: initial upload screen and demo edit screen
- full-view comparison evidence: the combined image confirms the same warm yellow hierarchy, four-step path, note title, illustrated upload target, dominant camera action, secondary gallery action, example entry, and learning history.
- focused region comparison evidence: the upload area and action group were inspected at full screenshot resolution; text, image crop, borders, button sizes, and spacing were readable without a separate crop.

**Findings**

- No actionable P0, P1, or P2 mismatches remain.
- The implementation intentionally uses a quieter header and a smaller illustration than the concept image so the real controls and dynamic history fit comfortably on common phones.

**Required Fidelity Surfaces**

- Fonts and typography: child-friendly display heading, readable Chinese body text, clear action hierarchy, and safe wrapping on mobile.
- Spacing and layout rhythm: major sections follow the reference order; tap targets are at least 54px high; mobile and desktop spacing remain consistent.
- Colors and visual tokens: butter yellow, cream paper, sunflower action yellow, and blue accents match the selected direction with accessible dark text.
- Image quality and asset fidelity: a dedicated generated notebook-camera illustration is used with an appropriate crop and no placeholder or emoji artwork.
- Copy and content: the selected child-friendly labels are present while existing workflow and document history content remain intact.

**Patches Made**

- Moved learning history after the active edit/result areas so the current task is never buried below old documents.
- Replaced visible emoji controls with Bootstrap Icons.
- Updated dynamic recognition button states to preserve the new icon and wording.

**Follow-up Polish**

- P3: a future pass could add a compact history thumbnail, but it is not needed for the current workflow.

final result: passed
