// giftbox.js
const grid = document.getElementById("grid");
const toast = document.getElementById("toast");
const toastTitle = document.getElementById("toastTitle");
const toastText = document.getElementById("toastText");
const toastBtn = document.getElementById("toastBtn");

toastBtn.addEventListener("click", () => toast.classList.add("hidden"));

const CORRECT = "16-03-2002";

// ✅ Dates made intentionally confusing (all “near” the real one)
const dates = shuffle([
  CORRECT,
  "16-03-2003", // year off by 1
  "16-02-2002", // month off by 1
  "15-03-2002", // day off by 1
  "16-03-2012", // year digit changed
  "06-03-2002"  // day digit changed
]);

// Fun wrong messages
const wrongLines = [
  "Close… but that date feels like someone’s WiFi password 😭",
  "Nope. That gift is for a parallel universe version of you.",
  "Wrong box. This one contains… academic stress. Put it back.",
  "Not this one. Try the date that actually deserves cake.",
  "That one is fake. The real one is the birthday date 👀"
];

const hintLine = "Hint: Find your birthday date 🧁";

// Colorful confetti palette
const confettiColors = [
  "#FFB6C1", "#F8C8DC", "#AA336A",
  "#FFD166", "#06D6A0", "#118AB2",
  "#EF476F", "#8338EC", "#FFBE0B"
];

// Themes (we force the CORRECT one to be the pink theme)
const pinkTheme = { box:"#AA336A", lid:"#FFB6C1", ribbon:"#FFD166" };

const giftThemes = [
  { box:"#118AB2", lid:"#8EECF5", ribbon:"#FFB6C1" },
  { box:"#06D6A0", lid:"#B8F2E6", ribbon:"#8338EC" },
  { box:"#EF476F", lid:"#FFD6E8", ribbon:"#06D6A0" },
  { box:"#8338EC", lid:"#CDB4FF", ribbon:"#FFBE0B" },
  { box:"#FFBE0B", lid:"#FFF1B8", ribbon:"#AA336A" },
];

// ---------------- AUDIO (NO EXTERNAL FILES) ----------------
let audioCtx = null;

function ensureAudio(){
  if (!audioCtx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AC();
  }
  if (audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}

function playBuzzer(){
  const ctx = ensureAudio();
  const t0 = ctx.currentTime;

  // “rocker buzzer”: detuned saws + quick pitch drop + grit
  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  osc1.type = "sawtooth";
  osc2.type = "square";
  osc1.frequency.setValueAtTime(170, t0);
  osc1.frequency.exponentialRampToValueAtTime(85, t0 + 0.18);
  osc2.frequency.setValueAtTime(120, t0);
  osc2.frequency.exponentialRampToValueAtTime(70, t0 + 0.18);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(0.35, t0 + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.22);

  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(1600, t0);
  filter.frequency.exponentialRampToValueAtTime(700, t0 + 0.22);

  const waveShaper = ctx.createWaveShaper();
  waveShaper.curve = makeDistortionCurve(35);
  waveShaper.oversample = "4x";

  osc1.connect(filter);
  osc2.connect(filter);
  filter.connect(waveShaper);
  waveShaper.connect(gain);
  gain.connect(ctx.destination);

  osc1.start(t0);
  osc2.start(t0);
  osc1.stop(t0 + 0.24);
  osc2.stop(t0 + 0.24);
}

function playSuccess(){
  const ctx = ensureAudio();
  const t0 = ctx.currentTime;

  // cheerful “sparkle”: short arpeggio + tiny echo
  const master = ctx.createGain();
  master.gain.setValueAtTime(0.0001, t0);
  master.gain.exponentialRampToValueAtTime(0.35, t0 + 0.02);
  master.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.75);

  const delay = ctx.createDelay(0.25);
  delay.delayTime.setValueAtTime(0.12, t0);
  const fb = ctx.createGain();
  fb.gain.setValueAtTime(0.22, t0);
  delay.connect(fb);
  fb.connect(delay);

  master.connect(ctx.destination);
  master.connect(delay);
  delay.connect(ctx.destination);

  const notes = [659.25, 783.99, 987.77, 1318.51]; // E5, G5, B5, E6-ish vibe
  notes.forEach((f, i) => {
    const o = ctx.createOscillator();
    o.type = "triangle";
    const g = ctx.createGain();
    const start = t0 + i * 0.08;

    o.frequency.setValueAtTime(f, start);
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(0.22, start + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, start + 0.22);

    o.connect(g);
    g.connect(master);

    o.start(start);
    o.stop(start + 0.25);
  });
}

function makeDistortionCurve(amount){
  const n = 44100;
  const curve = new Float32Array(n);
  const k = typeof amount === "number" ? amount : 50;
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / n - 1;
    curve[i] = ((3 + k) * x * 20 * Math.PI / 180) / (Math.PI + k * Math.abs(x));
  }
  return curve;
}

// ---------------- BUILD GIFTS ----------------

dates.forEach((d, i) => {
  const theme = (d === CORRECT)
    ? pinkTheme
    : giftThemes[i % giftThemes.length];

  const wrap = document.createElement("div");
  wrap.className = "giftWrap";

  wrap.innerHTML = `
    <div class="gift" data-date="${d}" data-f="${(i%6)}">
      <div class="lid"></div>
      <div class="box">
        <div class="ribbonV"></div>
        <div class="ribbonH"></div>
      </div>
      <div class="bow"><div class="knot"></div></div>
      <div class="tag">${d}</div>
    </div>
  `;

  const gift = wrap.querySelector(".gift");
  const lid = wrap.querySelector(".lid");
  const box = wrap.querySelector(".box");
  const ribbonV = wrap.querySelector(".ribbonV");
  const ribbonH = wrap.querySelector(".ribbonH");
  const bow = wrap.querySelector(".bow");
  const knot = wrap.querySelector(".knot");

  // Apply theme colors (no “block” look)
  box.style.background = makeBoxGradient(theme.box);
  lid.style.background = makeLidGradient(theme.lid);
  ribbonV.style.background = makeRibbonGradient(theme.ribbon);
  ribbonH.style.background = makeRibbonGradient(theme.ribbon);

  // Bow colors
  bow.style.filter = "drop-shadow(0 10px 12px rgba(0,0,0,.10))";
  knot.style.background = theme.ribbon;

  // bow halves (scoped to this card)
  const style = document.createElement("style");
  style.textContent = `
    .giftWrap:nth-child(${i+1}) .bow::before,
    .giftWrap:nth-child(${i+1}) .bow::after{
      background: linear-gradient(180deg, ${theme.ribbon}, ${shade(theme.ribbon,-18)});
    }
  `;
  document.head.appendChild(style);

  // Click behavior
  gift.addEventListener("click", () => {
    const picked = gift.dataset.date;

    // iOS: make sure audio context is unlocked on the tap
    ensureAudio();

    if (picked !== CORRECT) {
      playBuzzer();

      toastTitle.textContent = "Nope 😼";
      toastText.textContent =
        `${wrongLines[Math.floor(Math.random()*wrongLines.length)]}\n\n${hintLine}`;
      toast.classList.remove("hidden");

      gift.animate(
        [
          {transform:"translateX(0)"},
          {transform:"translateX(-6px)"},
          {transform:"translateX(6px)"},
          {transform:"translateX(0)"}
        ],
        {duration: 220, iterations: 1}
      );
      return;
    }

    // Correct one: open + confetti + success sound
    playSuccess();
    gift.classList.add("open");
    burstConfetti(gift);

    setTimeout(() => {
      window.location.href = "montage.html"; // keep your next page name here
    }, 1600);
  });

  grid.appendChild(wrap);
});

function burstConfetti(anchor){
  for(let i=0;i<45;i++){
    const c = document.createElement("div");
    c.className = "confetti";
    c.style.background = confettiColors[Math.floor(Math.random()*confettiColors.length)];
    c.style.left = (Math.random()*220 - 80) + "px";
    c.style.top = (Math.random()*20 - 10) + "px";
    c.style.animationDuration = (0.8 + Math.random()*0.7) + "s";
    c.style.transform = `rotate(${Math.random()*180}deg)`;
    anchor.appendChild(c);
    setTimeout(() => c.remove(), 1400);
  }
}

// Helpers
function shuffle(arr){
  const a = [...arr];
  for(let i=a.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [a[i],a[j]] = [a[j],a[i]];
  }
  return a;
}
function makeBoxGradient(color){
  return `linear-gradient(180deg, ${shade(color, 12)}, ${shade(color, -10)})`;
}
function makeLidGradient(color){
  return `linear-gradient(180deg, ${shade(color, 18)}, ${shade(color, -8)})`;
}
function makeRibbonGradient(color){
  return `linear-gradient(180deg, ${shade(color, 14)}, ${shade(color, -10)})`;
}
function shade(hex, amt){
  const c = hex.replace("#","");
  const num = parseInt(c,16);
  let r = (num >> 16) + amt;
  let g = ((num >> 8) & 0x00FF) + amt;
  let b = (num & 0x0000FF) + amt;
  r = Math.max(0, Math.min(255, r));
  g = Math.max(0, Math.min(255, g));
  b = Math.max(0, Math.min(255, b));
  return "#" + (r<<16 | g<<8 | b).toString(16).padStart(6,"0");
}