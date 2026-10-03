/* ═══════════════════════════════════════════════════════════════════════
   Load Simulation — UTP Adjunct Lecture
   Spins up N simulated students that join and actively participate:
   answering quizzes, submitting short feedback (mixed sentiment), asking
   questions, and answering surveys. Use it to watch the dashboard fill up
   and to spot performance issues under realistic load.

   Usage (from project root, with node on PATH):
     node scripts/simulate-students.js
     node scripts/simulate-students.js --students=200 --url=http://localhost:3000
     node scripts/simulate-students.js --students=200 --duration=60 --burst

   Flags:
     --students=N     number of students to simulate      (default 200)
     --url=URL        server URL                           (default http://localhost:3000)
     --duration=SEC   how long to run before disconnecting (default 60)
     --rampMs=MS      spread out joins over this many ms    (default 5000)
     --burst          every ~8s, ALL students answer a quiz at once (stress test)
     --quiet          reduce per-event logging
   ═══════════════════════════════════════════════════════════════════════ */

const { io } = require('socket.io-client');

// ── Parse args ────────────────────────────────────────────────────────
const args = Object.fromEntries(
  process.argv.slice(2).map(a => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v === undefined ? true : v];
  })
);

const NUM_STUDENTS = parseInt(args.students) || 200;
const URL = args.url || 'http://localhost:3000';
const DURATION_MS = (parseInt(args.duration) || 60) * 1000;
const RAMP_MS = parseInt(args.rampMs) || 5000;
const BURST = !!args.burst;
const QUIET = !!args.quiet;
const AUTOQUIZ = !!args.autoquiz; // emit quizzes from the sim itself (no lecturer needed)

// ── Sample data ───────────────────────────────────────────────────────
const FIRST = ['Aina','Arif','Bala','Chong','Dinesh','Ella','Faiz','Gan','Hana','Iman',
  'Jaya','Kavi','Lim','Mei','Nadia','Omar','Priya','Qistina','Raj','Siti','Tan','Umar',
  'Vani','Wei','Xin','Yusof','Zara','Adam','Bella','Chris'];
// Short feedback words (a word or two) with a leaning sentiment
const POSITIVE = ['clear','fun','engaging','helpful','great','love it','awesome','inspiring','fast paced','useful'];
const NEUTRAL  = ['okay','fine','average','so so','normal'];
const NEGATIVE = ['too fast','confusing','boring','hard','slow','lost me'];

const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// Weighted sentiment: mostly positive, some neutral, some negative
function pickFeedback() {
  const roll = Math.random();
  if (roll < 0.55) return { text: rand(POSITIVE), rating: randInt(4, 5) };
  if (roll < 0.80) return { text: rand(NEUTRAL),  rating: 3 };
  return { text: rand(NEGATIVE), rating: randInt(1, 2) };
}

const QUESTIONS = [
  'Can you explain P90 again please',
  'How is variance different from std dev',
  'What is a real example of kriging',
  'Why is median better for permeability',
  'Can AI replace reservoir engineers',
  'How do we detect AI hallucination',
  'What does a high CV mean exactly',
  'Is correlation the same as causation',
];

// ── Stats ─────────────────────────────────────────────────────────────
const stats = {
  connected: 0, loggedIn: 0, quizAnswers: 0, feedback: 0, questions: 0,
  surveys: 0, errors: 0, disconnects: 0,
};
const clients = [];
let latestQuiz = null;
let latestSurvey = null;

// ── Build a single simulated student ──────────────────────────────────
function makeStudent(i) {
  const name = `${rand(FIRST)}_${i}_${randInt(100, 999)}`;
  const socket = io(URL, { transports: ['websocket'], forceNew: true, reconnection: false });
  const timers = [];
  clients.push({ socket, timers });

  socket.on('connect', () => {
    stats.connected++;
    socket.emit('student:login', { name });
  });

  socket.on('student:loggedin', () => {
    stats.loggedIn++;
    // Periodic feedback (short words, mixed sentiment)
    timers.push(setInterval(() => {
      const f = pickFeedback();
      socket.emit('student:feedback', f);
      stats.feedback++;
    }, randInt(6000, 14000)));

    // Periodic questions (respecting server 10-200 char rule)
    timers.push(setInterval(() => {
      socket.emit('student:question', { text: rand(QUESTIONS) });
      stats.questions++;
    }, randInt(12000, 25000)));
  });

  // Answer quizzes as they arrive (staggered "thinking time")
  socket.on('student:quiz:new', (quiz) => {
    latestQuiz = quiz;
    const think = BURST ? randInt(50, 400) : randInt(1000, 6000);
    timers.push(setTimeout(() => {
      // ~75% answer correctly, rest pick a random option
      const correct = quiz.correct ?? 0;
      const choose = Math.random() < 0.75 ? correct : randInt(0, (quiz.options?.length || 4) - 1);
      const points = choose === correct ? (quiz.points || 10) : 0;
      socket.emit('student:quiz', {
        questionId: quiz.slideId || 'quiz',
        answer: String.fromCharCode(65 + choose),
        points,
      });
      stats.quizAnswers++;
    }, think));
  });

  // Answer surveys as they arrive
  socket.on('student:survey:new', (survey) => {
    latestSurvey = survey;
    const opts = ['Strongly Disagree','Disagree','Neutral','Agree','Strongly Agree'];
    timers.push(setTimeout(() => {
      socket.emit('student:survey', {
        questionId: survey.slideId || 'survey',
        answer: rand(opts),
      });
      stats.surveys++;
    }, randInt(500, 4000)));
  });

  socket.on('connect_error', () => { stats.errors++; });
  socket.on('disconnect', () => { stats.disconnects++; });
}

// ── Orchestration ─────────────────────────────────────────────────────
console.log(`\n🎬 Simulating ${NUM_STUDENTS} students against ${URL}`);
console.log(`   duration=${DURATION_MS / 1000}s  ramp=${RAMP_MS}ms  burst=${BURST}\n`);

// Stagger joins across the ramp window
const gap = RAMP_MS / NUM_STUDENTS;
for (let i = 0; i < NUM_STUDENTS; i++) {
  setTimeout(() => makeStudent(i), Math.floor(i * gap));
}

// Optional: a driver socket that sends quizzes itself, so the burst test is
// self-contained (no lecturer console needed).
let driverSocket = null;
let autoQuizTimer = null;
if (AUTOQUIZ) {
  const QUIZZES = [
    { question: 'Which measure is most robust to outliers?', options: ['Mean','Median','Mode','Range'], correct: 1, points: 10, slideId: 'sim_q1' },
    { question: 'P90 means what probability of exceeding?', options: ['10%','50%','90%','100%'], correct: 2, points: 10, slideId: 'sim_q2' },
    { question: 'AI should be used as a...', options: ['Replacement','Copilot','Manager','Teacher'], correct: 1, points: 10, slideId: 'sim_q3' },
  ];
  driverSocket = io(URL, { transports: ['websocket'], forceNew: true, reconnection: false });
  driverSocket.on('connect', () => {
    let qi = 0;
    autoQuizTimer = setInterval(() => {
      const quiz = QUIZZES[qi % QUIZZES.length];
      qi++;
      driverSocket.emit('lecturer:sendquiz', quiz);
      console.log(`📨 autoquiz: sent "${quiz.question}"`);
    }, 8000);
  });
}

// Optional synchronized quiz-answer bursts (worst case for dashboard fan-out)
let burstTimer = null;
if (BURST) {
  burstTimer = setInterval(() => {
    if (!latestQuiz) return;
    const t0 = Date.now();
    let fired = 0;
    for (const { socket } of clients) {
      if (!socket.connected) continue;
      const correct = latestQuiz.correct ?? 0;
      const choose = Math.random() < 0.75 ? correct : randInt(0, 3);
      socket.emit('student:quiz', {
        questionId: latestQuiz.slideId || 'quiz',
        answer: String.fromCharCode(65 + choose),
        points: choose === correct ? (latestQuiz.points || 10) : 0,
      });
      stats.quizAnswers++;
      fired++;
    }
    console.log(`💥 burst: ${fired} answers fired in ${Date.now() - t0}ms`);
  }, 8000);
}

// Periodic stats print
const statsTimer = setInterval(() => {
  if (QUIET) return;
  console.log(
    `📊 connected=${stats.connected} loggedIn=${stats.loggedIn} ` +
    `quiz=${stats.quizAnswers} feedback=${stats.feedback} ` +
    `questions=${stats.questions} surveys=${stats.surveys} ` +
    `errors=${stats.errors} dropped=${stats.disconnects}`
  );
}, 3000);

// ── Teardown ──────────────────────────────────────────────────────────
function shutdown() {
  clearInterval(statsTimer);
  if (burstTimer) clearInterval(burstTimer);
  if (autoQuizTimer) clearInterval(autoQuizTimer);
  if (driverSocket) driverSocket.disconnect();
  for (const { socket, timers } of clients) {
    timers.forEach(t => { clearTimeout(t); clearInterval(t); });
    socket.disconnect();
  }
  console.log('\n✅ Simulation complete. Final stats:');
  console.log(JSON.stringify(stats, null, 2));
  // Give sockets a moment to close cleanly
  setTimeout(() => process.exit(0), 500);
}

setTimeout(shutdown, DURATION_MS);
process.on('SIGINT', () => { console.log('\n⏹️  Interrupted.'); shutdown(); });
