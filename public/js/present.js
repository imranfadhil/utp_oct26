/* ═══════════════════════════════════════════════════════════════════════
   Present Mode JS — UTP Adjunct Lecture
   Clean full-screen slides for the projector. READ-ONLY mirror: the lecturer
   console is the sole driver. Present mode only displays whatever slide the
   lecturer is on and follows along. It never changes or broadcasts slides.
   ═══════════════════════════════════════════════════════════════════════ */

const socket = io();
let currentSlide = 0;
let sessionActive = false;
const TOTAL_SLIDES = SLIDES.length;

// Presenter mode polls for the live excerpt frequently, so coalesce every
// trigger into one request per interval rather than one per event.
const requestDashboard = RateLimit.createDebouncedEmitter(socket, 'dashboard:request', 500);

// ── Render ────────────────────────────────────────────────────────────
// Render by index using local slide content when available; fall back to
// content pushed by the server (e.g. custom/quick content) if provided.
function renderSlide(index, content) {
  const el = document.getElementById('slideContent');
  const local = SLIDES[index];
  el.innerHTML = content || (local ? local.content : '');
  document.getElementById('counter').textContent = `Slide ${index + 1} / ${TOTAL_SLIDES}`;
  // Re-fill any live word cloud on the freshly rendered slide.
  if (latestDashboard) renderLiveWordCloud(latestDashboard.wordCloud);
  // Wire up the Monte Carlo demo if this slide carries it.
  initMonteCarlo();
  // Wire up the drilling control charts if this slide carries them.
  initDrillingCharts();
}

// Build the student join URL from wherever this page is served, so it works
// automatically on localhost or any deployed host without hardcoding.
function studentJoinUrl() {
  return window.location.origin + '/student.html';
}

// Generate a scannable QR (SVG) for a URL using the vendored qrcode lib.
function buildQrSvg(url) {
  try {
    const qr = qrcode(0, 'M'); // type 0 = auto-size, 'M' = ~15% error correction
    qr.addData(url);
    qr.make();
    // cellSize 6px, margin 0 (we add padding via CSS)
    return qr.createSvgTag({ cellSize: 6, margin: 0, scalable: true });
  } catch (e) {
    return '';
  }
}

function showWaiting() {
  const url = studentJoinUrl();
  const qrSvg = buildQrSvg(url);
  document.getElementById('slideContent').innerHTML = `
    <div class="standby standby-join">
      <div class="standby-pulse">
        <img src="/UTP-logo2.png" alt="Universiti Teknologi PETRONAS" style="height:56px;width:auto;">
      </div>
      <h1 class="standby-title">Scan to Join the Lecture</h1>
      <p class="standby-subtitle">Descriptive Statistics in Practice · Industry Insights and Responsible AI</p>
      <div class="join-qr">${qrSvg || '<div class="join-qr-fallback">QR unavailable</div>'}</div>
      <p class="join-url">${url}</p>
      <div class="standby-badge"><span class="standby-dot"></span> Register now — lecture starts soon</div>
    </div>
  `;
  document.getElementById('counter').textContent = '—';
}

// ── Fullscreen toggle (display convenience only) ──────────────────────
function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(() => {});
  } else {
    document.exitFullscreen();
  }
}

/* ── Live dashboard excerpt ────────────────────────────────────────────
   A compact read-only snapshot pinned to the slide stage. Clicking it opens
   the full dashboard, which carries a "back to present" button via ?from=present. */
let excerptVisible = true;
let latestDashboard = null;

function openDashboard() {
  window.location.href = '/dashboard.html?from=present';
}

function toggleExcerpt() {
  excerptVisible = !excerptVisible;
  document.getElementById('dashExcerpt').hidden = !excerptVisible;
  document.getElementById('btnExcerpt').textContent = excerptVisible ? '📊 Hide stats' : '📊 Show stats';
}

function esc(str) {
  return String(str).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

function renderExcerpt(data) {
  const body = document.getElementById('excerptBody');
  if (!data || !body) return;
  latestDashboard = data;

  const scores = (data.studentScores || [])
    .map(s => s.total)
    .filter(v => typeof v === 'number' && v > 0)
    .sort((a, b) => a - b);

  // responses[] is capped at 50 by the server, so use the true counts instead.
  const counts = data.responseCounts || {};
  const totalResponses = (counts.quiz || 0) + (counts.survey || 0) + (counts.feedback || 0) + (counts.question || 0);

  const metrics = `
    <div class="excerpt-metrics">
      <div class="excerpt-metric"><b>${data.students?.length ?? 0}</b><span>students</span></div>
      <div class="excerpt-metric"><b>${data.totalPoints ?? 0}</b><span>points</span></div>
      <div class="excerpt-metric"><b>${totalResponses}</b><span>responses</span></div>
    </div>`;

  // Descriptive stats on live scores — a nice tie-in with the lecture itself.
  let statsHtml = '';
  if (scores.length) {
    const n = scores.length;
    const mean = scores.reduce((a, b) => a + b, 0) / n;
    const mid = Math.floor(n / 2);
    const median = n % 2 === 0 ? (scores[mid - 1] + scores[mid]) / 2 : scores[mid];
    const stdDev = Math.sqrt(scores.reduce((acc, v) => acc + (v - mean) ** 2, 0) / n);
    const fmt = (x) => Number.isInteger(x) ? x : x.toFixed(1);
    statsHtml = `
      <div class="excerpt-section">
        <div class="excerpt-label">Live score stats</div>
        <div class="excerpt-stats">
          <span class="excerpt-chip"><i>μ</i> ${fmt(mean)}</span>
          <span class="excerpt-chip"><i>x̃</i> ${fmt(median)}</span>
          <span class="excerpt-chip"><i>σ</i> ${fmt(stdDev)}</span>
          <span class="excerpt-chip"><i>max</i> ${scores[n - 1]}</span>
        </div>
      </div>`;
  }

  const topGroups = [...(data.groupScores || [])]
    .sort((a, b) => b.total - a.total)
    .filter(g => g.total > 0)
    .slice(0, 5);
  const groupsHtml = topGroups.length ? `
    <div class="excerpt-section">
      <div class="excerpt-label">Top groups</div>
      ${topGroups.map((g, i) => `
        <div class="excerpt-row"><span>${i + 1}. ${esc(g.name)}</span><b>${g.total}</b></div>
      `).join('')}
    </div>` : '';

  const topStudents = [...(data.studentScores || [])]
    .filter(s => s.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);
  const studentsHtml = topStudents.length ? `
    <div class="excerpt-section">
      <div class="excerpt-label">Top students</div>
      ${topStudents.map((s, i) => `
        <div class="excerpt-row"><span>${i + 1}. ${esc(s.name)}</span><b>${s.total}</b></div>
      `).join('')}
    </div>` : '';

  const hasActivity = (data.students?.length || 0) > 0 || totalResponses > 0;
  body.innerHTML = hasActivity
    ? metrics + statsHtml + groupsHtml + studentsHtml
    : '<div class="excerpt-empty">Waiting for student activity…</div>';
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'f' || e.key === 'F') toggleFullscreen();
  if (e.key === 'd' || e.key === 'D') openDashboard();
});

// ── Status helper ─────────────────────────────────────────────────────
function setStatus(active) {
  const status = document.getElementById('liveStatus');
  if (active) {
    status.textContent = '● Live — following lecturer';
    status.classList.add('live');
  } else {
    status.textContent = 'Session not active';
    status.classList.remove('live');
  }
}

// ── Socket lifecycle (listen only — never drives slides) ──────────────
socket.on('connect', () => {
  // Ask the server for the current state so we sync if opened mid-lecture.
  socket.emit('controller:join');
  requestDashboard();
});

// Live dashboard feed for the excerpt panel (same payload the dashboard uses).
socket.on('dashboard:data', (data) => {
  renderExcerpt(data);
  renderLiveWordCloud(data.wordCloud);
});
socket.on('points:update', () => requestDashboard());
socket.on('survey:response', () => requestDashboard());
setInterval(() => requestDashboard(), 5000);

// Server-side nudge when this socket is sending events too fast.
socket.on('rate:limited', ({ message }) => {
  if (typeof showToast === 'function') showToast(message, 'warn');
});

socket.on('state:current', ({ slide, content, sessionActive: active }) => {
  currentSlide = slide || 0;
  sessionActive = active;
  setStatus(active);
  if (active) {
    renderSlide(currentSlide, content);
  } else {
    showWaiting();
  }
});

// Follow the lecturer's navigation (only display while the session is active).
socket.on('slide:change', ({ slide, content }) => {
  if (typeof slide === 'number') {
    currentSlide = slide;
    if (sessionActive) renderSlide(currentSlide, content);
  }
});

socket.on('session:status', ({ active }) => {
  sessionActive = active;
  setStatus(active);
  if (active) {
    renderSlide(currentSlide);
  } else {
    showWaiting();
  }
});

socket.on('session:reset', () => {
  currentSlide = 0;
  sessionActive = false;
  latestDashboard = null;
  setStatus(false);
  showWaiting();
  document.getElementById('excerptBody').innerHTML =
    '<div class="excerpt-empty">Waiting for student activity…</div>';
  requestDashboard();
});

socket.on('disconnect', () => {
  const status = document.getElementById('liveStatus');
  status.textContent = 'Disconnected';
  status.classList.remove('live');
});

// ── Init ──────────────────────────────────────────────────────────────
showWaiting();
