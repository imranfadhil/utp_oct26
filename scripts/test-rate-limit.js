/* ═══════════════════════════════════════════════════════════════════════
   Rate-limit test — UTP Adjunct Lecture

   Boots the real server and verifies that the limits actually engage, that a
   determined spammer still cannot farm points, and that normal lecture traffic
   is unaffected. Each scenario gets its own server process so one scenario's
   spent budgets (handshakes, per IP) can't leak into the next.

     node scripts/test-rate-limit.js
   ═══════════════════════════════════════════════════════════════════════ */

const path = require('path');
const fs = require('fs');
const os = require('os');
const { spawn } = require('child_process');
const { io } = require('socket.io-client');

const SERVER = path.join(__dirname, '..', 'server.js');
const results = [];

function check(name, condition, detail) {
  results.push({ name, ok: !!condition });
  console.log(`${condition ? '✅' : '❌'} ${name}${detail ? ` — ${detail}` : ''}`);
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ── Server harness ────────────────────────────────────────────────────
let nextPort = 3990;

function cleanup(dbPath) {
  for (const suffix of ['', '-wal', '-shm']) {
    try { fs.unlinkSync(dbPath + suffix); } catch (e) { /* already gone */ }
  }
}

function startServer(env = {}) {
  const port = nextPort++;
  const dbPath = path.join(os.tmpdir(), `ratelimit-test-${process.pid}-${port}.db`);
  const proc = spawn(process.execPath, [SERVER], {
    env: {
      ...process.env,
      PORT: String(port),
      DB_PATH: dbPath,
      RATE_LIMIT_LOG_INTERVAL_MS: '1000',
      ...env,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  const base = `http://127.0.0.1:${port}`;
  const logs = [];
  proc.stdout.on('data', d => logs.push(String(d)));
  proc.stderr.on('data', d => logs.push(String(d)));

  const ready = (async () => {
    for (let i = 0; i < 100; i++) {
      try {
        const res = await fetch(`${base}/landing.html`);
        if (res.ok) return;
      } catch (e) { /* not listening yet */ }
      await sleep(100);
    }
    throw new Error(`server on ${port} never became ready\n${logs.join('')}`);
  })();

  const stop = () => new Promise((resolve) => {
    proc.once('exit', resolve);
    proc.kill();
    setTimeout(() => { try { proc.kill('SIGKILL'); } catch (e) {} resolve(); }, 2000);
  });

  return { base, dbPath, logs, ready, stop };
}

// ── Client helpers ────────────────────────────────────────────────────
function makeStudent(base, name) {
  const socket = io(base, { transports: ['websocket'], forceNew: true, reconnection: false });
  const rejections = [];
  const notices = [];
  const dashboards = [];
  const disconnects = [];
  socket.on('student:feedback:rejected', (p) => rejections.push(p.message));
  socket.on('student:question:rejected', (p) => rejections.push(p.message));
  socket.on('rate:limited', (p) => notices.push(p.message));
  // Recorded eagerly: a `once()` listener attached after an emit would miss a
  // response that arrives during the intervening wait.
  socket.on('dashboard:data', (d) => dashboards.push(d));
  socket.on('disconnect', (reason) => disconnects.push(reason));
  return { socket, rejections, notices, dashboards, disconnects, name };
}

function waitFor(socket, event, timeoutMs = 5000) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), timeoutMs);
    socket.once(event, (payload) => { clearTimeout(timer); resolve(payload); });
  });
}

async function loginStudent(base, name) {
  const student = makeStudent(base, name);
  await waitFor(student.socket, 'connect');
  student.socket.emit('student:login', { name });
  student.loggedIn = await waitFor(student.socket, 'student:loggedin');
  return student;
}

// Read what actually landed in the database, so a "rejected" message can never
// hide an accepted row (or vice versa).
function readRows(dbPath, studentId, type) {
  const Database = require('better-sqlite3');
  const db = new Database(dbPath, { readonly: true });
  try {
    return db.prepare(
      'SELECT COUNT(*) AS c, COALESCE(SUM(points), 0) AS pts FROM responses WHERE type = ? AND student_id = ?'
    ).get(type, studentId);
  } finally {
    db.close();
  }
}

// ── Scenarios ─────────────────────────────────────────────────────────

// HTTP layer: state-changing requests are budgeted, static GETs are not.
async function testHttpLimits() {
  console.log('\n── HTTP layer ──');
  const srv = startServer({
    RATE_LIMIT_HTTP_MAX: '5',
    RATE_LIMIT_HTTP_WINDOW_MS: '60000',
  });
  await srv.ready;

  let got429 = false;
  for (let i = 0; i < 12; i++) {
    const res = await fetch(`${srv.base}/nope`, { method: 'POST' });
    if (res.status === 429) { got429 = true; break; }
  }
  check('HTTP limiter returns 429 once the budget is spent', got429);

  let pageOk = true;
  for (let i = 0; i < 30; i++) {
    const res = await fetch(`${srv.base}/landing.html`);
    if (res.status !== 200) { pageOk = false; break; }
  }
  check('Static GET requests are not rate limited', pageOk);

  let scriptOk = true;
  for (let i = 0; i < 5; i++) {
    const res = await fetch(`${srv.base}/js/rate-limit-client.js`);
    if (res.status !== 200) { scriptOk = false; break; }
  }
  check('The new client helper script is served', scriptOk);

  await srv.stop();
  cleanup(srv.dbPath);
}

// Point rules: the cooldown and the per-session cap.
async function testPointRules() {
  console.log('\n── Point-earning rules ──');
  const srv = startServer({
    ACTIVITY_COOLDOWN_MS: '200',
    FEEDBACK_CAP: '3',
    QUESTION_CAP: '2',
  });
  await srv.ready;

  // Cooldown: the second send inside the gap is refused.
  const a = await loginStudent(srv.base, 'RateTest_Alpha');
  a.socket.emit('student:feedback', { text: 'clear', rating: 5 });
  a.socket.emit('student:feedback', { text: 'clear', rating: 5 });
  await sleep(400);
  check('Per-action cooldown rejects the immediate resend',
    a.rejections.some(m => /wait/i.test(m)), a.rejections[0] || 'no rejection');

  // Cap: keeps rejecting once the cooldown has elapsed.
  for (let i = 0; i < 8; i++) {
    await sleep(250);
    a.socket.emit('student:feedback', { text: 'great', rating: 5 });
  }
  await sleep(400);
  check('Per-session feedback cap is enforced',
    a.rejections.some(m => /limit of 3/i.test(m)),
    a.rejections.find(m => /limit of/i.test(m)) || a.rejections.join(' | '));

  const b = await loginStudent(srv.base, 'RateTest_Beta');
  for (let i = 0; i < 4; i++) {
    await sleep(250);
    b.socket.emit('student:question', { text: `Is this a valid question number ${i}?` });
  }
  await sleep(400);
  check('Per-session question cap is enforced',
    b.rejections.some(m => /limit of 2/i.test(m)),
    b.rejections.find(m => /limit of/i.test(m)) || b.rejections.join(' | '));

  a.socket.disconnect();
  b.socket.disconnect();
  await srv.stop();
  cleanup(srv.dbPath);
}

// Socket flood: bursts are dropped, the client is nudged, repeat offenders are
// disconnected exactly once.
async function testSocketFlood() {
  console.log('\n── Socket flood ──');
  const srv = startServer({ RATE_LIMIT_DISCONNECT_AFTER: '25' });
  await srv.ready;

  const c = await loginStudent(srv.base, 'RateTest_Gamma');
  for (let i = 0; i < 400; i++) {
    c.socket.emit('student:quiz', { questionId: 'flood', answer: 'A', points: 10 });
  }
  await sleep(700);
  check('A burst of socket events is throttled (rate:limited sent)',
    c.notices.length > 0, c.notices[0] || 'no notice');

  const disconnected = await waitFor(c.socket, 'disconnect', 3000);
  check('Repeat offenders are disconnected', !!disconnected || c.disconnects.length > 0);

  const disconnectLogs = srv.logs.join('').match(/disconnecting abusive socket/g) || [];
  check('The offender is disconnected once, not per buffered packet',
    disconnectLogs.length === 1, `${disconnectLogs.length} disconnect(s)`);

  c.socket.disconnect();
  await srv.stop();
  cleanup(srv.dbPath);
}

// The real objective: spamming must not inflate the score. Drive the socket
// directly (bypassing the client throttle) and reconnect midway so the
// per-connection budget resets — the per-student cap has to hold the line.
async function testSpamCannotFarmPoints() {
  console.log('\n── Abuse scenario: points cannot be farmed ──');
  const srv = startServer({
    ACTIVITY_COOLDOWN_MS: '200',
    FEEDBACK_CAP: '3',
    RATE_LIMIT_IP_EVENTS_MAX: '100000', // isolate the per-student cap under test
    RATE_LIMIT_HANDSHAKE_MAX: '1000',
  });
  await srv.ready;

  const spam = await loginStudent(srv.base, 'RateTest_Spammer');
  const spammerId = spam.loggedIn && spam.loggedIn.student && spam.loggedIn.student.id;
  check('Spammer logged in for the abuse scenario', !!spammerId);
  if (!spammerId) { await srv.stop(); cleanup(srv.dbPath); return; }

  for (let round = 0; round < 3; round++) {
    for (let i = 0; i < 6; i++) {
      await sleep(250); // outwait the cooldown so the cap is the real brake
      spam.socket.emit('student:feedback', { text: 'spam', rating: 5 });
    }
    // Fresh connection: new per-socket bucket, new burst allowance.
    spam.socket.disconnect();
    await sleep(200);
    spam.socket.connect();
    await waitFor(spam.socket, 'connect');
    spam.socket.emit('student:login', { name: spam.name });
    await waitFor(spam.socket, 'student:loggedin');
  }
  await sleep(500);

  const awarded = readRows(srv.dbPath, spammerId, 'feedback');
  check('Spam cannot store more than the per-session cap',
    awarded.c === 3, `stored ${awarded.c} feedback rows (cap 3)`);
  check('Spam cannot award more than the cap allows',
    awarded.pts === 15, `${awarded.pts} pts awarded (expected 3 x 5 = 15)`);
  check('The spammer was told about the limit',
    spam.rejections.some(m => /limit of 3/i.test(m)),
    spam.rejections.find(m => /limit of/i.test(m)) || 'no cap message');

  spam.socket.disconnect();
  await srv.stop();
  cleanup(srv.dbPath);
}

// Normal traffic must sail through the same configuration untouched.
async function testNormalUse() {
  console.log('\n── Normal use is unaffected ──');
  const srv = startServer(); // stock defaults, exactly as deployed
  await srv.ready;

  const d = await loginStudent(srv.base, 'RateTest_Delta');
  check('A student can log in and receive their payload',
    !!(d.loggedIn && d.loggedIn.student && d.loggedIn.student.name === d.name));

  d.socket.emit('dashboard:request');
  const data = await waitFor(d.socket, 'dashboard:data');
  check('Dashboard requests are served', !!data && !!data.studentScores);

  // A realistic lecture pace on the same connection.
  d.socket.emit('student:requestSlide');
  await sleep(200);
  d.socket.emit('student:quiz', { questionId: 'norm', answer: 'A', points: 10 });
  await sleep(600);
  d.socket.emit('student:survey', { surveyId: 1, answer: 'Agree' });
  await sleep(600);
  d.socket.emit('student:feedback', { text: 'clear', rating: 5 });
  await sleep(600);
  d.socket.emit('student:question', { text: 'How do we detect AI hallucination?' });
  await sleep(600);

  const fb = readRows(srv.dbPath, d.loggedIn.student.id, 'feedback');
  const q = readRows(srv.dbPath, d.loggedIn.student.id, 'question');
  const quiz = readRows(srv.dbPath, d.loggedIn.student.id, 'quiz');
  check('Normal feedback/quiz/question all go through',
    fb.c === 1 && q.c === 1 && quiz.c === 1,
    `feedback=${fb.c} question=${q.c} quiz=${quiz.c}`);
  check('Normal use triggers no rejections', d.rejections.length === 0,
    d.rejections.join(' | ') || 'clean');
  check('Normal use triggers no rate limiting', d.notices.length === 0,
    d.notices.join(' | ') || 'clean');

  // A whole room behind one NAT address, polling like the real clients do.
  const room = await Promise.all(
    Array.from({ length: 12 }, (_, i) => loginStudent(srv.base, `RateTest_Room_${i}`))
  );
  await sleep(300);
  for (const s of room) s.socket.emit('dashboard:request');
  await sleep(1000);
  const payloads = room.map(s => s.dashboards.length);
  check('A shared-NAT room all gets dashboard data',
    payloads.every(n => n > 0), `${payloads.filter(n => n > 0).length}/${room.length} answered`);

  for (const s of room) s.socket.disconnect();
  d.socket.disconnect();
  await srv.stop();
  cleanup(srv.dbPath);
}

// Connection storms from one address are capped.
async function testHandshakeStorm() {
  console.log('\n── Connection storm ──');
  const srv = startServer({
    RATE_LIMIT_HANDSHAKE_MAX: '6',
    RATE_LIMIT_HANDSHAKE_WINDOW_MS: '60000',
  });
  await srv.ready;

  const opened = [];
  let refused = 0;
  for (let i = 0; i < 14; i++) {
    const s = io(srv.base, { transports: ['websocket'], forceNew: true, reconnection: false });
    s.on('connect_error', () => refused++);
    opened.push(s);
  }
  await sleep(1500);
  check('A connection storm is throttled', refused > 0, `${refused} refused`);
  for (const s of opened) s.disconnect();

  await srv.stop();
  cleanup(srv.dbPath);
}

// ── Run ───────────────────────────────────────────────────────────────
(async () => {
  await testHttpLimits();
  await testPointRules();
  await testSocketFlood();
  await testSpamCannotFarmPoints();
  await testNormalUse();
  await testHandshakeStorm();

  const failed = results.filter(r => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  if (failed.length) console.log('Failed:\n' + failed.map(f => '  - ' + f.name).join('\n'));
  process.exit(failed.length === 0 ? 0 : 1);
})().catch((err) => {
  console.error('\nTest harness error:', err);
  process.exit(1);
});
