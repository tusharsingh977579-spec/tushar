/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Map as MapIcon, 
  Users, 
  Briefcase, 
  Settings, 
  DollarSign, 
  Shield, 
  Heart, 
  Star, 
  ChevronRight, 
  Clock, 
  Zap,
  Trophy,
  Target,
  Car,
  Skull,
  Bell,
  Navigation,
  Activity,
  Info,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  auth, 
  db, 
  loginWithGoogle, 
  logout, 
  handleFirestoreError, 
  OperationType 
} from './firebase';
import { 
  onAuthStateChanged, 
  User as FirebaseUser 
} from 'firebase/auth';
import { 
  doc, 
  getDoc,
  onSnapshot, 
  setDoc, 
  updateDoc, 
  collection, 
  query, 
  orderBy, 
  limit, 
  addDoc, 
  serverTimestamp, 
  Timestamp 
} from 'firebase/firestore';

// --- Types ---
interface Mission {
  id: string;
  title: string;
  type: 'Heist' | 'Contact' | 'Race' | 'Survival';
  payout: number;
  rp: number;
  difficulty: 'Easy' | 'Normal' | 'Hard';
  description: string;
  location: { x: number; y: number };
}

interface Vehicle {
  id: string;
  name: string;
  class: string;
  price: number;
  image: string;
  stats: { speed: number; accel: number; braking: number; traction: number };
}

interface Weapon {
  id: string;
  name: string;
  type: string;
  damage: number;
  fireRate: number;
  accuracy: number;
  range: number;
  price: number;
  image: string;
}

interface CharacterStats {
  uid: string;
  displayName: string;
  photoURL: string;
  level: number;
  rp: number;
  rpToNext: number;
  cash: number;
  bank: number;
  health: number;
  armor: number;
  title: string;
  alias: string;
  status: string;
}

interface ChatMessage {
  id: string;
  uid: string;
  authorName: string;
  text: string;
  createdAt: any;
}

// --- Mock Data ---
const PRESIDENT_AVATAR = "https://ais-dev-6weeipbdneut24mpzo5sb7-790375904390.asia-southeast1.run.app/user_avatar.png"; // Placeholder for the uploaded image representation
const MISSIONS: Mission[] = [
  {
    id: '1',
    title: 'The Grand Depository',
    type: 'Heist',
    payout: 2500000,
    rp: 15000,
    difficulty: 'Hard',
    description: 'The big one. Infiltrate the high-security vault and escape the city.',
    location: { x: 45, y: 55 }
  },
  {
    id: '2',
    title: 'City Center Drift',
    type: 'Race',
    payout: 15000,
    rp: 2500,
    difficulty: 'Normal',
    description: 'High-speed street race through the heart of the city.',
    location: { x: 60, y: 40 }
  },
  {
    id: '3',
    title: 'Cargo Plane Job',
    type: 'Contact',
    payout: 25000,
    rp: 4000,
    difficulty: 'Normal',
    description: 'Secure the cargo plane from the airport and deliver it to the desert.',
    location: { x: 20, y: 80 }
  },
  {
    id: '4',
    title: 'Beach Survival',
    type: 'Survival',
    payout: 50000,
    rp: 8000,
    difficulty: 'Hard',
    description: 'Hold off waves of syndicate enforcers at the coast.',
    location: { x: 30, y: 30 }
  }
];

const VEHICLES: Vehicle[] = [
  {
    id: 'v1',
    name: 'Apex Predator',
    class: 'Super',
    price: 725000,
    image: 'https://picsum.photos/seed/zentorno/400/250',
    stats: { speed: 95, accel: 98, braking: 80, traction: 90 }
  },
  {
    id: 'v2',
    name: 'Ironclad Sedan',
    class: 'Sports',
    price: 525000,
    image: 'https://picsum.photos/seed/kuruma/400/250',
    stats: { speed: 80, accel: 75, braking: 70, traction: 85 }
  },
  {
    id: 'v3',
    name: 'Venom GT',
    class: 'Super',
    price: 565000,
    image: 'https://picsum.photos/seed/banshee/400/250',
    stats: { speed: 92, accel: 90, braking: 75, traction: 80 }
  }
];

const WEAPONS: Weapon[] = [
  {
    id: 'w1',
    name: 'Tactical Carbine',
    type: 'Assault Rifle',
    damage: 85,
    fireRate: 90,
    accuracy: 80,
    range: 75,
    price: 15000,
    image: 'https://picsum.photos/seed/rifle/400/200'
  },
  {
    id: 'w2',
    name: 'Heavy Sniper',
    type: 'Sniper Rifle',
    damage: 100,
    fireRate: 20,
    accuracy: 95,
    range: 100,
    price: 45000,
    image: 'https://picsum.photos/seed/sniper/400/200'
  },
  {
    id: 'w3',
    name: 'Combat MG',
    type: 'Machine Gun',
    damage: 75,
    fireRate: 95,
    accuracy: 60,
    range: 70,
    price: 25000,
    image: 'https://picsum.photos/seed/mg/400/200'
  }
];

const PLAYERS = [
  { name: 'Kingpin_Architect', level: 124, status: 'Online', color: 'text-orange-500' },
  { name: 'Shadow_Stalker', level: 85, status: 'Online', color: 'text-white' },
  { name: 'Ghost_Rider', level: 42, status: 'In Mission', color: 'text-blue-400' },
  { name: 'Viper_X', level: 210, status: 'Online', color: 'text-red-500' },
  { name: 'Neon_Pulse', level: 15, status: 'Online', color: 'text-white' },
];

// --- Components ---

const StatBar = ({ label, value, max, color, icon: Icon }: { label: string, value: number, max: number, color: string, icon: any }) => (
  <div className="flex flex-col gap-1 w-full">
    <div className="flex justify-between items-center text-[10px] uppercase tracking-widest font-bold text-white/60">
      <div className="flex items-center gap-1">
        <Icon size={12} className={color} />
        {label}
      </div>
      <span>{Math.round((value / max) * 100)}%</span>
    </div>
    <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
      <motion.div 
        initial={{ width: 0 }}
        animate={{ width: `${(value / max) * 100}%` }}
        className={`h-full ${color}`}
      />
    </div>
  </div>
);

const MissionCard = ({ mission, onSelect }: { mission: Mission, onSelect: (m: Mission) => void, key?: string }) => (
  <motion.div 
    whileHover={{ x: 10, backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
    onClick={() => onSelect(mission)}
    className="group flex items-center justify-between p-4 border-b border-white/5 cursor-pointer transition-colors"
  >
    <div className="flex items-center gap-4">
      <div className={`w-10 h-10 rounded flex items-center justify-center ${
        mission.type === 'Heist' ? 'bg-orange-500/20 text-orange-500' :
        mission.type === 'Race' ? 'bg-blue-500/20 text-blue-500' :
        mission.type === 'Survival' ? 'bg-red-500/20 text-red-500' :
        'bg-green-500/20 text-green-500'
      }`}>
        {mission.type === 'Heist' ? <Trophy size={20} /> :
         mission.type === 'Race' ? <Car size={20} /> :
         mission.type === 'Survival' ? <Skull size={20} /> :
         <Briefcase size={20} />}
      </div>
      <div>
        <h3 className="text-sm font-bold uppercase tracking-tight text-white group-hover:text-orange-400 transition-colors">{mission.title}</h3>
        <div className="flex items-center gap-2 text-[10px] text-white/40 uppercase tracking-widest">
          <span>{mission.type}</span>
          <span>•</span>
          <span className="text-green-400">${mission.payout.toLocaleString()}</span>
        </div>
      </div>
    </div>
    <ChevronRight size={16} className="text-white/20 group-hover:text-white transition-colors" />
  </motion.div>
);

const VehicleCard = ({ vehicle }: { vehicle: Vehicle, key?: string }) => (
  <motion.div 
    whileHover={{ y: -5 }}
    className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden group"
  >
    <div className="h-32 bg-black relative">
      <img src={vehicle.image} alt={vehicle.name} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" referrerPolicy="no-referrer" />
      <div className="absolute top-3 right-3 bg-black/80 px-2 py-1 rounded text-[8px] font-bold uppercase tracking-widest">
        {vehicle.class}
      </div>
    </div>
    <div className="p-4">
      <h3 className="text-sm font-bold uppercase tracking-tight mb-3">{vehicle.name}</h3>
      <div className="space-y-2">
        <div className="flex justify-between items-center text-[8px] uppercase tracking-widest text-white/40">
          <span>Speed</span>
          <div className="w-24 h-1 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-orange-500" style={{ width: `${vehicle.stats.speed}%` }} />
          </div>
        </div>
        <div className="flex justify-between items-center text-[8px] uppercase tracking-widest text-white/40">
          <span>Accel</span>
          <div className="w-24 h-1 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-orange-500" style={{ width: `${vehicle.stats.accel}%` }} />
          </div>
        </div>
      </div>
      <div className="mt-4 pt-4 border-t border-white/5 flex justify-between items-center">
        <span className="text-xs font-mono text-green-400">${vehicle.price.toLocaleString()}</span>
        <button className="text-[9px] uppercase tracking-widest font-bold text-white/40 hover:text-white transition-colors">Details</button>
      </div>
    </div>
  </motion.div>
);

const WeaponCard = ({ weapon }: { weapon: Weapon, key?: string }) => (
  <motion.div 
    whileHover={{ y: -5 }}
    className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden group"
  >
    <div className="h-32 bg-black relative p-4 flex items-center justify-center">
      <img src={weapon.image} alt={weapon.name} className="max-w-full max-h-full object-contain opacity-80 group-hover:opacity-100 transition-opacity" referrerPolicy="no-referrer" />
      <div className="absolute top-3 right-3 bg-black/80 px-2 py-1 rounded text-[8px] font-bold uppercase tracking-widest">
        {weapon.type}
      </div>
    </div>
    <div className="p-4">
      <h3 className="text-sm font-bold uppercase tracking-tight mb-3">{weapon.name}</h3>
      <div className="space-y-2">
        <div className="flex justify-between items-center text-[8px] uppercase tracking-widest text-white/40">
          <span>Damage</span>
          <div className="w-24 h-1 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-red-500" style={{ width: `${weapon.damage}%` }} />
          </div>
        </div>
        <div className="flex justify-between items-center text-[8px] uppercase tracking-widest text-white/40">
          <span>Accuracy</span>
          <div className="w-24 h-1 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500" style={{ width: `${weapon.accuracy}%` }} />
          </div>
        </div>
      </div>
      <div className="mt-4 pt-4 border-t border-white/5 flex justify-between items-center">
        <span className="text-xs font-mono text-green-400">${weapon.price.toLocaleString()}</span>
        <button className="text-[9px] uppercase tracking-widest font-bold text-white/40 hover:text-white transition-colors">Buy Ammo</button>
      </div>
    </div>
  </motion.div>
);

export default function App() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [activeTab, setActiveTab] = useState<'map' | 'missions' | 'stats' | 'garage' | 'weapons' | 'settings' | 'chat'>('missions');
  const [selectedMission, setSelectedMission] = useState<Mission | null>(null);
  const [missionStatus, setMissionStatus] = useState<'idle' | 'starting' | 'passed' | 'failed'>('idle');
  const [notifications, setNotifications] = useState<{ id: number; text: string }[]>([]);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [sessionPlayers, setSessionPlayers] = useState<CharacterStats[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  
  const [stats, setStats] = useState<CharacterStats>({
    uid: '',
    displayName: 'Guest',
    photoURL: '',
    level: 1,
    rp: 0,
    rpToNext: 5000,
    cash: 1000,
    bank: 0,
    health: 100,
    armor: 0,
    title: 'Street Thug',
    alias: 'The Newbie',
    status: 'Online'
  });

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setIsAuthReady(true);
      if (loading) setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Stats Sync & Presence
  useEffect(() => {
    if (!user) return;

    const userRef = doc(db, 'users', user.uid);
    
    // Initial sync / Create profile
    const syncProfile = async () => {
      try {
        const snap = await getDoc(userRef);
        if (!snap.exists()) {
          const initialStats = {
            uid: user.uid,
            displayName: user.displayName || 'Player',
            photoURL: user.photoURL || '',
            level: 1,
            rp: 0,
            rpToNext: 5000,
            cash: 10000,
            bank: 50000,
            health: 100,
            armor: 0,
            title: 'Street Thug',
            alias: user.displayName?.split(' ')[0] || 'Outlaw',
            status: 'Online',
            lastActive: new Date().toISOString()
          };
          await setDoc(userRef, initialStats);
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, 'users');
      }
    };
    syncProfile();

    // Real-time stats listener
    const unsubscribeStats = onSnapshot(userRef, (snap) => {
      if (snap.exists()) {
        setStats(snap.data() as CharacterStats);
      }
    }, (err) => handleFirestoreError(err, OperationType.GET, `users/${user.uid}`));

    // Presence update
    const updatePresence = async () => {
      try {
        await updateDoc(userRef, { 
          status: 'Online',
          lastActive: new Date().toISOString()
        });
      } catch (err) {}
    };
    const presenceInterval = setInterval(updatePresence, 60000); // Every minute

    return () => {
      unsubscribeStats();
      clearInterval(presenceInterval);
    };
  }, [user]);

  // Session Players Listener
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'users'), limit(50));
    const unsubscribe = onSnapshot(q, (snap) => {
      const players = snap.docs.map(doc => doc.data() as CharacterStats);
      setSessionPlayers(players);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'users'));
    return () => unsubscribe();
  }, [user]);

  // Chat Listener
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'chat'), orderBy('createdAt', 'desc'), limit(50));
    const unsubscribe = onSnapshot(q, (snap) => {
      const msgs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatMessage));
      setChatMessages(msgs.reverse());
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'chat'));
    return () => unsubscribe();
  }, [user]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !user) return;

    try {
      await addDoc(collection(db, 'chat'), {
        uid: user.uid,
        authorName: stats.alias || stats.displayName,
        text: chatInput,
        createdAt: serverTimestamp()
      });
      setChatInput('');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'chat');
    }
  };

  // Simulated world time
  const [worldTime, setWorldTime] = useState('12:00');
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setWorldTime(now.toLocaleTimeString([], { hour: '2-digit', hour12: false, minute: '2-digit' }));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Simulated Global Events
  const [globalEvent, setGlobalEvent] = useState('Double RP on all Survival missions this week!');
  useEffect(() => {
    const events = [
      'Double RP on all Survival missions this week!',
      '30% off all Super cars at Legendary Motorsport.',
      'New Heist available: The Cayo Perico Heist.',
      'Simeon is looking for high-end vehicles.',
      'Premium Race: Downtown Drift is now live.'
    ];
    const interval = setInterval(() => {
      setGlobalEvent(events[Math.floor(Math.random() * events.length)]);
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleStartMission = () => {
    setMissionStatus('starting');
    setTimeout(async () => {
      const success = Math.random() > 0.3;
      setMissionStatus(success ? 'passed' : 'failed');
      
      if (success && selectedMission && user) {
        try {
          const userRef = doc(db, 'users', user.uid);
          const newCash = stats.cash + selectedMission.payout;
          const newRp = stats.rp + selectedMission.rp;
          
          // Simple level up logic
          let newLevel = stats.level;
          let newRpToNext = stats.rpToNext;
          if (newRp >= newRpToNext) {
            newLevel++;
            newRpToNext = Math.round(newRpToNext * 1.2);
            addNotification(`Level Up! You are now Rank ${newLevel}`);
          }

          await updateDoc(userRef, {
            cash: newCash,
            rp: newRp,
            level: newLevel,
            rpToNext: newRpToNext,
            status: 'Online'
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, 'users');
        }
      }
      
      setTimeout(() => {
        setMissionStatus('idle');
        setSelectedMission(null);
      }, 4000);
    }, 2000);
  };

  const addNotification = (text: string) => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, text }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  };

  if (loading || !isAuthReady) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center z-50">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <h1 className="text-6xl font-black italic tracking-tighter text-white mb-4">
            URBAN <span className="text-orange-500">OUTLAW</span>
          </h1>
          <div className="w-64 h-1 bg-white/10 rounded-full overflow-hidden mx-auto">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: '100%' }}
              transition={{ duration: 2, ease: "easeInOut" }}
              className="h-full bg-orange-500"
            />
          </div>
          <p className="mt-4 text-[10px] uppercase tracking-[0.3em] text-white/40 animate-pulse">
            Connecting to Syndicate Hub...
          </p>
        </motion.div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="fixed inset-0 bg-[#0a0a0a] flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
          >
            <h1 className="text-7xl font-black italic tracking-tighter text-white mb-2">
              URBAN <span className="text-orange-500">OUTLAW</span>
            </h1>
            <p className="text-[10px] uppercase tracking-[0.5em] text-white/20 mb-12">Underworld Syndicate Hub</p>
            
            <div className="bg-white/5 border border-white/10 p-8 rounded-3xl backdrop-blur-xl">
              <h2 className="text-xl font-black uppercase tracking-tight mb-6">Authentication Required</h2>
              <p className="text-white/40 text-sm mb-8 leading-relaxed">
                You must verify your identity with the Syndicate to access the Metropolis network.
              </p>
              <button 
                onClick={loginWithGoogle}
                className="w-full h-14 bg-white text-black font-black uppercase tracking-widest rounded-xl hover:bg-orange-500 hover:text-white transition-all flex items-center justify-center gap-3"
              >
                <Users size={20} />
                Sign in with Google
              </button>
            </div>
            
            <p className="mt-8 text-[9px] uppercase tracking-widest text-white/10">
              By entering, you agree to the Syndicate Code of Conduct.
            </p>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans selection:bg-orange-500 selection:text-black overflow-hidden flex flex-col">
      {/* --- Mission Status Overlays --- */}
      <AnimatePresence>
        {missionStatus === 'starting' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center"
          >
            <div className="text-center">
              <motion.h2 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-6xl font-black italic tracking-tighter uppercase mb-4"
              >
                Launching <span className="text-orange-500">Mission</span>
              </motion.h2>
              <div className="flex justify-center gap-2">
                {[0, 1, 2].map(i => (
                  <motion.div 
                    key={i}
                    animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                    className="w-2 h-2 bg-orange-500 rounded-full"
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {missionStatus === 'passed' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center"
          >
            <motion.div 
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="text-center"
            >
              <h2 className="text-8xl font-black italic tracking-tighter text-yellow-400 uppercase mb-2">
                Contract Complete
              </h2>
              <div className="h-1 w-full bg-yellow-400/20 mb-8" />
              <div className="flex justify-center gap-12">
                <div className="text-center">
                  <span className="text-[10px] uppercase tracking-widest text-white/40 block mb-1">Cash Earned</span>
                  <span className="text-4xl font-black text-green-400 font-mono">${selectedMission?.payout.toLocaleString()}</span>
                </div>
                <div className="text-center">
                  <span className="text-[10px] uppercase tracking-widest text-white/40 block mb-1">RP Earned</span>
                  <span className="text-4xl font-black text-blue-400 font-mono">+{selectedMission?.rp.toLocaleString()}</span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {missionStatus === 'failed' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-red-900/40 backdrop-blur-sm z-[100] flex items-center justify-center"
          >
            <motion.div 
              initial={{ scale: 2, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-center"
            >
              <h2 className="text-9xl font-black italic tracking-tighter text-red-600 uppercase">
                Eliminated
              </h2>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- Notifications --- */}
      <div className="fixed top-20 right-6 z-[60] flex flex-col gap-3 pointer-events-none">
        <AnimatePresence>
          {notifications.map(n => (
            <motion.div 
              key={n.id}
              initial={{ x: 100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 100, opacity: 0 }}
              className="bg-black/80 backdrop-blur border-l-4 border-orange-500 p-4 w-64 shadow-2xl"
            >
              <div className="flex items-start gap-3">
                <Bell size={16} className="text-orange-500 mt-1" />
                <p className="text-[11px] font-bold uppercase tracking-wider leading-relaxed">{n.text}</p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* --- Top Navbar --- */}
      <header className="h-16 border-b border-white/10 flex items-center justify-between px-6 bg-black/50 backdrop-blur-md z-40">
        <div className="flex items-center gap-8">
          <h1 className="text-xl font-black italic tracking-tighter cursor-pointer" onClick={() => setActiveTab('missions')}>
            U<span className="text-orange-500">O</span>
          </h1>
          <nav className="hidden md:flex items-center gap-6">
            {[
              { id: 'map', label: 'Map', icon: MapIcon },
              { id: 'missions', label: 'Missions', icon: Target },
              { id: 'garage', label: 'Garage', icon: Car },
              { id: 'weapons', label: 'Arsenal', icon: Skull },
              { id: 'chat', label: 'Chat', icon: Bell },
              { id: 'stats', label: 'Stats', icon: Activity },
              { id: 'settings', label: 'Options', icon: Settings }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] font-bold transition-colors ${
                  activeTab === tab.id ? 'text-orange-500' : 'text-white/40 hover:text-white'
                }`}
              >
                <tab.icon size={14} />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex flex-col items-end">
            <div className="flex items-center gap-2 text-green-400 font-mono font-bold text-sm">
              <DollarSign size={14} />
              <span>{stats.cash.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-2 text-blue-400 font-mono font-bold text-xs opacity-80">
              <Briefcase size={12} />
              <span>{stats.bank.toLocaleString()}</span>
            </div>
          </div>
          <div className="h-8 w-px bg-white/10" />
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-end">
              <span className="text-[10px] uppercase tracking-widest font-bold text-white/40">Level</span>
              <span className="text-lg font-black leading-none">{stats.level}</span>
            </div>
            <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center font-black text-black">
              {stats.level}
            </div>
          </div>
        </div>
      </header>

      {/* --- Main Content --- */}
      <main className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside className="w-80 border-r border-white/10 flex flex-col bg-black/20">
          <div className="p-6 border-b border-white/10">
            <h2 className="text-[10px] uppercase tracking-[0.3em] font-bold text-white/40 mb-4">Player Status</h2>
            <div className="space-y-4">
              <StatBar label="Health" value={stats.health} max={100} color="bg-red-500" icon={Heart} />
              <StatBar label="Armor" value={stats.armor} max={100} color="bg-blue-500" icon={Shield} />
              <StatBar label="Stamina" value={85} max={100} color="bg-yellow-500" icon={Zap} />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <div className="p-6 pb-2">
              <h2 className="text-[10px] uppercase tracking-[0.3em] font-bold text-white/40">Available Jobs</h2>
            </div>
            <div className="flex flex-col">
              {MISSIONS.map(mission => (
                <MissionCard key={mission.id} mission={mission} onSelect={setSelectedMission} />
              ))}
            </div>
          </div>

          <div className="p-6 border-t border-white/10 bg-black/40">
            <div className="flex items-center justify-between text-[10px] uppercase tracking-widest font-bold text-white/40 mb-2">
              <span>Next Level</span>
              <span>{stats.rpToNext - stats.rp} RP Left</span>
            </div>
            <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${(stats.rp / stats.rpToNext) * 100}%` }}
                className="h-full bg-orange-500"
              />
            </div>
          </div>
        </aside>

        {/* Viewport */}
        <section className="flex-1 relative bg-[#0f0f0f]">
          <AnimatePresence mode="wait">
            {activeTab === 'map' && (
              <motion.div 
                key="map"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 p-8"
              >
                <div className="w-full h-full rounded-2xl border border-white/10 bg-black/40 relative overflow-hidden group">
                  {/* Territory Zones */}
                  <div className="absolute top-[20%] left-[20%] w-[30%] h-[30%] bg-orange-500/5 border border-orange-500/10 rounded-full blur-3xl pointer-events-none" />
                  <div className="absolute top-[50%] left-[60%] w-[25%] h-[25%] bg-blue-500/5 border border-blue-500/10 rounded-full blur-3xl pointer-events-none" />
                  <div className="absolute top-[70%] left-[30%] w-[20%] h-[20%] bg-red-500/5 border border-red-500/10 rounded-full blur-3xl pointer-events-none" />

                  {/* Mock Map Grid */}
                  <div className="absolute inset-0 opacity-20 pointer-events-none" 
                    style={{ 
                      backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)', 
                      backgroundSize: '40px 40px' 
                    }} 
                  />
                  
                  {/* Map Markers */}
                  {MISSIONS.map(m => (
                    <motion.button
                      key={m.id}
                      whileHover={{ scale: 1.2 }}
                      onClick={() => {
                        setSelectedMission(m);
                        setActiveTab('missions');
                      }}
                      className="absolute w-4 h-4 rounded-full bg-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.5)] border-2 border-white z-10"
                      style={{ left: `${m.location.x}%`, top: `${m.location.y}%` }}
                    >
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur px-2 py-1 rounded text-[8px] uppercase tracking-widest whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                        {m.title}
                      </div>
                    </motion.button>
                  ))}

                  <div className="absolute bottom-6 left-6 flex items-center gap-3 bg-black/60 backdrop-blur p-4 rounded-xl border border-white/10">
                    <Navigation size={20} className="text-orange-500" />
                    <div>
                      <span className="text-[10px] uppercase tracking-widest font-bold text-white/40 block">Current Location</span>
                      <span className="text-sm font-black uppercase italic">Vinewood Hills</span>
                    </div>
                  </div>

                  <div className="absolute bottom-6 right-6 flex flex-col items-end">
                    <span className="text-4xl font-black italic tracking-tighter opacity-20">METROPOLIS</span>
                    <span className="text-[10px] uppercase tracking-[0.4em] text-white/20">Satellite View Active</span>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'weapons' && (
              <motion.div 
                key="weapons"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 p-12 overflow-y-auto custom-scrollbar"
              >
                <div className="max-w-5xl mx-auto">
                  <div className="flex justify-between items-end mb-12">
                    <div>
                      <h2 className="text-5xl font-black uppercase tracking-tighter leading-none mb-2">The Arsenal</h2>
                      <p className="text-white/40 uppercase tracking-[0.3em] text-xs font-bold">High-Grade Syndicate Weaponry</p>
                    </div>
                    <div className="flex gap-4">
                      <div className="px-6 h-12 bg-white/5 flex items-center gap-3 rounded-xl border border-white/10">
                        <span className="text-[10px] uppercase tracking-widest font-bold text-white/40">Body Armor</span>
                        <span className="text-sm font-black text-blue-400">80%</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {WEAPONS.map(w => (
                      <WeaponCard key={w.id} weapon={w} />
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'settings' && (
              <motion.div 
                key="settings"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 p-12 overflow-y-auto custom-scrollbar"
              >
                <div className="max-w-3xl mx-auto">
                  <h2 className="text-5xl font-black uppercase tracking-tighter leading-none mb-12">Settings</h2>
                  
                  <div className="space-y-12">
                    <section>
                      <h3 className="text-[10px] uppercase tracking-[0.4em] font-bold text-orange-500 mb-6">Game Options</h3>
                      <div className="space-y-4">
                        {[
                          { label: 'Targeting Mode', value: 'Assisted Aim - Full' },
                          { label: 'Camera View', value: 'Third Person' },
                          { label: 'Radar Scale', value: '1.0x' },
                        ].map((opt, i) => (
                          <div key={i} className="flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-xl">
                            <span className="text-[11px] uppercase tracking-widest font-bold text-white/60">{opt.label}</span>
                            <span className="text-[11px] uppercase tracking-widest font-black text-white">{opt.value}</span>
                          </div>
                        ))}
                      </div>
                    </section>

                    <section>
                      <h3 className="text-[10px] uppercase tracking-[0.4em] font-bold text-orange-500 mb-6">Audio & Visual</h3>
                      <div className="space-y-4">
                        {[
                          { label: 'Music Volume', value: '80%' },
                          { label: 'SFX Volume', value: '100%' },
                          { label: 'Brightness', value: '50%' },
                        ].map((opt, i) => (
                          <div key={i} className="flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-xl">
                            <span className="text-[11px] uppercase tracking-widest font-bold text-white/60">{opt.label}</span>
                            <div className="w-32 h-1 bg-white/10 rounded-full overflow-hidden">
                              <div className="h-full bg-orange-500" style={{ width: opt.value }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'missions' && (
              <motion.div 
                key="missions"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="absolute inset-0 p-12 flex flex-col items-center justify-center text-center"
              >
                {!selectedMission ? (
                  <div className="max-w-md">
                    <div className="w-20 h-20 bg-orange-500/10 text-orange-500 rounded-3xl flex items-center justify-center mx-auto mb-6">
                      <Target size={40} />
                    </div>
                    <h2 className="text-3xl font-black uppercase tracking-tighter mb-2">Select a Job</h2>
                    <p className="text-white/40 text-sm leading-relaxed">
                      Choose a mission from the sidebar to view details, payouts, and difficulty levels.
                    </p>
                  </div>
                ) : (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="max-w-2xl w-full bg-white/5 border border-white/10 rounded-3xl p-10 text-left"
                  >
                    <div className="flex justify-between items-start mb-8">
                      <div>
                        <span className="text-[10px] uppercase tracking-[0.3em] font-bold text-orange-500 mb-2 block">
                          {selectedMission.type} Mission
                        </span>
                        <h2 className="text-5xl font-black uppercase tracking-tighter leading-none">
                          {selectedMission.title}
                        </h2>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] uppercase tracking-[0.3em] font-bold text-white/40 mb-1 block">Difficulty</span>
                        <span className={`text-sm font-bold uppercase ${
                          selectedMission.difficulty === 'Hard' ? 'text-red-500' : 'text-green-500'
                        }`}>
                          {selectedMission.difficulty}
                        </span>
                      </div>
                    </div>

                    <p className="text-lg text-white/60 mb-10 leading-relaxed">
                      {selectedMission.description}
                    </p>

                    <div className="grid grid-cols-2 gap-6 mb-10">
                      <div className="p-6 rounded-2xl bg-white/5 border border-white/5">
                        <span className="text-[10px] uppercase tracking-widest font-bold text-white/40 block mb-2">Potential Payout</span>
                        <span className="text-3xl font-black text-green-400 font-mono">
                          ${selectedMission.payout.toLocaleString()}
                        </span>
                      </div>
                      <div className="p-6 rounded-2xl bg-white/5 border border-white/5">
                        <span className="text-[10px] uppercase tracking-widest font-bold text-white/40 block mb-2">RP Reward</span>
                        <span className="text-3xl font-black text-blue-400 font-mono">
                          +{selectedMission.rp.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <button 
                        onClick={handleStartMission}
                        className="flex-1 h-14 bg-orange-500 hover:bg-orange-600 text-black font-black uppercase tracking-widest rounded-xl transition-colors flex items-center justify-center gap-2"
                      >
                        Start Mission
                        <ChevronRight size={20} />
                      </button>
                      <button 
                        onClick={() => setSelectedMission(null)}
                        className="px-8 h-14 bg-white/5 hover:bg-white/10 text-white font-bold uppercase tracking-widest rounded-xl transition-colors"
                      >
                        Back
                      </button>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}

            {activeTab === 'garage' && (
              <motion.div 
                key="garage"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 p-12 overflow-y-auto custom-scrollbar"
              >
                <div className="max-w-5xl mx-auto">
                  <div className="flex justify-between items-end mb-12">
                    <div>
                      <h2 className="text-5xl font-black uppercase tracking-tighter leading-none mb-2">My Garage</h2>
                      <p className="text-white/40 uppercase tracking-[0.3em] text-xs font-bold">3 / 10 Vehicles Stored</p>
                    </div>
                    <button 
                      onClick={() => addNotification('Legendary Motorsport: New stock available!')}
                      className="px-6 h-12 bg-white/5 hover:bg-white/10 text-white text-[10px] uppercase tracking-widest font-bold rounded-xl transition-colors border border-white/10"
                    >
                      Buy Vehicles
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {VEHICLES.map(v => (
                      <VehicleCard key={v.id} vehicle={v} />
                    ))}
                    <div className="border-2 border-dashed border-white/5 rounded-2xl flex flex-col items-center justify-center p-8 text-center opacity-40 hover:opacity-100 transition-opacity cursor-pointer">
                      <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center mb-4">
                        <Car size={24} />
                      </div>
                      <span className="text-[10px] uppercase tracking-widest font-bold">Empty Slot</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'chat' && (
              <motion.div 
                key="chat"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex flex-col p-8"
              >
                <div className="max-w-4xl w-full mx-auto flex-1 flex flex-col bg-black/40 border border-white/10 rounded-3xl overflow-hidden">
                  <div className="p-6 border-b border-white/10 flex justify-between items-center bg-black/20">
                    <div>
                      <h2 className="text-2xl font-black uppercase tracking-tighter italic">Global Syndicate Chat</h2>
                      <p className="text-[9px] uppercase tracking-widest text-white/20">Encrypted Channel: #METRO-MAIN</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                      <span className="text-[10px] uppercase tracking-widest font-bold text-white/40">{sessionPlayers.length} Active</span>
                    </div>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4 custom-scrollbar">
                    {chatMessages.map((msg) => (
                      <div key={msg.id} className={`flex flex-col ${msg.uid === user.uid ? 'items-end' : 'items-start'}`}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[9px] font-black uppercase tracking-widest ${msg.uid === user.uid ? 'text-orange-500' : 'text-white/40'}`}>
                            {msg.authorName}
                          </span>
                          <span className="text-[8px] text-white/10 font-mono">
                            {msg.createdAt?.toDate ? msg.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '...'}
                          </span>
                        </div>
                        <div className={`px-4 py-2 rounded-2xl text-sm max-w-[80%] ${
                          msg.uid === user.uid 
                            ? 'bg-orange-500 text-black font-bold rounded-tr-none' 
                            : 'bg-white/5 text-white border border-white/5 rounded-tl-none'
                        }`}>
                          {msg.text}
                        </div>
                      </div>
                    ))}
                  </div>

                  <form onSubmit={handleSendMessage} className="p-6 bg-black/40 border-t border-white/10 flex gap-4">
                    <input 
                      type="text" 
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="Type a message to the syndicate..."
                      className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 text-sm focus:outline-none focus:border-orange-500 transition-colors"
                    />
                    <button 
                      type="submit"
                      className="px-8 h-12 bg-orange-500 text-black font-black uppercase tracking-widest rounded-xl hover:bg-orange-600 transition-colors"
                    >
                      Send
                    </button>
                  </form>
                </div>
              </motion.div>
            )}

            {activeTab === 'stats' && (
              <motion.div 
                key="stats"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 p-12 overflow-y-auto custom-scrollbar"
              >
                <div className="max-w-4xl mx-auto">
                  <div className="flex items-end gap-8 mb-12">
                    <div className="relative group">
                      <div className="w-48 h-48 rounded-3xl overflow-hidden border-4 border-orange-500 shadow-[0_0_50px_rgba(249,115,22,0.5)] bg-black">
                        <img 
                          src={stats.photoURL || "https://picsum.photos/seed/kingpin/400/400"} 
                          alt={stats.alias} 
                          className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-500 scale-110"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <div className="absolute -bottom-3 -right-3 bg-orange-500 text-black px-4 py-1.5 rounded-lg font-black text-[12px] uppercase tracking-widest shadow-2xl border-2 border-black">
                        {stats.level >= 100 ? 'Untouchable' : 'Verified'}
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="px-3 py-1 bg-orange-500 text-black text-[10px] font-black uppercase tracking-[0.2em] rounded shadow-lg">
                          {stats.title}
                        </span>
                        <span className="text-white/20 text-[9px] font-bold uppercase tracking-[0.2em]">Metropolis Overlord</span>
                      </div>
                      <h2 className="text-7xl font-black uppercase tracking-tighter leading-none mb-3 italic text-transparent bg-clip-text bg-gradient-to-r from-white via-orange-500 to-white">
                        {stats.alias}
                      </h2>
                      <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,1)] animate-pulse" />
                          <span className="text-white/60 uppercase tracking-[0.2em] text-[11px] font-black">Ruling the Streets</span>
                        </div>
                        <div className="h-4 w-px bg-white/20" />
                        <span className="text-white/40 uppercase tracking-[0.2em] text-[10px] font-bold">Territory: All Districts</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                    {[
                      { label: 'Total Earnings', value: '$45,240,000', icon: DollarSign, color: 'text-green-400' },
                      { label: 'Missions Completed', value: '1,420', icon: Target, color: 'text-orange-400' },
                      { label: 'Races Won', value: '245', icon: Car, color: 'text-blue-400' },
                    ].map((stat, i) => (
                      <div key={i} className="p-8 rounded-3xl bg-white/5 border border-white/10">
                        <stat.icon size={24} className={`${stat.color} mb-4`} />
                        <span className="text-[10px] uppercase tracking-widest font-bold text-white/40 block mb-1">{stat.label}</span>
                        <span className="text-2xl font-black font-mono">{stat.value}</span>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-8">
                    <h3 className="text-sm uppercase tracking-[0.4em] font-bold text-white/40">Skill Progression</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                      <StatBar label="Stamina" value={95} max={100} color="bg-orange-500" icon={Zap} />
                      <StatBar label="Strength" value={60} max={100} color="bg-orange-500" icon={Zap} />
                      <StatBar label="Shooting" value={100} max={100} color="bg-orange-500" icon={Zap} />
                      <StatBar label="Stealth" value={40} max={100} color="bg-orange-500" icon={Zap} />
                      <StatBar label="Flying" value={85} max={100} color="bg-orange-500" icon={Zap} />
                      <StatBar label="Driving" value={100} max={100} color="bg-orange-500" icon={Zap} />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* World Info Overlay */}
          <div className="absolute top-6 right-6 flex items-center gap-4 pointer-events-none">
            <div className="flex flex-col items-end">
              <span className="text-[10px] uppercase tracking-widest font-bold text-white/40">World Time</span>
              <span className="text-xl font-black font-mono">{worldTime}</span>
            </div>
            <div className="h-10 w-px bg-white/10" />
            <div className="flex flex-col items-end">
              <span className="text-[10px] uppercase tracking-widest font-bold text-white/40">Weather</span>
              <span className="text-xl font-black uppercase italic">Sunny</span>
            </div>
          </div>
        </section>
      </main>

      {/* --- Footer / Status Bar --- */}
      <footer className="h-10 border-t border-white/10 bg-black flex items-center justify-between px-6 overflow-hidden relative">
        <div className="flex items-center gap-6 text-[9px] uppercase tracking-[0.3em] font-bold text-white/30">
          <button 
            onClick={() => setShowSessionModal(true)}
            className="flex items-center gap-2 hover:text-white transition-colors"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            <span>Public Session (24 Players)</span>
          </button>
          <div className="h-4 w-px bg-white/10" />
          <div className="flex items-center gap-2 overflow-hidden whitespace-nowrap">
            <Info size={10} className="text-orange-500 flex-shrink-0" />
            <motion.span 
              key={globalEvent}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="text-white/60"
            >
              {globalEvent}
            </motion.span>
          </div>
        </div>
        <div className="flex items-center gap-4 text-[9px] uppercase tracking-[0.3em] font-bold text-white/30">
          <span>NAT Type: Open</span>
          <div className="h-4 w-px bg-white/10" />
          <span>v1.0.4-UO</span>
        </div>
      </footer>

      {/* --- Session Modal --- */}
      <AnimatePresence>
        {showSessionModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-md z-[110] flex items-center justify-center p-6"
            onClick={() => setShowSessionModal(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-[#0f0f0f] border border-white/10 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-6 border-b border-white/10 flex justify-between items-center">
                <h2 className="text-xl font-black uppercase tracking-tighter italic">Session Players</h2>
                <button onClick={() => setShowSessionModal(false)} className="text-white/40 hover:text-white transition-colors">
                  <XCircle size={20} />
                </button>
              </div>
              <div className="p-2 overflow-y-auto max-h-[60vh] custom-scrollbar">
                {sessionPlayers.map((player, i) => (
                  <div key={i} className="flex items-center justify-between p-4 hover:bg-white/5 rounded-xl transition-colors cursor-pointer group">
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center font-black text-[10px]">
                        {player.level}
                      </div>
                      <div>
                        <span className={`text-sm font-bold uppercase tracking-tight ${player.uid === user.uid ? 'text-orange-500' : 'text-white'}`}>{player.alias || player.displayName}</span>
                        <span className="text-[9px] uppercase tracking-widest text-white/20 block">{player.status}</span>
                      </div>
                    </div>
                    <ChevronRight size={14} className="text-white/10 group-hover:text-white transition-colors" />
                  </div>
                ))}
              </div>
              <div className="p-6 bg-black/40 text-center flex flex-col gap-4">
                <p className="text-[9px] uppercase tracking-[0.3em] font-bold text-white/20">Total Players in Session: {sessionPlayers.length}</p>
                <button 
                  onClick={logout}
                  className="text-[10px] uppercase tracking-widest font-black text-red-500 hover:text-red-400 transition-colors"
                >
                  Terminate Session (Logout)
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Scanline Effect */}
      <div className="fixed inset-0 pointer-events-none z-[200] opacity-[0.03] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%]" />

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}} />
    </div>
  );
}
