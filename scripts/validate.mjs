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
const ext = fs.readFileSync('audio-extensions.js', 'utf8');
const studio = fs.readFileSync('studio-features.js', 'utf8');
const psy = fs.readFileSync('psy-machines.js', 'utf8');
const creator = fs.readFileSync('psy-track-creator.js', 'utf8');
const creatorCss = fs.readFileSync('psy-track-creator.css', 'utf8');
const cssV9 = fs.readFileSync('ui-v9.css','utf8');
const capture = fs.readFileSync('pcm-capture-processor.js', 'utf8');
const mp3 = fs.readFileSync('mp3-encoder-worker.js', 'utf8');

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
try { new Function(ext); ok('Syntaxe audio-extensions.js'); }
catch (error) { fail('Syntaxe audio-extensions.js: ' + error.message); }

[studio,capture,mp3,psy,creator].forEach((code,i) => {
  try { new Function(code); ok('Syntaxe studio #' + (i+1)); }
  catch(error){ fail('Syntaxe studio #' + (i+1) + ': ' + error.message); }
});

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
assert(html.includes("let TRACKS = ['kick','snare','hat','sub','acid','fm','biniou','metal','theremin','speak']"), '10 pistes : THEREMIN et SPEAK en plus');
assert(html.includes('initMasterEQ(masterFilter, analyserNode)'), 'EQ 5 bandes connecté au bus master');
assert(html.includes('buildExtendedFX()') && html.includes('syncExtendedFX()'), 'contrôles FX nouvelles machines et EQ');
assert(ext.includes('function triggerSnare(time)') && ext.includes('function triggerHat(time)') && ext.includes('function triggerSub('), 'moteurs Snare, Hat et Sub');
assert(ext.includes("name:'AIR'") && ext.includes("name:'SUB'"), 'EQ 5 bandes présent');
assert(studio.includes('function studioMakeMaster(input)') && html.includes('studioMakeMaster(comp)'), 'limiteur master');
assert(html.includes('buildPsyRack()') && html.includes('id="psy-open-rack"') && html.includes('data-panel="gear"'), 'rack cinq instruments visible');
assert(psy.includes('function psyTriggerTD3(') && psy.includes('function psyTriggerFM2(') && psy.includes('function psyTriggerT8Kick('), 'TD-3, FM2 et T8 synthétisés');
assert(psy.includes('function psyTriggerTheremin(') && psy.includes('function psyTriggerSpeak('), 'Theremin et Speak synthétisés');
assert(psy.includes('async function psyRecordVoice()') && psy.includes('async function psyLoadVoiceFile('), 'enregistrement micro et import audio');
assert(sw.includes('lovestronautes-v10') && sw.includes("new URL('./psy-machines.js', scope).href") && sw.includes("new URL('./ui-v9.css', scope).href"), 'cache PSY V10 hors ligne');
assert(sw.includes("url.pathname.endsWith('.css')"), 'mise à jour CSS réseau prioritaire');
assert(cssV9.includes('.panel.active{display:flex!important') && cssV9.includes('grid-template-columns:repeat(8,'), 'interface mobile déroulante et séquenceur tactile');
assert(html.includes('function activateStudioAudio()') && html.includes('function markStudioAudioReady()'), 'gestion robuste activation audio');
assert(html.includes('data-panel="song"') && html.includes('id="panel-song"') && html.includes('creatorBuildUI()'), 'Song Mode présent dans la navigation');
assert(html.includes('creator: creatorProjectState()') && html.includes('creatorRestoreState(state)'), 'Sauvegarde JSON rétrocompatible V10');
assert(html.includes('creatorSongBoundary(SEQ.barCount)') && html.includes('creatorRollingBass('), 'Arrangement et basse rolling joués réellement');
assert(creator.includes('function creatorGeneratePatterns()') && creator.includes('function creatorRenderPiano()'), 'Générateur tonal et éditeur 64 pas');
assert(studio.includes("value=\"-1\"") && studio.includes('exportSong?creatorTotalBars():studioExportBars'), 'Export WAV/MP3 du morceau entier');
assert(sw.includes("new URL('./psy-track-creator.js', scope).href") && sw.includes("new URL('./psy-track-creator.css', scope).href"), 'Song Mode offline PWA');
assert(creatorCss.includes('.creator-piano-grid') && creatorCss.includes('.creator-sections'), 'Timeline et piano roll responsive');
assert(html.includes('if (ctx) {\n        ctx.resume().then(markStudioAudioReady)'), 'un seul AudioContext pendant le démarrage');
assert(html.includes('id="studio-demo-btn"') && html.includes('id="studio-test-btn"') && html.includes('id="studio-fx-btn"'), 'barre accès son, démo et FX');
assert(html.includes('<details class="studio-advanced"'), 'commandes avancées repliables sur mobile');
assert(!html.includes('<div id="unlock">'), 'ancienne fenêtre audio bloquante supprimée');
assert(html.includes('studio: studioProjectState()') && html.includes('restoreStudioState(state)'), 'persistance mix studio');
assert(studio.includes('function studioWav(chunks,sampleRate)') && studio.includes("tag(0,'RIFF')"), 'WAV PCM stéréo');
assert(mp3.includes('new lamejs.Mp3Encoder(2,sampleRate,bitRate)'), 'MP3 stéréo');
assert(capture.includes('registerProcessor('), 'AudioWorklet PCM');
assert(html.includes('studioInitChannel(t,g,output)') && html.includes('studioInitChannel("biniou",biniouInput,biniouDrive)'), 'EQ/pan huit pistes');
assert(sw.includes("new URL('./vendor/lame.min.js', scope).href"), 'MP3 hors connexion');
assert(sw.includes("new URL('./audio-extensions.js', scope).href"), 'nouveau moteur disponible hors ligne');
assert(html.includes('biniouParams.cyber'), 'mode Cyber Breton présent');
assert(html.includes('cmd === 14'), 'Pitch Bend MIDI biniou présent');
assert(html.includes('PRO UX V2 — LIVE PERFORMANCE COCKPIT'), 'UI Pro UX V2 présente');
assert(html.includes('@media (min-width:1024px)'), 'layout desktop responsive présent');
assert(html.includes('@media (max-width:679px)'), 'layout mobile performance présent');
assert(html.includes("id=\"export-project\"") && html.includes("id=\"import-project\""), 'export/import projet présents');

const requiredIds = [
  'play-btn','tap-btn','bpm-input','swing-slider','morph-slider','unlock','studio-demo-btn','studio-test-btn','studio-fx-btn','studio-audio-guide','studio-advanced',
  'undo-btn','redo-btn','rec-btn','midi-btn','routing-btn','biniou-toggle','biniou-drone','biniou-cyber','biniou-reset-pitch','biniou-drive','biniou-tone','biniou-echo','biniou-space','biniou-harmony','biniou-pitch',
  'panel-seq','panel-mix','panel-fx','panel-gear','panel-song','psy-open-rack','panel-dna','kbd','scope'
];
const missingIds = requiredIds.filter(id => !ids.includes(id));
assert(missingIds.length === 0, missingIds.length ? 'Contrôles manquants: ' + missingIds.join(', ') : 'contrôles critiques présents');

const shellFiles = ['index.html','ui-v9.css','psy-track-creator.css','psy-track-creator.js','audio-extensions.js','studio-features.js','psy-machines.js','pcm-capture-processor.js','mp3-encoder-worker.js','vendor/lame.min.js','vendor/LICENSE-lamejs.txt','manifest.json','sw.js','icon.svg','banner.svg'];
for (const file of shellFiles) assert(fs.existsSync(file), 'asset présent: ' + file);

if (process.exitCode) process.exit(process.exitCode);
console.log('\nValidation Lovestronautes: OK');
