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

type Character = {
  id: string;
  name: string;
  role: string;
  perk: string;
};

type Vehicle = {
  id: string;
  name: string;
  type: string;
  handling: string;
  speed: number;
};

type Scene = {
  id: string;
  title: string;
  description: string;
  districtId: District['id'];
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

const CHARACTERS: Character[] = [
  { id: 'c1', name: 'Riot', role: 'Wheelman', perk: '+8% mission escape success' },
  { id: 'c2', name: 'Nyx', role: 'Infiltrator', perk: '-2 energy cost on medium missions' },
  { id: 'c3', name: 'Ghostwire', role: 'Signal Hacker', perk: '-6 district risk while active' },
  { id: 'c4', name: 'Patch', role: 'Mechanic', perk: '+1 random loot chance tier' },
];

const VEHICLES: Vehicle[] = [
  { id: 'v1', name: 'Vandal GT', type: 'Street Coupe', handling: 'Sharp', speed: 84 },
  { id: 'v2', name: 'Shadow Mule', type: 'Cargo Van', handling: 'Stable', speed: 62 },
  { id: 'v3', name: 'Pulse XR', type: 'Electric Bike', handling: 'Agile', speed: 78 },
  { id: 'v4', name: 'Iron Finch', type: 'Compact Drone Car', handling: 'Balanced', speed: 70 },
];

const SCENES: Scene[] = [
  { id: 's1', title: 'Rainline Overpass', description: 'Neon rain, slippery corners, hidden cam loops.', districtId: 'harbor' },
  { id: 's2', title: 'Glassline Atrium', description: 'High visibility zone with sensor-heavy access gates.', districtId: 'uptown' },
  { id: 's3', title: 'Smelt Alley', description: 'Industrial smoke cover and stacked freight tunnels.', districtId: 'industrial' },
  { id: 's4', title: 'Retro Bazaar', description: 'Crowded old market with shortcut rooftops.', districtId: 'oldtown' },
];

const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

const shuffle = <T,>(items: T[]) => [...items].sort(() => Math.random() - 0.5);

export default function App() {
  const [game, setGame] = useState<GameState>(STARTING_STATE);
  const [selectedDistrict, setSelectedDistrict] = useState<string>(DISTRICTS[0].id);
  const [aliasInput, setAliasInput] = useState('Rookie');
  const [log, setLog] = useState<string[]>(['Welcome to Neon Streets Online. Build your crew empire.']);
  const [objectives, setObjectives] = useState<Objective[]>(STARTING_OBJECTIVES);
  const [activeCharacter, setActiveCharacter] = useState<string>(CHARACTERS[0].id);
  const [activeVehicle, setActiveVehicle] = useState<string>(VEHICLES[0].id);
  const [musicOn, setMusicOn] = useState(false);
  const [sfxOn, setSfxOn] = useState(true);
  const logRef = useRef<HTMLDivElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const musicTimerRef = useRef<number | null>(null);

  const district = useMemo(() => DISTRICTS.find((d) => d.id === selectedDistrict) ?? DISTRICTS[0], [selectedDistrict]);
  const character = useMemo(() => CHARACTERS.find((c) => c.id === activeCharacter) ?? CHARACTERS[0], [activeCharacter]);
  const vehicle = useMemo(() => VEHICLES.find((v) => v.id === activeVehicle) ?? VEHICLES[0], [activeVehicle]);
  const districtScenes = useMemo(() => SCENES.filter((scene) => scene.districtId === district.id), [district.id]);
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
        activeCharacter?: string;
        activeVehicle?: string;
        musicOn?: boolean;
        sfxOn?: boolean;
      };
      if (parsed.game) setGame(parsed.game);
      if (parsed.selectedDistrict) setSelectedDistrict(parsed.selectedDistrict);
      if (parsed.aliasInput) setAliasInput(parsed.aliasInput);
      if (parsed.log) setLog(parsed.log);
      if (parsed.objectives) setObjectives(parsed.objectives);
      if (parsed.activeCharacter) setActiveCharacter(parsed.activeCharacter);
      if (parsed.activeVehicle) setActiveVehicle(parsed.activeVehicle);
      if (typeof parsed.musicOn === 'boolean') setMusicOn(parsed.musicOn);
      if (typeof parsed.sfxOn === 'boolean') setSfxOn(parsed.sfxOn);
    } catch {
      // ignore invalid save data
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ game, selectedDistrict, aliasInput, log, objectives, activeCharacter, activeVehicle, musicOn, sfxOn }),
    );
  }, [game, selectedDistrict, aliasInput, log, objectives, activeCharacter, activeVehicle, musicOn, sfxOn]);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [log]);

  const getAudioContext = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext();
    }
    return audioCtxRef.current;
  };

  const playTone = (frequency: number, duration = 0.12, type: OscillatorType = 'sawtooth', gainValue = 0.04) => {
    if (!sfxOn) return;
    const ctx = getAudioContext();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    gain.gain.value = gainValue;
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start();
    oscillator.stop(ctx.currentTime + duration);
  };

  useEffect(() => {
    if (!musicOn) {
      if (musicTimerRef.current !== null) {
        clearInterval(musicTimerRef.current);
        musicTimerRef.current = null;
      }
      return;
    }

    const notes = [220, 261.63, 329.63, 392];
    let i = 0;
    playTone(notes[0], 0.18, 'triangle', 0.03);
    musicTimerRef.current = window.setInterval(() => {
      playTone(notes[i % notes.length], 0.16, 'triangle', 0.03);
      i += 1;
    }, 420);

    return () => {
      if (musicTimerRef.current !== null) {
        clearInterval(musicTimerRef.current);
        musicTimerRef.current = null;
      }
    };
  }, [musicOn, sfxOn]);

  const appendLog = (entry: string) => setLog((prev) => [...prev, `Day ${game.day}: ${entry}`]);

  const refreshObjectives = (next: GameState) => {
    setObjectives([
      { id: 'obj1', label: 'Complete 2 missions', done: next.missionsCompleted >= 2 },
      { id: 'obj2', label: 'End day with heat below 40%', done: next.heat < 40 },
      { id: 'obj3', label: 'Reach $1000 cash', done: next.cash >= 1000 },
    ]);
  };

  const runMission = (mission: Mission) => {
    const energyCost = character.id === 'c2' && mission.difficulty !== 'Low' ? Math.max(6, mission.energyCost - 2) : mission.energyCost;
    if (game.energy < energyCost) {
      playTone(150, 0.2, 'square');
      appendLog(`Not enough energy for ${mission.title}. Need ${mission.energyCost} energy.`);
      return;
    }

    const difficultyPenalty = mission.difficulty === 'High' ? 16 : mission.difficulty === 'Medium' ? 10 : 4;
    const riskOffset = character.id === 'c3' ? 6 : 0;
    const successChance = Math.max(20, 88 - (district.risk - riskOffset) - difficultyPenalty - Math.floor(game.heat / 2));
    const success = randomInt(1, 100) <= successChance;

    if (success) {
      const payout = randomInt(mission.rewardMin, mission.rewardMax);
      const repGain = randomInt(mission.repMin, mission.repMax);
      playTone(520, 0.1);
      playTone(740, 0.12);
      const next = {
        ...game,
        cash: game.cash + payout,
        rep: game.rep + repGain,
        energy: Math.max(0, game.energy - energyCost),
        heat: Math.min(100, game.heat + randomInt(5, 11)),
        day: game.day + 1,
        missionsCompleted: game.missionsCompleted + 1,
      };
      setGame(next);
      refreshObjectives(next);
      appendLog(`${mission.title} complete. +$${payout}, +${repGain} REP.`);
      const lootThreshold = character.id === 'c4' ? 0.56 : 0.67;
      if (Math.random() > lootThreshold) {
        const item = ['Signal Scrambler', 'Turbo Kit', 'Safehouse Key', 'Encrypted Tablet'][randomInt(0, 3)];
        const withLoot = { ...next, inventory: [...next.inventory, item] };
        setGame(withLoot);
        refreshObjectives(withLoot);
        appendLog(`Bonus loot found: ${item}.`);
      }
      return;
    }

    const loss = randomInt(70, 200);
    playTone(130, 0.2, 'square');
    const next = {
      ...game,
      cash: Math.max(0, game.cash - loss),
      energy: Math.max(0, game.energy - Math.ceil(energyCost * 1.2)),
      heat: Math.min(100, game.heat + randomInt(12, 26)),
      day: game.day + 1,
    };
    setGame(next);
    refreshObjectives(next);
    appendLog(`${mission.title} failed. Lost $${loss} during extraction.`);
  };

  const layLow = () => {
    playTone(280, 0.1, 'triangle');
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
      playTone(160, 0.14, 'square');
      appendLog('Need at least $250 to invest in crew upgrades.');
      return;
    }
    playTone(420, 0.1, 'triangle');
    const next = { ...game, cash: game.cash - 250, rep: game.rep + 12 };
    setGame(next);
    refreshObjectives(next);
    appendLog('Crew investment successful. -$250, +12 REP.');
  };

  const applyAlias = () => {
    const trimmed = aliasInput.trim();
    if (!trimmed) return;
    playTone(360, 0.08);
    setGame((prev) => ({ ...prev, alias: trimmed }));
    appendLog(`Alias changed to ${trimmed}.`);
  };

  const resetGame = () => {
    localStorage.removeItem(STORAGE_KEY);
    setGame(STARTING_STATE);
    setAliasInput('Rookie');
    setSelectedDistrict(DISTRICTS[0].id);
    setActiveCharacter(CHARACTERS[0].id);
    setActiveVehicle(VEHICLES[0].id);
    setMusicOn(false);
    setSfxOn(true);
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

        <h3 className="missions-title">Audio / Music</h3>
        <div className="toggles">
          <button className={musicOn ? 'active' : ''} onClick={() => setMusicOn((prev) => !prev)}>{musicOn ? 'Music: On' : 'Music: Off'}</button>
          <button className={sfxOn ? 'active' : ''} onClick={() => setSfxOn((prev) => !prev)}>{sfxOn ? 'SFX: On' : 'SFX: Off'}</button>
        </div>
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

        <h3 className="missions-title">Scene Setups</h3>
        <div className="scene-list">
          {districtScenes.map((scene) => (
            <article key={scene.id} className="scene-card">
              <h4>{scene.title}</h4>
              <p>{scene.description}</p>
            </article>
          ))}
        </div>

        <h3 className="missions-title">Mission Board (rotates daily)</h3>
        <div className="missions-grid">
          {districtMissions.map((mission) => (
            <article key={mission.id} className="mission-card">
              <h4>{mission.title}</h4>
              <p>Difficulty: {mission.difficulty}</p>
              <p>Reward: ${mission.rewardMin} - ${mission.rewardMax}</p>
              <p>Energy Cost: {character.id === 'c2' && mission.difficulty !== 'Low' ? `${mission.energyCost - 2} (Nyx perk)` : mission.energyCost}</p>
              <button onClick={() => runMission(mission)}>Start Mission</button>
            </article>
          ))}
        </div>

        <div className="actions">
          <button onClick={layLow}>Lay Low</button>
          <button onClick={investCrew}>Invest Crew</button>
        </div>
      </section>

      <section className="panel roster">
        <h2>Characters</h2>
        <div className="card-grid">
          {CHARACTERS.map((crew) => (
            <article key={crew.id} className={`select-card ${crew.id === character.id ? 'active' : ''}`}>
              <h4>{crew.name}</h4>
              <p>{crew.role}</p>
              <small>{crew.perk}</small>
              <button onClick={() => setActiveCharacter(crew.id)}>Use Character</button>
            </article>
          ))}
        </div>
      </section>

      <section className="panel garage">
        <h2>Vehicles</h2>
        <div className="card-grid">
          {VEHICLES.map((ride) => (
            <article key={ride.id} className={`select-card ${ride.id === vehicle.id ? 'active' : ''}`}>
              <h4>{ride.name}</h4>
              <p>{ride.type}</p>
              <small>{ride.handling} handling • Speed {ride.speed}</small>
              <button onClick={() => setActiveVehicle(ride.id)}>Set Vehicle</button>
            </article>
          ))}
        </div>
      </section>

      <section className="panel inventory">
        <h2>Inventory</h2>
        {game.inventory.length === 0 ? <p>No rare loot yet. Run missions to get drops.</p> : (
          <ul>{game.inventory.map((item, i) => <li key={`${item}-${i}`}>{item}</li>)}</ul>
        )}
      </section>

      <section className="panel controls">
        <h2>Controls</h2>
        <ul>
          <li><strong>District buttons:</strong> choose the active area and scene set.</li>
          <li><strong>Start Mission:</strong> run a highlighted contract.</li>
          <li><strong>Lay Low:</strong> reduce heat and recover energy.</li>
          <li><strong>Invest Crew:</strong> spend cash to gain reputation.</li>
          <li><strong>Use Character / Set Vehicle:</strong> swap perks and style instantly.</li>
          <li><strong>Music / SFX toggles:</strong> turn synth soundtrack and sound effects on/off.</li>
        </ul>
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
