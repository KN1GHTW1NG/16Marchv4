const flip = document.getElementById("flip");
const flipInner = document.getElementById("flipInner");
const flipBtn = document.getElementById("flipBtn");
const backBtn = document.getElementById("backBtn");

const fx = document.getElementById("fx");

const noteImg = document.getElementById("noteImg");
const notePlaceholder = document.getElementById("notePlaceholder");
const downloadBtn = document.getElementById("downloadBtn");

// ✅ SET THIS LATER when you upload your handwritten note image:
// Example: "assets/handnote.png"
const NOTE_SRC = ""; // <-- put file path here later

// ----- Flip logic -----
flipBtn.addEventListener("click", () => {
  flip.classList.add("isFlipped");
});
backBtn.addEventListener("click", () => {
  flip.classList.remove("isFlipped");
});

// ----- Note wiring -----
function wireNote(){
  if (!NOTE_SRC) {
    // keep placeholder visible
    downloadBtn.classList.add("disabled");
    downloadBtn.href = "#";
    return;
  }

  noteImg.src = NOTE_SRC;
  noteImg.style.display = "block";
  notePlaceholder.style.display = "none";

  // simple download (same-origin assets)
  downloadBtn.href = NOTE_SRC;
  downloadBtn.setAttribute("download", "note.png");
}
wireNote();

// ----- Continuous confetti + petals -----
const confettiColors = [
  "#FFB6C1","#F8C8DC","#AA336A",
  "#FFD166","#06D6A0","#118AB2",
  "#EF476F","#8338EC","#FFBE0B"
];

function spawnConfettiBurst(){
  // small burst from random x near top
  const burstX = Math.random() * window.innerWidth;
  const count = 12 + Math.floor(Math.random()*10);

  for(let i=0;i<count;i++){
    const b = document.createElement("div");
    b.className = "bit";
    b.style.background = confettiColors[Math.floor(Math.random()*confettiColors.length)];
    b.style.left = (burstX + (Math.random()*120 - 60)) + "px";
    b.style.top = (-20) + "px";

    const dur = 1.1 + Math.random()*0.9;
    b.style.animationDuration = dur + "s";

    // sideways drift via CSS transform in keyframes: we fake it using translateX by setting margin-left-ish (works fine)
    b.style.transform = `rotate(${Math.random()*180}deg)`;

    fx.appendChild(b);
    setTimeout(()=> b.remove(), (dur*1000) + 200);
  }
}

function spawnPetal(){
  const p = document.createElement("div");
  p.className = "petal";
  p.style.left = (Math.random() * window.innerWidth) + "px";
  p.style.top = (-80) + "px";
  const dur = 5.2 + Math.random()*3.2;
  p.style.animationDuration = dur + "s";
  p.style.opacity = (0.45 + Math.random()*0.25).toFixed(2);

  fx.appendChild(p);
  setTimeout(()=> p.remove(), (dur*1000) + 300);
}

// Timers tuned for “continuous but not chaotic”
setInterval(spawnConfettiBurst, 520); // confetti loop
setInterval(spawnPetal, 430);         // petals loop
// ---------------- Lantern Brownian Motion + Interactivity ----------------
(function(){
  const lanterns = Array.from(document.querySelectorAll(".lantern-layer .lantern"));
  if (!lanterns.length) return;

  // Respect reduced motion (optional but good)
  const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce) return;

  // Build physics state from current CSS positions
  const state = lanterns.map(el => {
    const rect = el.getBoundingClientRect();
    const parent = el.parentElement.getBoundingClientRect();

    // initial base position inside layer
    const x0 = rect.left - parent.left;
    const y0 = rect.top  - parent.top;

    // We'll keep the CSS top/left as "anchor" and animate around it using translate vars.
    // Make sure elements are positioned via top/left already (your .L1/.L2... do that).
    return {
      el,
      // translation around anchor
      tx: 0, ty: 0,
      vx: 0, vy: 0,

      // rotation
      rot: (Math.random()*10 - 5),
      rv: (Math.random()*0.6 - 0.3),

      // unique feel per lantern
      accel: 18 + Math.random()*10,   // random push strength
      damp:  0.90 + Math.random()*0.04, // velocity damping
      maxV:  22 + Math.random()*10,   // speed cap
      bounds: 18 + Math.random()*10,  // how far it can wander
      wobble: 0.6 + Math.random()*0.8
    };
  });

  // Tap to focus / unfocus
  lanterns.forEach(el => {
    el.addEventListener("click", () => {
      const is = el.classList.toggle("isFocus");

      // Unfocus others (keeps it neat)
      if (is) {
        lanterns.forEach(other => { if (other !== el) other.classList.remove("isFocus"); });
      }

      // Tiny “pulse” feedback
      el.animate(
        [{ transform: getComputedStyle(el).transform }, { transform: getComputedStyle(el).transform }],
        { duration: 1 }
      );
    }, { passive: true });
  });

  let last = performance.now();

  function tick(now){
    const dt = Math.min(0.033, (now - last) / 1000);
    last = now;

    // Get container size to keep motion sane on rotate/resizes
    const layer = document.querySelector(".lantern-layer");
    const W = layer ? layer.clientWidth : window.innerWidth;
    const H = layer ? layer.clientHeight : window.innerHeight;

    for (const s of state) {
      // Random acceleration (Brownian-ish)
      const ax = (Math.random()*2 - 1) * s.accel;
      const ay = (Math.random()*2 - 1) * s.accel;

      s.vx = (s.vx + ax * dt) * s.damp;
      s.vy = (s.vy + ay * dt) * s.damp;

      // Speed cap (keeps it elegant)
      const sp = Math.hypot(s.vx, s.vy);
      if (sp > s.maxV) {
        const k = s.maxV / sp;
        s.vx *= k; s.vy *= k;
      }

      // Apply
      s.tx += s.vx * dt;
      s.ty += s.vy * dt;

      // Soft bounds around anchor (spring back)
      const b = s.bounds;
      if (s.tx > b)  s.vx -= (s.tx - b) * 6 * dt;
      if (s.tx < -b) s.vx -= (s.tx + b) * 6 * dt;
      if (s.ty > b)  s.vy -= (s.ty - b) * 6 * dt;
      if (s.ty < -b) s.vy -= (s.ty + b) * 6 * dt;

      // Gentle rotation drift
      s.rv = (s.rv + (Math.random()*2 - 1) * 0.25 * dt) * 0.985;
      s.rot += s.rv;

      // Keep rotation subtle
      if (s.rot > 10) s.rot = 10;
      if (s.rot < -10) s.rot = -10;

      // Write to CSS variables
      s.el.style.setProperty("--tx", s.tx.toFixed(2) + "px");
      s.el.style.setProperty("--ty", s.ty.toFixed(2) + "px");
      s.el.style.setProperty("--rot", s.rot.toFixed(2) + "deg");
    }

    requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
})();