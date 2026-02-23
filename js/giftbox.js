// ---------------- DOM ----------------
const gifts = Array.from(document.querySelectorAll(".gift"));
const hintEl = document.getElementById("hint");

const wrongOverlay = document.getElementById("wrong");
const wrongTitle = document.getElementById("wrongTitle");
const wrongMsg = document.getElementById("wrongMsg");
const wrongOk = document.getElementById("wrongOk");

const winOverlay = document.getElementById("win");
const continueBtn = document.getElementById("continue");

const confettiCanvas = document.getElementById("confetti");
const cctx = confettiCanvas.getContext("2d");

// ---------------- iPhone-safe canvas sizing ----------------
let CW = 0, CH = 0, DPR = 1;
function sizeConfetti() {
  DPR = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
  CW = window.innerWidth;
  CH = window.innerHeight;
  confettiCanvas.style.width = CW + "px";
  confettiCanvas.style.height = CH + "px";
  confettiCanvas.width = Math.floor(CW * DPR);
  confettiCanvas.height = Math.floor(CH * DPR);
  cctx.setTransform(DPR, 0, 0, DPR, 0, 0);
}
window.addEventListener("resize", sizeConfetti);
sizeConfetti();

// ---------------- Tiny sounds (no external files) ----------------
let audioCtx = null;

function ensureAudio() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === "suspended") audioCtx.resume();
}

function playPop() {
  ensureAudio();
  const t0 = audioCtx.currentTime;

  // quick "pop" noise + pitch
  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();

  o.type = "triangle";
  o.frequency.setValueAtTime(520, t0);
  o.frequency.exponentialRampToValueAtTime(180, t0 + 0.12);

  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(0.35, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.16);

  o.connect(g);
  g.connect(audioCtx.destination);

  o.start(t0);
  o.stop(t0 + 0.18);
}

function playBuzzer() {
  ensureAudio();
  const t0 = audioCtx.currentTime;

  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();

  o.type = "sawtooth";
  o.frequency.setValueAtTime(120, t0);

  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(0.28, t0 + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.35);

  o.connect(g);
  g.connect(audioCtx.destination);

  o.start(t0);
  o.stop(t0 + 0.38);
}

// ---------------- Confetti ----------------
const COLORS = [
  "#ff595e","#ffca3a","#8ac926","#1982c4","#6a4c93",
  "#ff9f1c","#2ec4b6","#e71d36","#a2d2ff","#ffc8dd"
];

let confetti = [];
let confettiRunning = false;

function spawnConfettiBurst() {
  const count = 140;
  const cx = CW / 2;
  const cy = Math.min(CH * 0.35, 320);

  for (let i = 0; i < count; i++) {
    const angle = (Math.random() * Math.PI * 2);
    const speed = 5 + Math.random() * 9;
    confetti.push({
      x: cx,
      y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - (6 + Math.random() * 5),
      g: 0.25 + Math.random() * 0.20,
      r: 2 + Math.random() * 4,
      w: 6 + Math.random() * 8,
      h: 4 + Math.random() * 6,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.25,
      col: COLORS[Math.floor(Math.random() * COLORS.length)],
      life: 180 + Math.floor(Math.random() * 80),
    });
  }
}

function stepConfetti() {
  if (!confettiRunning) return;

  cctx.clearRect(0, 0, CW, CH);

  confetti = confetti.filter(p => p.life > 0 && p.y < CH + 80);

  for (const p of confetti) {
    p.life--;
    p.vy += p.g;
    p.x += p.vx;
    p.y += p.vy;
    p.rot += p.vr;

    cctx.save();
    cctx.translate(p.x, p.y);
    cctx.rotate(p.rot);
    cctx.fillStyle = p.col;
    cctx.globalAlpha = 0.95;
    cctx.fillRect(-p.w/2, -p.h/2, p.w, p.h);
    cctx.restore();
  }

  if (confetti.length === 0) {
    confettiRunning = false;
    cctx.clearRect(0, 0, CW, CH);
    return;
  }

  requestAnimationFrame(stepConfetti);
}

function runConfetti() {
  confetti = [];
  spawnConfettiBurst();
  confettiRunning = true;
  requestAnimationFrame(stepConfetti);
}

// ---------------- Wrong messages ----------------
const roasts = [
  "Close… but that date is giving 'random download link' energy.",
  "Nope. That’s not the birthday date. Try again, detective 🕵️",
  "Wrong box 😭 Hint: the right one is the *real* birthday date.",
  "Not this one. You’re one month/year away… suspiciously close.",
  "Incorrect. The correct box is pink for a reason 😌"
];

// ---------------- Click logic ----------------
let solved = false;

function showWrong(date) {
  wrongTitle.textContent = "Nope 😭";
  const msg = roasts[Math.floor(Math.random() * roasts.length)];
  wrongMsg.textContent = msg + " (You picked: " + date + ")";
  wrongOverlay.classList.remove("hidden");
}

function showWin() {
  winOverlay.classList.remove("hidden");
}

wrongOk.addEventListener("click", () => {
  wrongOverlay.classList.add("hidden");
});

continueBtn.addEventListener("click", () => {
  // ✅ go to secret page
  window.location.href = "secret.html";
});

gifts.forEach(btn => {
  btn.addEventListener("click", () => {
    if (solved) return;

    // ensure sounds work on first tap (iOS requires gesture)
    ensureAudio();

    const date = btn.dataset.date || "";
    const isCorrect = btn.dataset.correct === "1";

    if (!isCorrect) {
      playBuzzer();
      showWrong(date);
      hintEl.textContent = "Hint: it’s her birthday date 👀";
      return;
    }

    solved = true;
    hintEl.textContent = "YES! That’s the one 🎉";
    playPop();
    runConfetti();

    // show win modal after a tiny beat
    setTimeout(showWin, 450);
  });
});