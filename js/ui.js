// ── Mensajes ──
export function showMsg(id, text) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = text;
  el.style.display = 'block';
}

export function clearMsg(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = 'none';
}

// ── Toast ──
export function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2200);
}

// ── Confetti ──
export function showConfetti(hueBase) {
  const h = hueBase || 44;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const CW = window.innerWidth, CH = window.innerHeight;
  const cv = document.createElement('canvas');
  cv.width = CW * dpr; cv.height = CH * dpr;
  cv.style.cssText = `position:fixed;inset:0;width:${CW}px;height:${CH}px;pointer-events:none;z-index:9999`;
  document.body.appendChild(cv);
  const ctx = cv.getContext('2d');
  ctx.scale(dpr, dpr);
  const cx = CW/2, cy = CH * 0.42;
  const rings = [
    { n:10, r1:110, speed:5.0, delay:0,  hue:h },
    { n:14, r1:160, speed:3.8, delay:40, hue:h-6 },
    { n:7,  r1:75,  speed:6.2, delay:10, hue:h+6 },
    { n:5,  r1:200, speed:2.8, delay:70, hue:h-2 },
  ];
  const ps = [];
  rings.forEach(ring => {
    for(let i=0;i<ring.n;i++){
      const a=(i/ring.n)*Math.PI*2+Math.random()*.25;
      ps.push({
        angle:a, r:0, targetR:ring.r1,
        speed:ring.speed*(0.8+Math.random()*.4),
        life:1, decay:.013+Math.random()*.008,
        size:1.8+Math.random()*2,
        hue:ring.hue+Math.random()*14,
        delay:ring.delay, frame:0,
      });
    }
  });
  let t=0;
  function frame(){
    t++; ctx.clearRect(0,0,CW,CH);
    let alive=false;
    ps.forEach(p=>{
      p.frame++;
      if(p.frame<p.delay){alive=true;return;}
      p.r=Math.min(p.r+p.speed, p.targetR);
      p.life-=p.decay;
      if(p.life<=0)return;
      alive=true;
      const x=cx+Math.cos(p.angle)*p.r;
      const y=cy+Math.sin(p.angle)*p.r*.72;
      ctx.save(); ctx.globalAlpha=p.life*.22;
      ctx.beginPath(); ctx.arc(x,y,p.size*5,0,Math.PI*2);
      ctx.fillStyle=`hsl(${p.hue},100%,62%)`; ctx.fill(); ctx.restore();
      ctx.save(); ctx.globalAlpha=p.life*p.life*.92;
      ctx.beginPath(); ctx.arc(x,y,p.size*p.life,0,Math.PI*2);
      const g=ctx.createRadialGradient(x,y,0,x,y,p.size*3);
      g.addColorStop(0,`hsla(${p.hue+8},100%,88%,1)`);
      g.addColorStop(.4,`hsla(${p.hue},95%,66%,.8)`);
      g.addColorStop(1,`hsla(${p.hue-8},80%,40%,0)`);
      ctx.fillStyle=g; ctx.fill(); ctx.restore();
      ctx.save(); ctx.globalAlpha=p.life*.4;
      const px2=cx+Math.cos(p.angle)*(p.r-p.speed*3.5);
      const py2=cy+Math.sin(p.angle)*(p.r-p.speed*3.5)*.72;
      ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(px2,py2);
      ctx.strokeStyle=`hsla(${p.hue},95%,68%,1)`;
      ctx.lineWidth=p.size*.5; ctx.lineCap='round'; ctx.stroke(); ctx.restore();
    });
    if(alive&&t<160)requestAnimationFrame(frame);
    else cv.remove();
  }
  frame();
}

export function showXPFloat(habitId, xp) {
  // Color según peso del hábito
  const isFantasy = document.documentElement.getAttribute('data-theme') === 'fantasy';
  const color = xp >= 50
    ? (isFantasy ? '#d4a843' : '#c4a84f')
    : xp >= 25
      ? (isFantasy ? '#aab4c8' : '#8fb339')
      : (isFantasy ? '#cd7f50' : '#5a6b5a');

  const card = document.getElementById('habit-' + habitId);
  let startX, startY;
  if (card) {
    const rect = card.getBoundingClientRect();
    // Más a la izquierda — alejado del tick
    startX = rect.right - 110;
    startY = rect.top + rect.height / 2;
  } else {
    startX = window.innerWidth / 2;
    startY = window.innerHeight * 0.45;
  }

  const el = document.createElement('div');
  el.style.cssText = `
    position:fixed;
    left:${startX}px;
    top:${startY}px;
    display:flex;
    align-items:baseline;
    gap:2px;
    pointer-events:none;
    z-index:9999;
    opacity:0;
    animation:xpFloatB 1.1s linear forwards;
  `;
  const big = document.createElement('span');
  big.style.cssText = `font-size:18px;font-weight:800;color:${color};`;
  big.textContent = `+${xp}`;
  const sm = document.createElement('span');
  sm.style.cssText = `font-size:10px;font-weight:700;color:${color};opacity:0.65;`;
  sm.textContent = 'XP';
  el.appendChild(big);
  el.appendChild(sm);
  document.body.appendChild(el);

  if (!document.getElementById('xp-float-style')) {
    const s = document.createElement('style');
    s.id = 'xp-float-style';
    s.textContent = `@keyframes xpFloatB {
      0%   { opacity:0; transform:translateY(4px); }
      10%  { opacity:1; transform:translateY(-2px); }
      85%  { opacity:1; transform:translateY(-18px); }
      100% { opacity:0; transform:translateY(-22px); }
    }`;
    document.head.appendChild(s);
  }
  setTimeout(() => el.remove(), 1100);
}

// ── Router de vistas ──
export function switchView(view) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('view-' + view).classList.add('active');
  document.getElementById('nav-' + view).classList.add('active');
  // Resetear color gold del nav-hoy si salimos de hoy
  if (view !== 'hoy') {
    const navHoy = document.getElementById('nav-hoy');
    if (navHoy) navHoy.style.color = '';
  }
}
