// npm run check:3d — the 3D performance rules (design/docs/3d-performance.md), checked on the source.
//
// Parses every .ts/.tsx under src with the TypeScript compiler and fails on:
//   raw-canvas     a react-three-fiber <Canvas> outside src/components/three — models draw through
//                  QualityCanvas (adaptive resolution, off-screen pause, shadow cache, one dpr owner)
//   raw-composer   @react-three/postprocessing's EffectComposer outside src/components/three —
//                  QualityComposer keeps it at the canvas's pixel ratio
//   webgl-context  canvas.getContext('webgl'…) outside src/lib/webgl-support.ts — a support probe
//                  asks hasWebGL() (one released context per page); a raw-WebGL visual says why
//   own-dpr        setDpr, drei AdaptiveDpr / PerformanceMonitor / AdaptiveEvents, `regress` —
//                  a second controller fighting QualityCanvas over the pixel ratio
//   alloc-in-frame `new Vector3()` (or any three math object, geometry, material, texture, typed
//                  array) inside a useFrame callback — garbage on every frame; hoist it
//   state-in-frame a React state setter (setX(…)) called unconditionally inside useFrame — a
//                  re-render on every frame
//   invalidate-loop invalidate() called unconditionally inside useFrame — the model never rests
//   inline-line-points  <Line points={[…]}> — new points on every render rebuild drei's Line
//                  (and can drop its shader); build them in a useMemo or a module constant
//   preserve-buffer preserveDrawingBuffer: true — a buffer copy on every frame
//   unregistered-scene  a QualityCanvas `name` with no entry in scripts/perf/scenes-3d.mjs (the
//                  benchmark must reach every model); or a name used twice
//
// An exception is written next to the code, with its reason (at least a few words):
//   // perf-3d-allow(<rule>): <why>          on the line, or the line above
//   // perf-3d-allow-file(<rule>): <why>     anywhere in the file, for the whole file
// Run: node scripts/check-3d.mjs [--json] [--src=<dir>]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import ts from 'typescript';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// --src=<dir>: check another tree (the rules' own test runs them on old code)
const srcArg = process.argv.find((x) => x.startsWith('--src='));
const SRC = srcArg ? path.resolve(srcArg.slice(6)) : path.join(ROOT, 'src');
const SHARED = path.join(SRC, 'components', 'three') + path.sep;
const PROBE = path.join(SRC, 'lib', 'webgl-support.ts');

const ALLOC = /^(Vector[234]|Matrix[34]|Quaternion|Euler|Color|Box[23]|Sphere|Ray|Plane|Frustum|Raycaster|Spherical|Cylindrical|Object3D|Group|Mesh|InstancedMesh|Line|Points|\w*Geometry|\w*Material|\w*Texture|WebGLRenderTarget|(Float|Int|Uint)(8|16|32|64)(Clamped)?Array|Array|Map|Set)$/;
const OWN_DPR = new Set(['AdaptiveDpr', 'PerformanceMonitor', 'AdaptiveEvents']);

const findings = [];
const walkDir = (dir, out = []) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walkDir(p, out);
    else if (/\.(ts|tsx)$/.test(e.name) && !e.name.endsWith('.d.ts')) out.push(p);
  }
  return out;
};

function allowed(text, lines, line, rule) {
  const re = new RegExp(`perf-3d-allow\\((${rule})\\):\\s*(.{10,})`);
  const fileRe = new RegExp(`perf-3d-allow-file\\((${rule})\\):\\s*(.{10,})`);
  if (fileRe.test(text)) return true;
  return re.test(lines[line] ?? '') || re.test(lines[line - 1] ?? '');
}

/** The useFrame callback a node sits in (null: none). */
function frameCallback(node) {
  for (let n = node.parent; n; n = n.parent) {
    if ((ts.isArrowFunction(n) || ts.isFunctionExpression(n)) && n.parent && ts.isCallExpression(n.parent)) {
      const callee = n.parent.expression;
      if (ts.isIdentifier(callee) && callee.text === 'useFrame' && n.parent.arguments[0] === n) return n;
    }
  }
  return null;
}

/** A branch between the node and its useFrame callback: it runs only some frames. */
function guarded(node, callback) {
  for (let n = node.parent; n && n !== callback; n = n.parent) {
    if (ts.isIfStatement(n) || ts.isConditionalExpression(n) || ts.isSwitchStatement(n) || ts.isCatchClause(n)) return true;
    if (ts.isBinaryExpression(n) && [ts.SyntaxKind.AmpersandAmpersandToken, ts.SyntaxKind.BarBarToken, ts.SyntaxKind.QuestionQuestionToken].includes(n.operatorToken.kind)) return true;
    // after an early `return` under a condition the rest of the body is guarded too
    if (ts.isBlock(n) && n.parent === callback) {
      const stmt = n.statements.find((s) => s.pos <= node.pos && node.end <= s.end);
      const i = n.statements.indexOf(stmt);
      if (n.statements.slice(0, i).some((s) => ts.isIfStatement(s) && containsReturn(s))) return true;
    }
  }
  return false;
}
const containsReturn = (n) => ts.isReturnStatement(n) || n.getChildren().some((c) => !ts.isFunctionLike(c) && containsReturn(c));

const names = []; // [name, file, line]

for (const file of walkDir(SRC)) {
  const text = fs.readFileSync(file, 'utf8');
  if (!/three|fiber|drei|postprocessing|getContext|QualityCanvas|useFrame/.test(text)) continue;
  const lines = text.split(/\r?\n/);
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const rel = path.relative(ROOT, file).replace(/\\/g, '/');
  const shared = file.startsWith(SHARED);
  const report = (node, rule, message) => {
    const line = sf.getLineAndCharacterOfPosition(node.getStart(sf)).line;
    if (allowed(text, lines, line, rule)) return;
    findings.push({ file: rel, line: line + 1, rule, message });
  };

  const visit = (node) => {
    // imports: <Canvas>, EffectComposer, own-dpr components
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier) && node.importClause?.namedBindings && ts.isNamedImports(node.importClause.namedBindings)) {
      const from = node.moduleSpecifier.text;
      for (const el of node.importClause.namedBindings.elements) {
        const name = (el.propertyName ?? el.name).text;
        if (from === '@react-three/fiber' && name === 'Canvas' && !shared) report(el, 'raw-canvas', 'react-three-fiber <Canvas>: draw through QualityCanvas (src/components/three/QualityCanvas.tsx)');
        if (from === '@react-three/postprocessing' && name === 'EffectComposer' && !shared) report(el, 'raw-composer', 'EffectComposer: use QualityComposer (it follows the pixel ratio)');
        if (from === '@react-three/drei' && OWN_DPR.has(name) && !shared) report(el, 'own-dpr', `drei ${name}: QualityCanvas owns the pixel ratio and the frame-rate adaptation`);
      }
    }
    // getContext('webgl…')
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === 'getContext') {
      const a = node.arguments[0];
      if (a && ts.isStringLiteralLike(a) && /webgl/i.test(a.text) && file !== PROBE) report(node, 'webgl-context', `getContext('${a.text}'): a support check calls hasWebGL() (src/lib/webgl-support.ts)`);
    }
    // setDpr / regress, anywhere outside the shared renderer
    if (!shared && ts.isIdentifier(node) && (node.text === 'setDpr' || node.text === 'regress') && !ts.isPropertyAssignment(node.parent)) {
      if (ts.isCallExpression(node.parent) && node.parent.expression === node) report(node, 'own-dpr', `${node.text}(): QualityCanvas owns the pixel ratio`);
      else if (ts.isPropertyAccessExpression(node.parent) && node.parent.name === node && ts.isCallExpression(node.parent.parent)) report(node, 'own-dpr', `${node.text}(): QualityCanvas owns the pixel ratio`);
      else if (ts.isBindingElement(node.parent)) report(node, 'own-dpr', `${node.text} from the store: QualityCanvas owns the pixel ratio`);
    }
    // inside useFrame
    const cb = (ts.isNewExpression(node) || ts.isCallExpression(node)) && frameCallback(node);
    if (cb && ts.isNewExpression(node)) {
      const e = node.expression;
      const name = ts.isIdentifier(e) ? e.text : ts.isPropertyAccessExpression(e) ? e.name.text : '';
      if (ALLOC.test(name)) report(node, 'alloc-in-frame', `new ${name}() inside useFrame: allocate once (useMemo / a module constant) and reuse it`);
    }
    if (cb && ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
      const name = node.expression.text;
      if (/^set[A-Z]\w*$/.test(name) && name !== 'setTimeout' && name !== 'setInterval' && !guarded(node, cb)) report(node, 'state-in-frame', `${name}() on every frame re-renders React every frame: write to a ref, or set it only when it changes`);
      if (name === 'invalidate' && !guarded(node, cb)) report(node, 'invalidate-loop', 'invalidate() on every frame: the model never rests — ask for frames only while something moves');
    }
    // <Line points={[…]}>
    if (ts.isJsxAttribute(node) && node.name.getText(sf) === 'points' && node.initializer && ts.isJsxExpression(node.initializer) && node.initializer.expression && ts.isArrayLiteralExpression(node.initializer.expression)) {
      const tag = node.parent.parent;
      if ((ts.isJsxSelfClosingElement(tag) || ts.isJsxOpeningElement(tag)) && /Line$/.test(tag.tagName.getText(sf))) report(node, 'inline-line-points', '<Line points={[…]}>: new points each render rebuild the line — useMemo them or hoist a constant');
    }
    // preserveDrawingBuffer: true
    if (ts.isPropertyAssignment(node) && node.name.getText(sf) === 'preserveDrawingBuffer' && node.initializer.kind === ts.SyntaxKind.TrueKeyword) report(node, 'preserve-buffer', 'preserveDrawingBuffer: true copies the frame every frame — only for a capture, behind a flag');
    // QualityCanvas name
    if ((ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node)) && node.tagName.getText(sf) === 'QualityCanvas') {
      const attr = node.attributes.properties.find((p) => ts.isJsxAttribute(p) && p.name.getText(sf) === 'name');
      const v = attr?.initializer;
      if (v && ts.isStringLiteral(v)) names.push([v.text, rel, sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1]);
      else report(node, 'unregistered-scene', 'QualityCanvas needs a literal name="…" (the benchmark finds the model by it)');
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
}

// every model in the benchmark, once
const { SCENES } = await import(pathToFileURL(path.join(ROOT, 'scripts', 'perf', 'scenes-3d.mjs')).href);
const registered = new Set(Object.values(SCENES).map((s) => s.scene));
const seen = new Map();
for (const [name, file, line] of names) {
  if (seen.has(name)) findings.push({ file, line, rule: 'unregistered-scene', message: `name "${name}" is also used by ${seen.get(name)}` });
  seen.set(name, `${file}:${line}`);
  if (!registered.has(name)) findings.push({ file, line, rule: 'unregistered-scene', message: `QualityCanvas "${name}" has no entry in scripts/perf/scenes-3d.mjs` });
}

if (process.argv.includes('--json')) console.log(JSON.stringify(findings, null, 1));
else {
  for (const f of findings) console.log(`${f.file}:${f.line}  ${f.rule}  ${f.message}`);
  console.log(findings.length ? `\ncheck:3d — ${findings.length} problem(s). Rules and exceptions: design/docs/3d-performance.md` : `check:3d — ${names.length} models, no problems.`);
}
process.exitCode = findings.length ? 1 : 0;
