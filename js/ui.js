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
export function showConfetti() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const CW = window.innerWidth, CH = window.innerHeight;
  const cv = document.createElement('canvas');
  cv.width = CW * dpr; cv.height = CH * dpr;
  cv.style.cssText = `position:fixed;inset:0;width:${CW}px;height:${CH}px;pointer-events:none;z-index:9999`;
  document.body.appendChild(cv);
  const ctx = cv.getContext('2d');
  ctx.scale(dpr, dpr);
  const cx = CW/2, cy = CH * 0.42;
  // Burst orbital: 3 anillos de partículas que explotan hacia afuera
  const rings = [
    { n:10, r1:110, speed:5.0, delay:0,  hue:44 },
    { n:14, r1:160, speed:3.8, delay:40, hue:38 },
    { n:7,  r1:75,  speed:6.2, delay:10, hue:50 },
    { n:5,  r1:200, speed:2.8, delay:70, hue:42 },
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
  // Color según peso del XP
  const color = xp >= 50 ? '#c4a84f' : xp >= 25 ? '#8fb339' : '#6b7560';
  // Buscar el elemento del hábito en la lista
  const el = document.createElement('div');
  el.style.cssText = `
    position:fixed;
    left:50%;
    top:45%;
    transform:translate(-50%,-50%);
    font-family:'DM Sans',sans-serif;
    font-size:38px;
    font-weight:700;
    color:${color};
    pointer-events:none;
    z-index:9999;
    opacity:1;
    text-shadow:0 2px 16px ${color}66;
    animation:xpFloat 0.9s ease-out forwards;
  `;
  el.textContent = `+${xp} XP`;
  document.body.appendChild(el);

  // Inyectar keyframes si no existen
  if (!document.getElementById('xp-float-style')) {
    const s = document.createElement('style');
    s.id = 'xp-float-style';
    s.textContent = `@keyframes xpFloat {
      0%   { opacity:0; transform:translate(-50%,-50%) scale(0.6); }
      15%  { opacity:1; transform:translate(-50%,-60%) scale(1.1); }
      40%  { opacity:0.9; transform:translate(-50%,-70%) scale(1); }
      100% { opacity:0; transform:translate(-50%,-90%) scale(0.85); }
    }`;
    document.head.appendChild(s);
  }
  setTimeout(() => el.remove(), 900);
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
