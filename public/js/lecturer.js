/* ═══════════════════════════════════════════════════════════════════════
   Lecturer Console JS — UTP Adjunct Lecture
   ═══════════════════════════════════════════════════════════════════════ */

const socket = io();
let currentSlide = 0;
const TOTAL_SLIDES = SLIDES.length;
let latestDashboard = null; // most recent dashboard payload (feeds live word cloud)
let surveyBank = [];        // reusable survey prompts loaded from the server

// Server-side nudge when this console sends events too fast.
socket.on('rate:limited', ({ message }) => {
  if (typeof showToast === 'function') showToast(message, 'warn');
});
// Track what's already been sent so the bank items stay flagged green even
// after the lists re-render (bank re-renders on every slide change) and across
// page refreshes (persisted to localStorage).
const SENT_Q_KEY = 'lecturer:sentQuestionIds';
const SENT_S_KEY = 'lecturer:sentSurveyIds';

function loadSentSet(key) {
  try {
    const raw = localStorage.getItem(key);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch (e) {
    return new Set();
  }
}

function saveSentSet(key, set) {
  try { localStorage.setItem(key, JSON.stringify([...set])); } catch (e) {}
}

const sentQuestionIds = loadSentSet(SENT_Q_KEY);
const sentSurveyIds = loadSentSet(SENT_S_KEY);

// Student questions have no server id, so we key "addressed" state by a stable
// student+text hash. This survives refresh because backfill replays the same
// student/text pairs.
const ADDRESSED_KEY = 'lecturer:addressedQuestions';
const addressedQuestions = loadSentSet(ADDRESSED_KEY);

function questionKey(student, text) {
  return `${student}\u0000${text}`;
}

/* ── Slide Content is now shared via public/js/slides.js (const SLIDES) ─── */

/* ── Lecture Notes — concise talking points per slide (index matches SLIDES).
   `points` may contain light HTML (<strong>, <em>). `say` is an optional
   one-liner to deliver verbatim. ─────────────────────────────────────────── */
const NOTES = [
  { title: 'Welcome', points: [
    'Set the tone: this is interactive, not a monologue.',
    'Two threads today: <strong>descriptive statistics</strong> and <strong>responsible AI</strong>.',
    'Tell them phones will be used — quizzes and polls are part of the session.',
  ], say: 'By the end you\'ll see the statistics you already know running real petroleum projects.' },

  { title: 'Agenda', points: [
    'Four parts: Stats Review → Industry Insights → Responsible AI → Open Q&A.',
    'Flag the <strong>three quiz checkpoints</strong> (after Parts 1, 2, 3) so they keep phones ready.',
    'Part 4 is offline — no devices, just discussion.',
  ] },

  { title: 'Introduction', points: [
    'Keep it short — 2 minutes max.',
    'The arc: offshore petrophysicist → data scientist → AI leadership.',
    'Land the point: <strong>statistics was the bridge</strong> between the two careers.',
  ], say: 'The bridge between reading logs and leading a data science team was exactly the stats you\'re learning now.' },

  { title: 'Warm-Up Word Cloud', points: [
    'Get everyone to submit 1–3 words — participation from the first minute.',
    'Point at the live cloud: bigger word = higher frequency = a <strong>mode</strong> forming in real time.',
    'Normalise feelings: "confusing" and "exam stress" are common and fine.',
    '<strong>Reminder:</strong> use this warm-up to test the <strong>Survey / Poll</strong> panel — fire one prompt and confirm responses land before the real quizzes.',
  ], say: 'You\'re already doing statistics — that cloud is a frequency distribution.' },

  { title: 'Mean · Median · Mode', points: [
    'These are the <strong>measures of central tendency</strong> — the "centre" of the data.',
    '<strong>Mean</strong>: sum ÷ count. Uses every value, so it\'s <em>sensitive to outliers</em>.',
    '<strong>Median</strong>: middle value when sorted. <em>Robust</em> — one huge value barely moves it.',
    '<strong>Mode</strong>: most frequent value. The only one that works for <em>categorical</em> data.',
    '<strong>Why geometric mean for permeability?</strong> Permeability is <em>log-normal</em> — a few very high values (thief zones, fractures, high-perm streaks) drag the arithmetic mean far above what any real rock actually has.',
    'Worked example — four samples: <strong>1, 10, 100, 1000 mD</strong>. Arithmetic mean = <strong>278 mD</strong> (no rock is anywhere near it!), geometric mean = <strong>32 mD</strong> (representative of the bulk).',
    'Geometric mean = average of the <em>logs</em>, then exponentiate: GM = exp(mean(ln x)). It\'s the natural "centre" for <em>multiplicative</em> data like permeability.',
    'For a log-normal distribution the geometric mean <strong>equals the median</strong> — so both give the same answer here.',
  ], say: 'If your average permeability is higher than almost every sample you measured, you\'ve used the wrong average.' },

  { title: 'Standard Deviation & Variance', points: [
    'These are the <strong>measures of spread</strong> — how far data sits from the centre.',
    '<strong>Variance (σ²)</strong>: average squared deviation. Units are squared, so it\'s hard to read directly.',
    '<strong>Std dev (σ)</strong>: square root of variance — back in the <em>same units</em> as the data.',
    '<strong>68-95-99.7 rule</strong>: in a normal distribution, ~68% within ±1σ, ~95% within ±2σ.',
    '<strong>CV = σ/μ</strong> lets you compare spread across different scales.',
  ], say: 'Two reservoirs can share the same average porosity but behave completely differently — spread is the difference.' },

  { title: 'Probability Distributions', points: [
    'Match the distribution to the physics of the variable.',
    '<strong>Normal</strong>: porosity, thickness — symmetric, CLT applies.',
    '<strong>Log-normal</strong>: permeability, reserves — most reservoir properties, right-skewed.',
    '<strong>Triangular</strong>: drilling depth to target.',
    '<strong>Binomial</strong>: success/failure counts — well tests, risk analysis.',
    'Percentiles P10/P50/P90 are the language of uncertainty — preview of the next part.',
  ], say: 'Pick the wrong distribution and your reserve estimate can be off by millions of barrels.' },

  { title: 'Correlation & Regression', points: [
    '<strong>Pearson\'s r</strong> measures the strength of a <em>linear</em> relationship, from −1 to +1.',
    'Rough guide: |r| &gt; 0.7 strong · 0.3–0.7 moderate · &lt; 0.3 weak.',
    '<strong>Regression</strong> (y = mx + c) fits the trend line so you can predict.',
    '<strong>Other measures:</strong> Spearman\'s ρ and Kendall\'s τ are <em>rank-based</em> — they capture any <em>monotonic</em> trend, need no linearity, and resist outliers. R² reports how well the line fits.',
    '<strong>Key point:</strong> porosity–permeability is <em>not</em> linear — perm spans orders of magnitude. So we fit <strong>log₁₀(k) vs φ</strong> and compute Pearson\'s r on the <em>transformed</em> perm.',
    'Caution: correlation ≠ causation, and r only captures <em>linear</em> relationships — always plot the data first.',
  ], say: 'If the scatter is curved, don\'t force a straight line — transform the data, or use a rank-based measure like Spearman.' },

  { title: 'Part 1 Recap → Quiz', points: [
    'Quick verbal recap of the four boxes before launching the quiz.',
    'Tell them to grab phones and join if they haven\'t.',
    'Launch <strong>Quiz Round 1</strong> from the Question Bank panel on the right.',
  ] },

  { title: 'Reservoir Characterization', points: [
    'Core idea: reservoirs are <strong>heterogeneous</strong> — properties vary in space.',
    '<strong>How the three bullets connect:</strong> the <em>variogram</em> measures spatial correlation → <em>kriging/SGS</em> use that to build realizations → <em>Monte Carlo</em> runs many realizations to get an uncertainty range. The equation is the engine of the first step.',
    '<strong>The equation, in words:</strong> γ(h) = (1/2N) Σ [Z(x) − Z(x+h)]². Take every pair of samples a distance <em>h</em> apart, square the difference in their values, average, then halve.',
    'It answers one question: <em>"how different are two points this far apart?"</em> Small γ(h) = similar; large γ(h) = unrelated.',
    '<strong>Reading the curve:</strong> γ(h) rises with distance, then flattens at the <strong>sill</strong>. The distance where it flattens is the <strong>range</strong> — beyond it, points are no longer spatially correlated.',
    'Link back: the semivariogram is just <strong>variance</strong> — but now it depends on distance. The sill equals the ordinary variance σ².',
  ], say: 'A variogram is variance with a memory of distance — it tells you how far a measurement "reaches".' },

  { title: 'Uncertainty: P10 · P50 · P90', points: [
    'Every project reports reserves as a <strong>range</strong>, never a single number.',
    '<strong>P90</strong> = 90% chance of exceeding → conservative (low).',
    '<strong>P50</strong> = best estimate (median).',
    '<strong>P10</strong> = 10% chance of exceeding → optimistic (high).',
    'Punchline: these are just <strong>percentiles</strong> — first-year stats.',
  ], say: 'P90 is the number you can defend; P10 is the number you hope for.' },

  { title: 'Monte Carlo — HIIP', points: [
    'HIIP = 7758 × A × h × φ × (1 − Sw) / Boi.',
    'We never know A, h, φ, Sw exactly — so draw each from a <strong>distribution</strong>.',
    'Run it thousands of times, then read P10/P50/P90 off the histogram.',
    'Demo: run with <strong>10 simulations</strong> — the percentiles jump every time.',
    'Then run <strong>10,000</strong> — they barely move. That\'s the <strong>Law of Large Numbers</strong>.',
    '<strong>"Is it really this fast?"</strong> Yes — <em>this</em> demo is instant because it\'s a <strong>closed-form equation</strong> with only <strong>4 independent variables</strong>. Each run is just one multiply-and-divide, so 10,000 runs finish in milliseconds.',
    '<strong>When does it get expensive?</strong> When each "run" stops being a formula and becomes a <em>simulation</em>:',
    '<strong>1. Spatial models</strong> — instead of one porosity number, you simulate a full 3D grid (millions of cells) with geostatistics (SGS/kriging). One realization can take minutes.',
    '<strong>2. Flow simulation</strong> — running a reservoir simulator per realization (history matching, production forecasting) takes <em>hours per run</em>.',
    '<strong>3. Many variables + correlations</strong> — dozens of uncertain inputs, correlated, with structural/topological uncertainty (how many faults? compartments?).',
    '<strong>4. Coupled workflows</strong> — geology → static model → dynamic flow → economics, chained per realization.',
    'So: <strong>10,000 runs × hours each = days to weeks</strong> on a cluster. That\'s why industry uses <em>experimental design</em>, <em>proxy/surrogate models</em> (ML emulators), and HPC to cut the count.',
  ], say: 'The maths is trivial — the cost is in what each run represents. A formula is instant; a full field simulation is not.' },

  { title: 'Drilling Analytics', points: [
    '<strong>Control charts</strong> track weight-on-bit, torque, mud density in real time.',
    'Control limits are <strong>μ ± 3σ</strong> — the same σ from Part 1.',
    'Points outside the limits are <strong>outliers</strong> → possible kicks, lost circulation, bit dysfunction.',
    '<strong>Reading the charts on screen:</strong> green line = centre (μ); red dashed lines = UCL/LCL; the series wiggles inside the band when the process is "in control".',
    'Red dots are the <strong>signals</strong>: WOB spike → bit dysfunction · torque spike → stick-slip · mud density drop → possible kick.',
    'Key idea: the chart doesn\'t tell you <em>what</em> is wrong — it tells you <em>when to look</em>. The engineer interprets the cause.',
    'Broader point: every "normal range" in engineering is μ ± k·σ.',
  ], say: 'When you see a normal operating range on a rig, you\'re looking at statistics.' },

  { title: 'Part 2 Recap → Quiz', points: [
    'Recap the four boxes: characterization, uncertainty, Monte Carlo, drilling.',
    'Launch <strong>Quiz Round 2</strong> from the Question Bank panel.',
  ] },

  { title: 'From Stats to AI in Industry', points: [
    'Thesis: <strong>ML is applied statistics at scale</strong> — already running across the energy industry.',
    'Map the concepts: linear/logistic regression → neural nets · Bayes → Naive Bayes · PCA → dimensionality reduction.',
    '<strong>Where AI is used today:</strong> seismic (picks faults/horizons ~10× faster) · production (well performance, lift) · predictive maintenance (failure from sensor data).',
    'Key insight on screen: AI <strong>amplifies</strong> a petroleum engineer\'s ability — it <em>can\'t replace</em> domain expertise or statistical literacy.',
    'Their stats foundation is a genuine advantage for understanding all of this.',
  ], say: 'You already know the maths behind a lot of what\'s marketed as AI.' },

  { title: 'AI as Copilot, Not Autopilot', points: [
    'Copilot: <strong>you</strong> ask, verify, decide, stay accountable.',
    'Autopilot: AI generates, you accept blindly, you lose the ability to explain.',
    'The rule: <strong>if you can\'t verify it, don\'t use it.</strong>',
    '<strong>The risks that make this matter</strong> (bottom of the slide): <em>hallucination</em> (confident but wrong) · <em>bias</em> (learns and amplifies biased data) · <em>over-reliance</em> (your skills weaken) · <em>black box</em> (can\'t explain the decision).',
    'Stakes: wrong decisions cost millions and can be safety-critical.',
  ], say: 'You are the pilot. AI is the copilot — it never takes the controls.' },

  { title: 'Responsible AI — Why & How', points: [
    '<strong>Why it matters:</strong> AI can be wrong · you own the result · consequences are real (dollars, safety).',
    '<strong>How to practice it:</strong> verify against trusted sources · stay in the loop · be transparent (cite AI use) · know the limits (no physics/safety/ethics reasoning).',
    '<strong>Prompting is how you "verify" and "give context"</strong> — walk the bad vs good prompt example on screen.',
    'Do: give context, ask step-by-step, challenge the answer. Don\'t: copy-paste blindly, share personal data, skip thinking.',
    'Mention the <strong>NIST AI RMF</strong> as the industry-standard framework.',
  ], say: 'A vague prompt gets a vague answer — the quality of your question sets the ceiling.' },

  { title: 'Part 3 Recap → Quiz', points: [
    'Recap the four boxes: stats→ML, copilot vs autopilot, know the risks, practice it.',
    'Launch <strong>Quiz Round 3</strong> from the Question Bank panel — the last checkpoint round.',
  ] },

  { title: 'Your Superpower', points: [
    '<strong>Data Literacy</strong> — <em>What it means:</em> understanding what data actually signifies beyond raw numbers.<ul><li><em>AI Limitation:</em> AI can generate misleading visualizations or ingest biased data without recognizing semantic dishonesty.</li><li><em>Your Edge:</em> spotting manipulation, cherry-picked metrics, and scale distortions.</li></ul>',
    '<strong>Uncertainty</strong> — <em>What it means:</em> knowing that nothing in data is absolute and every outcome comes with risk.<ul><li><em>AI Limitation:</em> AI models are optimized to project high confidence and definitive, single-point answers.</li><li><em>Your Edge:</em> quantifying risk, setting confidence intervals, and understanding the margin of error.</li></ul>',
    '<strong>Pattern Recognition</strong> — <em>What it means:</em> identifying correlations, trends, and anomalies.<ul><li><em>AI Limitation:</em> AI excels at finding mathematical associations but confuses <strong>correlation with causation</strong>.</li><li><em>Your Edge:</em> providing physical, logical, or domain context to explain <em>why</em> patterns exist and filtering out spurious relationships.</li></ul>',
    '<strong>Hypothesis Testing</strong> — <em>What it means:</em> creating a framework for making rigorous, defensible, data-driven decisions.<ul><li><em>AI Limitation:</em> while AI/agents can automate the <em>mechanics</em> (writing code and executing <em>t</em>-tests), they lack epistemic intent. Unsupervised agentic loops risk automated <strong>p-hacking</strong> and data dredging.</li><li><em>Your Edge:</em> defining the <em>a priori</em> hypothesis, committing to experimental boundaries, managing error rates (α and β), and taking ultimate real-world accountability for the decision.</li></ul>',
    '<strong>Bottom Line:</strong> AI automates execution, but humans remain the <strong>Epistemic Gatekeepers</strong>. Your statistical foundation is your ultimate competitive advantage in an AI-driven industry.',
  ], say: 'AI can compute faster, but you\'re the one who knows what the numbers mean.' },

  { title: 'Career Pathways', points: [
    'Options: petroleum engineering, data science, sustainability, finance.',
    'Stats + domain knowledge travels across sectors.',
    'Personal note: petrophysics → data science → AI leadership, all in one company.',
  ] },

  { title: 'Key Takeaways', points: [
    '1. Stats is everywhere in engineering.',
    '2. AI is a copilot, not autopilot.',
    '3. Always verify — hallucinations are real.',
    '4. Your skills + AI = superpower.',
    '5. Stay accountable — you own the result.',
  ] },

  { title: 'Part 4: Open Q&A', points: [
    '<strong>Run the final quiz first</strong> — launch the wrap-up round from the Question Bank panel before opening the floor.',
    'It\'s a light round on key takeaways, durable skills and career paths — a chance to claw back some points.',
    'Once the quiz closes, phones down — this becomes a conversation.',
    'Invite questions on studies, careers, or AI; point to final scores on the dashboard.',
    'Remind them the feedback form is still open on the student page.',
  ], say: 'One last quiz to lock in the takeaways — then phones down and let\'s talk.' },

  { title: 'Thank You', points: [
    'Thank them for the energy and participation.',
    'Point to contact details on screen.',
    'Close with the final thought: AI won\'t replace you — someone using it responsibly will.',
  ] },
];


// ── Socket Events ─────────────────────────────────────────────────────
socket.on('connect', () => {
  // Don't auto-login — wait for password
});

socket.on('lecturer:authed', () => {
  console.log('[lecturer] authenticated');
  document.getElementById('lecturerLogin').classList.add('hidden');
  document.getElementById('lecturerApp').classList.remove('hidden');
  // Send the initial slide (slide 0) so the server stores it for students
  const slide = SLIDES[0];
  socket.emit('lecturer:slide', { slide: 0, title: slide.title, content: slide.content });
  buildOutline();
  loadDashboardData();
  loadBankForSlide(0);
  socket.emit('lecturer:surveybank:list');
});

socket.on('lecturer:auth:failed', ({ message }) => {
  const errEl = document.getElementById('lecturerLoginError');
  errEl.textContent = message;
  errEl.style.display = 'block';
});

function lecturerLogin() {
  const password = document.getElementById('lecturerPassword').value;
  // Send even when empty — the server allows empty login when no admin
  // password is configured (local dev). It rejects empty when one is set.
  document.getElementById('lecturerLoginError').style.display = 'none';
  socket.emit('lecturer:login', { password });
}

socket.on('dashboard:data', (data) => {
  latestDashboard = data;
  updateSidebar(data);
  renderLiveWordCloud(data.wordCloud);
});

socket.on('lecturer:update', ({ type, student }) => {
  if (type === 'student_joined') {
    updateStudentList();
  }
});

socket.on('lecturer:question', ({ student, text }) => {
  addQuestion(student, text);
});

// Replay questions that arrived before this console connected/refreshed.
socket.on('lecturer:questions:backfill', (questions) => {
  const feed = document.getElementById('questionFeed');
  feed.innerHTML = '';
  for (const q of questions) addQuestion(q.student, q.text);
});

// Dashboard data is now broadcast via debounced broadcastDashboard
// No need for individual points:update or survey:response listeners

// ── Question Bank ─────────────────────────────────────────────────────
socket.on('lecturer:bank:list', ({ slideId, questions }) => {
  const container = document.getElementById('questionBankList');
  if (questions.length === 0) {
    container.innerHTML = '<div class="loading-text">No questions for this slide.</div>';
    return;
  }
  container.innerHTML = questions.map(q => {
    const opts = JSON.parse(q.options);
    const labels = ['A', 'B', 'C', 'D'];
    const sent = sentQuestionIds.has(q.id) ? ' sent' : '';
    return `<div class="bank-item${sent}" data-qid="${q.id}">
      <button class="bank-send-btn" onclick="sendBankQuestion(${q.id})">▶ Send</button>
      <span class="bank-q">${q.question}</span>
      <span class="bank-opts">${opts.map((o, i) => `${labels[i]}. ${o}${i === q.correct ? ' ✓' : ''}`).join(' &nbsp;|&nbsp; ')}</span>
    </div>`;
  }).join('');
});

function sendBankQuestion(questionId) {
  socket.emit('lecturer:bank:send', { questionId });
  // Flag it green so you can see at a glance what's already gone out.
  sentQuestionIds.add(questionId);
  saveSentSet(SENT_Q_KEY, sentQuestionIds);
  const el = document.querySelector(`.bank-item[data-qid="${questionId}"]`);
  if (el) el.classList.add('sent');
}

function addBankQuestion() {
  const question = document.getElementById('bankNewQuestion').value.trim();
  const options = [
    document.getElementById('bankNewOptA').value.trim(),
    document.getElementById('bankNewOptB').value.trim(),
    document.getElementById('bankNewOptC').value.trim(),
    document.getElementById('bankNewOptD').value.trim(),
  ];
  const correct = parseInt(document.getElementById('bankNewCorrect').value);
  const points = parseInt(document.getElementById('bankNewPoints').value) || 10;

  if (!question || options.some(o => !o)) {
    showToast('Fill in the question and all 4 options.', 'warn');
    return;
  }

  socket.emit('lecturer:bank:add', { slideId: currentSlide, question, options, correct, points });

  // Clear form
  document.getElementById('bankNewQuestion').value = '';
  document.getElementById('bankNewOptA').value = '';
  document.getElementById('bankNewOptB').value = '';
  document.getElementById('bankNewOptC').value = '';
  document.getElementById('bankNewOptD').value = '';
  showToast('Question added to the bank.', 'success');
}

// ── Slide Navigation ──────────────────────────────────────────────────
function renderSlide(index) {
  const slide = SLIDES[index];
  const viewer = document.getElementById('slideContent');
  viewer.innerHTML = slide.content;
  document.getElementById('slideIndicator').textContent = `Slide ${index + 1} / ${TOTAL_SLIDES}`;
  setActiveOutline(index);
  renderNotes(index);
  // Re-fill any live word cloud embedded in the freshly rendered slide.
  if (latestDashboard) renderLiveWordCloud(latestDashboard.wordCloud);
  // Wire up the Monte Carlo demo if this slide carries it.
  initMonteCarlo();
  // Wire up the drilling control charts if this slide carries them.
  initDrillingCharts();
}

function goSlide(delta) {
  const target = Math.max(0, Math.min(TOTAL_SLIDES - 1, currentSlide + delta));
  // Key repeat on arrow keys keeps firing while held; at the first/last slide
  // that would re-broadcast the same slide over and over. Nothing to send then.
  if (target === currentSlide) return;
  currentSlide = target;
  renderSlide(currentSlide);
  // Send full slide content so students can render it too
  const slide = SLIDES[currentSlide];
  socket.emit('lecturer:slide', { slide: currentSlide, title: slide.title, content: slide.content });
  // Load question bank for this slide
  loadBankForSlide(currentSlide);
}

function loadBankForSlide(slideId) {
  document.getElementById('bankSlideLabel').textContent = slideId + 1;
  socket.emit('lecturer:bank:list', { slideId });
}

// ── Slide Outline (quick jump) ────────────────────────────────────────
function buildOutline() {
  const list = document.getElementById('outlineList');
  if (!list) return;
  list.innerHTML = SLIDES.map((s, i) =>
    `<li class="outline-item" data-index="${i}" onclick="jumpToSlide(${i})" title="${escapeHtmlLect(s.title)}">
       <span class="outline-num">${i + 1}</span>
       <span class="outline-title">${escapeHtmlLect(s.title)}</span>
     </li>`
  ).join('');
  const count = document.getElementById('outlineCount');
  if (count) count.textContent = `${TOTAL_SLIDES} slides`;
  setActiveOutline(currentSlide);
}

function setActiveOutline(index) {
  const list = document.getElementById('outlineList');
  if (!list) return;
  list.querySelectorAll('.outline-item').forEach(el => {
    const active = Number(el.dataset.index) === index;
    el.classList.toggle('active', active);
    if (active) el.scrollIntoView({ block: 'nearest' });
  });
}

function jumpToSlide(index) {
  if (index === currentSlide) return;
  goSlide(index - currentSlide);
}

function toggleOutline() {
  const body = document.querySelector('.lecturer-body');
  if (!body) return;
  body.classList.toggle('outline-collapsed');
  try { localStorage.setItem('outlineCollapsed', body.classList.contains('outline-collapsed') ? '1' : '0'); } catch (e) {}
}

// Restore the outline's collapsed state from the last session.
try {
  if (localStorage.getItem('outlineCollapsed') === '1') {
    document.querySelector('.lecturer-body')?.classList.add('outline-collapsed');
  }
} catch (e) {}

// ── Keyboard Navigation ───────────────────────────────────────────────
// Arrow keys / PageUp / PageDown / Space drive the slides, but only once
// the console is unlocked and never while typing in a form field.
document.addEventListener('keydown', (e) => {
  const app = document.getElementById('lecturerApp');
  if (!app || app.classList.contains('hidden')) return; // not logged in yet

  const tag = (e.target.tagName || '').toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable) return;

  switch (e.key) {
    case 'ArrowRight':
    case 'ArrowDown':
    case 'PageDown':
    case ' ':
      e.preventDefault();
      goSlide(1);
      break;
    case 'ArrowLeft':
    case 'ArrowUp':
    case 'PageUp':
      e.preventDefault();
      goSlide(-1);
      break;
    case 'Home':
      e.preventDefault();
      goSlide(-currentSlide);
      break;
    case 'End':
      e.preventDefault();
      goSlide(TOTAL_SLIDES - 1 - currentSlide);
      break;
  }
});

// ── Session Controls ─────────────────────────────────────────────────
function startSession() {
  socket.emit('lecturer:start');
  document.getElementById('btnStart').disabled = true;
  document.getElementById('btnStop').disabled = false;
  document.getElementById('sessionStatus').textContent = 'Active';
  document.getElementById('sessionStatus').className = 'status-badge active';
}

function stopSession() {
  socket.emit('lecturer:stop');
  document.getElementById('btnStart').disabled = false;
  document.getElementById('btnStop').disabled = true;
  document.getElementById('sessionStatus').textContent = 'Inactive';
  document.getElementById('sessionStatus').className = 'status-badge';
}

async function resetSession() {
  const ok = await showConfirm(
    'This deletes ALL data — students, scores and responses. This cannot be undone.',
    { confirmText: 'Delete everything', danger: true }
  );
  if (!ok) return;
  socket.emit('lecturer:reset');
  sentQuestionIds.clear();
  sentSurveyIds.clear();
  addressedQuestions.clear();
  saveSentSet(SENT_Q_KEY, sentQuestionIds);
  saveSentSet(SENT_S_KEY, sentSurveyIds);
  saveSentSet(ADDRESSED_KEY, addressedQuestions);
  currentSlide = 0;
  renderSlide(0);
  // Re-render the bank and survey panels so their green "sent" flags clear now,
  // rather than waiting for the next slide change.
  loadBankForSlide(0);
  socket.emit('lecturer:surveybank:list');
  document.getElementById('btnStart').disabled = false;
  document.getElementById('btnStop').disabled = true;
  document.getElementById('sessionStatus').textContent = 'Inactive';
  document.getElementById('sessionStatus').className = 'status-badge';
  document.getElementById('studentList').innerHTML = '';
  document.getElementById('questionFeed').innerHTML = '';
  document.getElementById('studentCount').textContent = '0';
  showToast('Session reset — all data cleared.', 'success');
}

// ── Lecture Notes ─────────────────────────────────────────────────────
function renderNotes(index) {
  const body = document.getElementById('lectureNotes');
  if (!body) return;
  const label = document.getElementById('notesSlideLabel');
  if (label) label.textContent = `Slide ${index + 1}`;

  const note = NOTES[index];
  if (!note) {
    body.innerHTML = '<div class="notes-empty">No notes for this slide.</div>';
    return;
  }

  const points = (note.points || []).map(p => `<li>${p}</li>`).join('');
  const say = note.say ? `<div class="notes-say">${note.say}</div>` : '';
  body.innerHTML = `
    <div class="notes-title">${escapeHtmlLect(note.title)}</div>
    <ul>${points}</ul>
    ${say}
  `;
}

// ── Survey ────────────────────────────────────────────────────────────
function sendSurvey() {
  const question = document.getElementById('surveyQuestion').value.trim();
  if (!question) { showToast('Enter a survey question.', 'warn'); return; }
  socket.emit('lecturer:sendsurvey', { question });
  document.getElementById('surveyQuestion').value = '';
  showToast('Survey sent to all students.', 'success');
}

// Send one of the ready-made prompts straight from the bank.
function sendBankSurvey(id) {
  const item = surveyBank.find(q => q.id === id);
  if (!item) return;
  socket.emit('lecturer:sendsurvey', { question: item.question });
  // Flag it green, same as the question bank.
  sentSurveyIds.add(id);
  saveSentSet(SENT_S_KEY, sentSurveyIds);
  const el = document.querySelector(`.survey-bank-item[data-sid="${id}"]`);
  if (el) el.classList.add('sent');
  showToast('Survey sent: ' + item.question, 'success');
}

socket.on('lecturer:surveybank:list', ({ questions }) => {
  surveyBank = questions || [];
  const container = document.getElementById('surveyBankList');
  if (!container) return;
  if (!surveyBank.length) {
    container.innerHTML = '<div class="loading-text">No saved prompts.</div>';
    return;
  }
  container.innerHTML = surveyBank.map(q => `
    <div class="survey-bank-item${sentSurveyIds.has(q.id) ? ' sent' : ''}" data-sid="${q.id}">
      <button class="bank-send-btn" onclick="sendBankSurvey(${q.id})">▶</button>
      <span class="survey-bank-q">${escapeHtmlLect(q.question)}</span>
    </div>
  `).join('');
});

function escapeHtmlLect(str) {
  return String(str).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

// ── Sidebar Updates ──────────────────────────────────────────────────
let studentDataCache = null;

// Several sidebar refreshes can land together (login, then the login broadcast);
// coalesce them so we don't rebuild the same payload twice.
const requestDashboard = RateLimit.createDebouncedEmitter(socket, 'dashboard:request', 300);

function loadDashboardData() {
  requestDashboard();
}

function updateSidebar(data) {
  studentDataCache = data;
  
  // Student count (active / total)
  document.getElementById('studentCount').textContent = data.activeStudents ?? data.students.length;
  const totalEl = document.getElementById('studentCountTotal');
  if (totalEl) totalEl.textContent = `/ ${data.totalStudents ?? data.students.length}`;

  // Student list
  const list = document.getElementById('studentList');
  list.innerHTML = data.students.map(s => {
    const group = data.groups.find(g => g.id === s.group_id);
    return `<li>${s.name} ${group ? `<span style="color:${group.color};font-size:0.75rem;">(${group.name})</span>` : ''}</li>`;
  }).join('');

  // Quick stats
  document.getElementById('statQuiz').textContent = data.responseCounts.quiz;
  document.getElementById('statSurvey').textContent = data.responseCounts.survey;
  document.getElementById('statFeedback').textContent = data.responseCounts.feedback;
  document.getElementById('statQuestions').textContent = data.responseCounts.question;
  document.getElementById('statPoints').textContent = data.totalPoints;
}

function addQuestion(student, text) {
  const feed = document.getElementById('questionFeed');
  const key = questionKey(student, text);
  const item = document.createElement('div');
  item.className = 'question-item';
  item.title = 'Click to mark as addressed';
  item.innerHTML = `<strong>${student}</strong>${text}`;
  // Re-apply addressed state saved from a previous session.
  if (addressedQuestions.has(key)) item.classList.add('addressed');
  // Click to toggle addressed (gray → green) so you can track what's handled.
  item.addEventListener('click', () => {
    const on = item.classList.toggle('addressed');
    if (on) addressedQuestions.add(key); else addressedQuestions.delete(key);
    saveSentSet(ADDRESSED_KEY, addressedQuestions);
  });
  feed.prepend(item);
  if (feed.children.length > 50) feed.removeChild(feed.lastChild);
}

function updateStudentList() {
  loadDashboardData();
}

// ── Init ──────────────────────────────────────────────────────────────
renderSlide(0);
