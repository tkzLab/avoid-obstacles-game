const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const starsCollectedEl = document.getElementById("starsCollected");
const bestEl = document.getElementById("best");
const stageEl = document.getElementById("stage");
const stageNameEl = document.getElementById("stageName");
const meterFill = document.getElementById("meterFill");
const overlay = document.getElementById("overlay");
const overlayTitle = document.getElementById("overlayTitle");
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
const bestKey = "starDashBestStars";
const goalStars = 10;
const stages = [
  { name: "しゅっぱつ！", speed: 240, obstacleGap: 1.25, pairs: false },
  { name: "はやく なってきた！", speed: 300, obstacleGap: 0.98, pairs: false },
  { name: "あと すこし！", speed: 365, obstacleGap: 0.76, pairs: true },
];

const state = {
  mode: "ready",
  lane: 2,
  targetX: 0,
  obstacles: [],
  particles: [],
  backgroundStars: [],
  collectibles: [],
  starsCollected: 0,
  speed: stages[0].speed,
  spawnTimer: 0,
  starTimer: 0,
  lastTime: 0,
  best: Number(localStorage.getItem(bestKey) || 0),
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
  state.collectibles = [];
  state.particles = [];
  state.starsCollected = 0;
  state.speed = stages[0].speed;
  state.spawnTimer = 0.9;
  state.starTimer = 0.45;
  state.lastTime = performance.now();
  overlay.classList.add("hidden");
  pauseButton.textContent = "II";
  pauseButton.setAttribute("aria-label", "いちじていし");
  updateHud();
}

function makeBackgroundStars() {
  state.backgroundStars = Array.from({ length: 90 }, () => ({
    x: Math.random() * W,
    y: Math.random() * H,
    r: Math.random() * 1.8 + 0.4,
    speed: Math.random() * 70 + 40,
    alpha: Math.random() * 0.55 + 0.25,
  }));
}

function spawnObstacle() {
  const stage = currentStage();
  const occupied = new Set();
  const amount = stage.pairs && Math.random() > 0.6 ? 2 : 1;

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

function spawnCollectible() {
  const openLanes = Array.from({ length: laneCount }, (_, lane) => lane)
    .filter((lane) => !state.obstacles.some((obstacle) => obstacle.lane === lane && obstacle.y < 160));
  const lane = openLanes.length ? openLanes[Math.floor(Math.random() * openLanes.length)] : Math.floor(Math.random() * laneCount);
  state.collectibles.push({ lane, x: laneCenter(lane), y: -42, spin: Math.random() * Math.PI * 2 });
}

function moveLane(direction) {
  if (state.mode !== "playing") return;
  state.lane = Math.max(0, Math.min(laneCount - 1, state.lane + direction));
  state.targetX = laneCenter(state.lane);
}

function setOverlay(title, message, buttonText) {
  overlayTitle.textContent = title;
  messageEl.textContent = message;
  startButton.textContent = buttonText;
  overlay.classList.remove("hidden");
}

function currentStage() {
  if (state.starsCollected >= 7) return stages[2];
  if (state.starsCollected >= 3) return stages[1];
  return stages[0];
}

function stageNumber() {
  return stages.indexOf(currentStage()) + 1;
}

function updateHud() {
  starsCollectedEl.textContent = state.starsCollected;
  stageEl.textContent = stageNumber();
  stageNameEl.textContent = currentStage().name;
  meterFill.style.width = `${(state.starsCollected / goalStars) * 100}%`;
}

function burst(color = "#ffc857") {
  for (let i = 0; i < 16; i++) {
    state.particles.push({
      x: state.targetX,
      y: playerY,
      vx: Math.cos((Math.PI * 2 * i) / 16) * (70 + Math.random() * 140),
      vy: Math.sin((Math.PI * 2 * i) / 16) * (70 + Math.random() * 140),
      life: 0.55 + Math.random() * 0.35,
      color,
    });
  }
}

function endGame() {
  state.mode = "over";
  state.best = Math.max(state.best, state.starsCollected);
  localStorage.setItem(bestKey, String(state.best));
  bestEl.textContent = state.best;

  burst("#ff6b6b");

  setOverlay("おしまい！", `ほしを ${state.starsCollected}こ あつめたよ。もういちど たびにでよう！`, "もういちど");
}

function finishGame() {
  state.mode = "clear";
  state.best = Math.max(state.best, state.starsCollected);
  localStorage.setItem(bestKey, String(state.best));
  bestEl.textContent = state.best;
  burst("#6dde8a");
  setOverlay("やったね！", "10この ほしを あつめたよ。すてきな うちゅうのたび だったね！", "もういちど");
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

  for (const star of state.backgroundStars) {
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
  const stage = currentStage();
  state.speed += (stage.speed - state.speed) * Math.min(1, dt * 1.8);
  state.spawnTimer -= dt;
  state.starTimer -= dt;

  if (state.spawnTimer <= 0) {
    spawnObstacle();
    state.spawnTimer = stage.obstacleGap + Math.random() * 0.28;
  }
  if (state.starTimer <= 0) {
    spawnCollectible();
    state.starTimer = 0.8 + Math.random() * 0.42;
  }

  for (const obstacle of state.obstacles) {
    obstacle.y += state.speed * dt;
    obstacle.spin += obstacle.spinSpeed * dt * 4;
  }
  state.obstacles = state.obstacles.filter((obstacle) => obstacle.y < H + 100);
  for (const star of state.collectibles) {
    star.y += state.speed * dt * 0.9;
    star.spin += dt * 4;
  }
  state.collectibles = state.collectibles.filter((star) => star.y < H + 80);

  const playerRadius = 28;
  for (const obstacle of state.obstacles) {
    const dx = obstacle.x - state.targetX;
    const dy = obstacle.y - playerY;
    const hitDistance = obstacle.size / 2 + playerRadius - 6;
    if (Math.hypot(dx, dy) < hitDistance) {
      endGame();
      return;
    }
  }

  for (let i = state.collectibles.length - 1; i >= 0; i--) {
    const star = state.collectibles[i];
    if (Math.hypot(star.x - state.targetX, star.y - playerY) < 42) {
      state.collectibles.splice(i, 1);
      state.starsCollected += 1;
      burst("#ffc857");
      updateHud();
      if (state.starsCollected >= goalStars) {
        finishGame();
        return;
      }
    }
  }
}

function drawRoad() {
  const road = ctx.createLinearGradient(0, 0, 0, H);
  road.addColorStop(0, "#161f2d");
  road.addColorStop(1, "#0d1119");
  ctx.fillStyle = road;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = "#ffffff";
  for (const star of state.backgroundStars) {
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

function drawCollectible(star) {
  ctx.save();
  ctx.translate(star.x, star.y);
  ctx.rotate(star.spin);
  ctx.fillStyle = "#ffc857";
  ctx.strokeStyle = "#fff4c6";
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const angle = -Math.PI / 2 + (Math.PI * 2 * i) / 10;
    const radius = i % 2 ? 10 : 22;
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
  for (const star of state.collectibles) drawCollectible(star);
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

let touchStartX = null;
canvas.addEventListener("pointerdown", (event) => {
  touchStartX = event.clientX;
});
canvas.addEventListener("pointerup", (event) => {
  if (touchStartX === null) return;
  const distance = event.clientX - touchStartX;
  if (Math.abs(distance) >= 28) moveLane(distance > 0 ? 1 : -1);
  touchStartX = null;
});
canvas.addEventListener("pointercancel", () => { touchStartX = null; });

leftButton.addEventListener("pointerdown", () => moveLane(-1));
rightButton.addEventListener("pointerdown", () => moveLane(1));
startButton.addEventListener("click", () => {
  if (state.mode === "paused") togglePause();
  else resetGame();
});
pauseButton.addEventListener("click", togglePause);

makeBackgroundStars();
state.targetX = laneCenter(state.lane);
updateHud();
draw();
requestAnimationFrame(loop);
