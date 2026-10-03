const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { rateLimit } = require('express-rate-limit');
const path = require('path');
const Database = require('better-sqlite3');

// ── Init Express & Socket.io ──────────────────────────────────────────
const app = express();
const server = http.createServer(app);
const io = new Server(server);

// ── Rate limiting: configuration & HTTP layer ─────────────────────────
// A lecture hall of ~300 phones is a lot of clients for one small server, and
// a single student mashing the +5 pts feedback button can saturate it. Two
// layers keep that from taking the lecture down:
//
//   1. express-rate-limit guards HTTP: state-changing requests, and new
//      Socket.io handshakes (connection storms), keyed by client IP.
//   2. A per-event budget for Socket.io messages (see SOCKET_EVENT_LIMITS),
//      which never pass through Express. Each event is checked per connection
//      (tab), per student (shared across their tabs once logged in) and per IP
//      (the backstop when the whole room shares one campus NAT address).
//
// Every limit is env-configurable; set RATE_LIMIT_ENABLED=0 to switch it off.
function envFlag(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === '') return fallback;
  return !['0', 'false', 'no', 'off'].includes(raw.trim().toLowerCase());
}

function envNumber(name, fallback, min = 0) {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === '') return fallback;
  const value = Number(raw);
  return Number.isFinite(value) && value >= min ? value : fallback;
}

const RATE_LIMIT_ENABLED = envFlag('RATE_LIMIT_ENABLED', true);

// Number of proxies in front of the app (1 = a single tunnel/reverse proxy such
// as cloudflared). Only affects IP-based limits; leave at 0 when the app is
// exposed directly.
const TRUST_PROXY_HOPS = envNumber('TRUST_PROXY', 0);
if (TRUST_PROXY_HOPS > 0) app.set('trust proxy', TRUST_PROXY_HOPS);

// Non-GET/HEAD requests only — see the `skip` option below.
const HTTP_LIMIT_WINDOW_MS = envNumber('RATE_LIMIT_HTTP_WINDOW_MS', 60_000, 1000);
const HTTP_LIMIT_MAX = envNumber('RATE_LIMIT_HTTP_MAX', 120, 1);
const HANDSHAKE_LIMIT_WINDOW_MS = envNumber('RATE_LIMIT_HANDSHAKE_WINDOW_MS', 60_000, 1000);
const HANDSHAKE_LIMIT_MAX = envNumber('RATE_LIMIT_HANDSHAKE_MAX', 900, 1);
// Per-IP budget for a single Socket.io event type, in the given window. This is
// the shared-network backstop: in a lecture hall effectively every client may
// share one NAT address (or one tunnel), so this must sit far above the room's
// real total. It only bites on a burst of *new connections* sending in parallel.
const IP_EVENT_WINDOW_MS = envNumber('RATE_LIMIT_IP_WINDOW_MS', 10_000, 1000);
const IP_EVENT_MAX = envNumber('RATE_LIMIT_IP_EVENTS_MAX', 6000, 0);
// One knob to scale every per-event socket budget for a bigger/smaller room.
const SOCKET_LIMIT_MULTIPLIER = envNumber('RATE_LIMIT_MULTIPLIER', 1, 0.1);
// Chronic offenders get dropped (auto-reconnect + auto-login brings them back).
const SOCKET_DISCONNECT_VIOLATIONS = envNumber('RATE_LIMIT_DISCONNECT_AFTER', 40, 1);
const SOCKET_DISCONNECT_WINDOW_MS = envNumber('RATE_LIMIT_DISCONNECT_WINDOW_MS', 60_000, 1000);
// How often an over-limit client is told to slow down (they still get dropped
// if they keep going — this just avoids flooding them with toasts).
const SOCKET_EVENT_NOTICE_MS = envNumber('RATE_LIMIT_NOTICE_MS', 3000, 0);
const RATE_LIMIT_LOG_MS = envNumber('RATE_LIMIT_LOG_INTERVAL_MS', 5000, 1000);

// Engine.io requests bypass Express, so req.ip is unset there. Mirror what
// Express would do: take the hop our own proxy appended and ignore anything the
// client put to the left of it. X-Forwarded-For is only honoured when the direct
// peer is an internal address (the tunnel/reverse-proxy container); the app is
// also published directly on :80, so a client could otherwise send a fresh
// X-Forwarded-For per request and never trip an IP limit.
function isInternalAddress(address) {
  if (!address) return false;
  const addr = address.replace(/^::ffff:/i, '');
  if (addr === '::1' || addr === '127.0.0.1' || addr.startsWith('127.')) return true;
  if (/^f[cd][0-9a-f]{2}:/i.test(addr)) return true;   // fc00::/7 unique-local
  if (/^fe[89ab][0-9a-f]:/i.test(addr)) return true;    // fe80::/10 link-local
  const v4 = addr.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!v4) return false;
  const [a, b] = [Number(v4[1]), Number(v4[2])];
  return a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
}

function resolveClientIp(req) {
  if (!req) return 'unknown';
  const peer = req.socket?.remoteAddress || req.ip || 'unknown';
  if (TRUST_PROXY_HOPS > 0 && isInternalAddress(peer)) {
    const chain = String(req.headers?.['x-forwarded-for'] || '')
      .split(',').map(s => s.trim()).filter(Boolean);
    const hop = chain[chain.length - TRUST_PROXY_HOPS];
    if (hop) return hop;
  }
  return peer;
}

// Only a brand-new connection is a handshake; requests carrying a session id
// belong to a live client (long-polling) and must never be throttled.
function isEngineHandshake(req) {
  return !req._query || req._query.sid === undefined;
}

function sendRateLimited(req, res, scope) {
  const retryAfterSec = Math.ceil(Math.max(HTTP_LIMIT_WINDOW_MS, HANDSHAKE_LIMIT_WINDOW_MS) / 1000);
  console.warn(`[rate-limit] HTTP ${scope} limit hit by ${resolveClientIp(req)} (${req.method} ${req.url})`);
  const body = { error: 'Too many requests', scope };
  if (typeof res.status === 'function') {
    res.status(429).json(body);
    return;
  }
  // Engine.io upgrade path: the response is a thin shim, so write raw.
  res.writeHead(429, { 'Content-Type': 'application/json', 'Retry-After': String(retryAfterSec) });
  res.end(JSON.stringify(body));
}

const httpLimiter = rateLimit({
  windowMs: HTTP_LIMIT_WINDOW_MS,
  limit: HTTP_LIMIT_MAX,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  // Key by the same self-resolved address so the HTTP and handshake budgets
  // agree on who a client is.
  keyGenerator: (req) => resolveClientIp(req),
  // Static asset GETs are cheap and idempotent, and a full hall opening the page
  // at once is thousands of them in a burst. Only state-changing methods (and
  // unknown routes) are budgeted.
  skip: (req) => !RATE_LIMIT_ENABLED || req.method === 'GET' || req.method === 'HEAD',
  handler: (req, res) => sendRateLimited(req, res, 'http'),
});

const handshakeLimiter = rateLimit({
  windowMs: HANDSHAKE_LIMIT_WINDOW_MS,
  limit: HANDSHAKE_LIMIT_MAX,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  // Engine.io requests bypass Express, including trust proxy, so key them by the
  // same self-resolved address the socket layer uses.
  keyGenerator: (req) => resolveClientIp(req),
  handler: (req, res) => sendRateLimited(req, res, 'handshake'),
});

if (RATE_LIMIT_ENABLED) {
  // io.engine.use() because engine.io intercepts /socket.io before Express sees
  // it, so app.use('/socket.io', ...) would never run.
  io.engine.use((req, res, next) => {
    if (!isEngineHandshake(req)) return next();
    req.ip = resolveClientIp(req);
    handshakeLimiter(req, res, next);
  });
}

app.use(httpLimiter);

app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders: (res, filePath) => {
    // Don't cache JS/HTML so updates (and the matching helper scripts) take
    // effect immediately on student phones.
    if (filePath.endsWith('.js') || filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
  }
}));
app.use(express.json());

// Redirect root to landing
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'landing.html')));

// ── SQLite Setup ──────────────────────────────────────────────────────
const DB_PATH = process.env.DB_PATH || 'lecture.db';
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS students (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT    NOT NULL,
    group_id    INTEGER DEFAULT 0,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS responses (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id  INTEGER NOT NULL,
    student_name TEXT   NOT NULL DEFAULT '',
    type        TEXT    NOT NULL,   -- 'quiz', 'survey', 'feedback', 'question'
    question_id TEXT    NOT NULL DEFAULT '',
    answer      TEXT    NOT NULL,
    points      INTEGER DEFAULT 1,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id)
  );

  CREATE TABLE IF NOT EXISTS groups (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT    NOT NULL,
    color       TEXT    NOT NULL DEFAULT '#4f46e5'
  );

  CREATE TABLE IF NOT EXISTS quiz_questions (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    slide_id    TEXT    NOT NULL DEFAULT '',
    question    TEXT    NOT NULL,
    options     TEXT    NOT NULL,  -- JSON array
    correct     INTEGER NOT NULL DEFAULT 0,
    points      INTEGER NOT NULL DEFAULT 10,
    active      INTEGER DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS settings (
    key         TEXT PRIMARY KEY,
    value       TEXT
  );

  CREATE TABLE IF NOT EXISTS question_bank (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    slide_id    INTEGER NOT NULL DEFAULT 0,
    question    TEXT    NOT NULL,
    options     TEXT    NOT NULL,  -- JSON array of 4 options
    correct     INTEGER NOT NULL DEFAULT 0,
    points      INTEGER NOT NULL DEFAULT 10,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Reusable pool of opinion/poll prompts the lecturer can fire off.
  CREATE TABLE IF NOT EXISTS survey_bank (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    question    TEXT    NOT NULL,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- One row per survey actually sent. Keeping the prompt text here is what
  -- lets the dashboard show *what* was asked alongside the answers; responses
  -- only ever stored a slide id before, so the question was lost.
  CREATE TABLE IF NOT EXISTS surveys (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    question    TEXT    NOT NULL,
    options     TEXT    NOT NULL,  -- JSON array, preserves display order
    sent_at     DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Seed default groups if empty
const groupCount = db.prepare('SELECT COUNT(*) as cnt FROM groups').get();
if (groupCount.cnt === 0) {
  const insertGroup = db.prepare('INSERT INTO groups (name, color) VALUES (?, ?)');
  const groups = [
    ['Team Mean (μ)', '#ef4444'],
    ['Team Median', '#f59e0b'],
    ['Team Mode', '#10b981'],
    ['Team Std Dev (σ)', '#3b82f6'],
    ['Team Variance (σ²)', '#8b5cf6'],
    ['Team Percentile', '#ec4899'],
    ['Team Quartile', '#14b8a6'],
    ['Team Correlation', '#f97316'],
  ];
  const insertMany = db.transaction((gs) => { for (const g of gs) insertGroup.run(...g); });
  insertMany(groups);
}

// Seed default admin password from env var (for deployment) or skip locally
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
if (ADMIN_PASSWORD) {
  db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('admin_password', ADMIN_PASSWORD);
}

/* Seed question bank.
   Questions are grouped onto the three CHECKPOINT slides (8, 13, 17) so the
   lecturer can run one quiz round per Part. Bump QB_VERSION whenever the
   default set changes — seeded rows are replaced, lecturer-added ones survive
   only if you clear the flag manually. */
const QB_VERSION = '11';
const qbCount = db.prepare('SELECT COUNT(*) as cnt FROM question_bank').get();
const qbVersion = db.prepare('SELECT value FROM settings WHERE key = ?').get('qb_version');
if (qbCount.cnt === 0 || qbVersion?.value !== QB_VERSION) {
  db.exec('DELETE FROM question_bank');
  const insertQB = db.prepare('INSERT INTO question_bank (slide_id, question, options, correct, points) VALUES (?, ?, ?, ?, ?)');
  const questions = [
    // ── Slide 0: Welcome (warm-up) ────────────────────────────────────
    [0, 'What is the main topic of this lecture?', JSON.stringify(['Descriptive Statistics in Practice', 'Drilling Techniques', 'Reservoir Geology', 'Well Logging']), 0, 10],
    [0, 'What role does AI play in this lecture?', JSON.stringify(['Autopilot replacing engineers', 'Copilot to assist learning', 'Main subject of the lecture', 'Not mentioned']), 1, 10],
    // ── Slide 1: Agenda ───────────────────────────────────────────────
    [1, 'Which part covers Mean, Median, Mode?', JSON.stringify(['Part 1: Stats Review', 'Part 2: Industry Insights', 'Part 3: Responsible AI', 'Part 4: Open Q&A']), 0, 10],
    [1, 'Which part discusses AI bias and ethics?', JSON.stringify(['Part 1', 'Part 2', 'Part 3', 'Part 4']), 2, 10],
    [1, 'When do the quiz rounds happen?', JSON.stringify(['Only at the very end', 'After each of Parts 1, 2 and 3', 'Before the lecture starts', 'There are no quizzes']), 1, 10],

    // ═══ CHECKPOINT 1 (slide 8) — Part 1: Descriptive Statistics ══════
    [8, 'Which measure of central tendency is most robust to outliers?', JSON.stringify(['Mean', 'Median', 'Mode', 'Range']), 1, 10],
    [8, 'In petrophysics, why is median permeability preferred over mean?', JSON.stringify(['It is easier to calculate', 'Permeability distributions are log-normal', 'Mean is always inaccurate', 'Median is always larger']), 1, 10],
    [8, 'What does the mode represent?', JSON.stringify(['The average of all values', 'The middle value', 'The most frequent value', 'The spread of data']), 2, 10],
    [8, 'What is the formula for variance?', JSON.stringify(['σ = √(Σ(x-μ)²/n)', 'σ² = Σ(x-μ)²/n', 'σ = Σ|x-μ|/n', 'σ² = Σ(x-μ)/n']), 1, 10],
    [8, 'What percentage of data lies within ±1σ in a normal distribution?', JSON.stringify(['95%', '99.7%', '68%', '50%']), 2, 10],
    [8, 'A high CV (Coefficient of Variation) in porosity indicates:', JSON.stringify(['Homogeneous formation', 'Heterogeneous formation', 'No porosity', 'Perfect reservoir']), 1, 10],
    [8, 'Which distribution is most common for permeability?', JSON.stringify(['Normal', 'Log-Normal', 'Exponential', 'Binomial']), 1, 10],
    [8, 'P10, P50, P90 are examples of:', JSON.stringify(['Means', 'Variances', 'Percentiles', 'Modes']), 2, 10],
    [8, 'The Central Limit Theorem applies to which distribution?', JSON.stringify(['Log-Normal', 'Exponential', 'Normal', 'Binomial']), 2, 10],
    [8, 'What does Pearson\'s r = 0.85 indicate?', JSON.stringify(['Weak correlation', 'No correlation', 'Strong positive correlation', 'Perfect negative correlation']), 2, 10],
    [8, 'What is the range of Pearson\'s correlation coefficient?', JSON.stringify(['0 to 1', '-1 to 1', '-∞ to ∞', '0 to 100']), 1, 10],
    [8, 'In petroleum engineering, what is a common use of correlation?', JSON.stringify(['Porosity vs Permeability', 'Depth vs Temperature', 'Pressure vs Volume', 'All of the above']), 3, 10],

    // ═══ CHECKPOINT 2 (slide 13) — Part 2: Industry Insights ═════════
    [13, 'What tool measures spatial correlation in geostatistics?', JSON.stringify(['Histogram', 'Variogram', 'Box plot', 'Scatter plot']), 1, 10],
    [13, 'Monte Carlo simulation in reservoir engineering involves:', JSON.stringify(['One deterministic calculation', '1000s of realizations for uncertainty', 'Only mean values', 'Ignoring heterogeneity']), 1, 10],
    [13, 'Kriging is a method used in:', JSON.stringify(['Drilling', 'Geostatistics', 'Well testing', 'Production logging']), 1, 10],
    [13, 'P90 means there is a ___ probability of exceeding the estimate.', JSON.stringify(['10%', '50%', '90%', '100%']), 2, 10],
    [13, 'Which is the conservative estimate in P10/P50/P90?', JSON.stringify(['P10', 'P50', 'P90', 'All are equal']), 2, 10],
    [13, 'P10, P50, P90 are based on which statistical concept?', JSON.stringify(['Mean', 'Variance', 'Percentiles', 'Standard deviation']), 2, 10],
    [13, 'In Monte Carlo simulation, why do we run thousands of iterations?', JSON.stringify(['To slow the computer down', 'To build a distribution of possible outcomes', 'To get one exact answer', 'To avoid using statistics']), 1, 10],
    [13, 'In the HIIP equation, increasing water saturation (Sw) will:', JSON.stringify(['Increase HIIP', 'Decrease HIIP', 'Not affect HIIP', 'Double HIIP']), 1, 10],
    [13, 'With only 10 Monte Carlo runs, the P10/P50/P90 values are:', JSON.stringify(['Perfectly reliable', 'Unstable — they change each run', 'Always identical', 'Impossible to compute']), 1, 10],
    [13, 'In control charts, what is the Upper Control Limit (UCL)?', JSON.stringify(['μ', 'μ + σ', 'μ + 3σ', 'μ - 3σ']), 2, 10],
    [13, 'What does an outlier in drilling data potentially signal?', JSON.stringify(['Normal operation', 'Bit dysfunction or kick', 'Better performance', 'Nothing important']), 1, 10],
    [13, 'Control charts are used to monitor:', JSON.stringify(['Only mean values', 'Real-time drilling parameters', 'Final well cost', 'Team performance']), 1, 10],

    // ═══ CHECKPOINT 3 (slide 17) — Part 3: Responsible AI ════════════
    [17, 'Machine Learning is best described as:', JSON.stringify(['Magic', 'Applied statistics at scale', 'Replacing engineers', 'Database management']), 1, 10],
    [17, 'Linear regression in stats is equivalent to what in ML?', JSON.stringify(['Classification', 'Neural Networks', 'Clustering', 'Dimensionality reduction']), 1, 10],
    [17, 'Bayes\' Theorem in stats relates to which ML method?', JSON.stringify(['Neural Networks', 'Naive Bayes', 'K-Means', 'PCA']), 1, 10],
    [17, 'AI in seismic interpretation can be ___ faster than manual.', JSON.stringify(['2×', '5×', '10×', '100×']), 2, 10],
    [17, 'AI cannot replace which critical skill in petroleum engineering?', JSON.stringify(['Data entry', 'Domain expertise', 'Typing speed', 'File management']), 1, 10],
    [17, 'Predictive maintenance in drilling uses AI to:', JSON.stringify(['Drill faster', 'Predict equipment failure', 'Replace engineers', 'Reduce costs only']), 1, 10],
    [17, 'In the Copilot model, who makes the final decision?', JSON.stringify(['AI', 'The human engineer', 'The computer', 'The manager']), 1, 10],
    [17, 'What is the danger of Autopilot mode?', JSON.stringify(['Faster results', 'Loss of critical thinking', 'Better accuracy', 'Lower cost']), 1, 10],
    [17, 'The key rule for using AI is:', JSON.stringify(['Always trust AI', 'If you can\'t verify it, don\'t use it', 'Never question AI', 'Use AI for everything']), 1, 10],
    [17, 'What is AI hallucination?', JSON.stringify(['AI dreaming', 'AI confidently making up facts', 'AI sleeping', 'AI learning']), 1, 10],
    [17, 'AI bias comes primarily from:', JSON.stringify(['The algorithm itself', 'Training data', 'Computer hardware', 'Internet speed']), 1, 10],
    [17, 'Why is the Black Box problem critical in engineering?', JSON.stringify(['It looks cool', 'Engineers must explain decisions', 'It is faster', 'It costs less']), 1, 10],
    [17, 'What does Responsible AI mean?', JSON.stringify(['Letting AI make all decisions', 'Building AI that is fair, transparent, and safe', 'Making AI faster', 'Removing humans from the process']), 1, 10],
    [17, 'Why is Responsible AI important in engineering?', JSON.stringify(['It looks good on a resume', 'Bad AI decisions can cost millions or endanger lives', 'Engineers don\'t need it', 'AI is never wrong']), 1, 10],
    [17, 'Which is a key practice of Responsible AI?', JSON.stringify(['Trust AI outputs blindly', 'Verify AI outputs against trusted sources', 'Never use AI', 'Let AI work alone']), 1, 10],
    [17, 'Which is a good prompting practice?', JSON.stringify(['Ask for direct answers', 'Provide context', 'Copy-paste blindly', 'Avoid thinking']), 1, 10],
    [17, 'What should you NOT do when using AI?', JSON.stringify(['Challenge the answer', 'Request explanations', 'Share personal data', 'Ask for step-by-step']), 2, 10],
    [17, 'A good prompt should include:', JSON.stringify(['Only the question', 'Context and specific data', 'No details', 'Random keywords']), 1, 10],

    // ═══ FINAL QUIZ (slide 20) — Part 4: one last round before Q&A ═══
    // Consolidated from the old per-slide bonus questions (Statistical
    // Thinking, Career Pathways, Key Takeaways) so the lecturer runs a single
    // wrap-up quiz on the Part 4 slide before opening the floor.
    [21, 'Statistical thinking gives you an edge in:', JSON.stringify(['Only academics', 'Industry and data literacy', 'Just exams', 'Only research']), 1, 10],
    [21, 'Which skill is NOT replaceable by AI?', JSON.stringify(['Data entry', 'Hypothesis testing', 'Typing', 'File sorting']), 1, 10],
    [21, 'Petroleum engineering offers among the highest:', JSON.stringify(['Stress levels', 'Starting salaries', 'Vacation days', 'Homework']), 1, 10],
    [21, 'Stats knowledge is valuable in which career?', JSON.stringify(['Only petroleum', 'Data science and finance too', 'Only teaching', 'No career needs it']), 1, 10],
    [21, 'What sector uses analytics for carbon capture?', JSON.stringify(['Finance', 'Sustainability', 'Retail', 'Entertainment']), 1, 10],
    [21, 'What is the first key takeaway?', JSON.stringify(['AI is always right', 'Stats is everywhere in engineering', 'You don\'t need math', 'Ignore uncertainty']), 1, 10],
    [21, 'AI should be used as:', JSON.stringify(['A replacement', 'A copilot', 'A manager', 'A teacher']), 1, 10],
    [21, 'Who is responsible for the work you submit?', JSON.stringify(['AI', 'Your lecturer', 'You', 'Your team']), 2, 10],
  ];
  const insertManyQB = db.transaction((qs) => { for (const q of qs) insertQB.run(...q); });
  insertManyQB(questions);
  db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('qb_version', QB_VERSION);
}

/* Seed the survey bank. These are agree/disagree statements (the student UI
   offers a 5-point Strongly Disagree → Strongly Agree scale), written so the
   answers are genuinely informative rather than obvious. Bump SB_VERSION to
   replace the defaults. */
const SB_VERSION = '2';
const sbCount = db.prepare('SELECT COUNT(*) as cnt FROM survey_bank').get();
const sbVersion = db.prepare('SELECT value FROM settings WHERE key = ?').get('sb_version');
if (sbCount.cnt === 0 || sbVersion?.value !== SB_VERSION) {
  db.exec('DELETE FROM survey_bank');
  const insertSB = db.prepare('INSERT INTO survey_bank (question) VALUES (?)');
  const surveys = [
    // Statistics — enjoyment, then whether they see it as a real tool
    'I enjoy studying statistics.',
    'Statistics feels more like exam material than a real engineering tool.',
    // AI — habit, then blind trust
    'I use AI tools like ChatGPT for my coursework.',
    'I trust AI answers without checking them elsewhere.',
    // Their future with stats
    'I feel confident about starting a career that combines engineering and data.',
  ];
  const insertManySB = db.transaction((qs) => { for (const q of qs) insertSB.run(q); });
  insertManySB(surveys);
  db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('sb_version', SB_VERSION);
}

// ── In-memory state ───────────────────────────────────────────────────
let currentSlide = 0;          // which slide the lecturer is on
let currentSlideContent = null; // the HTML content of the current slide
let currentSlideTitle = null;   // the title of the current slide
let sessionActive = false;
const SLIDE_COUNT = 22; // total slides available (0..21, incl. closing "Thank You!")
let dashboardDebounceTimer = null; // debounce timer for dashboard broadcasts

// ── Button-spam filter ────────────────────────────────────────────────
// The lecture awards points per action, so a bored student can hold down
// "Send (+5 pts)" and the shared team bonus hands the whole room a windfall.
// These two guards are independent: `activityCooldown` is a per-action gap, and
// `dailyCap` bounds a single student's actions within the whole session.
const ACTIVITY_COOLDOWN_MS = envNumber('ACTIVITY_COOLDOWN_MS', 10_000, 0);
const FEEDBACK_CAP = envNumber('FEEDBACK_CAP', 8, 1);
const QUESTION_CAP = envNumber('QUESTION_CAP', 5, 1);

// event name -> studentId -> last accepted timestamp
const activityCooldown = new Map();
// `capKey(studentId, event)` -> accepted count this session
const activityCounts = new Map();
const capKey = (studentId, event) => `${event}:${studentId}`;

// Mirrors the client-side guard so the server stays the source of truth.
// Returns an error message to reject with, or null to accept.
function checkActivityQuota(studentId, event, action) {
  const cooldownKey = `${event}:${studentId}`;
  const now = Date.now();
  const last = activityCooldown.get(cooldownKey) || 0;
  const cap = event === 'student:feedback' ? FEEDBACK_CAP : QUESTION_CAP;

  if (ACTIVITY_COOLDOWN_MS > 0 && now - last < ACTIVITY_COOLDOWN_MS) {
    const wait = Math.ceil((ACTIVITY_COOLDOWN_MS - (now - last)) / 1000);
    return `Please wait ${wait}s before sending ${action} again.`;
  }

  const count = activityCounts.get(capKey(studentId, event)) || 0;
  if (count >= cap) {
    return `You've reached the limit of ${cap} ${action}s for this session — thanks!`;
  }

  activityCooldown.set(cooldownKey, now);
  activityCounts.set(capKey(studentId, event), count + 1);
  return null;
}

// ── Socket event rate limiting ────────────────────────────────────────
// Socket.io messages never reach Express, so they get their own budget here.
// Each event is checked at three scopes so no single limiter can be defeated:
//   socket  — one browser tab; another tab starts the budget over (cheap and
//             harmless, since a spammer must then work three times as hard)
//   student — shared by every tab of a logged-in student, so opening tabs is not
//             a way to earn points faster
//   ip      — one shared backstop for the whole network (see IP_EVENT_*): stops
//             a burst of scripted connections from one machine. It is deliberately
//             far above what a real lecture room generates, and all clients of a
//             hall behind one NAT/tunnel share it, so it must never be tight.
//
// These are *flood* guards, not the point rules: `points`/`windowMs` is the token
// cost per send, and the per-scope numbers are set well above normal use so the
// point-earning rules below stay the binding constraint for a bored student.
// Tightening these would make the server silently swallow sends that the quota
// would otherwise answer with a friendly "you've hit the limit" message.
const SOCKET_EVENT_LIMITS = {
  'student:feedback': { points: 1, windowMs: 10_000, perSocket: 30, perStudent: 30 },
  'student:question': { points: 1, windowMs: 10_000, perSocket: 20, perStudent: 20 },
  'student:quiz': { points: 1, windowMs: 5000, perSocket: 20, perStudent: 20 },
  'student:survey': { points: 1, windowMs: 5000, perSocket: 20, perStudent: 20 },
  // Read-only polls — generous, but still bounded so a reconnect loop can't
  // turn into a request storm that rebuilds the whole dashboard payload.
  'student:requestSlide': { points: 1, windowMs: 5000, perSocket: 15, perStudent: 15 },
  // Dashboards/presenter poll continuously by design (every 5s + on each update).
  'dashboard:request': { points: 1, windowMs: 10_000, perSocket: 60, perStudent: 60 },
  // Controllers sit behind the admin password; only a runaway retry loop matters.
  'lecturer:slide': { points: 1, windowMs: 10_000, perSocket: 60, perStudent: 0 },
  'lecturer:sendquiz': { points: 1, windowMs: 10_000, perSocket: 20, perStudent: 0 },
  'lecturer:sendsurvey': { points: 1, windowMs: 10_000, perSocket: 20, perStudent: 0 },
  'lecturer:start': { points: 1, windowMs: 10_000, perSocket: 20, perStudent: 0 },
  'lecturer:stop': { points: 1, windowMs: 10_000, perSocket: 20, perStudent: 0 },
};

const socketLimitBuckets = new Map(); // scopeKey -> { count, windowStart }
const socketViolationBuckets = new Map(); // socket.id -> { count, windowStart }
const rateLimitNoticeAt = new Map(); // socket.id -> timestamp of last "slow down" toast

// Three independent scopes, so no single limiter can be evaded:
//   socket  — one browser tab
//   student — all tabs of a logged-in student (opening tabs must not earn more)
//   ip      — shared-network backstop for connection churn
function checkEventBudget(socket, event, rule) {
  const windowMs = rule.windowMs;
  const multiplier = SOCKET_LIMIT_MULTIPLIER;
  const cost = Math.max(1, Math.round(rule.points * multiplier));

  const socketLimit = Math.max(1, Math.round((rule.perSocket || 20) * multiplier));
  if (!spendBudget(`socket:${socket.id}:${event}`, cost, windowMs, socketLimit)) return false;

  const studentId = socket.student?.id;
  if (studentId && rule.perStudent > 0) {
    const limit = Math.max(1, Math.round(rule.perStudent * multiplier));
    if (!spendBudget(`student:${studentId}:${event}`, cost, windowMs, limit)) return false;
  }

  // Shared per-network backstop. Normally much larger than everyone combined;
  // it only bites when a burst of *new connections* is sending in parallel,
  // which is exactly what a scripted flood looks like.
  if (IP_EVENT_MAX > 0) {
    const limit = Math.max(1, Math.round(IP_EVENT_MAX * multiplier));
    if (!spendBudget(`ip:${resolveClientIp(socket.request)}:${event}`, cost, IP_EVENT_WINDOW_MS, limit)) {
      return false;
    }
  }

  return true;
}

// Sliding-ish (fixed-window) token bucket. Returns true when the action fits.
function spendBudget(key, points, windowMs, limit) {
  if (limit <= 0) return true;
  const now = Date.now();
  let bucket = socketLimitBuckets.get(key);
  if (!bucket || now - bucket.windowStart >= windowMs) {
    bucket = { count: 0, windowStart: now };
    socketLimitBuckets.set(key, bucket);
  }
  if (bucket.count + points > limit) return false;
  bucket.count += points;
  return true;
}

// Batches the bursts so the log stays readable during a spam wave.
let rateLimitLogState = { dropped: 0, lastLog: Date.now() };
function logRateLimitDrop(socket, event) {
  rateLimitLogState.dropped++;
  const now = Date.now();
  if (now - rateLimitLogState.lastLog < RATE_LIMIT_LOG_MS) return;
  const role = socket.student
    ? `student ${socket.student.name}`
    : (socket.lecturer ? 'lecturer' : 'anonymous');
  console.warn(
    `[rate-limit] dropped ${rateLimitLogState.dropped} socket event(s) in the last ` +
    `${Math.round((now - rateLimitLogState.lastLog) / 1000)}s ` +
    `(latest: ${event} from ${role} @ ${resolveClientIp(socket.request)})`
  );
  rateLimitLogState = { dropped: 0, lastLog: now };
}

// Over budget: warn the client, and disconnect repeat offenders so a scripted
// flood costs the server nothing. The client auto-reconnects (and auto-logs-in),
// so this is recoverable. Marked on the socket so a flood of already-buffered
// packets can't call disconnect() over and over.
function flagSocketAbuse(socket, event) {
  const now = Date.now();
  let violations = socketViolationBuckets.get(socket.id);
  if (!violations || now - violations.windowStart >= SOCKET_DISCONNECT_WINDOW_MS) {
    violations = { count: 0, windowStart: now };
    socketViolationBuckets.set(socket.id, violations);
  }
  violations.count++;

  const lastNotice = rateLimitNoticeAt.get(socket.id) || 0;
  if (now - lastNotice > SOCKET_EVENT_NOTICE_MS) {
    rateLimitNoticeAt.set(socket.id, now);
    socket.emit('rate:limited', {
      message: 'Slow down a moment — too many requests.',
      event,
    });
  }

  if (violations.count < SOCKET_DISCONNECT_VIOLATIONS || socket.rateLimitedOff) return;
  socket.rateLimitedOff = true; // one disconnect per connection
  console.warn(`[rate-limit] disconnecting abusive socket ${socket.id} (${event})`);
  socketViolationBuckets.delete(socket.id);
  rateLimitNoticeAt.delete(socket.id);
  socket.disconnect(true);
}

// ── Active student tracking ───────────────────────────────────────────
// A student counts as active while they hold a live socket and haven't been
// dropped for missing a quiz. Closing the browser or logging out removes them
// immediately; missing a quiz marks them inactive until they take part again.
const QUIZ_RESPONSE_MS = 60 * 1000; // answer window before a non-responder is dropped
const activeStudents = new Map();   // studentId -> { name, sockets:Set, active:bool }

function markStudentActive(student) {
  let entry = activeStudents.get(student.id);
  if (!entry) {
    entry = { name: student.name, sockets: new Set(), active: true };
    activeStudents.set(student.id, entry);
  }
  entry.active = true;
  return entry;
}

// Ids of students currently counted (live socket + not dropped for a missed quiz).
function activeStudentIds() {
  const ids = new Set();
  for (const [id, entry] of activeStudents) {
    if (entry.active) ids.add(id);
  }
  return ids;
}

// The roster the dashboard/leaderboard should see — active students only.
function activeRoster() {
  const ids = activeStudentIds();
  return db.prepare('SELECT * FROM students ORDER BY name').all()
    .filter(s => ids.has(s.id));
}

// Watch a quiz: anyone who was present when it was sent and doesn't answer
// within the window is treated as disengaged and drops off the roster.
// Students who join *after* the quiz was sent aren't penalised.
let quizWatch = null;
function startQuizWatch() {
  if (quizWatch) clearTimeout(quizWatch.timer);
  const answered = new Set();
  const participants = activeStudentIds(); // snapshot at send time
  const timer = setTimeout(() => {
    let changed = false;
    for (const id of participants) {
      const entry = activeStudents.get(id);
      if (entry && entry.active && !answered.has(id)) { entry.active = false; changed = true; }
    }
    quizWatch = null;
    if (changed) broadcastDashboard();
  }, QUIZ_RESPONSE_MS);
  quizWatch = { answered, timer };
}

// Default 5-point agree scale used by surveys (order matters — index drives the mean).
const SURVEY_SCALE = ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree'];

// ── Word cloud aggregation ────────────────────────────────────────────
const RATING_WORDS = { 5: 'Excellent', 4: 'Great', 3: 'Okay', 2: 'Poor', 1: 'Bad' };
const STOPWORDS = new Set([
  'the','a','an','and','or','but','is','are','was','were','be','been','to','of',
  'in','on','at','for','it','this','that','with','as','i','im','so','very','really',
  'too','my','me','we','you','your','its','was','has','have','had','will','can',
]);

function buildWordCloud() {
  const rows = db.prepare("SELECT answer FROM responses WHERE type = 'feedback'").all();
  const counts = new Map();
  const bump = (word, by = 1) => {
    if (!word) return;
    counts.set(word, (counts.get(word) || 0) + by);
  };

  for (const row of rows) {
    let text = '';
    let rating = 0;
    try {
      const parsed = JSON.parse(row.answer);
      text = parsed.text || '';
      rating = parseInt(parsed.rating) || 0;
    } catch (e) {
      text = row.answer || '';
    }
    // Words from the feedback text
    const words = String(text)
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length >= 3 && !STOPWORDS.has(w));
    for (const w of words) bump(w);
    // Rating converted to a sentiment word (weighted so it stands out a bit)
    if (RATING_WORDS[rating]) bump(RATING_WORDS[rating], 2);
  }

  return [...counts.entries()]
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 40);
}

/* ── Survey results aggregation ─────────────────────────────────────────
   Joins each sent survey to its responses so the dashboard can show the
   question, the tally per option, and a mean score on the agree scale. */
function buildSurveyResults() {
  const surveys = db.prepare('SELECT * FROM surveys ORDER BY id DESC').all();
  if (!surveys.length) return [];

  const rows = db.prepare(
    "SELECT question_id, answer, COUNT(*) as cnt FROM responses WHERE type = 'survey' GROUP BY question_id, answer"
  ).all();

  // question_id → Map(answer → count)
  const tally = new Map();
  for (const r of rows) {
    if (!tally.has(r.question_id)) tally.set(r.question_id, new Map());
    tally.get(r.question_id).set(r.answer, r.cnt);
  }

  return surveys.map(s => {
    let options;
    try { options = JSON.parse(s.options); } catch (e) { options = SURVEY_SCALE; }
    const counts = tally.get(`survey_${s.id}`) || new Map();

    const results = options.map(opt => ({ option: opt, count: counts.get(opt) || 0 }));
    const total = results.reduce((acc, r) => acc + r.count, 0);

    // Mean on a 1..n scale (only meaningful for ordered scales like ours).
    let mean = null;
    if (total > 0) {
      const sum = results.reduce((acc, r, i) => acc + r.count * (i + 1), 0);
      mean = Math.round((sum / total) * 100) / 100;
    }

    return {
      id: s.id,
      question: s.question,
      sent_at: s.sent_at,
      options,
      results,
      total,
      mean,
    };
  });
}

/* ── Scoring: individual + team bonus ───────────────────────────────────
   A student's displayed score is their own earned points PLUS a bonus derived
   from how their whole team is doing. This makes it worth finding your
   teammates and rallying them instead of grinding solo.

   bonus = round(team average points × TEAM_BONUS_RATE)

   We use the team AVERAGE (over everyone who joined that team, not just those
   who scored) rather than the team TOTAL, for two reasons:
     1. Total would just reward being in the biggest team — not fair, and not
        something students can influence.
     2. Average means an idle teammate drags the figure down, so the whole team
        has a reason to get everyone participating.
   It's also a mean, which ties straight back to the lecture content. */
const TEAM_BONUS_RATE = 0.5;

function computeScores() {
  const groups = db.prepare('SELECT * FROM groups').all();
  const activeIds = activeStudentIds();

  /* Points each student earned themselves. LEFT JOIN from students (not an
     inner join on responses) so members who haven't scored yet are still
     included — they still receive their team's bonus, which is exactly the
     nudge that gets teammates to rally them. Only *active* students count, so
     closed browsers / logged-out / disengaged students don't skew the teams. */
  const earnedRows = db.prepare(`
    SELECT s.id as student_id, s.name, s.group_id, COALESCE(SUM(r.points), 0) as earned
    FROM students s
    LEFT JOIN responses r ON r.student_id = s.id
    GROUP BY s.id
  `).all().filter(r => activeIds.has(r.student_id));

  // Head count per team — includes members who haven't scored yet.
  const memberCount = new Map();
  for (const r of earnedRows) {
    memberCount.set(r.group_id, (memberCount.get(r.group_id) || 0) + 1);
  }

  // Team earned totals (sum of members' own points).
  const teamEarned = new Map();
  for (const r of earnedRows) {
    teamEarned.set(r.group_id, (teamEarned.get(r.group_id) || 0) + r.earned);
  }

  // Per-team average and the resulting per-member bonus.
  const teamBonus = new Map();
  const teamAverage = new Map();
  for (const g of groups) {
    const members = memberCount.get(g.id) || 0;
    const earned = teamEarned.get(g.id) || 0;
    const avg = members > 0 ? earned / members : 0;
    teamAverage.set(g.id, avg);
    teamBonus.set(g.id, Math.round(avg * TEAM_BONUS_RATE));
  }

  // Individual scores = own points + their team's bonus.
  const studentScores = earnedRows.map(r => {
    const bonus = teamBonus.get(r.group_id) || 0;
    return {
      student_id: r.student_id,
      name: r.name,
      group_id: r.group_id,
      earned: r.earned,
      teamBonus: bonus,
      // `total` stays the ranking figure so existing UI keeps working.
      total: r.earned + bonus,
    };
  }).sort((a, b) => b.total - a.total);

  const groupScores = groups.map(g => ({
    id: g.id,
    name: g.name,
    color: g.color,
    total: teamEarned.get(g.id) || 0,
    members: memberCount.get(g.id) || 0,
    average: Math.round((teamAverage.get(g.id) || 0) * 10) / 10,
    bonus: teamBonus.get(g.id) || 0,
  })).sort((a, b) => b.total - a.total);

  return { groups, studentScores, groupScores };
}

// ── Debounced dashboard broadcast ─────────────────────────────────────
function broadcastDashboard() {
  if (dashboardDebounceTimer) clearTimeout(dashboardDebounceTimer);
  dashboardDebounceTimer = setTimeout(() => {
    dashboardDebounceTimer = null;
    const students = activeRoster();
    const responses = db.prepare('SELECT * FROM responses ORDER BY created_at DESC').all();
    const { groups, studentScores, groupScores } = computeScores();

    const responseCounts = {
      quiz: db.prepare('SELECT COUNT(*) as cnt FROM responses WHERE type=?').get('quiz').cnt,
      survey: db.prepare('SELECT COUNT(*) as cnt FROM responses WHERE type=?').get('survey').cnt,
      feedback: db.prepare('SELECT COUNT(*) as cnt FROM responses WHERE type=?').get('feedback').cnt,
      question: db.prepare('SELECT COUNT(*) as cnt FROM responses WHERE type=?').get('question').cnt,
    };

    const totalPoints = db.prepare('SELECT COALESCE(SUM(points),0) as total FROM responses').get().total;

    const distribution = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    for (const s of studentScores) {
      const bucket = Math.min(9, Math.floor(s.total / 10));
      distribution[bucket]++;
    }

    const payload = {
      students, groups, responses: responses.slice(0, 50),
      studentScores, groupScores, responseCounts,
      totalPoints, distribution, currentSlide, sessionActive,
      activeStudents: students.length,
      totalStudents: db.prepare('SELECT COUNT(*) as cnt FROM students').get().cnt,
      teamBonusRate: TEAM_BONUS_RATE,
      wordCloud: buildWordCloud(),
      surveyResults: buildSurveyResults(),
    };

    // Full payload → dashboards + lecturer (everyone NOT in the students room).
    io.except('students').emit('dashboard:data', payload);
    // Slim payload → students. Only what the mini-leaderboard/score display needs.
    io.to('students').emit('dashboard:data',
      buildStudentPayload(groups, studentScores, groupScores, payload.wordCloud));
  }, 200); // 200ms debounce — batches all rapid changes into one broadcast
}

// ── Slim payload for students ─────────────────────────────────────────
// Students only render their own score/rank, team score/rank, and the top-10
// leaderboard — so they don't need the full students/responses/wordCloud data.
function buildStudentPayload(groups, studentScores, groupScores, wordCloud) {
  const payload = {
    groups,
    // Keep every scoring student so each one can still find their own rank;
    // this list is lightweight (id/name/group_id/total). We drop the heavy
    // fields: full roster, responses, responseCounts, distribution.
    studentScores,
    groupScores,
    teamBonusRate: TEAM_BONUS_RATE,
  };
  // Only ship the word cloud when the current slide actually displays one,
  // so we don't add weight to every broadcast for 300 phones.
  if (wordCloud && slideHasLiveWordCloud()) payload.wordCloud = wordCloud;
  return payload;
}

// True when the slide the lecturer is on embeds a [data-live-wordcloud] block.
function slideHasLiveWordCloud() {
  return typeof currentSlideContent === 'string' &&
    currentSlideContent.includes('data-live-wordcloud');
}

// ── Socket.io Events ──────────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log(`[connect] ${socket.id}`);

  // Run every inbound event through the per-event budget before the handler
  // sees it. Controllers (lecturer/present) are included so a stuck key or a
  // retry loop can't flood the room; admins emit far too little to ever notice.
  socket.use(([event, ...args], next) => {
    if (!RATE_LIMIT_ENABLED) return next();
    const rule = SOCKET_EVENT_LIMITS[event];
    if (!rule) return next();
    if (checkEventBudget(socket, event, rule)) return next();
    logRateLimitDrop(socket, event);
    flagSocketAbuse(socket, event);
    next(new Error('rate limited'));
  });

  // ── Student login ──────────────────────────────────────────────────
  socket.on('student:login', ({ name }) => {
    // Check for duplicate name — if exists, allow reconnection (refresh)
    let student = db.prepare('SELECT * FROM students WHERE name = ?').get(name);
    if (!student) {
      // New student — random team assignment (round-robin)
      const groups = db.prepare('SELECT id FROM groups ORDER BY id').all();
      const studentCount = db.prepare('SELECT COUNT(*) as cnt FROM students').get().cnt;
      const groupId = groups[studentCount % groups.length].id;
      const info = db.prepare('INSERT INTO students (name, group_id) VALUES (?, ?)').run(name, groupId);
      student = { id: info.lastInsertRowid, name, group_id: groupId };
    }
    // If student already exists, just re-associate the socket (refresh)
    socket.join('students');
    socket.join(`group:${student.group_id}`);
    socket.student = student;
    // Register this socket as an active participant (rejoining re-activates them).
    const entry = markStudentActive(student);
    entry.sockets.add(socket.id);
    socket.emit('student:loggedin', { student, currentSlide, slideContent: currentSlideContent, sessionActive });
    io.to('lecturer').emit('lecturer:update', { type: 'student_joined', student });
    broadcastDashboard();
  });

  // ── Student logout ─────────────────────────────────────────────────
  // Explicitly leaving the session drops them from the active roster.
  socket.on('student:logout', () => {
    if (!socket.student) return;
    const entry = activeStudents.get(socket.student.id);
    if (entry) {
      entry.sockets.delete(socket.id);
      if (entry.sockets.size === 0) activeStudents.delete(socket.student.id);
    }
    socket.leave('students');
    socket.student = null;
    broadcastDashboard();
  });

  // ── Student requests current slide ────────────────────────────────
  socket.on('student:requestSlide', () => {
    if (sessionActive && currentSlideContent) {
      socket.emit('slide:change', { slide: currentSlide, content: currentSlideContent });
    }
  });

  // ── Lecturer login ─────────────────────────────────────────────────
  socket.on('lecturer:login', ({ password } = {}) => {
    const stored = db.prepare('SELECT value FROM settings WHERE key = ?').get('admin_password');
    // If a password is set, it must match. If none is set (local dev), allow in.
    if (stored && password !== stored.value) {
      socket.emit('lecturer:auth:failed', { message: 'Incorrect password.' });
      return;
    }
    socket.join('lecturer');
    socket.lecturer = true;
    socket.emit('lecturer:authed');

    // Backfill questions submitted before this console connected/refreshed,
    // so the Q&A panel isn't empty mid-lecture. Oldest first so newest ends on top.
    const priorQuestions = db.prepare(
      "SELECT student_name, answer FROM responses WHERE type = 'question' ORDER BY created_at ASC"
    ).all();
    if (priorQuestions.length) {
      socket.emit('lecturer:questions:backfill',
        priorQuestions.map(q => ({ student: q.student_name, text: q.answer }))
      );
    }
  });

  // ── Presenter / Lecturer join the controllers room ─────────────────
  // Both the lecturer console and present mode are "controllers": they can
  // drive slides and must stay in sync with each other. Students only ever
  // receive slides — they never emit slide changes.
  socket.on('controller:join', () => {
    socket.join('controllers');
    socket.emit('state:current', {
      slide: currentSlide,
      title: currentSlideTitle,
      content: currentSlideContent,
      sessionActive,
    });
  });

  // ── Slide navigation ───────────────────────────────────────────────
  socket.on('lecturer:slide', ({ slide, title, content }) => {
    currentSlide = Math.max(0, Math.min(SLIDE_COUNT - 1, slide));
    currentSlideContent = content || null;
    currentSlideTitle = title || null;
    const payload = { slide: currentSlide, title: currentSlideTitle, content: currentSlideContent };
    // Sync every controller (sender included) so lecturer + present match.
    io.to('controllers').emit('slide:change', payload);
    socket.emit('slide:change', payload); // in case sender hasn't joined controllers yet
    // Broadcast to students only when the session is active.
    if (sessionActive) {
      io.to('students').emit('slide:change', payload);
    }
  });

  // ── Session control ────────────────────────────────────────────────
  socket.on('lecturer:start', () => {
    sessionActive = true;
    io.emit('session:status', { active: true });
    // Send current slide to all students now that session is active
    if (currentSlideContent) {
      io.to('students').emit('slide:change', { slide: currentSlide, title: currentSlideTitle, content: currentSlideContent });
    }
  });

  socket.on('lecturer:stop', () => {
    sessionActive = false;
    io.emit('session:status', { active: false });
  });

  socket.on('lecturer:reset', () => {
    db.exec('DELETE FROM responses');
    db.exec('DELETE FROM students');
    activeStudents.clear();
    // A reset wipes the roster and scores, so the anti-spam counters go too.
    activityCooldown.clear();
    activityCounts.clear();
    if (quizWatch) { clearTimeout(quizWatch.timer); quizWatch = null; }
    sessionActive = false;
    currentSlide = 0;
    currentSlideContent = null;
    currentSlideTitle = null;
    io.emit('session:reset');
  });

  // ── Quiz answer ────────────────────────────────────────────────────
  socket.on('student:quiz', ({ questionId, answer, points }) => {
    if (!socket.student) return;
    const { id: studentId, name: studentName, group_id } = socket.student;
    // Answering a quiz counts as engagement — re-activate if they were dropped.
    markStudentActive(socket.student);
    if (quizWatch) quizWatch.answered.add(studentId);
    db.prepare(
      'INSERT INTO responses (student_id, student_name, type, question_id, answer, points) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(studentId, studentName, 'quiz', questionId, String(answer), points);
    broadcastDashboard();
  });

  // ── Survey response ────────────────────────────────────────────────
  socket.on('student:survey', ({ surveyId, questionId, answer }) => {
    if (!socket.student) return;
    const { id: studentId, name: studentName } = socket.student;
    // Store the survey row id so the dashboard can join back to the wording.
    // Falls back to the old slide-based id for safety.
    const qid = surveyId ? `survey_${surveyId}` : String(questionId || 'survey');
    db.prepare(
      'INSERT INTO responses (student_id, student_name, type, question_id, answer) VALUES (?, ?, ?, ?, ?)'
    ).run(studentId, studentName, 'survey', qid, String(answer));
    io.emit('survey:response', { studentId, answer });
    broadcastDashboard();
  });

  // ── Lecturer sends quiz to all students ────────────────────────────
  socket.on('lecturer:sendquiz', (quiz) => {
    io.emit('student:quiz:new', quiz);
    startQuizWatch();
  });

  // ── Question bank: list questions for a slide ─────────────────────
  socket.on('lecturer:bank:list', ({ slideId }) => {
    const questions = db.prepare('SELECT * FROM question_bank WHERE slide_id = ? ORDER BY id').all(slideId);
    socket.emit('lecturer:bank:list', { slideId, questions });
  });

  // ── Question bank: send a question to students ────────────────────
  socket.on('lecturer:bank:send', ({ questionId }) => {
    const q = db.prepare('SELECT * FROM question_bank WHERE id = ?').get(questionId);
    if (q) {
      io.emit('student:quiz:new', {
        question: q.question,
        options: JSON.parse(q.options),
        correct: q.correct,
        points: q.points,
        slideId: `bank_${q.slide_id}`,
      });
      startQuizWatch();
    }
  });

  // ── Question bank: add a new question ─────────────────────────────
  socket.on('lecturer:bank:add', ({ slideId, question, options, correct, points }) => {
    const info = db.prepare('INSERT INTO question_bank (slide_id, question, options, correct, points) VALUES (?, ?, ?, ?, ?)').run(
      slideId, question, JSON.stringify(options), correct, points
    );
    // Broadcast updated list to all lecturers
    const questions = db.prepare('SELECT * FROM question_bank WHERE slide_id = ? ORDER BY id').all(slideId);
    io.to('lecturer').emit('lecturer:bank:list', { slideId, questions });
  });

  // ── Lecturer sends survey to all students ──────────────────────────
  socket.on('lecturer:sendsurvey', ({ question, options }) => {
    const clean = String(question || '').trim().slice(0, 200);
    if (!clean) return;
    // Default to the 5-point agree scale the student UI renders.
    const opts = Array.isArray(options) && options.length
      ? options.map(o => String(o).slice(0, 60))
      : SURVEY_SCALE;
    // Record the survey so its wording survives for the dashboard.
    const info = db.prepare('INSERT INTO surveys (question, options) VALUES (?, ?)')
      .run(clean, JSON.stringify(opts));
    const surveyId = info.lastInsertRowid;
    io.emit('student:survey:new', { surveyId, question: clean, options: opts });
    broadcastDashboard();
  });

  // ── Survey bank: list reusable prompts ─────────────────────────────
  socket.on('lecturer:surveybank:list', () => {
    const questions = db.prepare('SELECT * FROM survey_bank ORDER BY id').all();
    socket.emit('lecturer:surveybank:list', { questions });
  });

  // ── Feedback ───────────────────────────────────────────────────────
  socket.on('student:feedback', ({ text, rating }) => {
    if (!socket.student) return;
    const { id: studentId, name: studentName } = socket.student;
    // Cooldown + per-session cap: points are awarded per feedback, so without
    // this the button is a points farm for anyone holding it down.
    const quotaError = checkActivityQuota(studentId, 'student:feedback', 'feedback');
    if (quotaError) {
      socket.emit('student:feedback:rejected', { message: quotaError });
      return;
    }
    // Keep feedback short (few words) so it feeds a clean word cloud.
    let cleanText = String(text || '').trim().slice(0, 30);
    if (cleanText.split(/\s+/).filter(Boolean).length > 3) {
      cleanText = cleanText.split(/\s+/).filter(Boolean).slice(0, 3).join(' ');
    }
    const cleanRating = parseInt(rating) || 0;
    db.prepare(
      'INSERT INTO responses (student_id, student_name, type, answer, points) VALUES (?, ?, ?, ?, ?)'
    ).run(studentId, studentName, 'feedback', JSON.stringify({ text: cleanText, rating: cleanRating }), 5);
    broadcastDashboard();
  });

  // ── Question submission ────────────────────────────────────────────
  socket.on('student:question', ({ text }) => {
    if (!socket.student) return;
    const { id: studentId, name: studentName } = socket.student;

    // Server-side quality filter (second layer of defense)
    const clean = (text || '').trim();
    if (clean.length < 10 || clean.length > 200) {
      socket.emit('student:question:rejected', { message: 'Question must be between 10 and 200 characters.' });
      return;
    }

    const quotaError = checkActivityQuota(studentId, 'student:question', 'question');
    if (quotaError) {
      socket.emit('student:question:rejected', { message: quotaError });
      return;
    }

    db.prepare(
      'INSERT INTO responses (student_id, student_name, type, answer, points) VALUES (?, ?, ?, ?, ?)'
    ).run(studentId, studentName, 'question', clean, 3);
    io.to('lecturer').emit('lecturer:question', { student: studentName, text: clean });
    broadcastDashboard();
  });

  // ── Dashboard data request ─────────────────────────────────────────
  socket.on('dashboard:request', () => {
    const { groups, studentScores, groupScores } = computeScores();

    // Students get the slim payload — skip the heavy roster/responses work.
    // The word cloud is only computed when the current slide shows one.
    if (socket.student && !socket.lecturer) {
      const wc = slideHasLiveWordCloud() ? buildWordCloud() : null;
      socket.emit('dashboard:data', buildStudentPayload(groups, studentScores, groupScores, wc));
      return;
    }

    // Full payload for dashboard + lecturer requesters.
    const students = activeRoster();
    const responses = db.prepare('SELECT * FROM responses ORDER BY created_at DESC').all();

    const responseCounts = {
      quiz: db.prepare('SELECT COUNT(*) as cnt FROM responses WHERE type=?').get('quiz').cnt,
      survey: db.prepare('SELECT COUNT(*) as cnt FROM responses WHERE type=?').get('survey').cnt,
      feedback: db.prepare('SELECT COUNT(*) as cnt FROM responses WHERE type=?').get('feedback').cnt,
      question: db.prepare('SELECT COUNT(*) as cnt FROM responses WHERE type=?').get('question').cnt,
    };

    const totalPoints = db.prepare('SELECT COALESCE(SUM(points),0) as total FROM responses').get().total;

    const distribution = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    for (const s of studentScores) {
      const bucket = Math.min(9, Math.floor(s.total / 10));
      distribution[bucket]++;
    }

    socket.emit('dashboard:data', {
      students, groups, responses: responses.slice(0, 50),
      studentScores, groupScores, responseCounts,
      totalPoints, distribution, currentSlide, sessionActive,
      activeStudents: students.length,
      totalStudents: db.prepare('SELECT COUNT(*) as cnt FROM students').get().cnt,
      teamBonusRate: TEAM_BONUS_RATE,
      wordCloud: buildWordCloud(),
      surveyResults: buildSurveyResults(),
    });
  });

  socket.on('disconnect', () => {
    // Drop per-connection rate-limit state so the maps track live sockets only.
    socketViolationBuckets.delete(socket.id);
    rateLimitNoticeAt.delete(socket.id);
    for (const key of socketLimitBuckets.keys()) {
      if (key.startsWith(`socket:${socket.id}:`)) socketLimitBuckets.delete(key);
    }
    // Closing the browser/tab drops the student from the active roster.
    if (socket.student) {
      const entry = activeStudents.get(socket.student.id);
      if (entry) {
        entry.sockets.delete(socket.id);
        if (entry.sockets.size === 0) activeStudents.delete(socket.student.id);
      }
      broadcastDashboard();
    }
    console.log(`[disconnect] ${socket.id}`);
  });
});

// ── Start ──────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`[server] UTP Lecture System running on http://0.0.0.0:${PORT}`);
});