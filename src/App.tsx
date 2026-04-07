import React, { useEffect, useMemo, useRef, useState } from 'react';

type Vec2 = { x: number; y: number };

type Guard = {
  id: string;
  pos: Vec2;
  waypointIndex: number;
  waypoints: Vec2[];
  speed: number;
  facing: number;
};

type GameStatus = 'playing' | 'detected' | 'extracted' | 'timeup';

const WIDTH = 960;
const HEIGHT = 600;
const PLAYER_RADIUS = 10;
const GUARD_RADIUS = 11;
const PLAYER_SPEED = 230; // px/s
const GUARD_FOV = Math.PI / 3; // 60deg
const GUARD_VIEW_DISTANCE = 180;
const LOOP_SECONDS = 12 * 60;

const START_POS: Vec2 = { x: 80, y: 300 };
const OBJECTIVE_POS: Vec2 = { x: 780, y: 150 };
const EXTRACTION_ZONE = { x: 830, y: 470, w: 90, h: 90 };

const WALLS = [
  { x: 190, y: 100, w: 30, h: 380 },
  { x: 190, y: 100, w: 250, h: 30 },
  { x: 410, y: 100, w: 30, h: 250 },
  { x: 300, y: 320, w: 260, h: 30 },
  { x: 560, y: 220, w: 30, h: 260 },
  { x: 560, y: 450, w: 260, h: 30 },
  { x: 730, y: 80, w: 30, h: 180 },
];

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function pointInRect(p: Vec2, r: { x: number; y: number; w: number; h: number }) {
  return p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
}

function collidesWithWall(pos: Vec2, radius: number) {
  return WALLS.some(
    (w) =>
      pos.x + radius > w.x &&
      pos.x - radius < w.x + w.w &&
      pos.y + radius > w.y &&
      pos.y - radius < w.y + w.h
  );
}

function normalizeAngle(a: number) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

const INITIAL_GUARDS: Guard[] = [
  {
    id: 'g1',
    pos: { x: 300, y: 230 },
    waypointIndex: 0,
    waypoints: [
      { x: 300, y: 230 },
      { x: 520, y: 230 },
      { x: 520, y: 140 },
      { x: 300, y: 140 },
    ],
    speed: 90,
    facing: 0,
  },
  {
    id: 'g2',
    pos: { x: 690, y: 350 },
    waypointIndex: 0,
    waypoints: [
      { x: 690, y: 350 },
      { x: 860, y: 350 },
      { x: 860, y: 220 },
      { x: 690, y: 220 },
    ],
    speed: 95,
    facing: 0,
  },
];

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const keys = useRef<Record<string, boolean>>({});

  const [player, setPlayer] = useState<Vec2>(START_POS);
  const [guards, setGuards] = useState<Guard[]>(INITIAL_GUARDS);
  const [hasObjective, setHasObjective] = useState(false);
  const [status, setStatus] = useState<GameStatus>('playing');
  const [timeLeft, setTimeLeft] = useState(LOOP_SECONDS);
  const [attempt, setAttempt] = useState(1);

  const hudMessage = useMemo(() => {
    if (status === 'detected') return 'Detected! Loop reset.';
    if (status === 'timeup') return 'Time expired! Loop reset.';
    if (status === 'extracted') return 'Heist complete! Starting new loop.';
    if (!hasObjective) return 'Steal the Chrono Core.';
    return 'Extract at the green zone.';
  }, [status, hasObjective]);

  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      keys.current[e.key.toLowerCase()] = true;
      if (e.key === ' ') e.preventDefault();
    };
    const onUp = (e: KeyboardEvent) => {
      keys.current[e.key.toLowerCase()] = false;
    };

    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);

    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
    };
  }, []);

  const resetLoop = (reason: GameStatus) => {
    setStatus(reason);
    setTimeout(() => {
      setPlayer(START_POS);
      setGuards(INITIAL_GUARDS.map((g) => ({ ...g, pos: { ...g.waypoints[0] }, waypointIndex: 0, facing: 0 })));
      setHasObjective(false);
      setTimeLeft(LOOP_SECONDS);
      setStatus('playing');
      setAttempt((a) => a + 1);
    }, 900);
  };

  useEffect(() => {
    if (status !== 'playing') return;

    let raf = 0;
    let last = performance.now();

    const step = (now: number) => {
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;

      setTimeLeft((t) => {
        const next = t - dt;
        if (next <= 0) {
          if (status === 'playing') resetLoop('timeup');
          return 0;
        }
        return next;
      });

      setPlayer((prev) => {
        let dx = 0;
        let dy = 0;
        if (keys.current['w'] || keys.current['arrowup']) dy -= 1;
        if (keys.current['s'] || keys.current['arrowdown']) dy += 1;
        if (keys.current['a'] || keys.current['arrowleft']) dx -= 1;
        if (keys.current['d'] || keys.current['arrowright']) dx += 1;

        const length = Math.hypot(dx, dy) || 1;
        const next = {
          x: clamp(prev.x + (dx / length) * PLAYER_SPEED * dt, PLAYER_RADIUS, WIDTH - PLAYER_RADIUS),
          y: clamp(prev.y + (dy / length) * PLAYER_SPEED * dt, PLAYER_RADIUS, HEIGHT - PLAYER_RADIUS),
        };

        if (collidesWithWall(next, PLAYER_RADIUS)) {
          return prev;
        }

        return next;
      });

      setGuards((prevGuards) =>
        prevGuards.map((g) => {
          const target = g.waypoints[g.waypointIndex];
          const vx = target.x - g.pos.x;
          const vy = target.y - g.pos.y;
          const dist = Math.hypot(vx, vy);

          if (dist < 2) {
            const nextIndex = (g.waypointIndex + 1) % g.waypoints.length;
            return { ...g, waypointIndex: nextIndex };
          }

          const dirX = vx / (dist || 1);
          const dirY = vy / (dist || 1);
          const candidate = {
            x: g.pos.x + dirX * g.speed * dt,
            y: g.pos.y + dirY * g.speed * dt,
          };

          return {
            ...g,
            pos: candidate,
            facing: Math.atan2(dirY, dirX),
          };
        })
      );

      raf = requestAnimationFrame(step);
    };

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [status]);

  useEffect(() => {
    if (status !== 'playing') return;

    const nearObjective = Math.hypot(player.x - OBJECTIVE_POS.x, player.y - OBJECTIVE_POS.y) < 20;
    if (nearObjective && !hasObjective) {
      setHasObjective(true);
    }

    if (hasObjective && pointInRect(player, EXTRACTION_ZONE)) {
      resetLoop('extracted');
      return;
    }

    for (const guard of guards) {
      const toPlayer = { x: player.x - guard.pos.x, y: player.y - guard.pos.y };
      const dist = Math.hypot(toPlayer.x, toPlayer.y);
      if (dist > GUARD_VIEW_DISTANCE) continue;
      const angleToPlayer = Math.atan2(toPlayer.y, toPlayer.x);
      const delta = Math.abs(normalizeAngle(angleToPlayer - guard.facing));
      if (delta <= GUARD_FOV / 2) {
        resetLoop('detected');
        return;
      }
    }
  }, [player, guards, hasObjective, status]);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, WIDTH, HEIGHT);

    // Background
    ctx.fillStyle = '#0b1020';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    // Grid
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    for (let x = 0; x < WIDTH; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, HEIGHT);
      ctx.stroke();
    }
    for (let y = 0; y < HEIGHT; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(WIDTH, y);
      ctx.stroke();
    }

    // Walls
    ctx.fillStyle = '#374151';
    WALLS.forEach((w) => ctx.fillRect(w.x, w.y, w.w, w.h));

    // Extraction zone
    ctx.fillStyle = 'rgba(16, 185, 129, 0.25)';
    ctx.fillRect(EXTRACTION_ZONE.x, EXTRACTION_ZONE.y, EXTRACTION_ZONE.w, EXTRACTION_ZONE.h);
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2;
    ctx.strokeRect(EXTRACTION_ZONE.x, EXTRACTION_ZONE.y, EXTRACTION_ZONE.w, EXTRACTION_ZONE.h);

    // Objective
    if (!hasObjective) {
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(OBJECTIVE_POS.x, OBJECTIVE_POS.y, 12, 0, Math.PI * 2);
      ctx.fill();
    }

    // Guards and FOV
    guards.forEach((g) => {
      ctx.fillStyle = 'rgba(239, 68, 68, 0.18)';
      ctx.beginPath();
      ctx.moveTo(g.pos.x, g.pos.y);
      ctx.arc(g.pos.x, g.pos.y, GUARD_VIEW_DISTANCE, g.facing - GUARD_FOV / 2, g.facing + GUARD_FOV / 2);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(g.pos.x, g.pos.y, GUARD_RADIUS, 0, Math.PI * 2);
      ctx.fill();
    });

    // Player
    ctx.fillStyle = '#60a5fa';
    ctx.beginPath();
    ctx.arc(player.x, player.y, PLAYER_RADIUS, 0, Math.PI * 2);
    ctx.fill();
  }, [player, guards, hasObjective]);

  const mins = Math.floor(timeLeft / 60)
    .toString()
    .padStart(2, '0');
  const secs = Math.floor(timeLeft % 60)
    .toString()
    .padStart(2, '0');

  return (
    <main
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(120deg, #030712, #111827)',
        color: '#e5e7eb',
        fontFamily: 'Inter, system-ui, sans-serif',
        padding: '24px',
      }}
    >
      <div style={{ maxWidth: 1024, margin: '0 auto' }}>
        <h1 style={{ margin: '0 0 6px', fontSize: 30 }}>Chrono Heist — Playable Prototype</h1>
        <p style={{ margin: '0 0 14px', color: '#9ca3af' }}>
          Move with WASD / Arrow keys. Steal the orange core, then extract in the green zone without being seen.
        </p>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            background: '#111827',
            border: '1px solid #374151',
            borderRadius: 10,
            padding: '10px 14px',
            marginBottom: 12,
          }}
        >
          <strong>Loop: {attempt}</strong>
          <strong>
            Timer: {mins}:{secs}
          </strong>
          <strong>Objective: {hasObjective ? 'Acquired' : 'Not acquired'}</strong>
          <strong style={{ color: status === 'playing' ? '#93c5fd' : '#fca5a5' }}>{hudMessage}</strong>
        </div>

        <canvas
          ref={canvasRef}
          width={WIDTH}
          height={HEIGHT}
          style={{
            width: '100%',
            maxWidth: WIDTH,
            border: '1px solid #374151',
            borderRadius: 10,
            background: '#0b1020',
            display: 'block',
          }}
        />
      </div>
    </main>
  );
}
