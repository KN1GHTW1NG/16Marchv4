const canvas = document.getElementById("carGame");
const ctx = canvas.getContext("2d");

// Responsive portrait canvas (fits iPhone better)
function resizeCanvas() {
  const maxW = 420;
  const cssW = Math.min(maxW, window.innerWidth - 20);
  const cssH = Math.min(window.innerHeight * 0.68, 740);

  canvas.style.width = cssW + "px";
  canvas.style.height = cssH + "px";

  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.round(cssW * dpr);
  canvas.height = Math.round(cssH * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

const leftBtn = document.getElementById("leftBtn");
const rightBtn = document.getElementById("rightBtn");
const retryBtn = document.getElementById("retryBtn");
const progressFill = document.getElementById("progressFill");

// ✅ Your assets
const playerCarImg = new Image();
playerCarImg.src = "assets/IMG_2122.png";

const obstacleImg = new Image();
obstacleImg.src = "assets/IMG_2125.png";

// ----- Road / lanes -----
const lanes = 3;
const lanePadding = 28; // side margin inside canvas
function laneWidth() {
  const cssW = parseFloat(canvas.style.width) || 400;
  return (cssW - lanePadding * 2) / lanes;
}
function laneX(laneIndex) {
  return lanePadding + laneIndex * laneWidth();
}

// Player size + position
let player = {
  lane: 1,
  x: 0,
  y: 0,
  w: 82,   // slightly bigger (more readable)
  h: 132
};

let obstacles = [];
let speed = 4.2;      // road scroll speed
let progress = 0;
let gameOver = false;

let dashedOffset = 0;
let spawnTimer = null;
let rafId = null;

function resetPlayerPosition() {
  const cssW = parseFloat(canvas.style.width) || 400;
  const cssH = parseFloat(canvas.style.height) || 650;

  player.x = laneX(player.lane) + (laneWidth() - player.w) / 2;
  player.y = cssH - player.h - 22;
}

function spawnObstacle() {
  const lane = Math.floor(Math.random() * lanes);
  const cssH = parseFloat(canvas.style.height) || 650;

  obstacles.push({
    lane,
    x: laneX(lane) + (laneWidth() - 76) / 2,
    y: -160,
    w: 76,
    h: 122
  });
}

// Simple AABB collision
function hit(a, b) {
  return !(
    a.x + a.w <= b.x ||
    a.x >= b.x + b.w ||
    a.y + a.h <= b.y ||
    a.y >= b.y + b.h
  );
}

function drawRoad() {
  const cssW = parseFloat(canvas.style.width) || 400;
  const cssH = parseFloat(canvas.style.height) || 650;

  // background pink gradient
  const bg = ctx.createLinearGradient(0, 0, 0, cssH);
  bg.addColorStop(0, "#F8C8DC");
  bg.addColorStop(1, "#FFB6C1");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, cssW, cssH);

  // road slab
  const roadX = lanePadding - 10;
  const roadW = cssW - (lanePadding - 10) * 2;

  const roadGrad = ctx.createLinearGradient(0, 0, 0, cssH);
  roadGrad.addColorStop(0, "rgba(40,40,46,0.35)");
  roadGrad.addColorStop(1, "rgba(20,20,26,0.45)");
  ctx.fillStyle = roadGrad;
  ctx.fillRect(roadX, 0, roadW, cssH);

  // road edge highlights
  ctx.fillStyle = "rgba(255,255,255,0.18)";
  ctx.fillRect(roadX, 0, 3, cssH);
  ctx.fillRect(roadX + roadW - 3, 0, 3, cssH);

  // lane dashed lines (moving)
  dashedOffset = (dashedOffset + speed * 2) % 40;

  for (let i = 1; i < lanes; i++) {
    const x = laneX(i);
    ctx.strokeStyle = "rgba(255,255,255,0.55)";
    ctx.lineWidth = 4;
    ctx.setLineDash([18, 22]);
    ctx.lineDashOffset = -dashedOffset;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, cssH);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  // subtle vignette
  const vignette = ctx.createRadialGradient(
    cssW / 2, cssH * 0.55, cssH * 0.1,
    cssW / 2, cssH * 0.55, cssH * 0.9
  );
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(1, "rgba(0,0,0,0.25)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, cssW, cssH);
}

function drawGameOverOverlay() {
  const cssW = parseFloat(canvas.style.width) || 400;
  const cssH = parseFloat(canvas.style.height) || 650;

  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.fillRect(0, 0, cssW, cssH);

  // pink-ish dialog
  const boxW = Math.min(320, cssW - 40);
  const boxH = 150;
  const x = (cssW - boxW) / 2;
  const y = (cssH - boxH) / 2;

  ctx.fillStyle = "rgba(248,200,220,0.95)";
  ctx.strokeStyle = "rgba(170,51,106,0.55)";
  ctx.lineWidth = 2;
  roundRect(ctx, x, y, boxW, boxH, 18);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#AA336A";
  ctx.font = "800 18px system-ui";
  ctx.textAlign = "center";
  ctx.fillText("OOPS 😅  Tiny collision!", cssW / 2, y + 52);

  ctx.fillStyle = "rgba(31,31,34,0.75)";
  ctx.font = "600 13px system-ui";
  ctx.fillText("Tap Try Again to continue the journey.", cssW / 2, y + 82);
}

function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function updateAndDraw() {
  const cssW = parseFloat(canvas.style.width) || 400;
  const cssH = parseFloat(canvas.style.height) || 650;

  // Always draw, even when gameOver
  drawRoad();

  // Update obstacles only if not gameOver
  if (!gameOver) {
    for (let o of obstacles) o.y += speed;

    // Remove off-screen
    obstacles = obstacles.filter(o => o.y < cssH + 200);

    // Progress
    progress += 0.10;
    progressFill.style.width = Math.min(progress, 100) + "%";

    if (progress >= 100) {
      window.location.href = "colorselect.html";
      return;
    }
  }

  // Draw obstacles
  for (let o of obstacles) {
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(obstacleImg, o.x, o.y, o.w, o.h);
  }

  // Update player x from lane
  player.x = laneX(player.lane) + (laneWidth() - player.w) / 2;

  // Draw player
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(playerCarImg, player.x, player.y, player.w, player.h);

  // Collision check (only when running)
  if (!gameOver) {
    const pBox = { x: player.x, y: player.y, w: player.w, h: player.h };
    for (let o of obstacles) {
      if (hit(pBox, o)) {
        gameOver = true;
        retryBtn.classList.remove("hidden");
        stopSpawning();
        break;
      }
    }
  }

  // Game over overlay
  if (gameOver) drawGameOverOverlay();

  rafId = requestAnimationFrame(updateAndDraw);
}

function startSpawning() {
  stopSpawning();
  spawnTimer = setInterval(spawnObstacle, 1100);
}
function stopSpawning() {
  if (spawnTimer) clearInterval(spawnTimer);
  spawnTimer = null;
}

// Controls
leftBtn.onclick = () => {
  if (gameOver) return;
  player.lane = Math.max(0, player.lane - 1);
};

rightBtn.onclick = () => {
  if (gameOver) return;
  player.lane = Math.min(lanes - 1, player.lane + 1);
};

retryBtn.onclick = () => {
  // Full reset + restart loop + respawn obstacles
  obstacles = [];
  progress = 0;
  progressFill.style.width = "0%";
  gameOver = false;
  retryBtn.classList.add("hidden");
  player.lane = 1;
  resetPlayerPosition();
  startSpawning();
};

// Init
resetPlayerPosition();
startSpawning();
updateAndDraw();