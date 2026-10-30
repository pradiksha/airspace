// Airports sit in unit coordinates (0..1) so the map scales to any screen.
export const AIRPORTS = [
  { code: 'SEA', city: 'Seattle', x: 0.2, y: 0.1 },
  { code: 'PDX', city: 'Portland', x: 0.16, y: 0.22 },
  { code: 'SFO', city: 'San Francisco', x: 0.08, y: 0.5 },
  { code: 'LAX', city: 'Los Angeles', x: 0.16, y: 0.74 },
  { code: 'LAS', city: 'Las Vegas', x: 0.3, y: 0.66 },
  { code: 'PHX', city: 'Phoenix', x: 0.4, y: 0.84 },
  { code: 'SLC', city: 'Salt Lake City', x: 0.4, y: 0.38 },
  { code: 'DEN', city: 'Denver', x: 0.64, y: 0.52 },
  { code: 'MSP', city: 'Minneapolis', x: 0.88, y: 0.2 },
  { code: 'DFW', city: 'Dallas', x: 0.86, y: 0.84 },
];

const AIRLINES = ['AAL', 'DAL', 'UAL', 'SWA', 'ASA', 'JBU'];
const rnd = (a, b) => a + Math.random() * (b - a);
const NM_PER_UNIT = 2000;
let nextId = 1;

function makeFlight(from, p = 0) {
  let to;
  do {
    to = AIRPORTS[Math.floor(Math.random() * AIRPORTS.length)];
  } while (to === from);
  return {
    id: nextId++,
    callsign: AIRLINES[Math.floor(Math.random() * AIRLINES.length)] + Math.floor(rnd(100, 2999)),
    from, to, p,
    cruise: Math.round(rnd(310, 390)), // flight level
    bend: rnd(0.12, 0.24),
  };
}

export function createSim(count = 9) {
  const flights = Array.from({ length: count }, () =>
    makeFlight(AIRPORTS[Math.floor(Math.random() * AIRPORTS.length)], rnd(0, 0.9))
  );
  return {
    flights,
    step(dt) {
      flights.forEach((f, i) => {
        f.p += (dt * 0.02) / Math.hypot(f.to.x - f.from.x, f.to.y - f.from.y);
        if (f.p >= 1) flights[i] = makeFlight(f.to);
      });
    },
  };
}

// Each route is a quadratic curve that bows north, like a great-circle on a flat chart.
export function geometry(f, w, h) {
  const p0 = { x: f.from.x * w, y: f.from.y * h };
  const p1 = { x: f.to.x * w, y: f.to.y * h };
  const dx = p1.x - p0.x, dy = p1.y - p0.y, d = Math.hypot(dx, dy);
  let nx = -dy / d, ny = dx / d;
  if (ny > 0) { nx = -nx; ny = -ny; }
  const c = { x: (p0.x + p1.x) / 2 + nx * d * f.bend, y: (p0.y + p1.y) / 2 + ny * d * f.bend };
  return { p0, p1, c };
}

export function pointAt({ p0, p1, c }, t) {
  const u = 1 - t;
  const x = u * u * p0.x + 2 * u * t * c.x + t * t * p1.x;
  const y = u * u * p0.y + 2 * u * t * c.y + t * t * p1.y;
  const dx = 2 * u * (c.x - p0.x) + 2 * t * (p1.x - c.x);
  const dy = 2 * u * (c.y - p0.y) + 2 * t * (p1.y - c.y);
  return { x, y, angle: Math.atan2(dy, dx), bearing: ((Math.atan2(dx, -dy) * 180) / Math.PI + 360) % 360 };
}

export function telemetry(f, w = 1000, h = 700) {
  const climb = Math.min(1, Math.sin(Math.PI * f.p) * 3);
  const totalNm = Math.hypot(f.to.x - f.from.x, f.to.y - f.from.y) * NM_PER_UNIT * (1 + f.bend * 0.4);
  const { bearing } = pointAt(geometry(f, w, h), f.p);
  return {
    altitude: Math.round(f.cruise * climb) * 100,
    speed: Math.round(170 + 290 * climb),
    heading: Math.round(bearing),
    remainingNm: Math.round(totalNm * (1 - f.p)),
    phase: f.p < 0.2 ? 'Climbing' : f.p > 0.8 ? 'Descending' : 'Cruising',
  };
}
