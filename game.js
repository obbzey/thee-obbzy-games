// ==================== OBBZY GAMES — game.js ====================
// Storage key prefix
const STORE = 'obbzy_';
const SECRET_CODES = {
  1: '16',
  2: '07',
  3: '20',
  4: '0',
  5: '7'
};

// ==================== STATE ====================
let state = {
  mode: null,           // 'gf' | 'friend'
  friendName: '',
  assignedDoor: null,
  joinTime: null,
  currentChallengeStep: 0,
  challengeAnswers: [],
  currentScreen: 'screen-intro',
  prevScreens: []
};

// ==================== STARS ====================
(function spawnStars() {
  const bg = document.getElementById('stars-bg');
  for (let i = 0; i < 120; i++) {
    const s = document.createElement('div');
    s.className = 'star';
    const size = Math.random() * 3 + 1;
    s.style.cssText = `
      width:${size}px; height:${size}px;
      left:${Math.random() * 100}%;
      top:${Math.random() * 100}%;
      --dur:${(Math.random() * 3 + 2).toFixed(1)}s;
      animation-delay:${(Math.random() * 3).toFixed(1)}s;
    `;
    bg.appendChild(s);
  }
})();

// ==================== SCREEN ROUTER ====================
function showScreen(id, pushHistory = true) {
  document.querySelectorAll('.screen').forEach(s => {
    s.classList.add('hidden');
    s.classList.remove('out');
  });
  const next = document.getElementById(id);
  if (next) {
    next.classList.remove('hidden', 'out');
    if (pushHistory && state.currentScreen !== id) {
      state.prevScreens.push(state.currentScreen);
    }
    state.currentScreen = id;
  }
  const navBack = document.getElementById('nav-back');
  if (navBack) {
    navBack.className = state.prevScreens.length > 0 ? 'nav-back visible' : 'nav-back';
  }
}

function goBack() {
  if (state.prevScreens.length > 0) {
    const prev = state.prevScreens.pop();
    showScreen(prev, false);
  }
}

// ==================== STARTUP DETECTION ====================
window.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  const isFriend = params.get('friend') === '1';

  if (isFriend) {
    state.mode = 'friend';
    showFriendIntro();
  } else {
    state.mode = 'gf';
    // Intro screen is default, gf sees it then their page
    showScreen('screen-intro');
  }
});

// ==================== INTRO SCREEN ====================
function startFromIntro() {
  if (state.mode === 'gf') {
    showGFScreen();
  } else {
    // friend clicked start from intro somehow
    showFriendIntro();
  }
}

// ==================== GIRLFRIEND SCREEN ====================
function showGFScreen() {
  const link = buildInviteLink();
  const el = document.getElementById('gf-link-display');
  if (el) el.textContent = '🔗 ' + link;

  // Check if all 5 friends done
  const joined = getJoined();
  const completed = getCompleted();
  const surpriseBtn = document.getElementById('gf-surprise-btn');
  if (surpriseBtn) {
    if (completed.length >= 5) {
      surpriseBtn.style.display = 'inline-block';
    } else if (completed.length > 0) {
      surpriseBtn.style.display = 'inline-block';
      surpriseBtn.textContent = `🎁 Peek at Surprise (${completed.length}/5 done)`;
    }
  }

  showScreen('screen-gf');
}

function buildInviteLink() {
  const base = window.location.href.split('?')[0];
  return base + '?friend=1';
}

function copyLink() {
  const link = buildInviteLink();
  navigator.clipboard.writeText(link).then(() => {
    showToast('✅ Link copied! Share with your friends 💜');
  }).catch(() => {
    showToast('Copy this: ' + link);
  });
}

// ==================== FRIEND INTRO SCREEN ====================
function showFriendIntro() {
  // Assign door based on join order
  state.joinTime = Date.now();

  const intros = [
    { emoji: '🎀', title: 'You were quick with it! 👋', desc: 'A world built on friendship. Welcome to OBBZY GAMES. One question remains: How well do you really know her? Enter now and show your skills' },
    { emoji: '🌟', title: 'Welcome, Legend! ✨', desc: 'A special game, built with love, is waiting for you. Think you know her well enough to conquer your door? Let\'s find out! OBBZY GAMES awaits.' },
    { emoji: '🎯', title: 'Are you ready?! 🔥', desc: 'TAccess Granted: OBBZY GAMES initialized. Your unique challenge is live at the door. Secure the victory and leave your digital footprint on the map' },
    { emoji: '💫', title: 'A Mystery Awaits! 🗝️', desc: 'The gates to OBBZY GAMES are open. You have been summoned to face the trials of the door. Prove your bond, solve the puzzles, and unlock the secrets she\'s hidden inside!' },
    { emoji: '🎪', title: 'Last One In! 🚀', desc: 'Welcome to the inner circle. OBBZY GAMES is officially live. You\'ve got a unique door and a special challenge ahead. Show us you know her better than anyone else. No pressure—just don\'t miss!' },
  ];

  // Figure out which slot this friend gets (by current join count)
  const joined = getJoined();
  const slotIndex = Math.min(joined.length, 4);
  const intro = intros[slotIndex];

  // Set bg color
  const friendBgs = ['friend-bg-1', 'friend-bg-2', 'friend-bg-3', 'friend-bg-4', 'friend-bg-5'];
  const screen = document.getElementById('screen-friend-intro');
  screen.className = 'screen hidden ' + friendBgs[slotIndex];

  document.getElementById('friend-intro-emoji').textContent = intro.emoji;
  document.getElementById('friend-intro-title').textContent = intro.title;
  document.getElementById('friend-intro-desc').textContent = intro.desc;

  // Store temporary slot for name entry
  state._pendingSlot = slotIndex + 1; // 1-indexed door

  showScreen('screen-friend-intro');
}

function goToNameEntry() {
  showScreen('screen-name');
}

// ==================== NAME ENTRY ====================
function submitName() {
  const input = document.getElementById('name-input');
  const name = input ? input.value.trim() : '';
  if (!name) {
    showToast('Please enter your name! 😊');
    return;
  }
  state.friendName = name;

  // Register in storage
  const doorNum = registerFriend(name, state.joinTime || Date.now());
  state.assignedDoor = doorNum;

  showDoorScreen();
}

// ==================== DOOR ASSIGNMENT + STORAGE ====================
function getJoined() {
  try {
    return JSON.parse(localStorage.getItem(STORE + 'joined') || '[]');
  } catch { return []; }
}

function saveJoined(list) {
  localStorage.setItem(STORE + 'joined', JSON.stringify(list));
}

function getCompleted() {
  try {
    return JSON.parse(localStorage.getItem(STORE + 'completed') || '[]');
  } catch { return []; }
}

function saveCompleted(list) {
  localStorage.setItem(STORE + 'completed', JSON.stringify(list));
}

function registerFriend(name, joinTime) {
  const joined = getJoined();
  // Check if already registered (by name match — simple)
  const existing = joined.find(f => f.name.toLowerCase() === name.toLowerCase());
  if (existing) {
    state.assignedDoor = existing.door;
    return existing.door;
  }
  if (joined.length >= 5) {
    showToast('All 5 spots are taken! 😮');
    return joined[joined.length - 1].door; // fallback
  }
  const door = joined.length + 1; // 1 = first to join
  joined.push({ name, joinTime, door });
  saveJoined(joined);
  return door;
}

function markCompleted(name, door, score) {
  const code = SECRET_CODES[state.assignedDoor] || '???';

  const codeBox = document.createElement('div');
  codeBox.style.marginTop = '20px';
  codeBox.style.fontSize = '1.2rem';
  codeBox.style.color = '#ffd700';
  codeBox.innerHTML = `🔐 Your secret code: <b>${code}</b><br><span style="font-size:0.9rem;">Send this to her 💜</span>`;

  setTimeout(() => {
    const screen = document.getElementById('screen-complete');
    if (screen) screen.appendChild(codeBox);
  }, 300);
  const completed = getCompleted();
  if (!completed.find(f => f.name.toLowerCase() === name.toLowerCase())) {
    completed.push({ name, door, score, time: Date.now() });
    saveCompleted(completed);
  }
}

// ==================== DOOR SCREEN ====================
function showDoorScreen() {
  const door = state.assignedDoor;
  const sub = document.getElementById('doors-sub-text');
  if (sub) sub.textContent = `🎯 Your door is #${door} — only you can open it!`;

  // Update door cards
  for (let i = 1; i <= 5; i++) {
    const card = document.querySelector(`.door-card.door-${i}`);
    const lockEl = document.getElementById(`door-lock-${i}`);
    if (i === door) {
      card.classList.remove('locked');
      if (lockEl) lockEl.textContent = '🔓';
      card.title = 'Your door!';
    } else {
      card.classList.add('locked');
      if (lockEl) lockEl.textContent = '🔒';
    }
  }

  showScreen('screen-doors');
}

function tryDoor(num) {
  if (num !== state.assignedDoor) {
    showToast(`🔒 Door ${num} belongs to someone else!`);
    return;
  }
  startChallenge(num);
}

// ==================== CHALLENGES DATA ====================
const CHALLENGES = {
  1: {
    title: "🎵 The Music Quiz",
    desc: "Think you know her taste in music? This door is all about the songs and vibes she lives by.",
    color: '#ff6b9d',
    bgClass: 'challenge-bg-1',
    steps: [
      {
        type: 'music_choice',
        question: 'She has TWO songs on repeat when the world feels heavy. Which one does she love MORE?',
        options: [
          { emoji: '🎸', title: 'A Little Death', artist: 'The Neighbourhood', value: 'death' },
          { emoji: '🎤', title: 'Mystery of Love', artist: 'Sufjan Stevens', value: 'mystery' },
        ],
        correct: 'death',
        feedback_correct: '✅ Nice start.',
        feedback_wrong: '❌ From the very start? are we fr?.',
      },
      {
        type: 'music_choice',
        question: 'When she feels down and needs to blast music to feel something — which artist does she reach for?',
        options: [
          { emoji: '🌙', title: 'Drake', artist: 'Pop / Hip-Hop', value: 'drake' },
          { emoji: '🎻', title: 'The Neighbourhood', artist: 'Alternative', value: 'neighbourhood' },
        ],
        correct: 'neighbourhood',
        feedback_correct: '✅ That was good ngl.',
        feedback_wrong: '❌ Nah man how could you mess up this badly.',
      },
      {
        type: 'multiple_choice',
        question: 'What\'s the ONE word she uses literally every single day — like, she can\'t stop saying it?',
        options: ['Literally', 'Like', 'Obviously', 'Honestly'],
        correct: 1,
        feedback_correct: '✅ HARDDD',
        feedback_wrong: '❌ Weak ahh choice i think fofi gotta reconsider her choices',
      },
    ]
  },
  2: {
    title: "🎭 The Vibe Check",
    desc: "Every person has a mood. This challenge is about reading HER energy. Are you tuned in?",
    color: '#ffbe0b',
    bgClass: 'challenge-bg-2',
    steps: [
      {
        type: 'word_scramble',
        question: 'Unscramble this word — it describes what she does when feeling overwhelmed 🎶',
        scrambled: 'IBUSCM',
        answer: 'MUSIC',
        hint: '6 letters — what she blasts when the world is too loud',
        feedback_correct: '✅ oscs (on some cool shi).',
        feedback_wrong: '❌ You literally cant make this shi!up, the answer is MUSIC!.',
      },
      {
        type: 'music_choice',
        question: 'Arabic music hits differently. Which song does she vibe with more?',
        options: [
          { emoji: '🌹', title: 'Tamally Maak', artist: 'Amr Diab', value: 'amr' },
          { emoji: '💃', title: 'Bahebak Wala Laa', artist: 'Sherine', value: 'sherine' },
        ],
        correct: 'amr',
        feedback_correct: 'Thats wassup we might have a winner.',
        feedback_wrong: 'Nah man you shouldve known better .',
      },
      {
        type: 'multiple_choice',
        question: 'She loves being around people, but she’s not a people person. She is the loudest one in the room until she is the quietest. What is the one thing that switches her from Party Mode to I need to go home right now?',
        options: ['The unspoken plan', 'Over stimulation', 'Performance Fatigue', 'Annoyance Overload'],
        correct: 3,
        feedback_correct: '✅TTUUUFFFFFF ',
        feedback_wrong: '❌ I smell fakeness',
      },
    ]
  },
  3: {
    title: "🧩 The Memory Vault",
    desc: "Deep cuts only. This door tests if you've been paying attention to the little things about her.",
    color: '#06d6a0',
    bgClass: 'challenge-bg-3',
    steps: [
      {
        type: 'multiple_choice',
        question: 'She has a word she says literally every day without noticing. What is it?',
        options: ['Literally', 'Actually', 'Like', 'Basically'],
        correct: 2,
        feedback_correct: '✅ "GOOD SHI',
        feedback_wrong: '❌ What are yall atp"',
      },
      {
        type: 'multiple_choice',
        question: 'When she\'s feeling down, what\'s her go-to comfort ritual?',
        options: [
          'Watching a comfort show',
          'Eating something sweet',
          'Blasting music really loud',
          'Calling her best friend',
        ],
        correct: 2,
        feedback_correct: '✅ Smooth.',
        feedback_wrong: '❌ you a fake one.',
      },
      {
        type: 'word_scramble',
        question: 'Unscramble her favorite band name 🎸',
        scrambled: 'EHT HHUNGODBEROIO',
        answer: 'THE NEIGHBOURHOOD',
        hint: 'Alternative band, dark-romantic vibes... "A Little Death"?',
        feedback_correct: '✅ THE GAYBOURHOOD!',
        feedback_wrong: '❌ Its literally on her bio.',
      },
    ]
  },
  4: {
    title: "🎤 The Arabic Vibes",
    desc: "She's got a soft spot for Arabic music that hits the soul. How well do you know her ears?",
    color: '#3d9be9',
    bgClass: 'challenge-bg-4',
    steps: [
      {
        type: 'music_choice',
        question: ' Which artist does she prefer?',
        options: [
          { emoji: '🎙️', title: 'Amr Diab', artist: 'King of Mediterranean Music', value: 'amr' },
          { emoji: '🌺', title: 'Sherine', artist: 'Egyptian Pop Queen', value: 'sherine' },
        ],
        correct: 'amr',
        feedback_correct: '✅ Yeah she fw the fake jacked guy unfortunately.',
        feedback_wrong: '❌ Thats literally the base question how could you messed it up.',
      },
      {
        type: 'multiple_choice',
        question: 'When her mood needs a reset, which genre does she turn to FIRST?',
        options: ['Arabic Pop', 'Alternative/Indie', 'Hip-Hop', 'Whatever\'s trending'],
        correct: 1,
        feedback_correct: '✅ The Neighbourhood .',
        feedback_wrong: '❌ I smell fakeness.',
      },
      {
        type: 'emoji_memory',
        question: 'Quick memory game! Match the music emojis to unlock this door 🎵',
        pairs: ['🎸', '🎶', '🎤', '🎹', '🎸', '🎶', '🎤', '🎹'],
        feedback_correct: '✅ TTTTUUUFFFFF!',
        feedback_wrong: '❌ That was too weak icl',
      },
    ]
  },
  5: {
    title: "💜 The Final Boss",
    desc: "Door 5 is the hardest. Reserved for the last one to join — that's you. Prove you know her like no one else.",
    color: '#b06aff',
    bgClass: 'challenge-bg-5',
    steps: [
      {
        type: 'multiple_choice',
        question: '"It’s her birthday and she says, \'Don\'t get me anything, I don\'t need anything.\' What is the only \'correct\' move?',
        options: ['Actually get her nothing', 'Get her something small that she mentioned once six months ago in a random conversation', 'Don\'t buy a gift, but "accidentally" pay for her favorite food/coffee', 'Get her something "practical" that she\'s too lazy to buy for herself (like a new charger or a specific snack)You know'],
        correct: 1,
        feedback_correct: '✅ "That was impresssive!.',
        feedback_wrong: '❌ Yeah i think fofi gotta reconsider her choices',
      },
      {
        type: 'music_choice',
        question: 'Drake vs The Neighbourhood. She\'s feeling down. Who\'s she playing?',
        options: [
          { emoji: '🦉', title: 'Drake', artist: 'Hip-Hop / Pop', value: 'drake' },
          { emoji: '🌑', title: 'The Neighbourhood', artist: '"A Little Death"', value: 'neighbourhood' },
        ],
        correct: 'neighbourhood',
        feedback_correct: '✅ That was tuff.',
        feedback_wrong: '❌ Noway you dont even know this.',
      },
      {
        type: 'music_choice',
        question: 'Arabic showdown — her heart chooses one:',
        options: [
          { emoji: '🌟', title: 'Amr Diab', artist: '"Tamally Maak"', value: 'amr' },
          { emoji: '💐', title: 'Sherine', artist: '"Wana Maak"', value: 'sherine' },
        ],
        correct: 'amr',
        feedback_correct: '✅ Dayumn you actually kinda know her.',
        feedback_wrong: '❌ Nah that was suck you might be a fake one icl just saying .',
      },
    ]
  }
};

// ==================== CHALLENGE ENGINE ====================
let challengeData = null;
let emojiMemoryState = null;

function startChallenge(door) {
  challengeData = CHALLENGES[door];
  state.currentChallengeStep = 0;
  state.challengeAnswers = [];
  emojiMemoryState = null;

  // Set background
  const screen = document.getElementById('screen-challenge');
  screen.className = 'screen hidden ' + challengeData.bgClass;

  document.getElementById('challenge-door-badge').textContent = `DOOR ${door}`;
  document.getElementById('challenge-title').textContent = challengeData.title;
  document.getElementById('challenge-desc').textContent = challengeData.desc;

  renderChallengeStep();
  showScreen('screen-challenge');
}

function renderChallengeStep() {
  const steps = challengeData.steps;
  const step = steps[state.currentChallengeStep];
  const total = steps.length;
  const current = state.currentChallengeStep + 1;

  document.getElementById('progress-fill').style.width = `${((current - 1) / total) * 100}%`;
  document.getElementById('progress-text').textContent = `Question ${current} / ${total}`;

  const content = document.getElementById('challenge-content');
  const nav = document.getElementById('challenge-nav');
  nav.innerHTML = '';

  if (step.type === 'multiple_choice' || step.type === 'emoji_sequence') {
    content.innerHTML = `
      <div class="challenge-card">
        <div class="challenge-question">${step.question}</div>
        <div class="challenge-options" id="options-list">
          ${step.options.map((opt, i) => `
            <div class="challenge-option" onclick="selectOption(${i})" id="opt-${i}">${opt}</div>
          `).join('')}
        </div>
        <div class="challenge-feedback" id="challenge-feedback"></div>
      </div>
    `;
  } else if (step.type === 'music_choice') {
    content.innerHTML = `
      <div class="challenge-card">
        <div class="challenge-question">${step.question}</div>
        <div class="music-choice">
          ${step.options.map((opt, i) => `
            <div class="music-card" onclick="selectMusicOption('${opt.value}', ${i})" id="mopt-${i}" style="color:${challengeData.color}">
              <div class="song-emoji">${opt.emoji}</div>
              <div class="song-title">${opt.title}</div>
              <div class="song-artist">${opt.artist}</div>
            </div>
          `).join('')}
        </div>
        <div class="challenge-feedback" id="challenge-feedback"></div>
      </div>
    `;
  } else if (step.type === 'word_scramble') {
    content.innerHTML = `
      <div class="challenge-card">
        <div class="challenge-question">${step.question}</div>
        <div class="scrambled-word">${step.scrambled}</div>
        <div style="font-size:0.8rem; color:rgba(255,255,255,0.4); text-align:center; margin-bottom:12px;">Hint: ${step.hint}</div>
        <input type="text" class="word-scramble-input" id="scramble-input" placeholder="Your answer..." maxlength="30"
          onkeydown="if(event.key==='Enter') checkScramble()"/>
        <button class="btn btn-cyan" onclick="checkScramble()" style="width:100%">Check Answer ✓</button>
        <div class="challenge-feedback" id="challenge-feedback"></div>
      </div>
    `;
  } else if (step.type === 'emoji_memory') {
    initEmojiMemory(step, content);
  }
}

function selectOption(index) {
  const step = challengeData.steps[state.currentChallengeStep];
  const options = document.querySelectorAll('.challenge-option');
  options.forEach(o => o.style.pointerEvents = 'none');

  const isCorrect = index === step.correct;
  options[index].classList.add(isCorrect ? 'correct' : 'wrong');
  if (!isCorrect) options[step.correct].classList.add('correct');

  showFeedback(isCorrect, step);
  state.challengeAnswers.push(isCorrect);

  setTimeout(() => nextOrFinish(), 2200);
}

function selectMusicOption(value, index) {
  const step = challengeData.steps[state.currentChallengeStep];
  const cards = document.querySelectorAll('.music-card');
  cards.forEach(c => c.style.pointerEvents = 'none');

  const isCorrect = value === step.correct;
  const correctIndex = step.options.findIndex(o => o.value === step.correct);

  cards[index].style.border = `2px solid ${isCorrect ? '#06d6a0' : '#ff2d78'}`;
  cards[correctIndex].style.border = '2px solid #06d6a0';

  showFeedback(isCorrect, step);
  state.challengeAnswers.push(isCorrect);

  setTimeout(() => nextOrFinish(), 2400);
}

function checkScramble() {
  const input = document.getElementById('scramble-input');
  if (!input) return;
  const step = challengeData.steps[state.currentChallengeStep];
  const val = input.value.trim().toUpperCase();
  const isCorrect = val === step.answer.toUpperCase();

  input.style.borderColor = isCorrect ? '#06d6a0' : '#ff2d78';
  showFeedback(isCorrect, step);
  state.challengeAnswers.push(isCorrect);

  const btn = input.nextElementSibling;
  if (btn) btn.style.pointerEvents = 'none';
  input.disabled = true;

  setTimeout(() => nextOrFinish(), 2400);
}

function showFeedback(isCorrect, step) {
  const fb = document.getElementById('challenge-feedback');
  if (!fb) return;
  fb.className = 'challenge-feedback ' + (isCorrect ? 'correct' : 'wrong');
  fb.textContent = isCorrect ? step.feedback_correct : step.feedback_wrong;
}

function nextOrFinish() {
  const steps = challengeData.steps;
  if (state.currentChallengeStep < steps.length - 1) {
    state.currentChallengeStep++;
    renderChallengeStep();
  } else {
    finishChallenge();
  }
}

// ==================== EMOJI MEMORY GAME ====================
function initEmojiMemory(step, container) {
  const pairs = [...step.pairs];
  // Shuffle
  for (let i = pairs.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pairs[i], pairs[j]] = [pairs[j], pairs[i]];
  }

  emojiMemoryState = {
    pairs,
    revealed: new Array(pairs.length).fill(false),
    matched: new Array(pairs.length).fill(false),
    firstPick: null,
    locked: false,
    matchCount: 0,
    totalPairs: pairs.length / 2
  };

  container.innerHTML = `
    <div class="challenge-card">
      <div class="challenge-question">${step.question}</div>
      <div class="emoji-grid" id="emoji-grid">
        ${pairs.map((_, i) => `
          <div class="emoji-tile back" id="tile-${i}" onclick="flipTile(${i})">❓</div>
        `).join('')}
      </div>
      <div style="text-align:center; font-size:0.85rem; color:rgba(255,255,255,0.4);" id="memory-hint">Tap tiles to flip them</div>
      <div class="challenge-feedback" id="challenge-feedback"></div>
    </div>
  `;
}

function flipTile(index) {
  const ms = emojiMemoryState;
  if (!ms || ms.locked || ms.matched[index] || ms.revealed[index]) return;

  const tile = document.getElementById(`tile-${index}`);
  ms.revealed[index] = true;
  tile.textContent = ms.pairs[index];
  tile.classList.remove('back');
  tile.classList.add('flipped');

  if (ms.firstPick === null) {
    ms.firstPick = index;
  } else {
    ms.locked = true;
    const first = ms.firstPick;
    ms.firstPick = null;

    if (ms.pairs[first] === ms.pairs[index] && first !== index) {
      // Match!
      ms.matched[first] = ms.matched[index] = true;
      document.getElementById(`tile-${first}`).classList.add('matched');
      tile.classList.add('matched');
      ms.matchCount++;
      ms.locked = false;
      document.getElementById('memory-hint').textContent = `✅ ${ms.matchCount}/${ms.totalPairs} matched!`;

      if (ms.matchCount === ms.totalPairs) {
        const step = challengeData.steps[state.currentChallengeStep];
        showFeedback(true, step);
        state.challengeAnswers.push(true);
        setTimeout(() => nextOrFinish(), 2000);
      }
    } else {
      // No match
      setTimeout(() => {
        ms.revealed[first] = ms.revealed[index] = false;
        const t1 = document.getElementById(`tile-${first}`);
        t1.textContent = '❓';
        t1.classList.remove('flipped');
        t1.classList.add('back');
        tile.textContent = '❓';
        tile.classList.remove('flipped');
        tile.classList.add('back');
        ms.locked = false;
      }, 1000);
    }
  }
}

// ==================== CHALLENGE COMPLETE ====================

function finishChallenge() {
  const correct = state.challengeAnswers.filter(Boolean).length;
  const total = challengeData.steps.length;
  const score = Math.round((correct / total) * 100);

  markCompleted(state.friendName, state.assignedDoor, score);

  const code = SECRET_CODES[state.assignedDoor] || '???';

  // 1. Create the secret code box
  const codeBox = document.createElement('div');
  codeBox.style.marginTop = '20px';
  codeBox.style.fontSize = '1.2rem';
  codeBox.style.color = '#ffd700';
  codeBox.innerHTML = `🔐 Your secret code: <b>${code}</b><br><span style="font-size:0.9rem;">Send this to her 💜</span>`;

  // 2. Add it to the screen after a short delay
  setTimeout(() => {
    const screen = document.getElementById('screen-complete');
    // Check for existing boxes to prevent duplication
    if (screen && !screen.querySelector('.secret-code-appended')) {
      codeBox.classList.add('secret-code-appended');
      screen.appendChild(codeBox);
    }
  }, 300);

  // 3. Define the messages
  const msgs = {
    100: ['WE GOT A WINNER! 👑', 'You actually know her perfectly. The council approves.'],
    67: ['Great Job! 🌟', 'You know the vibes pretty well! Solid friend material.'],
    33: ['Are yall even friends?... ', 'You got some right, but you might need to pay more attention!'],
    0: ['Yikes', 'Are you sure you guys are friends? Time to take some notes!']
  };

  let msgKey;
  if (score === 100) msgKey = 100;
  else if (score >= 67) msgKey = 67;
  else if (score >= 33) msgKey = 33;
  else msgKey = 0;

  const [title, msg] = msgs[msgKey];

  // 4. Update the UI
  document.getElementById('complete-emoji').textContent = score === 100 ? '🎉' : score >= 67 ? '⭐' : score >= 33 ? '🎯' : '😅';
  document.getElementById('complete-title').textContent = title;
  document.getElementById('complete-msg').textContent = msg;

  if (score >= 67) launchConfetti();

  // 5. This moves the user to the next screen
  showScreen('screen-complete');
}


// ==================== LEADERBOARD ====================
function goToLeaderboard() {
  renderLeaderboard();
  showScreen('screen-leaderboard');
}

function renderLeaderboard() {
  const joined = getJoined().sort((a, b) => a.joinTime - b.joinTime);
  const completed = getCompleted();
  const list = document.getElementById('leaderboard-list');

  const ranks = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];
  const doorColors = ['#ff6b9d', '#ffbe0b', '#06d6a0', '#3d9be9', '#b06aff'];

  if (joined.length === 0) {
    list.innerHTML = '<div class="lb-empty">No friends have joined yet… Share the link! 🔗</div>';
    return;
  }

  list.innerHTML = joined.map((f, i) => {
    const comp = completed.find(c => c.name.toLowerCase() === f.name.toLowerCase());
    const scoreText = comp ? `${comp.score}%` : '⏳';
    return `
      <div class="leaderboard-row">
        <div class="lb-rank">${ranks[i] || (i + 1) + '.'}</div>
        <div class="lb-name">${f.name}</div>
        <div class="lb-door" style="color:${doorColors[i]}">Door ${f.door}</div>
        <div class="lb-time">${scoreText}</div>
      </div>
    `;
  }).join('');
}

// ==================== SURPRISE PAGE (GF) ====================
function goToSurprise() {
  showScreen('screen-surprise');
  setTimeout(renderSurprise, 100);
}

function renderSurprise() {
  const completed = getCompleted();
  const joined = getJoined();

  const msgCard = document.getElementById('surprise-msg-card');
  msgCard.innerHTML = `
    <p>Hey baby 💜</p>
    <p>If you're reading this, it means your friends just finished the game and I hope they made you laugh, maybe cringe a little, and above all reminded you just how well you’re known and loved.</p>
    <p>I built <span class="surprise-highlight">OBBZY GAMES</span> because I wanted to celebrate you in a way that felt as fun and colorful as you are. Every door, every question, every challenge was built around the little things I love about you.</p>
    <p>Your playlist. Your vocabulary. Your heart. Your energy. You\'re a whole atmosphere, and I\'m just glad I get to be in it.</p>
    <p>You're the type of person who makes everyone\'s day better just by showing up. you deserve an entire digital world built in your honor.</p>
    <p>So here it is. Just for you.</p>
    <p style="color:#b06aff; font-weight:700; font-size:1.1rem;">I love you more than words can say. 💜🌹</p>
  `;

  const resultsDiv = document.getElementById('results-summary');
  const resultsList = document.getElementById('results-list');
  const doorColors = ['#ff6b9d', '#ffbe0b', '#06d6a0', '#3d9be9', '#b06aff'];

  if (completed.length > 0) {
    resultsDiv.style.display = 'block';
    resultsList.innerHTML = joined.map((f, i) => {
      const comp = completed.find(c => c.name.toLowerCase() === f.name.toLowerCase());
      return `
        <div class="friend-result-row">
          <span style="color:${doorColors[i]}; font-weight:700;">${f.name}</span>
          <span>Door ${f.door}</span>
          <span style="color:${comp ? '#06d6a0' : 'rgba(255,255,255,0.3)'}">
            ${comp ? comp.score + '%' : 'Not done yet'}
          </span>
        </div>
      `;
    }).join('');
  }
}

// ==================== CONFETTI ====================
function launchConfetti() {
  const colors = ['#b06aff', '#ff2d78', '#ffd700', '#00fff7', '#06d6a0', '#ffbe0b', '#ff6b9d'];
  for (let i = 0; i < 80; i++) {
    const c = document.createElement('div');
    c.className = 'confetti-particle';
    c.style.cssText = `
      left: ${Math.random() * 100}%;
      top: -10px;
      background: ${colors[Math.floor(Math.random() * colors.length)]};
      --dur: ${(Math.random() * 2 + 2).toFixed(1)}s;
      animation-delay: ${(Math.random() * 1).toFixed(2)}s;
      width: ${Math.random() * 8 + 4}px;
      height: ${Math.random() * 8 + 4}px;
      border-radius: ${Math.random() > 0.5 ? '50%' : '2px'};
    `;
    document.body.appendChild(c);
    setTimeout(() => c.remove(), 4000);
  }
}

// ==================== TOAST ====================
function showToast(msg, duration = 3000) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), duration);
}

// ==================== SECRET CODE CHECK ====================
function checkCodes() {
  const codes = [
    document.getElementById('code-1').value.trim().toUpperCase(),
    document.getElementById('code-2').value.trim().toUpperCase(),
    document.getElementById('code-3').value.trim().toUpperCase(),
    document.getElementById('code-4').value.trim().toUpperCase(),
    document.getElementById('code-5').value.trim().toUpperCase()
  ];

  // Your secret correct codes (you can change these)
  const correctCodes = ['16', '07', '20', '0', '7'];

  const errorEl = document.getElementById('code-error');

  // Check if all match
  const isCorrect = codes.every((code, i) => code === correctCodes[i]);

  if (isCorrect) {
    goToSurprise(); // go to your final love letter
  } else {
    errorEl.textContent = '❌ Some codes are wrong… try again 💔';
  }
}

// ==================== INIT URL ====================
// Called on DOMContentLoaded already above
