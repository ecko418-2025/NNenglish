import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

assert.match(html, /--primary:\s*#f5a800/i, 'uses the warm yellow primary color');
assert.match(html, /assets\/english-notebook-camera\.png/, 'uses the learning illustration');
assert.match(html, />拍照识别</, 'shows the child-friendly primary action');
assert.match(html, />选择照片</, 'shows the secondary photo action');
assert.match(html, />最近的学习</, 'renames document history for a child');
assert.match(html, /id="(?:fileInput|cameraInput|uploadZone|startBtn|editBox|resultsBox)"/g);
assert.match(html, /onclick="loadDemoResults\(\)"/, 'keeps the demo flow');
assert.match(html, /onclick="startProcess\(\)"/, 'keeps the recognition flow');
assert.doesNotMatch(
  html.slice(html.indexOf('<body>'), html.indexOf('<script>')),
  /📘|📷|📁|✨/u,
  'visible controls use icon-library icons instead of emoji',
);

console.log('UI structure checks passed');
