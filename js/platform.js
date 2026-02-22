const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const progressFill = document.getElementById("progressFill");
const percentEl = document.getElementById("percent");

const leftBtn = document.getElementById("leftBtn");
const rightBtn = document.getElementById("rightBtn");
const jumpBtn = document.getElementById("jumpBtn");

const winBox = document.getElementById("winBox");
const continueBtn = document.getElementById("continueBtn");

// ---------------- Sizing (portrait) ----------------
let W = 0, H = 0;

function resize() {
  const cssW = Math.min(420, window.innerWidth - 20);
  const cssH = Math.min(window.innerHeight * 0.75, 820);

  canvas.width = cssW;
  canvas.height = cssH;

  W = cssW;
  H = cssH;

  groundY = H - 150;
  buildLevel();
  respawn();
}
window.addEventListener("resize", resize);

// ---------------- Images (local) ----------------
const playerImg = new Image();
playerImg.src = "assets/IMG_2114.png";
let playerReady = false;
playerImg.onload = () => (playerReady = true);

const carImg = new Image();
carImg.src = "assets/IMG_2121.png";
let carReady = false;
carImg.onload = () => (carReady = true);

// ---------------- Physics ----------------
const gravity = 2200;
const moveSpeed = 360;
const jumpPower = 920;

let groundY = 0;

const player = {
  x: 80,
  y: 0,
  // collider (game physics box)
  w: 92,
  h: 132,
  vx: 0,
  vy: 0,
  grounded: false
};

// Make character visually bigger without breaking collisions
const spriteScale = 1.35; // bigger “feel” (not squished)

// ---------------- Level ----------------
// Platforms are rectangles you can stand on: {x,y,w,h}
let platforms = [];
let crates = [];
let goalX = 0;

// The goal car should sit on the last platform top:
let goalPlatform = null;

// Safe pits/gaps are built between platforms by spacing x positions.
function buildLevel() {
  const top = groundY;

  platforms = [
    { x: 0,    y: top,      w: 520, h: 44 },          // ground
    { x: 700,  y: top-90,   w: 240, h: 44 },          // ledge
    { x: 1120, y: top,      w: 420, h: 44 },          // ground
    { x: 1700, y: top-110,  w: 260, h: 44 },          // ledge
    { x: 2120, y: top,      w: 520, h: 44 }           // final ground
  ];

  // crates you can land on (standable)
  crates = [
    { x: 820,  y: top-150, w: 64, h: 64 },
    { x: 1270, y: top-64,  w: 64, h: 64 },
    { x: 1830, y: top-190, w: 64, h: 64 }
  ];

  goalPlatform = platforms[platforms.length - 1];
  goalX = goalPlatform.x + goalPlatform.w - 200; // near end of final platform
}

function respawn() {
  player.x = 80;
  player.y = platforms[0].y - player.h;
  player.vx = 0;
  player.vy = 0;
  player.grounded = true;

  cameraX = 0;
  finished = false;

  winBox.classList.add("hidden");
  progressFill.style.width = "0%";
  percentEl.textContent = "0%";
}

// ---------------- Controls ----------------
const keys = { left: false, right: false, jump: false };

document.addEventListener("keydown", (e) => {
  if (e.key === "ArrowLeft" || e.key === "a") keys.left = true;
  if (e.key === "ArrowRight" || e.key === "d") keys.right = true;
  if (e.key === "ArrowUp" || e.key === " ") keys.jump = true;
});
document.addEventListener("keyup", (e) => {
  if (e.key === "ArrowLeft" || e.key === "a") keys.left = false;
  if (e.key === "ArrowRight" || e.key === "d") keys.right = false;
  if (e.key === "ArrowUp" || e.key === " ") keys.jump = false;
});

// Better phone behavior: press and hold
function hold(btn, down, up) {
  if (!btn) return;
  btn.addEventListener("pointerdown", (e) => { e.preventDefault(); down(); });
  btn.addEventListener("pointerup", (e) => { e.preventDefault(); up(); });
  btn.addEventListener("pointercancel", (e) => { e.preventDefault(); up(); });
  btn.addEventListener("pointerleave", (e) => { e.preventDefault(); up(); });
}

hold(leftBtn,  () => (keys.left = true),  () => (keys.left = false));
hold(rightBtn, () => (keys.right = true), () => (keys.right = false));
jumpBtn?.addEventListener("pointerdown", (e) => {
  e.preventDefault();
  if (player.grounded) {
    player.vy = -jumpPower;
    player.grounded = false;
  }
});

// ---------------- Camera ----------------
let cameraX = 0;
function lerp(a, b, t) { return a + (b - a) * t; }

// ---------------- Collision ----------------
function overlap(a, b) {
  return !(
    a.x + a.w <= b.x ||
    a.x >= b.x + b.w ||
    a.y + a.h <= b.y ||
    a.y >= b.y + b.h
  );
}

function standOn(rect) {
  // standing check: player feet cross rect top
  if (
    player.x + player.w > rect.x &&
    player.x < rect.x + rect.w &&
    player.y + player.h >= rect.y &&
    player.y + player.h <= rect.y + 40 &&
    player.vy >= 0
  ) {
    player.y = rect.y - player.h;
    player.vy = 0;
    player.grounded = true;
  }
}

// ---------------- Drawing helpers (lighting) ----------------
function drawSky() {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#87CEEB");
  g.addColorStop(1, "#EAF8FF");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

function drawPit(x1, x2) {
  // dark void with subtle gradient
  const pitTop = 0;
  const pitBottom = H;
  const g = ctx.createLinearGradient(0, groundY, 0, pitBottom);
  g.addColorStop(0, "rgba(10,10,16,0.85)");
  g.addColorStop(1, "rgba(0,0,0,0.98)");
  ctx.fillStyle = g;
  ctx.fillRect(x1, groundY, x2 - x1, pitBottom - groundY);

  // lip shadow at the edge
  ctx.fillStyle = "rgba(0,0,0,0.18)";
  ctx.fillRect(x1, groundY, x2 - x1, 10);
}

function drawPlatform(p) {
  // top grass
  ctx.fillStyle = "#38b36a";
  ctx.fillRect(p.x, p.y, p.w, p.h);

  // top highlight strip
  ctx.fillStyle = "rgba(255,255,255,0.20)";
  ctx.fillRect(p.x, p.y, p.w, 6);

  // dirt face below platform (depth)
  const depth = 120;
  ctx.fillStyle = "#2e7d52";
  ctx.fillRect(p.x, p.y + p.h, p.w, depth);

  // subtle shadow under the lip
  ctx.fillStyle = "rgba(0,0,0,0.10)";
  ctx.fillRect(p.x, p.y + p.h, p.w, 10);
}

function drawCrate(c) {
  // crate with lighting
  ctx.fillStyle = "#8b5a2b";
  ctx.fillRect(c.x, c.y, c.w, c.h);

  ctx.fillStyle = "rgba(255,255,255,0.18)";
  ctx.fillRect(c.x, c.y, c.w, 6);

  ctx.fillStyle = "rgba(0,0,0,0.18)";
  ctx.fillRect(c.x, c.y + c.h - 8, c.w, 8);

  // shadow
  ctx.fillStyle = "rgba(0,0,0,0.18)";
  ctx.beginPath();
  ctx.ellipse(c.x + c.w/2, c.y + c.h + 10, c.w*0.42, 8, 0, 0, Math.PI*2);
  ctx.fill();
}

function drawCar() {
  const baseY = goalPlatform.y; // sit on final platform top
  const targetW = 150;

  if (carReady) {
    // preserve ratio (NO SQUASH)
    const ratio = carImg.width / carImg.height;
    const drawW = targetW;
    const drawH = drawW / ratio;

    const x = Math.round(goalX);
    const y = Math.round(baseY - drawH); // touches ground line

    // shadow
    ctx.fillStyle = "rgba(0,0,0,0.20)";
    ctx.beginPath();
    ctx.ellipse(x + drawW/2, baseY + 10, drawW*0.42, 9, 0, 0, Math.PI*2);
    ctx.fill();

    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(carImg, x, y, Math.round(drawW), Math.round(drawH));
  } else {
    ctx.fillStyle = "#FFB6C1";
    ctx.fillRect(goalX, baseY - 90, targetW, 90);
  }
}

function drawPlayer() {
  // shadow
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.beginPath();
  ctx.ellipse(player.x + player.w/2, player.y + player.h + 10, player.w*0.40, 8, 0, 0, Math.PI*2);
  ctx.fill();

  if (!playerReady) {
    ctx.fillStyle = "#ff4d6d";
    ctx.fillRect(player.x, player.y, player.w, player.h);
    return;
  }

  // preserve aspect ratio, larger, no halo, no squish
  const ratio = playerImg.width / playerImg.height;

  let drawH = player.h * spriteScale;
  let drawW = drawH * ratio;

  // keep within reason horizontally
  const maxW = player.w * 1.6;
  if (drawW > maxW) {
    drawW = maxW;
    drawH = drawW / ratio;
  }

  const x = Math.round(player.x + player.w/2 - drawW/2);
  const y = Math.round(player.y + player.h - drawH);

  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(playerImg, x, y, Math.round(drawW), Math.round(drawH));
}

// ---------------- Game loop ----------------
let finished = false;
let last = performance.now();

function update(dt) {
  if (finished) return;

  // move
  if (keys.left) player.vx = -moveSpeed;
  else if (keys.right) player.vx = moveSpeed;
  else player.vx *= 0.85;

  // jump
  if (keys.jump && player.grounded) {
    player.vy = -jumpPower;
    player.grounded = false;
  }

  // gravity
  player.vy += gravity * dt;

  // integrate
  player.x += player.vx * dt;
  player.y += player.vy * dt;

  player.grounded = false;

  // stand on platforms + crates
  for (const p of platforms) standOn(p);
  for (const c of crates) standOn(c);

  // PIT RESET: if feet below ground line and not grounded, you fell
  if (!player.grounded && player.y > H + 220) {
    respawn();
    return;
  }

  // camera follow
  cameraX = lerp(cameraX, player.x - 160, 0.12);

  // progress
  const p = Math.max(0, Math.min(1, player.x / goalX));
  progressFill.style.width = (p * 100).toFixed(0) + "%";
  percentEl.textContent = Math.floor(p * 100) + "%";

  // win: overlap with car “zone”
  const playerBox = { x: player.x, y: player.y, w: player.w, h: player.h };
  const carBox = { x: goalX + 20, y: goalPlatform.y - 120, w: 110, h: 140 };
  if (overlap(playerBox, carBox)) {
    finished = true;
    winBox.classList.remove("hidden");
  }
}

function draw() {
  ctx.clearRect(0, 0, W, H);
  drawSky();

  ctx.save();
  ctx.translate(-cameraX, 0);

  // draw pits between platform segments (find gaps)
  const sorted = [...platforms].sort((a,b)=>a.x-b.x);
  for (let i=0;i<sorted.length-1;i++){
    const a = sorted[i];
    const b = sorted[i+1];
    const gapStart = a.x + a.w;
    const gapEnd = b.x;
    if (gapEnd - gapStart > 10) drawPit(gapStart, gapEnd);
  }

  // platforms with depth
  for (const p of platforms) drawPlatform(p);

  // crates
  for (const c of crates) drawCrate(c);

  // goal car
  drawCar();

  // player
  drawPlayer();

  ctx.restore();
}

function loop(now) {
  const dt = Math.min(0.033, (now - last) / 1000);
  last = now;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

// continue button
continueBtn.addEventListener("click", () => {
  window.location.href = "cargame.html";
});

// start
resize();
requestAnimationFrame(loop);