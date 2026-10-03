/* ═══════════════════════════════════════════════════════════════════════
   Student Interface JS — UTP Adjunct Lecture
   ═══════════════════════════════════════════════════════════════════════ */

const socket = io();
let currentStudent = null;
let groups = [];
let currentQuiz = null;
let currentSurvey = null;
let currentRating = 0;
let allStudentScores = [];
let lastSlideContent = null; // cache for slide content received before login
let latestWordCloud = null;  // most recent word cloud data (live warm-up slide)

// ── Outbound throttles ────────────────────────────────────────────────
// Points are awarded per action, so tapping in bursts is tempting. The server
// enforces these limits too; this keeps the traffic (and the toasts) local.
// `RateLimit` lives in /js/rate-limit-client.js.
const emitFeedback = RateLimit.createThrottledEmitter(socket, 'student:feedback');
const emitQuestion = RateLimit.createThrottledEmitter(socket, 'student:question');
// Polls can be triggered by several events at once; collapse them into one send.
const requestDashboard = RateLimit.createDebouncedEmitter(socket, 'dashboard:request', 300);
// Login is quiet (auto-login on every reconnect shouldn't toast) but still
// spaced out enough to absorb a double-tap on "Join Session".
const emitLogin = RateLimit.createThrottledEmitter(socket, 'student:login',
  { gapMs: 1000, maxPerWindow: 15, windowMs: 60000, label: 'login', quiet: true });

// A quiz answer must never double-submit, even on a fast double tap.
const emitQuizAnswerThrottled = RateLimit.createThrottledEmitter(socket, 'student:quiz',
  { gapMs: 1500, label: 'answer', quiet: true });
let answeredQuizKey = null; // questionId of the quiz already answered
let answeredSurveyKey = null; // surveyId of the survey already answered

// Surveys are throttled like quizzes, but stay loud: a double tap is worth a nudge.
const emitSurvey = RateLimit.createThrottledEmitter(socket, 'student:survey',
  { gapMs: 1500, maxPerWindow: 12, windowMs: 60000, label: 'vote' });

// Slide requests are idempotent but arrive on connect/login/reconnect together.
const emitRequestSlide = RateLimit.createThrottledEmitter(socket, 'student:requestSlide',
  { gapMs: 1000, maxPerWindow: 30, windowMs: 60000, label: 'slide request', quiet: true });

function emitQuizAnswer(payload) {
  // One answer per quiz, no matter how many taps land on the options.
  const key = payload.questionId || 'quiz';
  if (answeredQuizKey === key) return false;
  if (!emitQuizAnswerThrottled(payload)) return false;
  answeredQuizKey = key;
  return true;
}

// ── Socket Events ─────────────────────────────────────────────────────
socket.on('connect', () => {
  // Load groups as soon as connected so the dropdown is populated before login
  loadGroups();

  // Auto-login if we have saved credentials
  const saved = localStorage.getItem('utp_student');
  if (saved) {
    try {
      const { name } = JSON.parse(saved);
      if (name) {
        emitLogin({ name });
      }
    } catch (e) {
      localStorage.removeItem('utp_student');
    }
  }
});

socket.on('student:loggedin', ({ student, currentSlide, slideContent, sessionActive }) => {
  currentStudent = student;
  document.getElementById('loginScreen').classList.add('hidden');
  document.getElementById('studentApp').classList.remove('hidden');
  document.getElementById('displayName').textContent = student.name;
  loadGroups();

  // Set team name from the groups we already have
  const myGroup = groups.find(g => g.id === student.group_id);
  if (myGroup) {
    document.getElementById('displayGroup').textContent = myGroup.name;
    document.getElementById('displayGroup').style.background = myGroup.color + '22';
    document.getElementById('displayGroup').style.color = myGroup.color;
  }

  // Show slide only if session is active
  if (sessionActive) {
    const content = slideContent || lastSlideContent;
    if (content) {
      document.getElementById('slideContent').innerHTML = content;
      initMonteCarlo(); // in case we land straight onto the interactive slide
      initDrillingCharts(); // in case we land straight onto the drilling slide
    } else {
      emitRequestSlide();
    }
  } else {
    document.getElementById('slideContent').innerHTML = STANDBY_HTML;
  }
});

socket.on('slide:change', ({ slide, title, content }) => {
  // Cache the content in case we receive it before login
  if (content) lastSlideContent = content;
  // Only render if session is active (checked via session:status)
  // The server only sends slide:change to students when session is active
  const slideContainer = document.getElementById('slideContent');
  if (content) {
    slideContainer.innerHTML = content;
  } else {
    slideContainer.innerHTML = `<div class="waiting-msg">📖 Slide ${slide + 1}</div>`;
  }
  // If the new slide embeds a live word cloud, fill it right away and ask the
  // server for fresh counts (the slim student feed only carries it on demand).
  if (content && content.includes('data-live-wordcloud')) {
    renderLiveWordCloud(latestWordCloud);
    requestDashboard();
  }
  // Students get their own working copy of the Monte Carlo demo.
  initMonteCarlo();
  // And the drilling control charts, if this slide carries them.
  initDrillingCharts();
  // Hide previous quiz and survey when slide changes
  document.getElementById('quizArea').classList.add('hidden');
  document.getElementById('surveyArea').classList.add('hidden');
  currentQuiz = null;
  currentSurvey = null;
});

socket.on('session:status', ({ active }) => {
  const slideContainer = document.getElementById('slideContent');
  if (active) {
    // Session started — show the cached slide content
    if (lastSlideContent) {
      slideContainer.innerHTML = lastSlideContent;
    } else {
      emitRequestSlide();
    }
  } else {
    // Session stopped — show the standby screen
    slideContainer.innerHTML = STANDBY_HTML;
    // Hide quiz and survey too
    document.getElementById('quizArea').classList.add('hidden');
    document.getElementById('surveyArea').classList.add('hidden');
    currentQuiz = null;
    currentSurvey = null;
  }
});

socket.on('session:reset', () => {
  localStorage.removeItem('utp_student');
  document.getElementById('loginScreen').classList.remove('hidden');
  document.getElementById('studentApp').classList.add('hidden');
  allStudentScores = [];
  updateMiniLeaderboard();
  document.getElementById('myScore').textContent = '0';
  document.getElementById('myRank').textContent = '#-';
  document.getElementById('teamScore').textContent = '0';
  document.getElementById('teamRank').textContent = '#-';
});

// ── Quiz handling ─────────────────────────────────────────────────────
socket.on('student:quiz:new', (quiz) => {
  currentQuiz = quiz;
  answeredQuizKey = null; // a fresh quiz instance can be answered again
  const area = document.getElementById('quizArea');
  area.classList.remove('hidden');
  document.getElementById('quizQuestionText').textContent = quiz.question;
  const container = document.getElementById('quizOptions');
  container.innerHTML = '';
  document.getElementById('quizResult').classList.add('hidden');

  quiz.options.forEach((opt, i) => {
    const btn = document.createElement('button');
    btn.className = 'quiz-option';
    btn.textContent = `${String.fromCharCode(65 + i)}. ${opt}`;
    btn.dataset.index = i;
    btn.onclick = () => answerQuiz(i);
    container.appendChild(btn);
  });
});

function answerQuiz(selectedIndex) {
  if (!currentQuiz || !currentStudent) return;
  const options = document.querySelectorAll('.quiz-option');
  options.forEach((btn, i) => {
    btn.disabled = true;
    if (i === currentQuiz.correct) btn.classList.add('correct');
    if (i === selectedIndex && i !== currentQuiz.correct) btn.classList.add('wrong');
  });

  const isCorrect = selectedIndex === currentQuiz.correct;
  const points = isCorrect ? currentQuiz.points : 0;

  const result = document.getElementById('quizResult');
  result.classList.remove('hidden');
  result.style.background = isCorrect ? '#d1fae5' : '#fee2e2';
  result.textContent = isCorrect ? `✅ Correct! +${points} pts` : `❌ Wrong! The answer was ${String.fromCharCode(65 + currentQuiz.correct)}`;

  emitQuizAnswer({
    questionId: currentQuiz.slideId || 'quiz',
    answer: String.fromCharCode(65 + selectedIndex),
    points,
  });
}

// ── Survey handling ───────────────────────────────────────────────────
socket.on('student:survey:new', (survey) => {
  currentSurvey = survey;
  answeredSurveyKey = null; // a fresh survey instance can be answered again
  const area = document.getElementById('surveyArea');
  area.classList.remove('hidden');
  document.getElementById('surveyQuestionText').textContent = survey.question;
  // The server supplies the scale so it always matches what the dashboard tallies.
  const container = document.getElementById('surveyOptions');
  container.innerHTML = '';
  const surveyOptions = survey.options && survey.options.length
    ? survey.options
    : ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree'];
  surveyOptions.forEach((opt, i) => {
    const btn = document.createElement('button');
    btn.className = 'survey-option';
    btn.textContent = `${i + 1}. ${opt}`;
    btn.onclick = () => answerSurvey(i, surveyOptions);
    container.appendChild(btn);
  });
});

function answerSurvey(index, options) {
  if (!currentSurvey || !currentStudent) return;
  // One vote per survey, however many options get tapped in quick succession.
  const key = String(currentSurvey.surveyId || 'survey');
  if (answeredSurveyKey === key) return;
  answeredSurveyKey = key;
  emitSurvey({ surveyId: currentSurvey.surveyId, answer: options[index] });
  const container = document.getElementById('surveyOptions');
  const choice = document.createElement('div');
  choice.style.cssText = 'padding:12px;background:#d1fae5;border-radius:8px;text-align:center;';
  choice.textContent = `✅ Thanks for voting! You answered: ${options[index]}`;
  container.innerHTML = '';
  container.appendChild(choice);
}

// ── Feedback ──────────────────────────────────────────────────────────
function setRating(rating) {
  currentRating = rating;
  const stars = document.querySelectorAll('#ratingStars span');
  stars.forEach((s, i) => {
    s.textContent = i < rating ? '★' : '☆';
    s.classList.toggle('active', i < rating);
  });
}

function sendFeedback() {
  const text = document.getElementById('feedbackText').value.trim();
  if (!text && !currentRating) {
    showToast('Type a word or two, or tap the stars first.', 'warn');
    return;
  }

  // Keep feedback short so it feeds a clean word cloud (few words, not sentences)
  if (text) {
    const words = text.split(/\s+/).filter(Boolean);
    if (words.length > 3) {
      showToast('Keep it to 3 words max — e.g. "clear", "fun", "too fast".', 'warn');
      return;
    }
    if (text.length > 30) {
      showToast('Keep it under 30 characters so it fits the word cloud.', 'warn');
      return;
    }
  }

  if (!emitFeedback({ text, rating: currentRating })) return; // throttled — toast already shown

  document.getElementById('feedbackText').value = '';
  currentRating = 0;
  document.querySelectorAll('#ratingStars span').forEach(s => { s.textContent = '☆'; s.classList.remove('active'); });
  showToast('Thanks — your word is on the screen! +5 pts', 'success');
}

// ── Questions ─────────────────────────────────────────────────────────
function sendQuestion() {
  const text = document.getElementById('questionInput').value.trim();
  if (!text) {
    showToast('Type your question first.', 'warn');
    return;
  }

  // Quality filter
  const filterResult = checkQuestionQuality(text);
  if (!filterResult.valid) {
    showToast(filterResult.message, 'warn');
    return;
  }

  if (!emitQuestion({ text })) return; // throttled — toast already shown

  document.getElementById('questionInput').value = '';
  showToast('Question submitted — I\'ll get to it! +3 pts', 'success');
}

// Listen for server-side question rejection
socket.on('student:question:rejected', ({ message }) => {
  showToast(message, 'error');
});

// Listen for server-side feedback rejection (cooldown / session cap)
socket.on('student:feedback:rejected', ({ message }) => {
  showToast(message, 'warn');
});

// The server also pushes a nudge when a socket sends events too fast.
socket.on('rate:limited', ({ message }) => {
  showToast(message, 'warn');
});

// ── Question Quality Filter ───────────────────────────────────────────
function checkQuestionQuality(text) {
  // Minimum length
  if (text.length < 10) {
    return { valid: false, message: 'Please write a complete question (at least 10 characters).' };
  }

  // Maximum length
  if (text.length > 200) {
    return { valid: false, message: 'Please keep your question under 200 characters.' };
  }

  // All caps (spam detection)
  const upperChars = text.replace(/[^A-Z]/g, '').length;
  const letterChars = text.replace(/[^A-Za-z]/g, '').length;
  if (letterChars > 0 && upperChars / letterChars > 0.7) {
    return { valid: false, message: 'Please use normal capitalization, not ALL CAPS.' };
  }

  // Repeated characters (gibberish like "aaaaaaa" or "??????")
  const repeated = text.match(/(.)\1{4,}/g);
  if (repeated) {
    return { valid: false, message: 'Please avoid repeated characters — write a proper question.' };
  }

  // Repeated words (spam like "hello hello hello")
  const words = text.toLowerCase().split(/\s+/);
  const wordCounts = {};
  for (const w of words) {
    wordCounts[w] = (wordCounts[w] || 0) + 1;
  }
  for (const [word, count] of Object.entries(wordCounts)) {
    if (word.length > 2 && count >= 4) {
      return { valid: false, message: 'Please avoid repeating the same word too many times.' };
    }
  }

  // Common spam patterns
  const spamPatterns = [
    /^(lol+|haha+|hehe+|xd+)\s*$/i,
    /^(test|testing|asdf|qwerty|whatever|nothing)\s*$/i,
    /^(no+|yes+|ok+|okay+)\s*$/i,
  ];
  for (const pattern of spamPatterns) {
    if (pattern.test(text)) {
      return { valid: false, message: 'That doesn\'t look like a real question. Please ask something meaningful!' };
    }
  }

  return { valid: true };
}

// ── Groups loading ────────────────────────────────────────────────────
function loadGroups() {
  // Fetch groups from server (debounced — it's also called on every login event)
  requestDashboard();
}

socket.on('dashboard:data', (data) => {
  groups = data.groups;
  allStudentScores = data.studentScores || [];

  // Live word cloud, when the current slide embeds one.
  if (data.wordCloud) {
    latestWordCloud = data.wordCloud;
    renderLiveWordCloud(latestWordCloud);
  }

  // Update mini leaderboard
  updateMiniLeaderboard();

  // Update my score, rank and team stats from server data (ground truth)
  if (currentStudent) {
    // Get real score from server. `total` already includes the team bonus.
    const myServerData = data.studentScores.find(s => s.student_id === currentStudent.id);
    const realScore = myServerData ? myServerData.total : 0;
    document.getElementById('myScore').textContent = realScore;

    // Show how the score splits into own points vs team bonus, so it's obvious
    // that helping teammates raises your own number.
    const breakdown = document.getElementById('scoreBreakdown');
    if (breakdown) {
      const earned = myServerData ? myServerData.earned : 0;
      const bonus = myServerData ? myServerData.teamBonus : 0;
      breakdown.textContent = bonus > 0 ? `${earned} yours + ${bonus} team` : `${earned} yours`;
    }

    const ranked = data.studentScores.filter(s => s.total > 0).sort((a, b) => b.total - a.total);
    const myRank = ranked.findIndex(s => s.student_id === currentStudent.id) + 1;
    document.getElementById('myRank').textContent = myRank > 0 ? `#${myRank}` : '#-';

    // Team score and rank
    const myGroupId = currentStudent.group_id;
    const myGroup = data.groups.find(g => g.id === myGroupId);
    if (myGroup) {
      document.getElementById('displayGroup').textContent = myGroup.name;
      document.getElementById('displayGroup').style.background = myGroup.color + '22';
      document.getElementById('displayGroup').style.color = myGroup.color;
    }

    // Find this team's score from groupScores
    const teamScoreData = data.groupScores.find(g => g.id === myGroupId);
    if (teamScoreData) {
      document.getElementById('teamScore').textContent = teamScoreData.total;
      // Team rank
      const teamRanked = data.groupScores.filter(g => g.total > 0).sort((a, b) => b.total - a.total);
      const teamRank = teamRanked.findIndex(g => g.id === myGroupId) + 1;
      document.getElementById('teamRank').textContent = teamRank > 0 ? `#${teamRank}` : '#-';

      // Team average is what drives everyone's bonus — spell it out.
      const teamNote = document.getElementById('teamBreakdown');
      if (teamNote) {
        teamNote.textContent =
          `avg ${teamScoreData.average} × ${data.teamBonusRate} = +${teamScoreData.bonus} each`;
      }
    }
  }
});

// ── Login ─────────────────────────────────────────────────────────────
function login() {
  const name = document.getElementById('studentName').value.trim();
  if (!name) { showToast('Please enter your name to join.', 'warn'); return; }
  // Save credentials so refresh doesn't log them out
  localStorage.setItem('utp_student', JSON.stringify({ name }));
  emitLogin({ name });
}

// ── Logout ────────────────────────────────────────────────────────────
async function logout() {
  const ok = await showConfirm('Log out and switch to a different name?', {
    confirmText: 'Log out',
  });
  if (!ok) return;
  // Tell the server we're leaving so we drop off the active roster.
  socket.emit('student:logout');
  localStorage.removeItem('utp_student');
  document.getElementById('loginScreen').classList.remove('hidden');
  document.getElementById('studentApp').classList.add('hidden');
  document.getElementById('studentName').value = '';
  currentStudent = null;
}

// ── Mini Leaderboard ─────────────────────────────────────────────────
function updateMiniLeaderboard() {
  const container = document.getElementById('miniLeaderboard');
  const ranked = allStudentScores
    .filter(s => s.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  if (ranked.length === 0) {
    container.innerHTML = '<div class="loading-text">No scores yet. Start answering quizzes!</div>';
    return;
  }

  container.innerHTML = ranked.map((s, i) => {
    const group = groups.find(g => g.id === s.group_id);
    return `<div class="leaderboard-item">
      <span class="lb-rank">#${i + 1}</span>
      <span class="lb-name">${s.name} ${group ? `<span style="font-size:0.7rem;color:${group.color};">(${group.name})</span>` : ''}</span>
      <span class="lb-score">${s.total} pts</span>
    </div>`;
  }).join('');
}

// Dashboard data is now broadcast automatically via debounced server broadcast
// No need for individual points:update listener