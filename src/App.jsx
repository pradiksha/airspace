import { useEffect, useMemo, useState } from 'react';
import Radar from './Radar';
import { createSim, telemetry } from './sim';

const fmt = (n) => n.toLocaleString('en-US');

function Detail({ f }) {
  const t = telemetry(f);
  return (
    <section className="detail" aria-live="polite">
      <h2>{f.callsign}</h2>
      <p className="route">
        {f.from.city} to {f.to.city}
      </p>
      <p className="phase">{t.phase}</p>
      <div className="meter" role="img" aria-label={`Trip ${Math.round(f.p * 100)}% complete`}>
        <span style={{ width: `${f.p * 100}%` }} />
      </div>
      <dl>
        <div><dt>Altitude</dt><dd>{fmt(t.altitude)} ft</dd></div>
        <div><dt>Ground speed</dt><dd>{t.speed} kt</dd></div>
        <div><dt>Heading</dt><dd>{String(t.heading).padStart(3, '0')}°</dd></div>
        <div><dt>To go</dt><dd>{fmt(t.remainingNm)} nm</dd></div>
      </dl>
    </section>
  );
}

export default function App() {
  const sim = useMemo(() => createSim(9), []);
  const [selectedId, setSelectedId] = useState(null);
  const [paused, setPaused] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [, setTick] = useState(0);

  // Re-render the side panel a few times a second; the map animates itself.
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 250);
    return () => clearInterval(id);
  }, []);

  const selected = sim.flights.find((f) => f.id === selectedId);

  return (
    <div className="app">
      <Radar sim={sim} selectedId={selectedId} onSelect={setSelectedId} paused={paused} speed={speed} />
      <aside className="side">
        <header>
          <h1>Western airspace</h1>
          <p>{sim.flights.length} aircraft in the air</p>
        </header>

        {selected ? (
          <Detail f={selected} />
        ) : (
          <section>
            <p className="hint">Select an aircraft on the map or from the list.</p>
            <ul className="flights">
              {sim.flights.map((f) => (
                <li key={f.id}>
                  <button onClick={() => setSelectedId(f.id)}>
                    <b>{f.callsign}</b>
                    <span>{f.from.code} to {f.to.code}</span>
                    <span>{fmt(telemetry(f).altitude)} ft</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        <footer className="controls">
          {selected && <button onClick={() => setSelectedId(null)}>Show all flights</button>}
          <button onClick={() => setPaused((p) => !p)}>{paused ? 'Resume' : 'Pause'}</button>
          <label>
            Time speed {speed}×
            <input type="range" min="0.5" max="6" step="0.5" value={speed} onChange={(e) => setSpeed(+e.target.value)} />
          </label>
        </footer>
      </aside>
    </div>
  );
}
