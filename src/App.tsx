import { useEffect, useMemo, useRef, useState } from 'react';

type District = {
  id: string;
  name: string;
  risk: number;
  flavor: string;
};

type Mission = {
  id: string;
  districtId: District['id'];
  title: string;
  difficulty: 'Low' | 'Medium' | 'High';
  rewardMin: number;
  rewardMax: number;
  repMin: number;
  repMax: number;
  energyCost: number;
};

type GameState = {
  alias: string;
  energy: number;
  heat: number;
  cash: number;
  rep: number;
  day: number;
  inventory: string[];
  missionsCompleted: number;
};

type Objective = {
  id: string;
  label: string;
  done: boolean;
};

const STORAGE_KEY = 'neon-streets-save-v2';

const DISTRICTS: District[] = [
  { id: 'harbor', name: 'Harbor Ring', risk: 24, flavor: 'Fast routes, tight patrol loops.' },
  { id: 'uptown', name: 'Glass Uptown', risk: 36, flavor: 'High payouts, expensive mistakes.' },
  { id: 'industrial', name: 'Foundry Mile', risk: 30, flavor: 'Cargo convoys and scrap markets.' },
  { id: 'oldtown', name: 'Old Quarter', risk: 18, flavor: 'Low-profile gigs and courier runs.' },
];

const MISSIONS: Mission[] = [
  { id: 'm1', districtId: 'harbor', title: 'Container Ghost Run', difficulty: 'Low', rewardMin: 130, rewardMax: 230, repMin: 6, repMax: 12, energyCost: 15 },
  { id: 'm2', districtId: 'harbor', title: 'Dockside Signal Hijack', difficulty: 'Medium', rewardMin: 170, rewardMax: 280, repMin: 8, repMax: 16, energyCost: 18 },
  { id: 'm3', districtId: 'uptown', title: 'Penthouse Data Sweep', difficulty: 'High', rewardMin: 260, rewardMax: 410, repMin: 10, repMax: 20, energyCost: 24 },
  { id: 'm4', districtId: 'uptown', title: 'Mirror Mile Escape', difficulty: 'Medium', rewardMin: 220, rewardMax: 340, repMin: 9, repMax: 17, energyCost: 20 },
  { id: 'm5', districtId: 'industrial', title: 'Foundry Convoy Pull', difficulty: 'Medium', rewardMin: 200, rewardMax: 310, repMin: 8, repMax: 17, energyCost: 19 },
  { id: 'm6', districtId: 'industrial', title: 'Scrapyard Relay Raid', difficulty: 'High', rewardMin: 240, rewardMax: 390, repMin: 11, repMax: 21, energyCost: 23 },
  { id: 'm7', districtId: 'oldtown', title: 'Backstreet Courier Swap', difficulty: 'Low', rewardMin: 120, rewardMax: 210, repMin: 5, repMax: 11, energyCost: 14 },
  { id: 'm8', districtId: 'oldtown', title: 'Arcade Vault Pickup', difficulty: 'Medium', rewardMin: 180, rewardMax: 300, repMin: 8, repMax: 15, energyCost: 18 },
];

const STARTING_STATE: GameState = {
  alias: 'Rookie',
  energy: 100,
  heat: 0,
  cash: 500,
  rep: 0,
  day: 1,
  inventory: [],
  missionsCompleted: 0,
};

const STARTING_OBJECTIVES: Objective[] = [
  { id: 'obj1', label: 'Complete 2 missions', done: false },
  { id: 'obj2', label: 'End day with heat below 40%', done: false },
  { id: 'obj3', label: 'Reach $1000 cash', done: false },
];

const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

const shuffle = <T,>(items: T[]) => [...items].sort(() => Math.random() - 0.5);

export default function App() {
  const [game, setGame] = useState<GameState>(STARTING_STATE);
  const [selectedDistrict, setSelectedDistrict] = useState<string>(DISTRICTS[0].id);
  const [aliasInput, setAliasInput] = useState('Rookie');
  const [log, setLog] = useState<string[]>(['Welcome to Neon Streets Online. Build your crew empire.']);
  const [objectives, setObjectives] = useState<Objective[]>(STARTING_OBJECTIVES);
  const logRef = useRef<HTMLDivElement | null>(null);

  const district = useMemo(() => DISTRICTS.find((d) => d.id === selectedDistrict) ?? DISTRICTS[0], [selectedDistrict]);
  const districtMissions = useMemo(
    () => shuffle(MISSIONS.filter((m) => m.districtId === district.id)).slice(0, 2),
    [district.id, game.day],
  );

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as {
        game?: GameState;
        selectedDistrict?: string;
        aliasInput?: string;
        log?: string[];
        objectives?: Objective[];
      };
      if (parsed.game) setGame(parsed.game);
      if (parsed.selectedDistrict) setSelectedDistrict(parsed.selectedDistrict);
      if (parsed.aliasInput) setAliasInput(parsed.aliasInput);
      if (parsed.log) setLog(parsed.log);
      if (parsed.objectives) setObjectives(parsed.objectives);
    } catch {
      // ignore invalid save data
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ game, selectedDistrict, aliasInput, log, objectives }),
    );
  }, [game, selectedDistrict, aliasInput, log, objectives]);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [log]);

  const appendLog = (entry: string) => setLog((prev) => [...prev, `Day ${game.day}: ${entry}`]);

  const refreshObjectives = (next: GameState) => {
    setObjectives([
      { id: 'obj1', label: 'Complete 2 missions', done: next.missionsCompleted >= 2 },
      { id: 'obj2', label: 'End day with heat below 40%', done: next.heat < 40 },
      { id: 'obj3', label: 'Reach $1000 cash', done: next.cash >= 1000 },
    ]);
  };

  const runMission = (mission: Mission) => {
    if (game.energy < mission.energyCost) {
      appendLog(`Not enough energy for ${mission.title}. Need ${mission.energyCost} energy.`);
      return;
    }

    const difficultyPenalty = mission.difficulty === 'High' ? 16 : mission.difficulty === 'Medium' ? 10 : 4;
    const successChance = Math.max(20, 88 - district.risk - difficultyPenalty - Math.floor(game.heat / 2));
    const success = randomInt(1, 100) <= successChance;

    if (success) {
      const payout = randomInt(mission.rewardMin, mission.rewardMax);
      const repGain = randomInt(mission.repMin, mission.repMax);
      const next = {
        ...game,
        cash: game.cash + payout,
        rep: game.rep + repGain,
        energy: Math.max(0, game.energy - mission.energyCost),
        heat: Math.min(100, game.heat + randomInt(5, 11)),
        day: game.day + 1,
        missionsCompleted: game.missionsCompleted + 1,
      };
      setGame(next);
      refreshObjectives(next);
      appendLog(`${mission.title} complete. +$${payout}, +${repGain} REP.`);
      if (Math.random() > 0.67) {
        const item = ['Signal Scrambler', 'Turbo Kit', 'Safehouse Key', 'Encrypted Tablet'][randomInt(0, 3)];
        const withLoot = { ...next, inventory: [...next.inventory, item] };
        setGame(withLoot);
        refreshObjectives(withLoot);
        appendLog(`Bonus loot found: ${item}.`);
      }
      return;
    }

    const loss = randomInt(70, 200);
    const next = {
      ...game,
      cash: Math.max(0, game.cash - loss),
      energy: Math.max(0, game.energy - Math.ceil(mission.energyCost * 1.2)),
      heat: Math.min(100, game.heat + randomInt(12, 26)),
      day: game.day + 1,
    };
    setGame(next);
    refreshObjectives(next);
    appendLog(`${mission.title} failed. Lost $${loss} during extraction.`);
  };

  const layLow = () => {
    const next = {
      ...game,
      energy: Math.min(100, game.energy + 32),
      heat: Math.max(0, game.heat - 17),
      day: game.day + 1,
    };
    setGame(next);
    refreshObjectives(next);
    appendLog('You laid low, reduced heat, and recovered energy.');
  };

  const investCrew = () => {
    if (game.cash < 250) {
      appendLog('Need at least $250 to invest in crew upgrades.');
      return;
    }
    const next = { ...game, cash: game.cash - 250, rep: game.rep + 12 };
    setGame(next);
    refreshObjectives(next);
    appendLog('Crew investment successful. -$250, +12 REP.');
  };

  const applyAlias = () => {
    const trimmed = aliasInput.trim();
    if (!trimmed) return;
    setGame((prev) => ({ ...prev, alias: trimmed }));
    appendLog(`Alias changed to ${trimmed}.`);
  };

  const resetGame = () => {
    localStorage.removeItem(STORAGE_KEY);
    setGame(STARTING_STATE);
    setAliasInput('Rookie');
    setSelectedDistrict(DISTRICTS[0].id);
    setObjectives(STARTING_OBJECTIVES);
    setLog(['Game reset. New crew start in progress.']);
  };

  return (
    <main className="game-shell">
      <section className="panel profile">
        <h1>Neon Streets Online</h1>
        <p className="subtitle">Original open-city mission game (no copyrighted GTA assets)</p>

        <div className="alias-row">
          <input value={aliasInput} onChange={(e) => setAliasInput(e.target.value)} maxLength={18} aria-label="alias" />
          <button onClick={applyAlias}>Set Alias</button>
          <button onClick={resetGame}>Reset</button>
        </div>

        <ul className="stats-grid">
          <li><span>Alias</span><strong>{game.alias}</strong></li>
          <li><span>Cash</span><strong>${game.cash}</strong></li>
          <li><span>Reputation</span><strong>{game.rep}</strong></li>
          <li><span>Heat</span><strong>{game.heat}%</strong></li>
          <li><span>Energy</span><strong>{game.energy}%</strong></li>
          <li><span>Day</span><strong>{game.day}</strong></li>
        </ul>

        <h3 className="missions-title">Daily Objectives</h3>
        <ul className="objective-list">
          {objectives.map((objective) => (
            <li key={objective.id} className={objective.done ? 'done' : ''}>{objective.done ? '✅' : '⬜'} {objective.label}</li>
          ))}
        </ul>
      </section>

      <section className="panel contracts">
        <h2>Districts</h2>
        <div className="district-picker">
          {DISTRICTS.map((d) => (
            <button key={d.id} className={d.id === district.id ? 'active' : ''} onClick={() => setSelectedDistrict(d.id)}>
              {d.name}
            </button>
          ))}
        </div>

        <article className="district-card">
          <h3>{district.name}</h3>
          <p>{district.flavor}</p>
          <p>Risk Level: {district.risk}</p>
        </article>

        <h3 className="missions-title">Mission Board (rotates daily)</h3>
        <div className="missions-grid">
          {districtMissions.map((mission) => (
            <article key={mission.id} className="mission-card">
              <h4>{mission.title}</h4>
              <p>Difficulty: {mission.difficulty}</p>
              <p>Reward: ${mission.rewardMin} - ${mission.rewardMax}</p>
              <p>Energy Cost: {mission.energyCost}</p>
              <button onClick={() => runMission(mission)}>Start Mission</button>
            </article>
          ))}
        </div>

        <div className="actions">
          <button onClick={layLow}>Lay Low</button>
          <button onClick={investCrew}>Invest Crew</button>
        </div>
      </section>

      <section className="panel inventory">
        <h2>Inventory</h2>
        {game.inventory.length === 0 ? <p>No rare loot yet. Run missions to get drops.</p> : (
          <ul>{game.inventory.map((item, i) => <li key={`${item}-${i}`}>{item}</li>)}</ul>
        )}
      </section>

      <section className="panel log">
        <h2>Operations Feed</h2>
        <div ref={logRef} className="feed">
          {log.map((entry, i) => <p key={`${entry}-${i}`}>{entry}</p>)}
        </div>
      </section>
    </main>
  );
}
