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

// -------- CANVAS RESIZE --------
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

// -------- PHYSICS --------
const gravity = 2200;
const moveSpeed = 320;
const jumpForce = 780;
const friction = 0.85;

const keys = { left:false, right:false, jump:false };

const player = {
  x: 80, y: 0,
  w: 90, h: 135,
  vx: 0, vy: 0,
  grounded: false
};

// -------- IMAGES (NO SQUISH) --------
const playerImg = new Image();
playerImg.src = "https://github.com/KN1GHTW1NG/16March/raw/refs/heads/main/assets/IMG_2114.png";
let playerReady = false;
playerImg.onload = () => (playerReady = true);

const carImg = new Image();
carImg.src = "assets/IMG_2121.png";
let carReady = false;
carImg.onload = () => (carReady = true);

// -------- LEVEL (REAL PITS) --------
let groundY = 0;
let platforms = [];
let clouds = [];
let ledges = [];
let crates = [];

const goal = { x: 3050, w: 150 }; // width fixed; height from aspect ratio

function buildLevel() {
  groundY = H - 140;

  // These create REAL gaps between them (pits)
  platforms = [
  { x: 0,    w: 300 },
  { x: 380,  w: 260 },
  { x: 720,  w: 260 },
  { x: 1060, w: 260 },
  { x: 1400, w: 260 },
  { x: 1740, w: 320 }
];
// Floating ledges (mid-air)
ledges = [
  { x: 260,  y: groundY - 150, w: 140, h: 18 },
  { x: 690,  y: groundY - 210, w: 160, h: 18 },
  { x: 980,  y: groundY - 160, w: 140, h: 18 },
  { x: 1320, y: groundY - 230, w: 170, h: 18 },
  { x: 1680, y: groundY - 175, w: 150, h: 18 }
];

// Crates (solid obstacles)
crates = [
  { x: 430,  y: groundY - 48, w: 44, h: 44 },
  { x: 860,  y: groundY - 48, w: 44, h: 44 },
  { x: 1120, y: groundY - 48, w: 44, h: 44 },
  { x: 1550, y: groundY - 48, w: 44, h: 44 }
];
  clouds = [
    { x: 140,  y: 80,  s: 1.00 },
    { x: 520,  y: 55,  s: 0.85 },
    { x: 980,  y: 92,  s: 1.10 },
    { x: 1420, y: 70,  s: 0.90 },
    { x: 1900, y: 85,  s: 1.05 },
  ];
}

// -------- INPUT --------
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

// D-pad hold (not sticky)
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

// -------- GAME LOOP --------
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

  // ✅ LAND ONLY IF FEET OVER A PLATFORM SEGMENT
  const feetX1 = player.x + 10;
  const feetX2 = player.x + player.w - 10;

  for (const p of platforms) {
  const px1 = p.x;
  const px2 = p.x + p.w;

  const overlap = feetX2 > px1 && feetX1 < px2;
  if (!overlap) continue;

  const top = groundY;
  const feetY = player.y + player.h;
  const prevFeetY = (player.y - player.vy * dt) + player.h;

  // land only if crossing the top from above
  if (prevFeetY <= top && feetY >= top && player.vy >= 0) {
    player.y = top - player.h;
    player.vy = 0;
    player.grounded = true;
  }
}
// --- Ledge landing (mid-air platforms) ---
for (const l of ledges) {
  const px1 = l.x, px2 = l.x + l.w;
  const overlap = feetX2 > px1 && feetX1 < px2;
  if (!overlap) continue;

  const top = l.y;
  const feetY = player.y + player.h;
  const prevFeetY = (player.y - player.vy * dt) + player.h;

  if (prevFeetY <= top && feetY >= top && player.vy >= 0) {
    player.y = top - player.h;
    player.vy = 0;
    player.grounded = true;
  }
}

// --- Crate collisions (stand on top + basic side block) ---
for (const c of crates) {
  const px1 = c.x, px2 = c.x + c.w;
  const py1 = c.y, py2 = c.y + c.h;

  // AABB overlap test
  const overlapX = player.x + player.w > px1 && player.x < px2;
  const overlapY = player.y + player.h > py1 && player.y < py2;
  if (!overlapX || !overlapY) continue;

  const prevX = player.x - player.vx * dt;
  const prevY = player.y - player.vy * dt;

  // coming from above -> land on crate
  const prevFeetY = prevY + player.h;
  if (prevFeetY <= py1 && player.vy >= 0) {
    player.y = py1 - player.h;
    player.vy = 0;
    player.grounded = true;
    continue;
  }

  // basic left/right block
  if (prevX + player.w <= px1) {
    player.x = px1 - player.w;
    player.vx = 0;
  } else if (prevX >= px2) {
    player.x = px2;
    player.vx = 0;
  }
}
  // ✅ FALL INTO PIT -> RESET
  if (player.y > H + 250) respawn();

  // Camera follow
  cameraX = player.x - 150;

  // Win
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

  // BIG V2 watermark to confirm this file is running
  ctx.fillStyle = "rgba(0,0,0,0.10)";
  ctx.font = "900 52px system-ui";
  ctx.fillText("V2", 18, 70);

  ctx.save();
  ctx.translate(-cameraX, 0);

  drawClouds();
drawGrassPlatforms();
drawLedges();
drawCrates();
drawGoalCar();
drawPlayer();
  ctx.restore();
}

function drawClouds() {
  for (const c of clouds) {
    const x = c.x, y = c.y, s = c.s;

    // shadow
    ctx.fillStyle = "rgba(0,0,0,0.06)";
    ellipse(x + 30*s, y + 22*s, 85*s, 18*s);

    // cloud
    ctx.fillStyle = "rgba(255,255,255,0.96)";
    ellipse(x, y, 60*s, 30*s);
    ellipse(x + 38*s, y - 10*s, 54*s, 28*s);
    ellipse(x + 80*s, y, 70*s, 34*s);
    ellipse(x + 42*s, y + 12*s, 90*s, 34*s);
  }
}

function ellipse(cx, cy, w, h) {
  ctx.beginPath();
  ctx.ellipse(cx, cy, w/2, h/2, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawGrassPlatforms() {
  for (const p of platforms) {
    const x = p.x, w = p.w;

    // dirt
    ctx.fillStyle = "#7a4b2a";
    ctx.fillRect(x, groundY + 24, w, 140 - 24);

    // grass shiny gradient
    const g = ctx.createLinearGradient(0, groundY, 0, groundY + 34);
    g.addColorStop(0, "#58f09a");
    g.addColorStop(1, "#2aa65f");
    ctx.fillStyle = g;
    ctx.fillRect(x, groundY, w, 28);

    // shine line
    ctx.fillStyle = "rgba(255,255,255,0.28)";
    ctx.fillRect(x, groundY + 2, w, 3);

    // lip shadow
    ctx.fillStyle = "rgba(0,0,0,0.10)";
    ctx.fillRect(x, groundY + 26, w, 4);

    // blades
    ctx.strokeStyle = "rgba(0,0,0,0.10)";
    ctx.lineWidth = 1;
    for (let i = x + 6; i < x + w - 6; i += 14) {
      ctx.beginPath();
      ctx.moveTo(i, groundY + 26);
      ctx.lineTo(i + 3, groundY + 14);
      ctx.stroke();
    }
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
  const drawH = drawW / ratio; // preserve aspect
  const x = Math.round(goal.x);
  const y = Math.round(groundY - drawH); // touches ground
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(carImg, x, y, Math.round(drawW), Math.round(drawH));
}

function drawPlayer() {
  if (!playerReady) {
    ctx.fillStyle = "red";
    ctx.fillRect(player.x, player.y, player.w, player.h);
    return;
  }
  const ratio = playerImg.width / playerImg.height;
  const drawH = player.h;
  const drawW = drawH * ratio; // preserve aspect
  const x = Math.round(player.x + player.w/2 - drawW/2);
  const y = Math.round(player.y);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(playerImg, x, y, Math.round(drawW), Math.round(drawH));
}
function drawLedges() {
  for (const l of ledges) {
    // soft shadow
    ctx.fillStyle = "rgba(0,0,0,0.12)";
    ctx.fillRect(l.x + 2, l.y + 6, l.w, l.h);

    // ledge body
    const g = ctx.createLinearGradient(0, l.y, 0, l.y + l.h);
    g.addColorStop(0, "#f4d6b5");
    g.addColorStop(1, "#d3a679");
    ctx.fillStyle = g;
    ctx.fillRect(l.x, l.y, l.w, l.h);

    // highlight
    ctx.fillStyle = "rgba(255,255,255,0.22)";
    ctx.fillRect(l.x, l.y + 2, l.w, 2);
  }
}

function drawCrates() {
  for (const c of crates) {
    // shadow
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    ctx.fillRect(c.x + 3, c.y + 6, c.w, c.h);

    // crate
    const g = ctx.createLinearGradient(0, c.y, 0, c.y + c.h);
    g.addColorStop(0, "#c98a4a");
    g.addColorStop(1, "#9b5f2c");
    ctx.fillStyle = g;
    ctx.fillRect(c.x, c.y, c.w, c.h);

    // simple “wood plank” lines
    ctx.strokeStyle = "rgba(0,0,0,0.18)";
    ctx.lineWidth = 2;
    ctx.strokeRect(c.x + 2, c.y + 2, c.w - 4, c.h - 4);
    ctx.beginPath();
    ctx.moveTo(c.x + 6, c.y + c.h/2);
    ctx.lineTo(c.x + c.w - 6, c.y + c.h/2);
    ctx.stroke();
  }
}
// Overlay buttons
replayBtn?.addEventListener("click", respawn);
continueBtn?.addEventListener("click", () => {
  window.location.href = "cargame.html";
});

// ---------------- CLEAN SMOOTH 10 SECOND COUNTDOWN ----------------

resize();

window.addEventListener("load", function() {

  const loadingEl = document.getElementById("loading");
  const loadPctEl = document.getElementById("loadPct");
  const loadFillEl = document.getElementById("loadFill");

  const totalTime = 10000;
  const startTime = Date.now();

  if (loadingEl) loadingEl.classList.remove("hidden");

  const timer = setInterval(function() {

    const elapsed = Date.now() - startTime;
    const remaining = Math.max(0, totalTime - elapsed);

    const seconds = Math.ceil(remaining / 1000);
    const progress = Math.min(1, elapsed / totalTime);

    if (loadPctEl) loadPctEl.textContent = seconds + "s";
    if (loadFillEl) loadFillEl.style.width = (progress * 100) + "%";

    if (elapsed >= totalTime) {
      clearInterval(timer);
      if (loadingEl) loadingEl.classList.add("hidden");
      requestAnimationFrame(loop);
    }

  }, 30);

});