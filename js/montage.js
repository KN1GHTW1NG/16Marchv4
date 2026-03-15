const flip = document.getElementById("flip");
const flipInner = document.getElementById("flipInner");
const flipBtn = document.getElementById("flipBtn");
const backBtn = document.getElementById("backBtn");

const fx = document.getElementById("fx");
const downloadBtn = document.getElementById("downloadBtn");

// ----- Flip logic -----
flipBtn.addEventListener("click", () => {
  flip.classList.add("isFlipped");
});
backBtn.addEventListener("click", () => {
  flip.classList.remove("isFlipped");
});

// ----- PDF download fix for Safari -----
downloadBtn.addEventListener("click", (e) => {
  e.preventDefault();

  const pdfUrl = "assets/note.pdf";
  const a = document.createElement("a");
  a.href = pdfUrl;
  a.download = "note.pdf";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
});

// ----- Continuous confetti + petals -----
const confettiColors = [
  "#FFB6C1","#F8C8DC","#AA336A",
  "#FFD166","#06D6A0","#118AB2",
  "#EF476F","#8338EC","#FFBE0B"
];

function spawnConfettiBurst(){
  const burstX = Math.random() * window.innerWidth;
  const count = 5 + Math.floor(Math.random() * 4);

  for(let i=0;i<count;i++){
    const b = document.createElement("div");
    b.className = "bit";
    b.style.background = confettiColors[Math.floor(Math.random()*confettiColors.length)];
    b.style.left = (burstX + (Math.random()*100 - 50)) + "px";
    b.style.top = "-20px";

    const dur = 1.2 + Math.random()*0.7;
    b.style.animationDuration = dur + "s";
    b.style.transform = `rotate(${Math.random()*180}deg)`;

    fx.appendChild(b);
    setTimeout(()=> b.remove(), (dur*1000) + 200);
  }
}

function spawnPetal(){
  const p = document.createElement("div");
  p.className = "petal";
  p.style.left = (Math.random() * window.innerWidth) + "px";
  p.style.top = "-80px";

  const dur = 6 + Math.random()*2.5;
  p.style.animationDuration = dur + "s";
  p.style.opacity = (0.40 + Math.random()*0.18).toFixed(2);

  fx.appendChild(p);
  setTimeout(()=> p.remove(), (dur*1000) + 300);
}

setInterval(spawnConfettiBurst, 1200);
setInterval(spawnPetal, 900);

// ---------------- Lantern DVD Motion + Interactivity ----------------
(function(){
  const layer = document.querySelector(".lantern-layer");
  const lanterns = Array.from(document.querySelectorAll(".lantern-layer .lantern"));
  if (!layer || !lanterns.length) return;

  const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce) return;

  let isPaused = false;

  function px(val){
    const n = parseFloat(val);
    return Number.isFinite(n) ? n : 0;
  }

  function clamp(v, min, max){
    return Math.max(min, Math.min(max, v));
  }

  const state = lanterns.map((el) => {
    const cs = getComputedStyle(el);
    const layerRect = layer.getBoundingClientRect();
    const rect = el.getBoundingClientRect();

    const w = rect.width;
    const h = rect.height;

    let x = px(cs.left);
    let y = px(cs.top);

    const right = px(cs.right);
    const bottom = px(cs.bottom);

    if (cs.left === "auto" && cs.right !== "auto") {
      x = layerRect.width - right - w;
    }

    if (cs.top === "auto" && cs.bottom !== "auto") {
      y = layerRect.height - bottom - h;
    }

    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      x = rect.left - layerRect.left;
      y = rect.top - layerRect.top;
    }

    const speed = 12 + Math.random() * 10;
    const angle = Math.random() * Math.PI * 2;

    el.style.left = x + "px";
    el.style.top = y + "px";
    el.style.right = "auto";
    el.style.bottom = "auto";

    el.style.setProperty("--tx", "0px");
    el.style.setProperty("--ty", "0px");

    return {
      el,
      x,
      y,
      w,
      h,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      rot: (Math.random() * 6 - 3),
      rv: (Math.random() * 0.35 - 0.175),
      rotMax: 6
    };
  });

  lanterns.forEach(el => {
    el.addEventListener("click", () => {
      const is = el.classList.toggle("isFocus");

      if (is) {
        lanterns.forEach(other => {
          if (other !== el) other.classList.remove("isFocus");
        });
      }
    }, { passive: true });
  });

  let last = performance.now();

  function tick(now){
    if (isPaused) {
      last = now;
      requestAnimationFrame(tick);
      return;
    }

    const dt = Math.min(0.025, (now - last) / 1000);
    last = now;

    const W = layer.clientWidth;
    const H = layer.clientHeight;

    for (const s of state) {
      s.x += s.vx * dt;
      s.y += s.vy * dt;

      if (s.x <= 0) {
        s.x = 0;
        s.vx = Math.abs(s.vx);
      } else if (s.x + s.w >= W) {
        s.x = W - s.w;
        s.vx = -Math.abs(s.vx);
      }

      if (s.y <= 0) {
        s.y = 0;
        s.vy = Math.abs(s.vy);
      } else if (s.y + s.h >= H) {
        s.y = H - s.h;
        s.vy = -Math.abs(s.vy);
      }

      s.rv = (s.rv + (Math.random() * 2 - 1) * 0.08 * dt) * 0.992;
      s.rot += s.rv;
      s.rot = clamp(s.rot, -s.rotMax, s.rotMax);

      s.el.style.left = s.x.toFixed(2) + "px";
      s.el.style.top = s.y.toFixed(2) + "px";
      s.el.style.setProperty("--rot", s.rot.toFixed(2) + "deg");
    }

    requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);

  window.addEventListener("resize", () => {
    const W = layer.clientWidth;
    const H = layer.clientHeight;

    state.forEach((s) => {
      const rect = s.el.getBoundingClientRect();
      s.w = rect.width;
      s.h = rect.height;

      s.x = clamp(s.x, 0, Math.max(0, W - s.w));
      s.y = clamp(s.y, 0, Math.max(0, H - s.h));

      s.el.style.left = s.x + "px";
      s.el.style.top = s.y + "px";
    });
  }, { passive: true });

  document.addEventListener("visibilitychange", () => {
    isPaused = document.hidden;
  });
})();