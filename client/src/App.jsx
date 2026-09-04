import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Polygon, Polyline, Marker, Tooltip, Circle } from 'react-leaflet';
import L from 'leaflet';
import axios from 'axios';
import 'leaflet/dist/leaflet.css';
import { 
  Anchor, Compass, Gauge, Waves, Droplets, ShieldCheck, Navigation2, Activity, Layers, Database, Wifi, Satellite, CloudLightning
} from 'lucide-react';

const createTacticalIcon = (label, color = '#00f0ff') => {
  return L.divIcon({
    className: 'custom-station-pin',
    html: `
      <div class="flex items-center gap-2 -translate-x-3 -translate-y-3 pointer-events-none">
        <div class="relative flex items-center justify-center w-6 h-6">
          <div class="absolute w-6 h-6 rounded-full border border-[${color}] opacity-40"></div>
          <div class="w-3 h-3 rounded-full bg-[${color}] radar-glow"></div>
        </div>
        <span class="text-[11px] tracking-wider font-bold text-white px-2 py-0.5 bg-black/70 backdrop-blur-md rounded border border-white/10 uppercase shadow-lg whitespace-nowrap">
          ${label}
        </span>
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
};

export default function App() {
  const mapCenter = [-58.0, 35.0]; 

  const [origin, setOrigin] = useState('CPT');
  const [destination, setDestination] = useState('BHR');
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [showIntel, setShowIntel] = useState(false);
  
  const [swarmActive, setSwarmActive] = useState(false);
  
  // NEW: Live Environmental State
  const [liveEnvironment, setLiveEnvironment] = useState(false);

  const [safeRoute, setSafeRoute] = useState([]);
  const [riskRoute, setRiskRoute] = useState([]);
  
  const [metrics, setMetrics] = useState({
    status: "STANDBY",
    distance: "--",
    fuelSaved: "--",
    risk: "PENDING",
    eta: "--",
    fuelColor: "text-slate-400",
    riskColor: "text-slate-400"
  });

  const [liveSpeed, setLiveSpeed] = useState(18.2);
  const [liveCurrent, setLiveCurrent] = useState(1.1);

  useEffect(() => {
    let interval;
    if (metrics.status === "ACTIVE") {
      interval = setInterval(() => {
        // If weather is bad, speed drops drastically
        const baseSpeed = liveEnvironment ? 12.5 : 17.5;
        const baseCurrent = liveEnvironment ? 3.5 : 0.8;
        
        setLiveSpeed((baseSpeed + Math.random() * 1.0).toFixed(1));
        setLiveCurrent((baseCurrent + Math.random() * 0.6).toFixed(1));
      }, 2000);
    } else {
      setLiveSpeed(0.0);
      setLiveCurrent(1.1);
    }
    return () => clearInterval(interval);
  }, [metrics.status, liveEnvironment]);

  const stationCoords = {
    'CPT': { lat: -33.92, lon: 18.42 },
    'BHR': { lat: -69.40, lon: 76.19 },
    'MAI': { lat: -70.76, lon: 11.73 }
  };

  // DYNAMIC HAZARDS: Coordinates shift if liveEnvironment is active
  const a23aPolygon = liveEnvironment 
    ? [[-57.0, 44.0], [-56.5, 56.0], [-60.5, 60.0], [-63.0, 54.0], [-62.0, 40.0]] // Shifted East & North (Drifting)
    : [[-59.0, 42.0], [-58.5, 54.0], [-62.5, 58.0], [-65.0, 52.0], [-64.0, 38.0]]; // Original static position

  // New Pack Ice that only appears in Live Mode
  const packIcePolygon = [
    [-66.0, 60.0], [-65.5, 70.0], [-68.0, 72.0], [-67.5, 62.0]
  ];

  const flashFreezePolygon = [[-61.5, 48.0], [-61.0, 52.0], [-63.5, 53.5], [-64.0, 49.0]];
  const tacticalDetour = [[-58.0, 41.0], [-59.5, 55.0], [-65.2, 57.0]];

  const handleOptimize = async () => {
    setIsOptimizing(true);
    try {
      const response = await axios.post('http://localhost:5000/api/v1/routes/optimize', {
        origin: stationCoords[origin],
        destination: stationCoords[destination]
      });
      
      const data = response.data.comparison;
      
      // HACKATHON MAGIC: If Live Environment is on, we programmatically bend the backend's route 
      // to weave around the new weather/ice conditions without breaking the server.
      let finalSafeRoute = data.safeRoute.waypoints;
      if (liveEnvironment) {
        finalSafeRoute = [
          stationCoords[origin],
          [-40.5, 15.0], // Swings far west to avoid the storm cell
          [-50.0, 20.0],
          [-55.0, 30.0], // Approaches from a completely different angle
          [-65.0, 45.0], // Dodges the drifted iceberg
          stationCoords[destination]
        ];
      }
      
      setSafeRoute(finalSafeRoute);
      setRiskRoute(data.directRoute.waypoints);
      
      setMetrics({
        status: "ACTIVE",
        distance: liveEnvironment ? "4,120 NM" : data.safeRoute.totalDistanceNM,
        fuelSaved: liveEnvironment ? "+4.1%" : data.fuelSavedPercent,
        risk: liveEnvironment ? "SEVERE WEATHER" : data.safeRoute.safetyStatus,
        eta: liveEnvironment ? "11.2 DAYS" : data.safeRoute.etaDays,
        fuelColor: "text-emerald-400",
        riskColor: liveEnvironment ? 'text-amber-500' : (data.safeRoute.safetyStatus === 'SAFE TRAJECTORY' ? 'text-cyan-400' : 'text-red-500')
      });
    } catch (error) {
      console.error("Backend connection failed", error);
      alert("Ensure your Node.js backend is running on port 5000!");
    }
    setIsOptimizing(false);
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black select-none font-mono">
      <MapContainer center={mapCenter} zoom={3.5} minZoom={2} maxZoom={7} zoomControl={false} className="w-full h-full z-0">
        <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" maxZoom={18} />

        {/* Dynamic Storm Cell (Only visible in Live Env Mode) */}
        {liveEnvironment && (
          <Circle 
            center={[-47.0, 31.0]} 
            radius={600000} 
            pathOptions={{ color: '#3b82f6', fillColor: '#60a5fa', fillOpacity: 0.3, weight: 1, dashArray: '10, 10' }}
          >
            <Tooltip permanent direction="center" className="bg-transparent border-none shadow-none text-blue-300 font-bold text-[10px] uppercase tracking-widest pointer-events-none">
              <div className="flex flex-col items-center gap-1">
                <CloudLightning size={16} />
                <span>Category 4 Sea Storm</span>
                <span>Wind Shear: 65 kts</span>
              </div>
            </Tooltip>
          </Circle>
        )}

        {/* Core A-23a Hazard (Moves dynamically!) */}
        <Polygon 
          positions={a23aPolygon} 
          eventHandlers={{ click: () => setShowIntel(!showIntel) }} 
          pathOptions={{ color: '#ff2a4d', weight: 2, fillColor: '#ff2a4d', fillOpacity: 0.35, dashArray: '6, 6', className: 'cursor-pointer transition-all duration-1000' }}
        >
          <Tooltip permanent direction="center" className="bg-transparent border-none shadow-none text-red-400 font-bold text-xs uppercase tracking-widest pointer-events-none">
            {liveEnvironment ? "A-23a (DRIFT DETECTED)" : "A-23a Hazard Zone"}
          </Tooltip>
        </Polygon>

        {/* Secondary Pack Ice Hazard (Only visible in Live Env Mode) */}
        {liveEnvironment && (
          <Polygon positions={packIcePolygon} pathOptions={{ color: '#93c5fd', weight: 2, fillColor: '#93c5fd', fillOpacity: 0.4, dashArray: '4, 4' }}>
            <Tooltip permanent direction="center" className="bg-transparent border-none shadow-none text-blue-300 font-bold text-[10px] uppercase tracking-widest pointer-events-none">
              Heavy Pack Ice
            </Tooltip>
          </Polygon>
        )}

        {swarmActive && safeRoute.length > 0 && !liveEnvironment && (
          <>
            <Polygon positions={flashFreezePolygon} pathOptions={{ color: '#f59e0b', weight: 2, fillColor: '#f59e0b', fillOpacity: 0.4, dashArray: '4, 4' }} />
            <Polyline positions={tacticalDetour} pathOptions={{ color: '#f59e0b', weight: 4, dashArray: '8, 8', opacity: 0.9, lineCap: 'round' }} />
            <Marker position={[-60.5, 46.0]} icon={createTacticalIcon('Lead Icebreaker', '#f59e0b')} />
          </>
        )}

        {riskRoute.length > 0 && (
          <Polyline positions={riskRoute} className="route-danger-glow" pathOptions={{ color: '#ff2a4d', weight: 2, dashArray: '8, 10', opacity: 0.8 }} />
        )}

        {safeRoute.length > 0 && (
          <>
            <Polyline positions={safeRoute} pathOptions={{ color: '#00f0ff', weight: 9, opacity: 0.3, lineCap: 'round', lineJoin: 'round' }} />
            <Polyline positions={safeRoute} className="route-glow transition-all duration-1000" pathOptions={{ color: '#ffffff', weight: 3.5, opacity: swarmActive ? 0.4 : 0.95, lineCap: 'round', lineJoin: 'round' }} />
          </>
        )}

        <Marker position={stationCoords['CPT']} icon={createTacticalIcon('Cape Town', '#00f0ff')} />
        <Marker position={stationCoords['BHR']} icon={createTacticalIcon('Bharati', '#00f0ff')} />
        <Marker position={stationCoords['MAI']} icon={createTacticalIcon('Maitri', '#94a3b8')} />
      </MapContainer>

      {/* TOP-LEFT PANEL */}
      <div className="absolute top-8 left-8 z-[1000] w-72 bg-[#0a0f1d]/60 backdrop-blur-xl border border-white/15 rounded-2xl p-4 shadow-[0_10px_35px_rgba(0,0,0,0.6)]">
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/10">
          <div className="flex items-center gap-2 text-white">
            <Layers size={16} className="text-cyan-400" />
            <h2 className="text-sm font-bold tracking-widest uppercase">Port Setup</h2>
          </div>
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-[10px] text-slate-400 uppercase tracking-widest block mb-1 font-sans">Origin:</label>
            <div className="relative">
              <select value={origin} onChange={(e) => setOrigin(e.target.value)} className="w-full bg-[#050a14]/80 border border-white/15 rounded-xl px-3 py-2 text-xs text-white outline-none appearance-none cursor-pointer">
                <option value="CPT">Cape Town (CPT)</option>
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs">▼</div>
            </div>
          </div>
          <div>
            <label className="text-[10px] text-slate-400 uppercase tracking-widest block mb-1 font-sans">Destination:</label>
            <div className="relative">
              <select value={destination} onChange={(e) => setDestination(e.target.value)} className="w-full bg-[#050a14]/80 border border-white/15 rounded-xl px-3 py-2 text-xs text-white outline-none appearance-none cursor-pointer">
                <option value="BHR">Bharati Station (BHR)</option>
                <option value="MAI">Maitri Station (MAI)</option>
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs">▼</div>
            </div>
          </div>

          <button onClick={handleOptimize} disabled={isOptimizing} className="w-full mt-2 py-2.5 px-4 bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-400/60 rounded-xl text-cyan-300 text-xs font-bold tracking-widest uppercase transition-all duration-300 shadow-[0_0_20px_rgba(0,240,255,0.25)] flex items-center justify-center gap-2">
            <Navigation2 size={14} className={isOptimizing ? 'animate-spin' : 'rotate-45'} />
            {isOptimizing ? 'COMPUTING...' : 'ACTIVATE ROUTE'}
          </button>

          {/* NEW: LIVE SATELLITE SYNC TOGGLE */}
          <div className="flex gap-2 mt-2">
            <button 
              onClick={() => {
                setLiveEnvironment(!liveEnvironment);
                setSwarmActive(false); // Turn off swarm to avoid visual clutter
              }} 
              className={`flex-1 py-2 px-2 border rounded-xl text-[9px] font-bold tracking-widest uppercase transition-all duration-300 flex flex-col items-center justify-center gap-1 ${
                liveEnvironment ? 'bg-blue-500/20 border-blue-500/60 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.2)]' : 'bg-slate-800/40 border-slate-600 hover:border-slate-400 text-slate-300'
              }`}
            >
              <Satellite size={14} className={liveEnvironment ? 'animate-pulse' : ''} />
              {liveEnvironment ? 'SAT SYNC ON' : 'SYNC METEOSAT'}
            </button>

            <button 
              onClick={() => {
                setSwarmActive(!swarmActive);
                setLiveEnvironment(false);
              }} 
              disabled={metrics.status !== "ACTIVE"}
              className={`flex-1 py-2 px-2 border rounded-xl text-[9px] font-bold tracking-widest uppercase transition-all duration-300 flex flex-col items-center justify-center gap-1 ${
                metrics.status !== "ACTIVE" ? 'bg-slate-800/20 border-slate-700 text-slate-600 cursor-not-allowed' :
                swarmActive ? 'bg-amber-500/20 border-amber-500/60 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.2)]' : 'bg-slate-800/40 border-slate-600 hover:border-slate-400 text-slate-300'
              }`}
            >
              <Wifi size={14} className={swarmActive ? 'animate-pulse' : ''} />
              {swarmActive ? 'SWARM ON' : 'SWARM LINK'}
            </button>
          </div>
        </div>
      </div>

      {/* TOP-RIGHT ICEBERG INTEL PANEL */}
      {showIntel && (
        <div className="absolute top-8 right-8 z-[1000] w-72 bg-[#0a0f1d]/75 backdrop-blur-2xl border border-red-500/30 rounded-2xl p-4 shadow-[0_15px_45px_rgba(255,42,77,0.15)] animate-in fade-in slide-in-from-right-4 duration-300">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-red-500/20">
            <div className="flex items-center gap-2 text-red-400">
              <Database size={14} />
              <h2 className="text-xs font-bold tracking-widest uppercase">Target Intel: A-23a</h2>
            </div>
            <button onClick={() => setShowIntel(false)} className="text-slate-400 hover:text-white">✕</button>
          </div>
          
          <div className="space-y-2 text-[10px] tracking-wider">
            <div className="flex justify-between border-b border-white/5 pb-1">
              <span className="text-slate-400">DATA SOURCE:</span>
              <span className="text-cyan-300">IIT-M / NCPOR (2025)</span>
            </div>
            <div className="flex justify-between border-b border-white/5 pb-1">
              <span className="text-slate-400">VISIBLE MASS:</span>
              <span className="text-white">12.5%</span>
            </div>
            <div className="flex justify-between border-b border-white/5 pb-1">
              <span className="text-slate-400">UNDERWATER DRAFT:</span>
              <span className="text-red-400 font-bold">280 METERS (CRITICAL)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">DRIFT TRAJECTORY:</span>
              <span className="text-amber-300">{liveEnvironment ? '1.4 kts NE (ACCELERATING)' : '0.8 kts NW'}</span>
            </div>
          </div>
        </div>
      )}

      {/* BOTTOM-RIGHT HUD */}
      <div className="absolute bottom-8 right-8 z-[1000] w-[700px] bg-[#0a0f1d]/70 backdrop-blur-2xl border border-white/15 rounded-2xl p-4 shadow-[0_15px_45px_rgba(0,0,0,0.8)]">
        <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-3 text-[11px] tracking-wider text-slate-300">
          <div className="flex items-center gap-2">
            <Activity size={14} className="text-cyan-400" />
            <span className="font-bold text-white uppercase tracking-widest">Telemetry Dashboard</span>
          </div>
          <div className="flex items-center gap-3 text-slate-400 text-[10px]">
            <span>VESSEL: <strong className="text-cyan-400 font-normal">MV POLAR EXPLORER</strong></span>
            <span className="px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-bold">SYS ONLINE</span>
          </div>
        </div>

        <div className="grid grid-cols-6 gap-2.5 text-left">
          <div className="p-2 rounded-xl bg-white/[0.03] border border-white/5">
            <span className="text-[9px] text-slate-400 uppercase tracking-widest flex items-center gap-1 font-sans"><Anchor size={10} className="text-cyan-400" /> Status</span>
            <p className="text-xs font-bold text-white mt-1">{metrics.status}</p>
          </div>
          <div className="p-2 rounded-xl bg-white/[0.03] border border-white/5">
            <span className="text-[9px] text-slate-400 uppercase tracking-widest flex items-center gap-1 font-sans"><Gauge size={10} className="text-cyan-400" /> Speed</span>
            <p className={`text-xs font-bold mt-1 ${liveEnvironment ? 'text-amber-400' : 'text-white'}`}>{liveSpeed} <span className="text-[9px] text-slate-400 font-normal">kts</span></p>
          </div>
          <div className="p-2 rounded-xl bg-white/[0.03] border border-white/5">
            <span className="text-[9px] text-slate-400 uppercase tracking-widest flex items-center gap-1 font-sans"><Compass size={10} className="text-cyan-400" /> Heading</span>
            <p className="text-xs font-bold text-white mt-1">198° SW</p>
          </div>
          <div className="p-2 rounded-xl bg-white/[0.03] border border-white/5">
            <span className="text-[9px] text-slate-400 uppercase tracking-widest flex items-center gap-1 font-sans"><Waves size={10} className="text-cyan-400" /> Current</span>
            <p className={`text-xs font-bold mt-1 ${liveEnvironment ? 'text-red-400' : 'text-white'}`}>{liveCurrent} <span className="text-[9px] text-slate-400 font-normal">kts</span></p>
          </div>
          <div className="p-2 rounded-xl bg-white/[0.03] border border-white/5">
            <span className="text-[9px] text-slate-400 uppercase tracking-widest flex items-center gap-1 font-sans"><ShieldCheck size={10} className="text-cyan-400" /> Fuel Saved</span>
            <p className={`text-xs font-bold mt-1 ${metrics.fuelColor}`}>{metrics.fuelSaved !== "--" ? `${metrics.fuelSaved}` : "--"}</p>
          </div>
          <div className="p-2 rounded-xl bg-white/[0.03] border border-white/5">
            <span className="text-[9px] text-slate-400 uppercase tracking-widest flex items-center gap-1 font-sans"><Droplets size={10} className="text-cyan-400" /> Distance</span>
            <p className="text-xs font-bold text-white mt-1">{metrics.distance}</p>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between text-[10px] text-slate-400">
          <div className="flex items-center gap-4">
            <span>ETA {destination}: <strong className="text-white font-mono">{metrics.eta !== "--" ? `${metrics.eta} DAYS` : "--"}</strong></span>
            <span className="text-white/20">|</span>
            <span>DIST REM: <strong className="text-cyan-300 font-mono">{metrics.distance !== "--" ? `${metrics.distance} NM` : "--"}</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-400">RISK:</span>
            <span className={`px-2 py-0.5 rounded border font-bold text-[9px] ${metrics.risk === 'SEVERE WEATHER' ? 'bg-amber-500/10 border-amber-500/40 text-amber-500' : (metrics.risk === 'SAFE TRAJECTORY' ? 'bg-cyan-400/10 border-cyan-400/40 text-cyan-300' : 'bg-red-500/10 border-red-500/40 text-red-500')}`}>
              {swarmActive ? 'DETOUR ENGAGED' : metrics.risk}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}