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
  const cv = document.createElement('canvas');
  cv.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:9999';
  cv.width = window.innerWidth; cv.height = window.innerHeight;
  document.body.appendChild(cv);
  const ctx = cv.getContext('2d');
  const ps = [];
  const cx = cv.width/2, cy = cv.height * 0.42;
  for (let i = 0; i < 32; i++) {
    const a = (Math.random() * Math.PI * 2);
    const speed = 1.5 + Math.random() * 3.5;
    ps.push({
      x: cx + (Math.random()-.5)*80,
      y: cy + (Math.random()-.5)*30,
      vx: Math.cos(a)*speed,
      vy: Math.sin(a)*speed - 1.5,
      life: 1, decay: 0.012+Math.random()*0.01,
      r: 1.5+Math.random()*2.5,
      hue: 38+Math.random()*20,
    });
  }
  let t = 0;
  function frame() {
    t++; ctx.clearRect(0,0,cv.width,cv.height);
    let alive = false;
    ps.forEach(p => {
      p.x+=p.vx; p.y+=p.vy; p.vy+=0.06; p.vx*=0.98;
      p.life-=p.decay;
      if(p.life<=0) return;
      alive = true;
      ctx.save();
      ctx.globalAlpha = p.life*p.life*0.85;
      ctx.beginPath(); ctx.arc(p.x,p.y,p.r*p.life,0,Math.PI*2);
      const g = ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,p.r*2.5);
      g.addColorStop(0,`hsla(${p.hue+8},100%,80%,1)`);
      g.addColorStop(.5,`hsla(${p.hue},95%,60%,.8)`);
      g.addColorStop(1,`hsla(${p.hue-8},80%,38%,0)`);
      ctx.fillStyle=g; ctx.fill();
      // tail
      ctx.globalAlpha=p.life*.3;
      ctx.beginPath(); ctx.moveTo(p.x,p.y); ctx.lineTo(p.x-p.vx*2.5,p.y-p.vy*2.5);
      ctx.strokeStyle=`hsla(${p.hue},95%,65%,1)`; ctx.lineWidth=p.r*.5; ctx.lineCap='round'; ctx.stroke();
      ctx.restore();
    });
    if(alive && t<120) requestAnimationFrame(frame);
    else cv.remove();
  }
  frame();
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
