# Yellow Child OCR Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the existing English OCR page in the selected warm yellow, elementary-school-friendly visual direction without changing its recognition and export behavior.

**Architecture:** Keep the current single-file application and all existing JavaScript behavior. Replace the presentation layer in `index.html`, add one generated illustration asset, and use a lightweight Node structure test to protect required controls and workflows.

**Tech Stack:** HTML, CSS, vanilla JavaScript, Node.js assertions, Bootstrap Icons CDN.

---

### Task 1: Protect the existing workflow

**Files:**
- Create: `tests/ui-structure.test.mjs`

- [ ] Add assertions for required control IDs, actions, yellow tokens, child-friendly copy, and the illustration.
- [ ] Run `node tests/ui-structure.test.mjs` and confirm it fails before the redesign.

### Task 2: Add the selected visual asset

**Files:**
- Create: `assets/english-notebook-camera.png`

- [ ] Add the generated notebook-camera illustration to the project.
- [ ] Reference it from the upload area with descriptive alternative text.

### Task 3: Implement the complete yellow interface

**Files:**
- Modify: `index.html`

- [ ] Replace the blue theme tokens and component styles with the selected butter-yellow system.
- [ ] Rework the header, progress path, title input, upload area, action buttons, and learning history.
- [ ] Apply the same components to preview, status, edit, completion, and download states.
- [ ] Preserve all existing IDs and JavaScript event entry points.

### Task 4: Verify behavior and fidelity

**Files:**
- Create: `design-qa.md`

- [ ] Run `node tests/ui-structure.test.mjs` and confirm it passes.
- [ ] Serve the project locally and check mobile and desktop layouts in the in-app browser.
- [ ] Exercise the demo, reset, edit, and completion flow.
- [ ] Compare the mobile result against the selected yellow mockup and record the final QA result.
