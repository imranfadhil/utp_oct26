/* ═══════════════════════════════════════════════════════════════════════
   Live Dashboard JS — UTP Adjunct Lecture
   ═══════════════════════════════════════════════════════════════════════ */

const socket = io();
let cachedData = null;

// Coalesce the several triggers that ask for dashboard data (connect, live
// updates, auto-refresh) into a single request instead of one per event.
const requestDashboard = RateLimit.createDebouncedEmitter(socket, 'dashboard:request', 400);

// Show the "back to Present" button only when we arrived from Present mode.
const fromPresent = new URLSearchParams(window.location.search).get('from') === 'present';
if (fromPresent) {
  document.getElementById('backToPresent').hidden = false;
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
      window.location.href = '/present.html';
    }
  });
}

socket.on('connect', () => {
  requestDashboard();
});

socket.on('dashboard:data', (data) => {
  cachedData = data;
  renderDashboard(data);
});

// Live updates
socket.on('points:update', () => {
  requestDashboard();
});

socket.on('survey:response', () => {
  requestDashboard();
});

socket.on('lecturer:update', () => {
  requestDashboard();
});

// Server-side nudge when this socket is sending events too fast.
socket.on('rate:limited', ({ message }) => {
  if (typeof showToast === 'function') showToast(message, 'warn');
});

/* ── Main Render ─────────────────────────────────────────────────────── */
function renderDashboard(data) {
  document.getElementById('dashTotalPoints').textContent = data.totalPoints;
  document.getElementById('dashStudents').textContent = data.activeStudents ?? data.students.length;
  document.getElementById('dashTotalStudents').textContent = data.totalStudents ?? data.students.length;
  document.getElementById('dashResponses').textContent = data.responses.length;

  renderGroupLeaderboard(data.groupScores);
  renderHistogram(data.distribution, data.students.length);
  renderScoreStats(data.studentScores);
  renderTopStudents(data.studentScores, data.groups);
  renderEngagementSummary(data.responseCounts);
  renderGroupComparison(data.groupScores, data.totalPoints);
  renderWordCloud(data.wordCloud || []);
  renderSurveyResults(data.surveyResults || []);
  renderActivityFeed(data.responses);
}

/* ── Survey Results ──────────────────────────────────────────────────────
   One block per survey sent: the question, a bar per option with counts and
   percentages, and the mean on the 1–5 agree scale. */
function renderSurveyResults(surveys) {
  const container = document.getElementById('surveyResults');
  if (!container) return;

  if (!surveys.length) {
    container.innerHTML = '<div class="loading-text">No surveys sent yet. Send one from the Lecturer Console.</div>';
    return;
  }

  container.innerHTML = surveys.map(s => {
    const maxCount = Math.max(...s.results.map(r => r.count), 1);
    const bars = s.results.map((r, i) => {
      const pct = s.total > 0 ? Math.round((r.count / s.total) * 100) : 0;
      const width = (r.count / maxCount) * 100;
      // Red (disagree) → green (agree) across the scale.
      const hue = s.results.length > 1 ? Math.round((i / (s.results.length - 1)) * 120) : 120;
      return `<div class="sr-row">
        <span class="sr-label">${escapeHtml(r.option)}</span>
        <div class="sr-bar-wrap">
          <div class="sr-bar" style="width:${width}%;background:hsl(${hue},65%,48%);"></div>
        </div>
        <span class="sr-count">${r.count}${s.total > 0 ? ` · ${pct}%` : ''}</span>
      </div>`;
    }).join('');

    const meanBadge = s.mean !== null
      ? `<span class="sr-mean" title="Mean on a 1–5 scale">μ = ${s.mean}</span>`
      : '<span class="sr-mean sr-mean-empty">awaiting votes</span>';

    return `<div class="sr-card">
      <div class="sr-head">
        <span class="sr-question">${escapeHtml(s.question)}</span>
        ${meanBadge}
      </div>
      <div class="sr-sub">${s.total} response${s.total === 1 ? '' : 's'}</div>
      ${bars}
    </div>`;
  }).join('');
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

/* ── Feedback Word Cloud ─────────────────────────────────────────────── */
function renderWordCloud(words) {
  const container = document.getElementById('wordCloud');
  if (!words || words.length === 0) {
    container.innerHTML = '<div class="loading-text">No feedback yet. Word cloud appears as students respond.</div>';
    return;
  }

  const maxCount = Math.max(...words.map(w => w.count), 1);
  const minCount = Math.min(...words.map(w => w.count));
  const palette = ['#2563eb', '#059669', '#d97706', '#7c3aed', '#dc2626', '#0891b2', '#db2777'];

  // Sentiment words from ratings get a distinct look
  const RATING_WORDS = new Set(['Excellent', 'Great', 'Okay', 'Poor', 'Bad']);

  container.innerHTML = words.map((w, i) => {
    // Scale font size 0.9rem → 3rem based on frequency
    const t = maxCount === minCount ? 1 : (w.count - minCount) / (maxCount - minCount);
    const size = (0.85 + t * 1.55).toFixed(2);
    const color = palette[i % palette.length];
    const isRating = RATING_WORDS.has(w.word);
    const weight = isRating ? 800 : 600;
    const style = `font-size:${size}rem;color:${color};font-weight:${weight};` +
      (isRating ? 'text-transform:uppercase;letter-spacing:0.5px;' : '');
    return `<span class="wc-word" style="${style}" title="${w.count} mention${w.count === 1 ? '' : 's'}">${w.word}</span>`;
  }).join('');
}

/* ── Group Leaderboard ───────────────────────────────────────────────── */
function renderGroupLeaderboard(groupScores) {
  const container = document.getElementById('groupLeaderboard');
  const sorted = [...groupScores].sort((a, b) => b.total - a.total);
  container.innerHTML = sorted.map((g, i) => `
    <div class="group-lb-item">
      <span class="glb-rank">#${i + 1}</span>
      <span class="glb-color" style="background:${g.color};"></span>
      <span class="glb-name">${g.name}</span>
      <span class="glb-meta">${g.members} member${g.members === 1 ? '' : 's'} · avg ${g.average} · +${g.bonus} each</span>
      <span class="glb-score">${g.total} pts</span>
    </div>
  `).join('');
}

/* ── Histogram ───────────────────────────────────────────────────────── */
function renderHistogram(distribution, totalStudents) {
  const container = document.getElementById('histogram');
  const maxVal = Math.max(...distribution, 1);
  container.innerHTML = distribution.map((count) => {
    const height = (count / maxVal) * 100;
    return `<div class="histogram-bar" style="height:${height}%;" title="${count} students">
      <span class="bar-count">${count}</span>
    </div>`;
  }).join('');
}

/* ── Score Distribution Stats (descriptive statistics) ───────────────── */
function renderScoreStats(studentScores) {
  const container = document.getElementById('scoreStats');
  // Use actual point totals from participating students (score > 0).
  const scores = (studentScores || [])
    .map(s => s.total)
    .filter(v => typeof v === 'number' && v > 0)
    .sort((a, b) => a - b);

  const n = scores.length;
  if (n === 0) {
    container.innerHTML = '<div class="loading-text">Descriptive stats appear once students start scoring.</div>';
    return;
  }

  // Mean (μ)
  const sum = scores.reduce((a, b) => a + b, 0);
  const mean = sum / n;

  // Median (middle value, or average of two middle values)
  const mid = Math.floor(n / 2);
  const median = n % 2 === 0 ? (scores[mid - 1] + scores[mid]) / 2 : scores[mid];

  // Mode (most frequent value; may be multi-modal)
  const freq = new Map();
  let maxFreq = 0;
  for (const v of scores) {
    const f = (freq.get(v) || 0) + 1;
    freq.set(v, f);
    if (f > maxFreq) maxFreq = f;
  }
  const modes = maxFreq > 1
    ? [...freq.entries()].filter(([, f]) => f === maxFreq).map(([v]) => v).sort((a, b) => a - b)
    : [];
  const modeStr = modes.length ? modes.join(', ') : '—';

  // Population variance (σ²) and standard deviation (σ)
  const variance = scores.reduce((acc, v) => acc + (v - mean) ** 2, 0) / n;
  const stdDev = Math.sqrt(variance);

  const min = scores[0];
  const max = scores[n - 1];
  const range = max - min;

  const fmt = (x) => Number.isInteger(x) ? x : x.toFixed(1);

  const stats = [
    { sym: 'n', label: 'count', val: n },
    { sym: 'μ', label: 'mean', val: fmt(mean) },
    { sym: 'x̃', label: 'median', val: fmt(median) },
    { sym: 'Mode', label: 'most frequent', val: modeStr },
    { sym: 'σ', label: 'std dev', val: fmt(stdDev) },
    { sym: 'σ²', label: 'variance', val: fmt(variance) },
    { sym: 'min–max', label: 'range', val: `${min}–${max}` },
    { sym: 'R', label: 'range width', val: range },
  ];

  container.innerHTML = stats.map(s => `
    <div class="stat-chip" title="${s.label}">
      <span class="stat-sym">${s.sym}</span>
      <span class="stat-val">${s.val}</span>
    </div>
  `).join('');
}

/* ── Top Students ────────────────────────────────────────────────────── */
function renderTopStudents(studentScores, groups) {
  const container = document.getElementById('topStudents');
  const sorted = [...studentScores]
    .filter(s => s.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, 15);

  if (sorted.length === 0) {
    container.innerHTML = '<div class="loading-text">No data yet. Waiting for quiz responses...</div>';
    return;
  }

  container.innerHTML = sorted.map((s, i) => {
    const group = groups.find(g => g.id === s.group_id);
    // Show the split so the team contribution is visible, not just the total.
    const split = s.teamBonus > 0
      ? `<span class="ts-split">${s.earned}+${s.teamBonus}</span>`
      : '';
    return `<div class="top-student-item">
      <span class="ts-rank">#${i + 1}</span>
      <span class="ts-name">${s.name}</span>
      ${group ? `<span class="ts-group" style="color:${group.color};">${group.name}</span>` : ''}
      ${split}
      <span class="ts-score">${s.total} pts</span>
    </div>`;
  }).join('');
}

/* ── Engagement Summary ──────────────────────────────────────────────── */
function renderEngagementSummary(counts) {
  const container = document.getElementById('engagementSummary');
  container.innerHTML = `
    <div class="eng-item">
      <div class="eng-num" style="color:#2563eb;">${counts.quiz}</div>
      <div class="eng-label">📝 Quizzes Answered</div>
    </div>
    <div class="eng-item">
      <div class="eng-num" style="color:#059669;">${counts.survey}</div>
      <div class="eng-label">📋 Surveys Completed</div>
    </div>
    <div class="eng-item">
      <div class="eng-num" style="color:#d97706;">${counts.feedback}</div>
      <div class="eng-label">💬 Feedback Given</div>
    </div>
    <div class="eng-item">
      <div class="eng-num" style="color:#7c3aed;">${counts.question}</div>
      <div class="eng-label">❓ Questions Asked</div>
    </div>
  `;
}

/* ── Group Comparison ────────────────────────────────────────────────── */
function renderGroupComparison(groupScores, totalPoints) {
  const container = document.getElementById('groupComparison');
  const sorted = [...groupScores].sort((a, b) => b.total - a.total);
  const maxScore = Math.max(...groupScores.map(g => g.total), 1);

  container.innerHTML = sorted.map(g => {
    const pct = (g.total / maxScore) * 100;
    return `<div class="gc-item">
      <span class="gc-name">${g.name}</span>
      <div class="gc-bar-wrap">
        <div class="gc-bar" style="width:${pct}%;background:${g.color};">
          ${pct > 15 ? g.total : ''}
        </div>
      </div>
      <span class="gc-score">${g.total}</span>
    </div>`;
  }).join('');
}

/* ── Activity Feed ───────────────────────────────────────────────────── */
function renderActivityFeed(responses) {
  const container = document.getElementById('activityFeed');
  if (responses.length === 0) {
    container.innerHTML = '<div class="loading-text">No activity yet.</div>';
    return;
  }

  const typeLabels = {
    quiz: '📝 Quiz answer',
    survey: '📋 Survey response',
    feedback: '💬 Feedback',
    question: '❓ Question',
  };

  container.innerHTML = responses.slice(0, 30).map(r => {
    const time = new Date(r.created_at + 'Z').toLocaleTimeString();
    const label = typeLabels[r.type] || r.type;
    let detail = '';
    if (r.type === 'feedback') {
      try { const f = JSON.parse(r.answer); detail = f.text ? `"${f.text.substring(0, 50)}"` : ''; } catch(e) { detail = r.answer.substring(0, 40); }
    } else if (r.type === 'question') {
      detail = r.answer.substring(0, 50);
    } else {
      detail = r.answer;
    }
    return `<div class="activity-item">
      <span class="act-time">${time}</span>
      <span><strong>${r.student_name}</strong> ${label}${detail ? ': ' + detail : ''} ${r.points > 0 ? '(+' + r.points + ')' : ''}</span>
    </div>`;
  }).join('');
}

// Auto-refresh every 5 seconds
setInterval(() => {
  if (cachedData) {
    requestDashboard();
  }
}, 5000);