import fs from 'node:fs';

function fail(message) {
  console.error('✗ ' + message);
  process.exitCode = 1;
}

function ok(message) {
  console.log('✓ ' + message);
}

function assert(condition, message) {
  if (condition) ok(message);
  else fail(message);
}

const html = fs.readFileSync('index.html', 'utf8');
const manifestText = fs.readFileSync('manifest.json', 'utf8');
const sw = fs.readFileSync('sw.js', 'utf8');

const ids = [...html.matchAll(/\bid=["']([^"']+)["']/g)].map(m => m[1]);
const duplicates = [...new Set(ids.filter((id, i) => ids.indexOf(id) !== i))];
assert(duplicates.length === 0, duplicates.length ? 'IDs HTML dupliqués: ' + duplicates.join(', ') : 'IDs HTML uniques');

const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(m => m[1]);
let inlineSyntax = true;
scripts.forEach((code, index) => {
  try { new Function(code); }
  catch (error) {
    inlineSyntax = false;
    fail('Syntaxe script inline #' + (index + 1) + ': ' + error.message);
  }
});
if (inlineSyntax) ok('Syntaxe des ' + scripts.length + ' scripts inline');

try {
  new Function(sw);
  ok('Syntaxe sw.js');
} catch (error) {
  fail('Syntaxe sw.js: ' + error.message);
}

let manifest = null;
try {
  manifest = JSON.parse(manifestText);
  ok('manifest.json valide');
} catch (error) {
  fail('manifest.json invalide: ' + error.message);
}

if (manifest) {
  assert(manifest.start_url === './', 'start_url PWA relatif au scope GitHub Pages');
  assert(manifest.scope === './', 'scope PWA relatif');
  assert(Array.isArray(manifest.icons) && manifest.icons.length > 0, 'icône PWA déclarée');
}

assert(html.includes("navigator.serviceWorker.register('./sw.js'"), 'Service Worker same-origin enregistré');
assert(!html.includes('navigator.serviceWorker.register(swURL)'), 'ancien Service Worker blob supprimé');
assert(html.includes('function stepInterval(stepIndex)'), 'scheduler swing présent');
assert(html.includes('function undoProject()') && html.includes('function redoProject()'), 'Undo/Redo présents');
assert(html.includes('function toggleMasterRecording()'), 'enregistrement master présent');
assert(html.includes('function triggerBiniou('), 'moteur biniou électronique présent');
assert(html.includes('function startBiniouDrone()'), 'drone biniou présent');
assert(html.includes('function updateBiniouFX()'), 'chaîne FX biniou présente');
assert(html.includes("id=\"export-project\"") && html.includes("id=\"import-project\""), 'export/import projet présents');

const requiredIds = [
  'play-btn','tap-btn','bpm-input','swing-slider','morph-slider',
  'undo-btn','redo-btn','rec-btn','midi-btn','routing-btn','biniou-toggle','biniou-drone','biniou-drive','biniou-tone','biniou-echo','biniou-space',
  'panel-seq','panel-mix','panel-fx','panel-dna','kbd','scope'
];
const missingIds = requiredIds.filter(id => !ids.includes(id));
assert(missingIds.length === 0, missingIds.length ? 'Contrôles manquants: ' + missingIds.join(', ') : 'contrôles critiques présents');

const shellFiles = ['index.html','manifest.json','sw.js','icon.svg','banner.svg'];
for (const file of shellFiles) assert(fs.existsSync(file), 'asset présent: ' + file);

if (process.exitCode) process.exit(process.exitCode);
console.log('\nValidation Lovestronautes: OK');
