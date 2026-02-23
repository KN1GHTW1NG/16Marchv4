// js/color-pick.js

const playField = document.getElementById("playField");

// HUD
const fillEl = document.getElementById("fill");
const pctEl  = document.getElementById("pct");
const streakEl = document.getElementById("streak");
const msgEl = document.getElementById("msg");

let streak = 0;
let progress = 0;

// win condition
const ROUNDS_TO_WIN = 10;

// Target: label + true color
const target = { label: "RED", color: "#ff2d2d" };

// Decoys: mix of lies
const decoys = [
  { label: "RED",    color: "#ffb6c1" }, // pink, says RED
  { label: "RED",    color: "#aa336a" }, // magenta, says RED
  { label: "GREEN",  color: "#ff2d2d" }, // red, wrong label
  { label: "BLUE",   color: "#ff2d2d" }, // red, wrong label
  { label: "PINK",   color: "#ff2d2d" }, // red, wrong label
  { label: "ORANGE", color: "#ff7a18" },
  { label: "PURPLE", color: "#7a3cff" },
  { label: "BLUE",   color: "#1976ff" },
  { label: "GREEN",  color: "#18c76f" },
  { label: "GRAY",   color: "#9aa0a6" },
];

function setHUD(){
  const pct = Math.round(progress * 100);
  if (fillEl) fillEl.style.width = pct + "%";
  if (pctEl)  pctEl.textContent = pct + "%";
  if (streakEl) streakEl.textContent = "Streak: " + streak;
}

function say(text){
  if (msgEl) msgEl.innerHTML = text;
}

function clearField(){
  if (playField) playField.innerHTML = "";
}

function rand(min,max){ return Math.random()*(max-min)+min; }

function spawnBlob({label,color,isCorrect}){
  const b = document.createElement("button");
  b.className = "blob";
  b.type = "button";
  b.setAttribute("aria-label", `${label} blob`);

  // place it inside the field
  const rect = playField.getBoundingClientRect();

  const size = 82;
  const pad = 56; // keeps blobs away from edges
  const x = rand(pad, Math.max(pad, rect.width - pad));
  const y = rand(pad, Math.max(pad, rect.height - pad));

  b.style.left = x + "px";
  b.style.top  = y + "px";

  // glossy blob background
  b.style.background = `radial-gradient(circle at 30% 25%, rgba(255,255,255,.45), rgba(255,255,255,0) 45%), ${color}`;

  // float desync
  b.style.animationDelay = (Math.random()*1.5) + "s";

  const s = document.createElement("span");
  s.textContent = label;

  // text color: dark text if blob is light pink
  const isLight = color.toLowerCase() === "#ffb6c1" || color.toLowerCase() === "#f8c8dc";
  s.style.color = isLight ? "#111" : "#fff";

  b.appendChild(s);

  b.addEventListener("click", () => {
    if (isCorrect){
      streak++;
      progress = Math.min(1, progress + 1/ROUNDS_TO_WIN);
      say(`NICE. That was actually <span class="redWord">RED</span> 😼`);
      setHUD();

      if (progress >= 1){
        // next page
        window.location.href = "giftbox.html"; // change later
        return;
      }
      newRound();
    } else {
      streak = 0;
      say(`Nope. That one was lying 😭 Try again: tap the blob that is actually <span class="redWord">RED</span>.`);
      setHUD();
      newRound();
    }
  });

  playField.appendChild(b);
}

function newRound(){
  clearField();

  // how many blobs per round (YES: several)
  const total = 10; // tweak 8–12

  // one correct blob
  spawnBlob({ label: target.label, color: target.color, isCorrect: true });

  // rest are decoys
  for (let i = 1; i < total; i++){
    const d = decoys[Math.floor(Math.random()*decoys.length)];
    const correct = (d.label === target.label && d.color.toLowerCase() === target.color.toLowerCase());
    spawnBlob({ label: d.label, color: d.color, isCorrect: correct });
  }
}

setHUD();
say(`Tap the blob that is actually <span class="redWord">RED</span>.`);
newRound();