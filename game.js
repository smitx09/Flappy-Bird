// Flappy Bird Game Engine
// Built for pure browser play with zero dependencies

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// DOM Elements
const uiOverlay = document.getElementById('uiOverlay');
const liveScoreEl = document.getElementById('liveScore');
const startScreen = document.getElementById('startScreen');
const pauseScreen = document.getElementById('pauseScreen');
const gameOverScreen = document.getElementById('gameOverScreen');
const startPlayBtn = document.getElementById('startPlayBtn');
const restartBtn = document.getElementById('restartBtn');
const menuBtn = document.getElementById('menuBtn');
const resumeBtn = document.getElementById('resumeBtn');
const soundBtn = document.getElementById('soundBtn');
const soundIcon = document.getElementById('soundIcon');
const pauseBtn = document.getElementById('pauseBtn');
const pauseIcon = document.getElementById('pauseIcon');
const finalScoreEl = document.getElementById('finalScore');
const bestScoreEl = document.getElementById('bestScore');
const medalIconEl = document.getElementById('medalIcon');
const newBestBadge = document.getElementById('newBestBadge');
const birdPreviewEl = document.getElementById('birdPreview');

// Game States
const STATE = {
  MENU: 'MENU',
  READY: 'READY',
  PLAYING: 'PLAYING',
  PAUSED: 'PAUSED',
  GAMEOVER: 'GAMEOVER'
};

let currentState = STATE.MENU;
let score = 0;
let bestScore = parseInt(localStorage.getItem('flappy_best_score') || '0', 10);
let screenShake = 0;
let frames = 0;

// Difficulty Settings
const DIFFICULTY = {
  easy: { gap: 145, speed: 2.2, spawnInterval: 120 },
  normal: { gap: 120, speed: 2.7, spawnInterval: 105 },
  hard: { gap: 98, speed: 3.4, spawnInterval: 90 }
};
let currentDiff = 'normal';

// Bird Skins definition
const SKINS = {
  classic: { name: 'Classic Gold', body: '#facc15', wing: '#eab308', belly: '#fef08a', beak: '#f97316', eye: '#fff', emoji: '🐥' },
  blue: { name: 'Sky Blue', body: '#38bdf8', wing: '#0284c7', belly: '#bae6fd', beak: '#fb923c', eye: '#fff', emoji: '🐦' },
  red: { name: 'Blaze Red', body: '#ef4444', wing: '#b91c1c', belly: '#fecaca', beak: '#f59e0b', eye: '#fff', emoji: '🦜' },
  phoenix: { name: 'Cyber Violet', body: '#a855f7', wing: '#7e22ce', belly: '#f3e8ff', beak: '#06b6d4', eye: '#22d3ee', emoji: '🦇' }
};
let currentSkinKey = 'classic';

// Particles Container
const particles = [];

class Particle {
  constructor(x, y, color, size = 3, vx = (Math.random() - 0.5) * 4, vy = (Math.random() - 0.5) * 4) {
    this.x = x;
    this.y = y;
    this.color = color;
    this.size = size;
    this.vx = vx;
    this.vy = vy;
    this.alpha = 1;
    this.decay = Math.random() * 0.03 + 0.02;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.alpha -= this.decay;
  }

  draw(c) {
    c.save();
    c.globalAlpha = Math.max(0, this.alpha);
    c.fillStyle = this.color;
    c.beginPath();
    c.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    c.fill();
    c.restore();
  }
}

// Bird Object
const bird = {
  x: 75,
  y: 250,
  radius: 14,
  velocity: 0,
  gravity: 0.38,
  jumpStrength: -7.5,
  rotation: 0,
  wingAngle: 0,
  hoverOffset: 0,

  reset() {
    this.x = 75;
    this.y = 250;
    this.velocity = 0;
    this.rotation = 0;
    this.wingAngle = 0;
    this.hoverOffset = 0;
  },

  flap() {
    this.velocity = this.jumpStrength;
    sounds.playJump();

    // Spawn puff particles
    for (let i = 0; i < 4; i++) {
      particles.push(new Particle(
        this.x - 8,
        this.y + 6,
        'rgba(255, 255, 255, 0.7)',
        Math.random() * 3 + 2,
        -(Math.random() * 2 + 1),
        (Math.random() - 0.5) * 2
      ));
    }
  },

  update() {
    if (currentState === STATE.MENU || currentState === STATE.READY) {
      // Gentle floating bob
      this.hoverOffset = Math.sin(frames * 0.08) * 6;
      this.rotation = 0;
      this.wingAngle = Math.sin(frames * 0.2) * 0.35;
      return;
    }

    if (currentState === STATE.PLAYING || currentState === STATE.GAMEOVER) {
      this.velocity += this.gravity;
      this.y += this.velocity;

      // Calculate tilt based on velocity
      if (this.velocity < 0) {
        this.rotation = Math.max(-0.45, this.velocity * 0.07);
        this.wingAngle = Math.sin(frames * 0.3) * 0.45;
      } else {
        this.rotation = Math.min(Math.PI / 2, this.rotation + 0.045);
        this.wingAngle = 0.1;
      }

      // Check ground collision
      const groundY = canvas.height - 85;
      if (this.y + this.radius >= groundY) {
        this.y = groundY - this.radius;
        if (currentState === STATE.PLAYING) {
          triggerGameOver();
        }
      }

      // Ceiling limit
      if (this.y - this.radius <= 0) {
        this.y = this.radius;
        this.velocity = 0;
      }
    }
  },

  draw(c) {
    const skin = SKINS[currentSkinKey];
    const drawY = (currentState === STATE.MENU || currentState === STATE.READY) 
      ? this.y + this.hoverOffset 
      : this.y;

    c.save();
    c.translate(this.x, drawY);
    c.rotate(this.rotation);

    // Drop shadow
    c.fillStyle = 'rgba(0, 0, 0, 0.18)';
    c.beginPath();
    c.ellipse(0, this.radius + 2, this.radius * 0.9, this.radius * 0.4, 0, 0, Math.PI * 2);
    c.fill();

    // Body
    c.fillStyle = skin.body;
    c.beginPath();
    c.ellipse(0, 0, this.radius + 3, this.radius, 0, 0, Math.PI * 2);
    c.fill();
    c.lineWidth = 2;
    c.strokeStyle = '#0f172a';
    c.stroke();

    // Belly highlight
    c.fillStyle = skin.belly;
    c.beginPath();
    c.ellipse(-2, 4, this.radius * 0.65, this.radius * 0.45, 0, 0, Math.PI * 2);
    c.fill();

    // Wing
    c.save();
    c.translate(-4, 0);
    c.rotate(this.wingAngle);
    c.fillStyle = skin.wing;
    c.beginPath();
    c.ellipse(-4, 0, 8, 5, 0.3, 0, Math.PI * 2);
    c.fill();
    c.stroke();
    c.restore();

    // Eye
    c.fillStyle = skin.eye;
    c.beginPath();
    c.arc(7, -4, 5.5, 0, Math.PI * 2);
    c.fill();
    c.stroke();

    // Pupil
    c.fillStyle = '#0f172a';
    c.beginPath();
    c.arc(8.5, -4, 2.5, 0, Math.PI * 2);
    c.fill();

    // Eye sparkle
    c.fillStyle = '#fff';
    c.beginPath();
    c.arc(9.5, -5.5, 1, 0, Math.PI * 2);
    c.fill();

    // Beak
    c.fillStyle = skin.beak;
    c.beginPath();
    c.moveTo(10, -2);
    c.lineTo(19, 2);
    c.lineTo(10, 6);
    c.closePath();
    c.fill();
    c.stroke();

    c.restore();
  }
};

// Pipe Manager
const pipes = [];

class PipePair {
  constructor(x, gap, speed) {
    this.x = x;
    this.width = 56;
    this.gap = gap;
    this.speed = speed;
    this.passed = false;

    // Minimum pipe visible height: 50px
    const minTop = 50;
    const maxTop = (canvas.height - 85) - gap - 50;
    this.topHeight = Math.floor(Math.random() * (maxTop - minTop + 1)) + minTop;
    this.bottomY = this.topHeight + this.gap;
    this.bottomHeight = (canvas.height - 85) - this.bottomY;
  }

  update() {
    this.x -= this.speed;

    // Check score trigger
    if (!this.passed && this.x + this.width < bird.x) {
      this.passed = true;
      score++;
      sounds.playScore();
      updateScoreUI();

      // Confetti particles in gap center
      for (let i = 0; i < 8; i++) {
        particles.push(new Particle(
          bird.x,
          this.topHeight + this.gap / 2,
          ['#fbbf24', '#38bdf8', '#34d399', '#f43f5e'][Math.floor(Math.random() * 4)],
          3,
          (Math.random() - 0.5) * 3,
          (Math.random() - 0.5) * 3
        ));
      }
    }
  }

  draw(c) {
    const pipeColor = '#22c55e';
    const pipeDark = '#15803d';
    const pipeLight = '#86efac';
    const lipHeight = 24;
    const lipOverhang = 3;

    // 1. TOP PIPE
    // Main column
    let gradTop = c.createLinearGradient(this.x, 0, this.x + this.width, 0);
    gradTop.addColorStop(0, pipeDark);
    gradTop.addColorStop(0.25, pipeLight);
    gradTop.addColorStop(0.65, pipeColor);
    gradTop.addColorStop(1, pipeDark);
    c.fillStyle = gradTop;
    c.fillRect(this.x, 0, this.width, this.topHeight - lipHeight);
    c.strokeStyle = '#0f172a';
    c.lineWidth = 2;
    c.strokeRect(this.x, 0, this.width, this.topHeight - lipHeight);

    // Lip collar
    c.fillRect(this.x - lipOverhang, this.topHeight - lipHeight, this.width + lipOverhang * 2, lipHeight);
    c.strokeRect(this.x - lipOverhang, this.topHeight - lipHeight, this.width + lipOverhang * 2, lipHeight);

    // 2. BOTTOM PIPE
    // Lip collar
    c.fillRect(this.x - lipOverhang, this.bottomY, this.width + lipOverhang * 2, lipHeight);
    c.strokeRect(this.x - lipOverhang, this.bottomY, this.width + lipOverhang * 2, lipHeight);

    // Main column
    let gradBottom = c.createLinearGradient(this.x, 0, this.x + this.width, 0);
    gradBottom.addColorStop(0, pipeDark);
    gradBottom.addColorStop(0.25, pipeLight);
    gradBottom.addColorStop(0.65, pipeColor);
    gradBottom.addColorStop(1, pipeDark);
    c.fillStyle = gradBottom;
    c.fillRect(this.x, this.bottomY + lipHeight, this.width, this.bottomHeight - lipHeight);
    c.strokeRect(this.x, this.bottomY + lipHeight, this.width, this.bottomHeight - lipHeight);
  }

  hits(b) {
    // Fair hitboxes with small forgiving threshold
    const buffer = 4;
    const birdLeft = b.x - b.radius + buffer;
    const birdRight = b.x + b.radius - buffer;
    const birdTop = b.y - b.radius + buffer;
    const birdBottom = b.y + b.radius - buffer;

    // Inside X span of pipe
    if (birdRight > this.x - 3 && birdLeft < this.x + this.width + 3) {
      // Hits top pipe
      if (birdTop < this.topHeight) return true;
      // Hits bottom pipe
      if (birdBottom > this.bottomY) return true;
    }
    return false;
  }
}

// Background & Environment
let groundOffset = 0;
let cloudOffset = 0;

function drawBackground(c) {
  // Sky Gradient
  let skyGrad = c.createLinearGradient(0, 0, 0, canvas.height - 85);
  skyGrad.addColorStop(0, '#38bdf8');
  skyGrad.addColorStop(0.7, '#7dd3fc');
  skyGrad.addColorStop(1, '#bae6fd');
  c.fillStyle = skyGrad;
  c.fillRect(0, 0, canvas.width, canvas.height);

  // Parallax Clouds
  c.fillStyle = 'rgba(255, 255, 255, 0.85)';
  const clouds = [
    { x: (cloudOffset * 0.4 + 40) % (canvas.width + 100) - 50, y: 70, s: 30 },
    { x: (cloudOffset * 0.4 + 220) % (canvas.width + 100) - 50, y: 130, s: 45 },
    { x: (cloudOffset * 0.4 + 360) % (canvas.width + 100) - 50, y: 90, s: 25 }
  ];
  clouds.forEach(cl => {
    c.beginPath();
    c.arc(cl.x, cl.y, cl.s * 0.7, 0, Math.PI * 2);
    c.arc(cl.x + cl.s * 0.6, cl.y - cl.s * 0.2, cl.s * 0.8, 0, Math.PI * 2);
    c.arc(cl.x + cl.s * 1.2, cl.y, cl.s * 0.65, 0, Math.PI * 2);
    c.fill();
  });

  // Distant City / Trees Skyline
  const skylineY = canvas.height - 85;
  c.fillStyle = '#6ee7b7';
  c.beginPath();
  c.moveTo(0, skylineY);
  c.lineTo(0, skylineY - 40);
  for (let i = 0; i < canvas.width; i += 35) {
    const hillHeight = 35 + Math.sin(i * 0.05) * 15;
    c.quadraticCurveTo(i + 17, skylineY - hillHeight, i + 35, skylineY - 30);
  }
  c.lineTo(canvas.width, skylineY);
  c.closePath();
  c.fill();

  // Ground Base
  const groundY = canvas.height - 85;
  c.fillStyle = '#ded895';
  c.fillRect(0, groundY, canvas.width, 85);

  // Ground Top Grass Strip
  c.fillStyle = '#73bf2e';
  c.fillRect(0, groundY, canvas.width, 14);
  c.fillStyle = '#559c1c';
  c.fillRect(0, groundY + 12, canvas.width, 3);

  // Moving Ground Diagonal Stripes
  c.fillStyle = '#c7b469';
  const stripeWidth = 14;
  for (let x = -stripeWidth * 2; x < canvas.width + stripeWidth * 2; x += stripeWidth * 2) {
    c.beginPath();
    c.moveTo(x + groundOffset, groundY + 15);
    c.lineTo(x + stripeWidth + groundOffset, groundY + 15);
    c.lineTo(x + stripeWidth - 8 + groundOffset, canvas.height);
    c.lineTo(x - 8 + groundOffset, canvas.height);
    c.closePath();
    c.fill();
  }

  // Border line between ground and game
  c.strokeStyle = '#0f172a';
  c.lineWidth = 2.5;
  c.beginPath();
  c.moveTo(0, groundY);
  c.lineTo(canvas.width, groundY);
  c.stroke();
}

// Game State Transitions
function startGame() {
  sounds.playClick();
  score = 0;
  frames = 0;
  pipes.length = 0;
  particles.length = 0;
  bird.reset();

  currentState = STATE.READY;
  startScreen.classList.add('hidden');
  gameOverScreen.classList.add('hidden');
  pauseScreen.classList.add('hidden');
  updateScoreUI();
}

function triggerGameOver() {
  if (currentState === STATE.GAMEOVER) return;

  currentState = STATE.GAMEOVER;
  screenShake = 16;
  sounds.playHit();
  setTimeout(() => sounds.playDie(), 140);

  // Feather explosion
  const skin = SKINS[currentSkinKey];
  for (let i = 0; i < 24; i++) {
    particles.push(new Particle(
      bird.x,
      bird.y,
      [skin.body, skin.wing, '#fff', skin.beak][Math.floor(Math.random() * 4)],
      Math.random() * 4 + 2,
      (Math.random() - 0.5) * 8,
      (Math.random() - 0.5) * 8
    ));
  }

  // Check High Score
  let isNewBest = false;
  if (score > bestScore) {
    bestScore = score;
    localStorage.setItem('flappy_best_score', bestScore.toString());
    isNewBest = true;
  }

  // Update Game Over UI
  finalScoreEl.textContent = score;
  bestScoreEl.textContent = bestScore;

  if (isNewBest && score > 0) {
    newBestBadge.classList.remove('hidden');
  } else {
    newBestBadge.classList.add('hidden');
  }

  // Assign Medal
  if (score >= 40) medalIconEl.textContent = '💎'; // Diamond / Platinum
  else if (score >= 25) medalIconEl.textContent = '🥇'; // Gold
  else if (score >= 15) medalIconEl.textContent = '🥈'; // Silver
  else if (score >= 5) medalIconEl.textContent = '🥉'; // Bronze
  else medalIconEl.textContent = '🎖️'; // Starter

  setTimeout(() => {
    gameOverScreen.classList.remove('hidden');
  }, 450);
}

function togglePause() {
  if (currentState === STATE.PLAYING) {
    currentState = STATE.PAUSED;
    pauseScreen.classList.remove('hidden');
    pauseIcon.textContent = '▶️';
  } else if (currentState === STATE.PAUSED) {
    currentState = STATE.PLAYING;
    pauseScreen.classList.add('hidden');
    pauseIcon.textContent = '⏸️';
  }
}

function updateScoreUI() {
  liveScoreEl.textContent = score;
  liveScoreEl.classList.remove('pop');
  void liveScoreEl.offsetWidth; // Force reflow
  liveScoreEl.classList.add('pop');
}

// User Action (Flap / Start)
function handleAction() {
  sounds.init();

  if (currentState === STATE.MENU) {
    startGame();
  } else if (currentState === STATE.READY) {
    currentState = STATE.PLAYING;
    bird.flap();
  } else if (currentState === STATE.PLAYING) {
    bird.flap();
  } else if (currentState === STATE.GAMEOVER && !gameOverScreen.classList.contains('hidden')) {
    startGame();
  }
}

// Event Listeners
window.addEventListener('keydown', (e) => {
  if (e.code === 'Space' || e.code === 'ArrowUp') {
    e.preventDefault();
    handleAction();
  } else if (e.code === 'KeyP') {
    e.preventDefault();
    togglePause();
  } else if (e.code === 'KeyM') {
    e.preventDefault();
    soundBtn.click();
  }
});

canvas.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  handleAction();
});

startPlayBtn.addEventListener('click', () => {
  startGame();
});

restartBtn.addEventListener('click', () => {
  startGame();
});

menuBtn.addEventListener('click', () => {
  sounds.playClick();
  currentState = STATE.MENU;
  gameOverScreen.classList.add('hidden');
  startScreen.classList.remove('hidden');
  bird.reset();
  score = 0;
  updateScoreUI();
});

resumeBtn.addEventListener('click', () => {
  togglePause();
});

pauseBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  togglePause();
});

soundBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  const muted = sounds.toggleMute();
  soundIcon.textContent = muted ? '🔇' : '🔊';
});

// Skin Selection
document.querySelectorAll('.skin-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    sounds.playClick();
    document.querySelectorAll('.skin-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentSkinKey = btn.dataset.skin;
    birdPreviewEl.textContent = SKINS[currentSkinKey].emoji;
  });
});

// Difficulty Selection
document.querySelectorAll('.diff-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    sounds.playClick();
    document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentDiff = btn.dataset.diff;
  });
});

// Main Loop
function loop() {
  requestAnimationFrame(loop);

  const diffConfig = DIFFICULTY[currentDiff];

  // Update Game Logic
  if (currentState !== STATE.PAUSED) {
    frames++;

    // Ground & Parallax movement
    const moveSpeed = (currentState === STATE.GAMEOVER) ? 0 : diffConfig.speed;
    groundOffset = (groundOffset - moveSpeed) % 28;
    cloudOffset = cloudOffset - moveSpeed * 0.3;

    bird.update();

    // Pipe Management
    if (currentState === STATE.PLAYING) {
      if (frames % diffConfig.spawnInterval === 0) {
        pipes.push(new PipePair(canvas.width, diffConfig.gap, diffConfig.speed));
      }

      for (let i = pipes.length - 1; i >= 0; i--) {
        const pipe = pipes[i];
        pipe.update();

        // Collision Check
        if (pipe.hits(bird)) {
          triggerGameOver();
        }

        // Remove off-screen pipes
        if (pipe.x + pipe.width < -10) {
          pipes.splice(i, 1);
        }
      }
    }

    // Update Particles
    for (let i = particles.length - 1; i >= 0; i--) {
      particles[i].update();
      if (particles[i].alpha <= 0) {
        particles.splice(i, 1);
      }
    }
  }

  // Render Section
  ctx.save();

  // Screen Shake effect
  if (screenShake > 0) {
    const sx = (Math.random() - 0.5) * screenShake;
    const sy = (Math.random() - 0.5) * screenShake;
    ctx.translate(sx, sy);
    screenShake *= 0.88;
    if (screenShake < 0.5) screenShake = 0;
  }

  // Draw World
  drawBackground(ctx);

  // Draw Pipes
  pipes.forEach(pipe => pipe.draw(ctx));

  // Draw Particles
  particles.forEach(p => p.draw(ctx));

  // Draw Bird
  bird.draw(ctx);

  // Ready State Prompt
  if (currentState === STATE.READY) {
    ctx.save();
    ctx.fillStyle = '#0f172a';
    ctx.font = '700 18px "Press Start 2P", monospace';
    ctx.textAlign = 'center';

    const pulse = 1 + Math.sin(frames * 0.1) * 0.06;
    ctx.translate(canvas.width / 2, 170);
    ctx.scale(pulse, pulse);

    // Outline
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 4;
    ctx.strokeText('GET READY!', 0, 0);
    ctx.fillText('GET READY!', 0, 0);

    ctx.font = '600 14px "Fredoka", sans-serif';
    ctx.fillStyle = '#1e293b';
    ctx.fillText('Tap or press Space to flap', 0, 30);
    ctx.restore();
  }

  ctx.restore();
}

// Initialise Best Score Display on load
bestScoreEl.textContent = bestScore;
birdPreviewEl.textContent = SKINS[currentSkinKey].emoji;

// Start the game loop
loop();
