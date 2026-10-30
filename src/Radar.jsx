import { useEffect, useRef } from 'react';
import { AIRPORTS, geometry, pointAt } from './sim';

const C = { paper: '#E9EEF0', grid: '#D2DCE1', ink: '#14264A', route: '#5E8BB8', ring: '#B3246B', sel: '#E8A317' };
const WING = [[11, 0], [5, -2], [-1, -11], [-4, -11], [-2, -2.5], [-8, -2], [-10, -5], [-12, -5], [-11, 0]];

function drawPlane(ctx, x, y, angle, color, scale = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.scale(scale, scale);
  ctx.beginPath();
  WING.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
  [...WING].reverse().forEach(([px, py]) => ctx.lineTo(px, -py));
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}

function curve(ctx, g, from = 0, to = 1, steps = 40) {
  ctx.beginPath();
  for (let i = 0; i <= steps; i++) {
    const { x, y } = pointAt(g, from + ((to - from) * i) / steps);
    i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
  }
}

function draw(ctx, w, h, sim, selectedId) {
  ctx.fillStyle = C.paper;
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = C.grid;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 0; x < w; x += 64) { ctx.moveTo(x, 0); ctx.lineTo(x, h); }
  for (let y = 0; y < h; y += 64) { ctx.moveTo(0, y); ctx.lineTo(w, y); }
  ctx.stroke();

  // Routes
  sim.flights.forEach((f) => {
    f.g = geometry(f, w, h);
    const sel = f.id === selectedId;
    curve(ctx, f.g);
    ctx.setLineDash(sel ? [] : [4, 6]);
    ctx.strokeStyle = sel ? C.sel : C.route;
    ctx.globalAlpha = sel ? 1 : 0.45;
    ctx.lineWidth = sel ? 2 : 1;
    ctx.stroke();
  });
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;

  // Airports
  ctx.font = '600 12px Archivo, system-ui, sans-serif';
  AIRPORTS.forEach((a) => {
    const x = a.x * w, y = a.y * h;
    ctx.strokeStyle = C.ring;
    ctx.lineWidth = 1.2;
    [12, 24].forEach((r, i) => {
      ctx.globalAlpha = i ? 0.35 : 0.75;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.stroke();
    });
    ctx.globalAlpha = 1;
    ctx.fillStyle = C.ink;
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillText(a.code, x + 29, y + 4);
  });

  // Aircraft with a short wake
  sim.flights.forEach((f) => {
    const sel = f.id === selectedId;
    const { x, y, angle } = pointAt(f.g, f.p);
    f.sx = x; f.sy = y;
    curve(ctx, f.g, Math.max(0, f.p - 0.1), f.p, 12);
    ctx.strokeStyle = sel ? C.sel : C.ink;
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.globalAlpha = 1;
    if (sel) {
      ctx.strokeStyle = C.sel;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, 20, 0, Math.PI * 2);
      ctx.stroke();
    }
    drawPlane(ctx, x, y, angle, sel ? C.sel : C.ink, sel ? 1.3 : 1);
    ctx.fillStyle = C.ink;
    ctx.fillText(f.callsign, x + 16, y - 14);
  });
}

export default function Radar({ sim, selectedId, onSelect, paused, speed }) {
  const canvasRef = useRef(null);
  const live = useRef({});
  live.current = { selectedId, paused, speed };

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let w = 0, h = 0, raf, last = performance.now();

    const resize = () => {
      const r = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      w = r.width; h = r.height;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const frame = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const { paused, speed, selectedId } = live.current;
      if (!paused) sim.step(dt * speed);
      draw(ctx, w, h, sim, selectedId);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, [sim]);

  const handleClick = (e) => {
    const r = canvasRef.current.getBoundingClientRect();
    const mx = e.clientX - r.left, my = e.clientY - r.top;
    let best = null, bestD = 26;
    sim.flights.forEach((f) => {
      const d = Math.hypot(f.sx - mx, f.sy - my);
      if (d < bestD) { best = f; bestD = d; }
    });
    onSelect(best ? best.id : null);
  };

  return <canvas ref={canvasRef} className="radar" onClick={handleClick} aria-label="Map of aircraft in flight" />;
}
