#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════════
   Export Slides → standalone interactive HTML
   ───────────────────────────────────────────────────────────────────────
   Bundles the shared slide content (public/js/slides.js) and the site CSS
   (public/css/style.css) into a single self-contained HTML file with its own
   navigation UI. No server, no Socket.io, no build tool required — just open
   the file in any browser (or host it statically).

   The interactive slides that are PURE client-side keep working:
     • Monte Carlo HIIP simulator
     • Drilling SPC control charts
   The live, server-driven bits degrade gracefully:
     • Live word cloud → shows a friendly "offline" placeholder
     • Dashboard excerpt → omitted entirely (present-mode only)

   Usage:  node scripts/export-slides.js  [outfile]
   Default outfile: dist/lecture-slides.html
   ═══════════════════════════════════════════════════════════════════════ */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PUBLIC = path.join(ROOT, 'public');

const SLIDES_JS = path.join(PUBLIC, 'js', 'slides.js');
const STYLE_CSS = path.join(PUBLIC, 'css', 'style.css');
const OUT = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(ROOT, 'dist', 'lecture-slides.html');

// Images referenced from slide HTML via absolute paths like src="/imran-fadhil.jpeg".
// We inline them as data URIs so the exported file is fully portable.
const IMAGE_MAP = {
  '/imran-fadhil.jpeg': 'imran-fadhil.jpeg',
  '/UTP-logo2.png': 'UTP-logo2.png',
  '/poster.jpg': 'poster.jpg',
};

const MIME = {
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
};

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

/** Build a data: URI for an image in /public, or null if it isn't there. */
function imageDataUri(publicPath) {
  const rel = IMAGE_MAP[publicPath];
  if (!rel) return null;
  const abs = path.join(PUBLIC, rel);
  if (!fs.existsSync(abs)) return null;
  const ext = path.extname(abs).toLowerCase();
  const mime = MIME[ext] || 'application/octet-stream';
  const b64 = fs.readFileSync(abs).toString('base64');
  return `data:${mime};base64,${b64}`;
}

/** Replace every known /public image reference in a string with a data URI. */
function inlineImages(str) {
  let out = str;
  for (const publicPath of Object.keys(IMAGE_MAP)) {
    const uri = imageDataUri(publicPath);
    if (!uri) continue;
    // Replace both src="/x" and url(/x) style references.
    out = out.split(publicPath).join(uri);
  }
  return out;
}

console.log('Reading sources…');
const slidesSrc = read(SLIDES_JS);
const cssSrc = read(STYLE_CSS);

// slides.js is written to run in the browser as a plain script (it declares
// SLIDES, renderLiveWordCloud, initMonteCarlo, initDrillingCharts, etc.).
// We embed it as-is, then drive it with our own standalone navigation script.
// Image paths inside the slide HTML strings get inlined.
const slidesEmbedded = inlineImages(slidesSrc);
const cssEmbedded = inlineImages(cssSrc);

const html = buildHtml({ css: cssEmbedded, slidesJs: slidesEmbedded });

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, html, 'utf8');

const kb = (Buffer.byteLength(html, 'utf8') / 1024).toFixed(0);
console.log(`✓ Wrote ${path.relative(ROOT, OUT)} (${kb} KB)`);
console.log('  Open it directly in a browser — no server needed.');

/* ───────────────────────────────────────────────────────────────────────
   Standalone HTML template
   ─────────────────────────────────────────────────────────────────────── */
function buildHtml({ css, slidesJs }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Descriptive Statistics in Practice — Interactive Slides</title>
<style>
/* ── Site styles (inlined from public/css/style.css) ───────────────── */
${css}

/* ── Standalone deck shell ─────────────────────────────────────────── */
html, body { height: 100%; margin: 0; background: #0f172a; }
.deck-stage { height: 100vh; display: flex; flex-direction: column; background: #0f172a; }
.deck-slide { flex: 1; display: flex; align-items: center; justify-content: center; padding: 3vh 4vw; overflow: hidden; }
.deck-card {
  background: #fff; border-radius: 16px; width: 100%; max-width: 1100px;
  max-height: 86vh; overflow-y: auto; padding: 40px 48px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.4); font-size: 1.3rem; line-height: 1.5;
}
.deck-card h1 { font-size: 2.6rem; }
.deck-card h2 { font-size: 2rem; }
.deck-bar {
  display: flex; align-items: center; justify-content: center; gap: 16px;
  padding: 12px 14px; background: #1e293b; color: #e2e8f0; flex-wrap: wrap;
}
.deck-bar button {
  background: #2563eb; color: #fff; border: none; border-radius: 8px;
  padding: 10px 18px; font-size: 1rem; cursor: pointer;
}
.deck-bar button:hover { background: #1d4ed8; }
.deck-bar button:disabled { background: #475569; cursor: not-allowed; }
.deck-counter { font-size: 1rem; min-width: 120px; text-align: center; }
.deck-title { font-size: 0.9rem; color: #94a3b8; max-width: 320px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.deck-hint { font-size: 0.75rem; color: #64748b; }
/* Progress strip across the very top */
.deck-progress { height: 4px; background: #334155; }
.deck-progress > div { height: 100%; background: #2563eb; width: 0; transition: width 0.2s ease; }
</style>
</head>
<body>
<div class="deck-stage">
  <div class="deck-progress"><div id="deckProgressBar"></div></div>
  <div class="deck-slide">
    <div class="deck-card slide-content" id="slideContent"><!-- rendered by deck script --></div>
  </div>
  <div class="deck-bar">
    <button id="btnPrev" onclick="deckPrev()">← Prev</button>
    <span class="deck-counter" id="counter">—</span>
    <button id="btnNext" onclick="deckNext()">Next →</button>
    <span class="deck-title" id="slideTitle"></span>
    <button onclick="deckFullscreen()">⛶ Fullscreen</button>
    <span class="deck-hint">← → arrows · Home/End · F fullscreen</span>
  </div>
</div>

<script>
/* ── Shared slide content + interactive helpers (from slides.js) ─────── */
${slidesJs}

/* ── Offline stub: the live word cloud has no server here ────────────── */
(function () {
  if (typeof renderLiveWordCloud === 'function') {
    var _orig = renderLiveWordCloud;
    // Override to always show a static placeholder in the exported deck.
    window.renderLiveWordCloud = function () {
      document.querySelectorAll('[data-live-wordcloud]').forEach(function (el) {
        el.innerHTML = '<div class="loading-text" style="color:#64748b;">' +
          '☁️ Live word cloud runs during the lecture (needs the session server).</div>';
      });
    };
  }
})();

/* ── Standalone navigation ───────────────────────────────────────────── */
var deckIndex = 0;
var DECK_TOTAL = (typeof SLIDES !== 'undefined') ? SLIDES.length : 0;

function deckRender() {
  var slide = SLIDES[deckIndex];
  var el = document.getElementById('slideContent');
  el.innerHTML = slide ? slide.content : '';
  document.getElementById('counter').textContent =
    'Slide ' + (deckIndex + 1) + ' / ' + DECK_TOTAL;
  document.getElementById('slideTitle').textContent = slide ? (slide.title || '') : '';
  document.getElementById('btnPrev').disabled = deckIndex === 0;
  document.getElementById('btnNext').disabled = deckIndex === DECK_TOTAL - 1;
  document.getElementById('deckProgressBar').style.width =
    (DECK_TOTAL > 1 ? (deckIndex / (DECK_TOTAL - 1)) * 100 : 100) + '%';

  // Reset scroll and wire up the pure client-side interactive widgets.
  el.scrollTop = 0;
  if (typeof renderLiveWordCloud === 'function') renderLiveWordCloud();
  if (typeof initMonteCarlo === 'function') initMonteCarlo();
  if (typeof initDrillingCharts === 'function') initDrillingCharts();

  // Keep the current slide in the URL hash so refresh/bookmarks hold position.
  if (history.replaceState) history.replaceState(null, '', '#' + (deckIndex + 1));
}

function deckGo(i) {
  deckIndex = Math.max(0, Math.min(DECK_TOTAL - 1, i));
  deckRender();
}
function deckNext() { deckGo(deckIndex + 1); }
function deckPrev() { deckGo(deckIndex - 1); }

function deckFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(function () {});
  } else {
    document.exitFullscreen();
  }
}

document.addEventListener('keydown', function (e) {
  if (e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); deckNext(); }
  else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); deckPrev(); }
  else if (e.key === 'Home') { e.preventDefault(); deckGo(0); }
  else if (e.key === 'End') { e.preventDefault(); deckGo(DECK_TOTAL - 1); }
  else if (e.key === 'f' || e.key === 'F') { deckFullscreen(); }
});

// Start on the slide named in the URL hash (#3 → slide 3), else slide 1.
(function () {
  var fromHash = parseInt((location.hash || '').replace('#', ''), 10);
  deckGo(isNaN(fromHash) ? 0 : fromHash - 1);
})();
</script>
</body>
</html>
`;
}
