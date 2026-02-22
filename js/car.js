const canvas = document.getElementById("carGame");
const ctx = canvas.getContext("2d");

canvas.width = 400;
canvas.height = 650;

const leftBtn = document.getElementById("leftBtn");
const rightBtn = document.getElementById("rightBtn");
const retryBtn = document.getElementById("retryBtn");
const progressFill = document.getElementById("progressFill");

// ✅ YOUR REAL ASSETS
const playerCarImg = new Image();
playerCarImg.src = "assets/IMG_2122.png";

const obstacleImg = new Image();
obstacleImg.src = "assets/IMG_2125.png";

let player = {
  x: 180,
  y: 500,
  w: 70,
  h: 120
};

let obstacles = [];
let speed = 4;
let progress = 0;
let gameOver = false;

function spawnObstacle() {
  const lane = Math.floor(Math.random() * 3);
  obstacles.push({
    x: 80 + lane * 110,
    y: -150,
    w: 70,
    h: 120
  });
}

function update() {
  if (gameOver) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Background
  ctx.fillStyle = "#F8C8DC";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Player Car
  ctx.drawImage(playerCarImg, player.x, player.y, player.w, player.h);

  // Obstacles
  for (let o of obstacles) {
    o.y += speed;

    ctx.drawImage(obstacleImg, o.x, o.y, o.w, o.h);

    // Collision detection
    if (
      player.x < o.x + o.w &&
      player.x + player.w > o.x &&
      player.y < o.y + o.h &&
      player.y + player.h > o.y
    ) {
      gameOver = true;
      retryBtn.classList.remove("hidden");
    }
  }

  // Remove off-screen obstacles
  obstacles = obstacles.filter(o => o.y < canvas.height + 150);

  // Progress system
  progress += 0.1;
  progressFill.style.width = progress + "%";

  if (progress >= 100) {
    window.location.href = "colorselect.html";
  }

  requestAnimationFrame(update);
}

setInterval(spawnObstacle, 1200);
update();

// Controls
leftBtn.onclick = () => {
  if (player.x > 80) player.x -= 110;
};

rightBtn.onclick = () => {
  if (player.x < 300) player.x += 110;
};

retryBtn.onclick = () => {
  obstacles = [];
  progress = 0;
  gameOver = false;
  retryBtn.classList.add("hidden");
};