// --- On-page error reporting (Safari proof) ---
const jsBadge = document.getElementById("jsBadge");
const errBox = document.getElementById("errBox");

window.addEventListener("error", (e) => {
  errBox.classList.remove("hidden");
  errBox.textContent =
    "JS ERROR:\n" +
    (e.message || "unknown") +
    "\n" +
    (e.filename || "") +
    ":" +
    (e.lineno || "");
  jsBadge.textContent = "JS: ERROR";
});

function setBadgeOk() {
  jsBadge.textContent = "JS: LOADED ✅";
  jsBadge.style.background = "rgba(0,184,148,.14)";
  jsBadge.style.color = "rgba(0,110,90,.95)";
}

const canvas = document.getElementById("cv");
const ctx = canvas.getContext("2d");

// HUD
const fillEl = document.getElementById("fill");
const pctEl = document.getElementById("pct");
const mEl = document.getElementById("m");

// Controls
const leftBtn = document.getElementById("leftBtn");
const rightBtn = document.getElementById("rightBtn");
const jumpBtn = document.getElementById("jumpBtn");

const winOverlay = document.getElementById("win");
const replayBtn = document.getElementById("replay");
const continueBtn = document.getElementById("continue");

setBadgeOk();

// --- Canvas sizing (DPR) ---
let W = 0, H = 0, DPR = 1;

function resize() {
  DPR = Math.max(1, Math.min(3, window.devicePixelRatio || 1));

  const cssW = Math.min(520, window.innerWidth - 20);
  const cssH = Math.min(window.innerHeight * 0.78, 780);

  canvas.style.width = cssW + "px";
  canvas.style.height = cssH + "px";

  canvas.width = Math.floor(cssW * DPR);
  canvas.height = Math.floor(cssH * DPR);

  W = cssW;
  H = cssH;

  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

  buildLevel();
  respawn();
}
window.addEventListener("resize", resize);

// --- Physics ---
const gravity = 2200;
const moveSpeed = 320;
const jumpForce = 780;
const friction = 0.85;

const keys = { left:false, right:false, jump:false };

const player = { x:80, y:0, w:90, h:135, vx:0, vy:0, grounded:false };

// --- Character image (NO SQUISH: we preserve aspect ratio) ---
const playerImg = new Image();
playerImg.src = "https://github.com/KN1GHTW1NG/16March/raw/refs/heads/main/assets/IMG_2114.png";
let imgReady = false;
playerImg.onload = () => (imgReady = true);

// --- Goal car PNG (NO SQUISH: preserve aspect ratio) ---
const carImg = new Image();
carImg.src = "assets/IMG_2121.png";
let carReady = false;
carImg.onload = () => (carReady = true);

// --- Level ---
let groundY = 0;

// We store platforms as rectangles now (same widths as before, but pits are real)
let platforms = [];

// Clouds (simple parallax)
let clouds = [];

const goal = { x: 2050, w: 150 }; // width on screen; height auto by aspect ratio

function buildLevel() {
  groundY = H - 140;

  // Same segments you had (these create pits between them)
  platforms = [
    { x: 0,    w: 300, h: 140 },
    { x: 380,  w: 260, h: 140 },
    { x: 720,  w: 260, h: 140 },
    { x: 1060, w: 260, h: 140 },
    { x: 1400, w: 260, h: 140 },
    { x: 1740, w: 320, h: 140 }
  ];

  // Clouds positions (fixed world coords)
  clouds = [
    { x: 120,  y: 80,  s: 1.0 },
    { x: 520,  y: 60,  s: 0.85 },
    { x: 980,  y: 95,  s: 1.15 },
    { x: 1420, y: 70,  s: 0.9 },
    { x: 1900, y: 85,  s: 1.05 }
  ];
}

// --- Input ---
document.addEventListener("keydown", (e) => {
  if (e.key === "ArrowLeft" || e.key === "a") keys.left = true;
  if (e.key === "ArrowRight" || e.key === "d") keys.right = true;
  if (e.key === " " || e.key === "ArrowUp") keys.jump = true;
});
document.addEventListener("keyup", (e) => {
  if (e.key === "ArrowLeft" || e.key === "a") keys.left = false;
  if (e.key === "ArrowRight" || e.key === "d") keys.right = false;
  if (e.key === " " || e.key === "ArrowUp") keys.jump = false;
});

function hold(btn, down, up) {
  if (!btn) return;
  btn.addEventListener("pointerdown", (e)=>{ e.preventDefault(); down(); });
  btn.addEventListener("pointerup", (e)=>{ e.preventDefault(); up(); });
  btn.addEventListener("pointercancel", (e)=>{ e.preventDefault(); up(); });
  btn.addEventListener("pointerleave", (e)=>{ e.preventDefault(); up(); });
}

hold(leftBtn,  ()=>keys.left=true,  ()=>keys.left=false);
hold(rightBtn, ()=>keys.right=true, ()=>keys.right=false);

if (jumpBtn) {
  jumpBtn.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    if (player.grounded) {
      player.vy = -jumpForce;
      player.grounded = false;
    }
  });
}

// --- Game loop ---
let cameraX = 0;
let last = performance.now();
let finished = false;

function respawn() {
  player.x = 80;
  player.y = groundY - player.h;
  player.vx = 0;
  player.vy = 0;
  player.grounded = true;
  cameraX = 0;
  finished = false;
  winOverlay.classList.add("hidden");
  updateHUD();
}

function loop(now) {
  const dt = Math.min(0.033, (now - last) / 1000);
  last = now;

  update(dt);
  draw();

  requestAnimationFrame(loop);
}

function update(dt) {
  if (finished) return;

  // Horizontal
  if (keys.left) player.vx = -moveSpeed;
  else if (keys.right) player.vx = moveSpeed;
  else player.vx *= friction;

  // Jump
  if (keys.jump && player.grounded) {
    player.vy = -jumpForce;
    player.grounded = false;
  }

  // Gravity
  player.vy += gravity * dt;

  // Integrate
  player.x += player.vx * dt;
  player.y += player.vy * dt;

  player.grounded = false;

  // ✅ REAL PIT LOGIC:
  // We only land if our feet are above a platform segment.
  for (let p of platforms) {
    const px1 = p.x, px2 = p.x + p.w;
    const feetX1 = player.x + 6;
    const feetX2 = player.x + player.w - 6;

    const overlap =
      feetX2 > px1 && feetX1 < px2;

    const platformTop = groundY;

    if (
      overlap &&
      player.y + player.h >= platformTop &&
      player.y + player.h <= platformTop + 40 &&
      player.vy >= 0
    ) {
      player.y = platformTop - player.h;
      player.vy = 0;
      player.grounded = true;
    }
  }

  // Fall reset (if fell into pit)
  if (player.y > H + 220) respawn();

  // Camera follow
  cameraX = player.x - 150;

  // Win trigger
  if (player.x > goal.x) {
    finished = true;
    winOverlay.classList.remove("hidden");
  }

  updateHUD();
}

function updateHUD() {
  const prog = Math.max(0, Math.min(1, player.x / (goal.x + 200)));
  fillEl.style.width = (prog * 100).toFixed(0) + "%";
  pctEl.textContent = Math.floor(prog * 100) + "%";
  mEl.textContent = Math.floor(player.x / 10) + "m";
}

function draw() {
  ctx.clearRect(0, 0, W, H);

  // Sky
  ctx.fillStyle = "#87CEEB";
  ctx.fillRect(0, 0, W, H);

  ctx.save();
  ctx.translate(-cameraX, 0);

  // Clouds
  drawClouds();

  // Grass platforms with shine + blades
  drawGrassPlatforms();

  // Goal car PNG (no squish)
  drawGoalCar();

  // Player (no squish)
  drawPlayer();

  ctx.restore();
}

function drawClouds() {
  for (const c of clouds) {
    const x = c.x;
    const y = c.y;
    const s = c.s;

    ctx.fillStyle = "rgba(255,255,255,0.95)";
    blob(x, y, 48*s, 26*s);
    blob(x + 34*s, y - 8*s, 40*s, 22*s);
    blob(x + 68*s, y, 52*s, 28*s);
    blob(x + 36*s, y + 10*s, 64*s, 28*s);

    // soft shadow under cloud
    ctx.fillStyle = "rgba(0,0,0,0.06)";
    blob(x + 10*s, y + 22*s, 70*s, 14*s);
  }
}

function blob(x, y, w, h) {
  ctx.beginPath();
  ctx.ellipse(x, y, w/2, h/2, 0, 0, Math.PI*2);
  ctx.fill();
}

function drawGrassPlatforms() {
  for (let p of platforms) {
    const x = p.x;
    const y = groundY;
    const w = p.w;
    const h = p.h;

    // dirt base
    ctx.fillStyle = "#7a4b2a";
    ctx.fillRect(x, y + 24, w, h - 24);

    // grass top gradient (shine)
    const g = ctx.createLinearGradient(0, y, 0, y + 40);
    g.addColorStop(0, "#4fe38a");
    g.addColorStop(1, "#2aa65f");
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, 28);

    // grass lip highlight
    ctx.fillStyle = "rgba(255,255,255,0.25)";
    ctx.fillRect(x, y + 2, w, 3);

    // blades (simple strokes)
    ctx.strokeStyle = "rgba(0,0,0,0.10)";
    ctx.lineWidth = 1;
    const step = 14;
    for (let i = x + 6; i < x + w - 6; i += step) {
      ctx.beginPath();
      ctx.moveTo(i, y + 26);
      ctx.lineTo(i + 3, y + 14);
      ctx.stroke();
    }

    // shadow under grass lip
    ctx.fillStyle = "rgba(0,0,0,0.10)";
    ctx.fillRect(x, y + 26, w, 4);
  }
}

function drawGoalCar() {
  if (!carReady) {
    ctx.fillStyle = "pink";
    ctx.fillRect(goal.x, groundY - 80, goal.w, 80);
    return;
  }

  const ratio = carImg.width / carImg.height;

  const drawW = goal.w;
  const drawH = drawW / ratio; // preserve aspect ratio => no squish

  const x = Math.round(goal.x);
  const y = Math.round(groundY - drawH); // bottom touches ground

  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(carImg, x, y, Math.round(drawW), Math.round(drawH));
}

function drawPlayer() {
  if (!imgReady) {
    ctx.fillStyle = "red";
    ctx.fillRect(player.x, player.y, player.w, player.h);
    return;
  }

  const ratio = playerImg.width / playerImg.height;
  const drawH = player.h;
  const drawW = drawH * ratio; // preserve aspect ratio => no squish

  const x = Math.round(player.x + player.w / 2 - drawW / 2);
  const y = Math.round(player.y);

  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(playerImg, x, y, Math.round(drawW), Math.round(drawH));
}

// Overlay buttons
replayBtn?.addEventListener("click", respawn);
continueBtn?.addEventListener("click", () => {
  window.location.href = "cargame.html";
});

// INIT
resize();
requestAnimationFrame(loop);