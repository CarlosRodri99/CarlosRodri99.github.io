/* ==============================================================
   PORTAFOLIO CARLOS RODRÍGUEZ - SCRIPTS
   ============================================================== */

/* ====================================================================
   1) CEREBRO WIREFRAME LOW-POLY
   Genera una red neuronal animada con forma de cerebro en el canvas.
   - Distribuye nodos dentro de la silueta cerebral con muestreo Poisson
   - Cada nodo se conecta a sus 4 vecinos más cercanos (malla wireframe)
   - Animación sutil de respiración + brillo (flicker)
   ==================================================================== */
(function () {
  const canvas = document.getElementById('brainCanvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let W, H, DPR;
  let nodes = [];
  let edges = [];

  function resize() {
    DPR = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    W = rect.width;
    H = rect.height;
    canvas.width  = W * DPR;
    canvas.height = H * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }

  /* Silueta cerebro - devuelve true si el punto (u,v) en [-1,1] está dentro */
  function brainShape(u, v) {
    const uu = u;
    const vv = v * 1.15; // estira un poco verticalmente
    const r = Math.sqrt(uu * uu + vv * vv);
    if (r > 1.15) return false;

    const angle = Math.atan2(vv, uu);
    // ondulación para sugerir lóbulos
    const lobeMod = 0.07 * Math.sin(angle * 5 + 0.5) + 0.04 * Math.cos(angle * 3);
    // hendidura superior (fisura interhemisférica)
    const topCleft = (vv < -0.45 && Math.abs(uu) < 0.06) ? -0.18 : 0;
    // tronco encefálico abajo
    const bottomCleft = (vv > 0.55 && Math.abs(uu) < 0.1) ? -0.12 : 0;

    const boundary = 1 + lobeMod + topCleft + bottomCleft;
    return r < boundary;
  }

  function dist(a, b) {
    const dx = a.x - b.x, dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function buildNodes() {
    nodes = [];
    const cx = W * 0.5, cy = H * 0.5;
    const rx = W * 0.42, ry = H * 0.40;

    const minDist = Math.min(W, H) * 0.042;
    const target = Math.floor((W * H) / 1800);

    let attempts = 0;
    while (nodes.length < target && attempts < target * 50) {
      attempts++;
      const u = (Math.random() * 2 - 1);
      const v = (Math.random() * 2 - 1);
      if (!brainShape(u, v)) continue;

      const x = cx + u * rx;
      const y = cy + v * ry;

      let tooClose = false;
      for (const n of nodes) {
        if (dist({ x, y }, n) < minDist) { tooClose = true; break; }
      }
      if (tooClose) continue;

      nodes.push({
        x, y,
        baseX: x, baseY: y,
        r: Math.random() * 1.2 + 0.6,
        phase: Math.random() * Math.PI * 2,
        speed: Math.random() * 0.5 + 0.25,
        bright: Math.random() < 0.18 ? 1.6 : 1.0
      });
    }
  }

  /* Conecta cada nodo a sus k vecinos más próximos */
  function buildEdges() {
    edges = [];
    const k = 4;
    const maxDistAllowed = Math.min(W, H) * 0.18;
    const seen = new Set();

    for (let i = 0; i < nodes.length; i++) {
      const dists = [];
      for (let j = 0; j < nodes.length; j++) {
        if (i === j) continue;
        const d = dist(nodes[i], nodes[j]);
        if (d < maxDistAllowed) dists.push({ j, d });
      }
      dists.sort((a, b) => a.d - b.d);
      const neighbors = dists.slice(0, k);
      for (const nb of neighbors) {
        const key = i < nb.j ? `${i}-${nb.j}` : `${nb.j}-${i}`;
        if (!seen.has(key)) {
          seen.add(key);
          edges.push({ a: i, b: nb.j });
        }
      }
    }
  }

  function init() {
    resize();
    buildNodes();
    buildEdges();
  }

  let t = 0;
  function draw() {
    t += 0.008;
    ctx.clearRect(0, 0, W, H);

    // glow central
    const g = ctx.createRadialGradient(W * 0.5, H * 0.5, 10, W * 0.5, H * 0.5, Math.min(W, H) * 0.5);
    g.addColorStop(0, 'rgba(59,130,246,0.16)');
    g.addColorStop(1, 'rgba(59,130,246,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // animación sutil de respiración
    for (const n of nodes) {
      n.x = n.baseX + Math.sin(t * n.speed + n.phase) * 2.2;
      n.y = n.baseY + Math.cos(t * n.speed + n.phase * 1.3) * 2.2;
    }

    // aristas (malla wireframe)
    for (const e of edges) {
      const a = nodes[e.a], b = nodes[e.b];
      const d = dist(a, b);
      const alpha = Math.max(0.08, Math.min(0.55, 1 - d / (Math.min(W, H) * 0.2)));
      ctx.strokeStyle = `rgba(140, 190, 255, ${alpha * 0.55})`;
      ctx.lineWidth = 0.55;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }

    // nodos con halo
    for (const n of nodes) {
      const flicker = 0.65 + 0.35 * Math.sin(t * 2 + n.phase);
      const baseR = n.r * n.bright;

      const grad = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, baseR * 7);
      grad.addColorStop(0, `rgba(180, 220, 255, ${0.55 * flicker})`);
      grad.addColorStop(0.4, `rgba(120, 180, 255, ${0.18 * flicker})`);
      grad.addColorStop(1, 'rgba(120, 180, 255, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(n.x, n.y, baseR * 7, 0, Math.PI * 2);
      ctx.fill();

      // núcleo
      ctx.fillStyle = `rgba(230, 240, 255, ${0.95 * flicker})`;
      ctx.beginPath();
      ctx.arc(n.x, n.y, baseR, 0, Math.PI * 2);
      ctx.fill();
    }

    requestAnimationFrame(draw);
  }

  window.addEventListener('resize', () => { init(); });
  init();
  draw();
})();


/* ====================================================================
   2) SCROLL REVEAL
   Anima los elementos con clase .reveal al entrar en el viewport
   ==================================================================== */
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('visible');
      revealObserver.unobserve(e.target);
    }
  });
}, { threshold: 0.12 });

document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));


/* ====================================================================
   3) SMOOTH SCROLL EN ENLACES INTERNOS
   ==================================================================== */
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const href = a.getAttribute('href');
    if (href.length > 1) {
      const target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  });
});


/* ====================================================================
   4) BOTÓN VOLVER ARRIBA
   Aparece tras 400px de scroll y vuelve al inicio suavemente
   ==================================================================== */
const scrollTopBtn = document.getElementById('scrollTopBtn');
if (scrollTopBtn) {
  window.addEventListener('scroll', () => {
    if (window.scrollY > 400) {
      scrollTopBtn.classList.add('visible');
    } else {
      scrollTopBtn.classList.remove('visible');
    }
  });

  scrollTopBtn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}


/* ====================================================================
   5) COPIAR EMAIL AL PORTAPAPELES
   ==================================================================== */
const copyEmailBtn = document.getElementById('copyEmailBtn');
const copyEmailFeedback = document.getElementById('copyEmailFeedback');

if (copyEmailBtn && copyEmailFeedback) {
  const emailAddress = 'carlos.rodriguez.monzo.99@gmail.com';
  const originalText = copyEmailFeedback.textContent;

  copyEmailBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(emailAddress);
      copyEmailFeedback.textContent = '✓ ¡Copiado!';
      copyEmailFeedback.style.color = '#4ade80';
    } catch (err) {
      // Fallback para navegadores antiguos
      const tmp = document.createElement('textarea');
      tmp.value = emailAddress;
      document.body.appendChild(tmp);
      tmp.select();
      try {
        document.execCommand('copy');
        copyEmailFeedback.textContent = '✓ ¡Copiado!';
        copyEmailFeedback.style.color = '#4ade80';
      } catch (e) {
        copyEmailFeedback.textContent = 'No se pudo copiar';
        copyEmailFeedback.style.color = '#f87171';
      }
      document.body.removeChild(tmp);
    }
    setTimeout(() => {
      copyEmailFeedback.textContent = originalText;
      copyEmailFeedback.style.color = '';
    }, 2200);
  });
}
