const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const progressFill = document.getElementById("progressFill");
const percentEl = document.getElementById("percent");

const leftBtn = document.getElementById("leftBtn");
const rightBtn = document.getElementById("rightBtn");
const jumpBtn = document.getElementById("jumpBtn");

const winBox = document.getElementById("winBox");
const continueBtn = document.getElementById("continueBtn");

let W=0,H=0,DPR=1;

function resize(){
  DPR=Math.min(2,window.devicePixelRatio||1);
  const cssW=Math.min(420,window.innerWidth-20);
  const cssH=window.innerHeight*0.75;
  canvas.style.width=cssW+"px";
  canvas.style.height=cssH+"px";
  canvas.width=cssW*DPR;
  canvas.height=cssH*DPR;
  ctx.setTransform(DPR,0,0,DPR,0,0);
  W=cssW; H=cssH;
}
window.addEventListener("resize",resize);

resize();

// ---- Physics ----
const gravity=2200;
const moveSpeed=340;
const jumpPower=820;

const player={
  x:100,
  y:0,
  w:80,    // BIGGER character
  h:110,
  vx:0,
  vy:0,
  grounded:false
};

const playerImg=new Image();
playerImg.src="assets/IMG_2114.png";

const carImg=new Image();
carImg.src="assets/IMG_2121.png";

let groundY=H-140;

// ---- Level ----
let platforms=[];
let crates=[];
let goal={x:2000,y:0,w:150,h:0};

function buildLevel(){
  groundY=H-140;
  platforms=[
    {x:0,w:400},
    {x:550,w:300},
    {x:1000,w:350},
    {x:1500,w:300},
    {x:1900,w:350}
  ];

  crates=[
    {x:650,y:groundY-50,w:50,h:50},
    {x:1120,y:groundY-50,w:50,h:50},
    {x:1700,y:groundY-50,w:50,h:50}
  ];

  goal.y=groundY;
  goal.h=carImg.height?carImg.height*(goal.w/carImg.width):90;
}

buildLevel();

// ---- Controls ----
const keys={};
document.addEventListener("keydown",e=>{
  if(e.key==="ArrowLeft"||e.key==="a")keys.left=true;
  if(e.key==="ArrowRight"||e.key==="d")keys.right=true;
  if(e.key==="ArrowUp"||e.key===" ")keys.jump=true;
});
document.addEventListener("keyup",e=>{
  if(e.key==="ArrowLeft"||e.key==="a")keys.left=false;
  if(e.key==="ArrowRight"||e.key==="d")keys.right=false;
  if(e.key==="ArrowUp"||e.key===" ")keys.jump=false;
});

leftBtn.onpointerdown=()=>keys.left=true;
leftBtn.onpointerup=()=>keys.left=false;
rightBtn.onpointerdown=()=>keys.right=true;
rightBtn.onpointerup=()=>keys.right=false;
jumpBtn.onpointerdown=()=>{
  if(player.grounded){
    player.vy=-jumpPower;
    player.grounded=false;
  }
};

// ---- Game Loop ----
let cameraX=0;

function update(dt){

  // movement
  if(keys.left) player.vx=-moveSpeed;
  else if(keys.right) player.vx=moveSpeed;
  else player.vx*=0.85;

  if(keys.jump && player.grounded){
    player.vy=-jumpPower;
    player.grounded=false;
  }

  player.vy+=gravity*dt;

  player.x+=player.vx*dt;
  player.y+=player.vy*dt;

  // ground collision
  player.grounded=false;

  for(let p of platforms){
    if(player.x+player.w>p.x && player.x<p.x+p.w){
      if(player.y+player.h>=groundY && player.y+player.h<=groundY+40){
        player.y=groundY-player.h;
        player.vy=0;
        player.grounded=true;
      }
    }
  }

  // crates collision
  for(let c of crates){
    if(player.x+player.w>c.x && player.x<c.x+c.w &&
       player.y+player.h>c.y && player.y<c.y+c.h){
        player.x-=player.vx*dt; // simple stop
    }
  }

  // fall reset
  if(player.y>H+200){
    player.x=100;
    player.y=0;
    player.vy=0;
  }

  // win
  if(player.x+player.w>goal.x){
    winBox.classList.remove("hidden");
  }

  // progress
  const progress=Math.min(player.x/goal.x,1);
  progressFill.style.width=(progress*100)+"%";
  percentEl.textContent=Math.floor(progress*100)+"%";

  cameraX=player.x-150;
}

function draw(){
  ctx.clearRect(0,0,W,H);

  ctx.save();
  ctx.translate(-cameraX,0);

  // ground
  ctx.fillStyle="#3CB371";
  for(let p of platforms){
    ctx.fillRect(p.x,groundY,p.w,H-groundY);
  }

  // pits visual
  ctx.fillStyle="#5c3d2e";
  ctx.fillRect(400,groundY,150,H-groundY);
  ctx.fillRect(850,groundY,150,H-groundY);
  ctx.fillRect(1350,groundY,150,H-groundY);

  // crates
  ctx.fillStyle="#8B4513";
  for(let c of crates){
    ctx.fillRect(c.x,c.y,c.w,c.h);
  }

  // car
  if(carImg.complete){
    const carH=carImg.height*(goal.w/carImg.width);
    ctx.drawImage(carImg,goal.x,groundY-carH,goal.w,carH);
  }

  // player
  if(playerImg.complete){
    ctx.drawImage(playerImg,player.x,player.y,player.w,player.h);
  }

  ctx.restore();
}

let last=performance.now();
function loop(now){
  const dt=(now-last)/1000;
  last=now;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

continueBtn.onclick=()=>window.location.href="cargame.html";
