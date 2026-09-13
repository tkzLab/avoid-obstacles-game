const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("score");
const bestEl = document.getElementById("best");
const overlay = document.getElementById("overlay");
const messageEl = document.getElementById("message");
const startButton = document.getElementById("startButton");
const pauseButton = document.getElementById("pauseButton");
const leftButton = document.getElementById("leftButton");
const rightButton = document.getElementById("rightButton");

const W = canvas.width;
const H = canvas.height;
const laneCount = 5;
const laneWidth = W / laneCount;
const playerY = H - 86;
const bestKey = "starDashBestScore";

const state = {
  mode: "ready",
  lane: 2,
  targetX: 0,
  obstacles: [],
  particles: [],
  stars: [],
  score: 0,
  speed: 270,
  spawnTimer: 0,
  lastTime: 0,
  best: Number(localStorage.getItem(bestKey) || 0),
  input: { left: false, right: false },
};

bestEl.textContent = state.best;

function laneCenter(lane) {
  return lane * laneWidth + laneWidth / 2;
}

function resetGame() {
  state.mode = "playing";
  state.lane = 2;
  state.targetX = laneCenter(state.lane);
  state.obstacles = [];
  state.particles = [];
  state.score = 0;
  state.speed = 270;
  state.spawnTimer = 0.35;
  state.lastTime = performance.now();
  overlay.classList.add("hidden");
  pauseButton.textContent = "II";
  pauseButton.setAttribute("aria-label", "いちじていし");
}

function makeStars() {
  state.stars = Array.from({ length: 90 }, () => ({
    x: Math.random() * W,
    y: Math.random() * H,
    r: Math.random() * 1.8 + 0.4,
    speed: Math.random() * 70 + 40,
    alpha: Math.random() * 0.55 + 0.25,
  }));
}

function spawnObstacle() {
  const occupied = new Set();
  const amount = Math.random() > 0.73 ? 2 : 1;

  while (occupied.size < amount) {
    occupied.add(Math.floor(Math.random() * laneCount));
  }

  for (const lane of occupied) {
    const size = Math.random() * 16 + 42;
    state.obstacles.push({
      lane,
      x: laneCenter(lane),
      y: -70,
      size,
      spin: Math.random() * Math.PI,
      spinSpeed: Math.random() * 2 - 1,
    });
  }
}

function moveLane(direction) {
  if (state.mode !== "playing") return;
  state.lane = Math.max(0, Math.min(laneCount - 1, state.lane + direction));
  state.targetX = laneCenter(state.lane);
}

function setOverlay(title, message, buttonText) {
  overlay.querySelector("h1").textContent = title;
  messageEl.textContent = message;
  startButton.textContent = buttonText;
  overlay.classList.remove("hidden");
}

function endGame() {
  state.mode = "over";
  state.best = Math.max(state.best, Math.floor(state.score));
  localStorage.setItem(bestKey, String(state.best));
  bestEl.textContent = state.best;

  for (let i = 0; i < 28; i++) {
    state.particles.push({
      x: state.targetX,
      y: playerY,
      vx: Math.cos((Math.PI * 2 * i) / 28) * (90 + Math.random() * 170),
      vy: Math.sin((Math.PI * 2 * i) / 28) * (90 + Math.random() * 170),
      life: 0.75,
      color: i % 2 ? "#47d7ff" : "#ffc857",
    });
  }

  setOverlay("おしまい！", `${Math.floor(state.score)}てん。よく がんばったね！`, "もういちど");
}

function togglePause() {
  if (state.mode === "playing") {
    state.mode = "paused";
    pauseButton.textContent = ">";
    pauseButton.setAttribute("aria-label", "つづける");
    setOverlay("ひとやすみ", "つづきから あそべるよ。", "つづける");
  } else if (state.mode === "paused") {
    state.mode = "playing";
    state.lastTime = performance.now();
    pauseButton.textContent = "II";
    pauseButton.setAttribute("aria-label", "いちじていし");
    overlay.classList.add("hidden");
  }
}

function update(dt) {
  const active = state.mode === "playing";

  for (const star of state.stars) {
    star.y += star.speed * dt * (active ? 1.6 : 0.25);
    if (star.y > H) {
      star.y = -4;
      star.x = Math.random() * W;
    }
  }

  for (const p of state.particles) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 400 * dt;
    p.life -= dt;
  }
  state.particles = state.particles.filter((p) => p.life > 0);

  if (!active) return;

  state.targetX += (laneCenter(state.lane) - state.targetX) * Math.min(1, dt * 14);
  state.speed += dt * 8;
  state.score += dt * (10 + state.speed / 34);
  state.spawnTimer -= dt;

  if (state.spawnTimer <= 0) {
    spawnObstacle();
    state.spawnTimer = Math.max(0.36, 0.92 - state.speed / 720 + Math.random() * 0.18);
  }

  for (const obstacle of state.obstacles) {
    obstacle.y += state.speed * dt;
    obstacle.spin += obstacle.spinSpeed * dt * 4;
  }
  state.obstacles = state.obstacles.filter((obstacle) => obstacle.y < H + 100);

  const playerRadius = 28;
  for (const obstacle of state.obstacles) {
    const dx = obstacle.x - state.targetX;
    const dy = obstacle.y - playerY;
    const hitDistance = obstacle.size / 2 + playerRadius - 6;
    if (Math.hypot(dx, dy) < hitDistance) {
      endGame();
      break;
    }
  }

  scoreEl.textContent = Math.floor(state.score);
}

function drawRoad() {
  const road = ctx.createLinearGradient(0, 0, 0, H);
  road.addColorStop(0, "#161f2d");
  road.addColorStop(1, "#0d1119");
  ctx.fillStyle = road;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = "#ffffff";
  for (const star of state.stars) {
    ctx.globalAlpha = star.alpha;
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  for (let i = 1; i < laneCount; i++) {
    const x = i * laneWidth;
    ctx.strokeStyle = "rgba(255,255,255,0.13)";
    ctx.lineWidth = 2;
    ctx.setLineDash([18, 22]);
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  }
  ctx.setLineDash([]);
}

function drawPlayer() {
  const x = state.targetX;
  ctx.save();
  ctx.translate(x, playerY);

  const flame = 16 + Math.sin(performance.now() / 70) * 5;
  ctx.fillStyle = "#ffc857";
  ctx.beginPath();
  ctx.moveTo(-12, 28);
  ctx.lineTo(0, 28 + flame);
  ctx.lineTo(12, 28);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#47d7ff";
  ctx.beginPath();
  ctx.moveTo(0, -34);
  ctx.lineTo(28, 28);
  ctx.lineTo(0, 16);
  ctx.lineTo(-28, 28);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#f5f7fb";
  ctx.beginPath();
  ctx.arc(0, -7, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawObstacle(obstacle) {
  ctx.save();
  ctx.translate(obstacle.x, obstacle.y);
  ctx.rotate(obstacle.spin);
  ctx.fillStyle = "#ff5f68";
  ctx.strokeStyle = "#ffc857";
  ctx.lineWidth = 4;
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const angle = (Math.PI * 2 * i) / 8;
    const radius = i % 2 ? obstacle.size * 0.3 : obstacle.size * 0.56;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawParticles() {
  for (const p of state.particles) {
    ctx.globalAlpha = Math.max(0, p.life);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function draw() {
  drawRoad();
  for (const obstacle of state.obstacles) drawObstacle(obstacle);
  drawPlayer();
  drawParticles();
}

function loop(now) {
  const dt = Math.min(0.033, (now - state.lastTime) / 1000 || 0);
  state.lastTime = now;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

document.addEventListener("keydown", (event) => {
  if (event.key === "ArrowLeft" || event.key.toLowerCase() === "a") moveLane(-1);
  if (event.key === "ArrowRight" || event.key.toLowerCase() === "d") moveLane(1);
  if (event.key === " " || event.key === "Enter") {
    event.preventDefault();
    if (state.mode === "ready" || state.mode === "over") resetGame();
    else togglePause();
  }
});

leftButton.addEventListener("pointerdown", () => moveLane(-1));
rightButton.addEventListener("pointerdown", () => moveLane(1));
startButton.addEventListener("click", () => {
  if (state.mode === "paused") togglePause();
  else resetGame();
});
pauseButton.addEventListener("click", togglePause);

makeStars();
state.targetX = laneCenter(state.lane);
draw();
requestAnimationFrame(loop);
