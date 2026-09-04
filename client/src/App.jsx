import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Polygon, Polyline, Marker, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import axios from 'axios';
import 'leaflet/dist/leaflet.css';
import { 
  Anchor, Compass, Gauge, Waves, Droplets, ShieldCheck, Navigation2, Activity, Layers, Info, Database
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
  const [showIntel, setShowIntel] = useState(false); // Controls the new Iceberg Data panel

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

  // Dynamic Live Sensor States
  const [liveSpeed, setLiveSpeed] = useState(18.2);
  const [liveCurrent, setLiveCurrent] = useState(1.1);

  // Fluctuating Data Effect: Runs only when the route is ACTIVE
  useEffect(() => {
    let interval;
    if (metrics.status === "ACTIVE") {
      interval = setInterval(() => {
        // Randomize speed slightly between 17.5 and 18.5
        setLiveSpeed((17.5 + Math.random() * 1.0).toFixed(1));
        // Randomize ocean current between 0.8 and 1.4
        setLiveCurrent((0.8 + Math.random() * 0.6).toFixed(1));
      }, 2000);
    } else {
      setLiveSpeed(0.0);
      setLiveCurrent(1.1);
    }
    return () => clearInterval(interval);
  }, [metrics.status]);

  const stationCoords = {
    'CPT': { lat: -33.92, lon: 18.42 },
    'BHR': { lat: -69.40, lon: 76.19 },
    'MAI': { lat: -70.76, lon: 11.73 }
  };

  const a23aPolygon = [
    [-59.0, 42.0], [-58.5, 54.0], [-62.5, 58.0], [-65.0, 52.0], [-64.0, 38.0]
  ];

  const handleOptimize = async () => {
    setIsOptimizing(true);
    try {
      const response = await axios.post('http://localhost:5000/api/v1/routes/optimize', {
        origin: stationCoords[origin],
        destination: stationCoords[destination]
      });
      
      const data = response.data.comparison;
      
      setSafeRoute(data.safeRoute.waypoints);
      setRiskRoute(data.directRoute.waypoints);
      
      setMetrics({
        status: "ACTIVE",
        distance: data.safeRoute.totalDistanceNM,
        fuelSaved: data.fuelSavedPercent,
        risk: data.safeRoute.safetyStatus,
        eta: data.safeRoute.etaDays,
        fuelColor: "text-emerald-400",
        riskColor: data.safeRoute.safetyStatus === 'SAFE TRAJECTORY' ? 'text-cyan-400' : 'text-red-500'
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

        <Polygon 
          positions={a23aPolygon} 
          // Click handler to open the HOD's requested data panel
          eventHandlers={{ click: () => setShowIntel(!showIntel) }} 
          pathOptions={{ color: '#ff2a4d', weight: 2, fillColor: '#ff2a4d', fillOpacity: 0.35, dashArray: '6, 6', className: 'cursor-pointer' }}
        >
          <Tooltip permanent direction="center" className="bg-transparent border-none shadow-none text-red-400 font-bold text-xs uppercase tracking-widest pointer-events-none">
            A-23a Hazard Zone
          </Tooltip>
        </Polygon>

        {riskRoute.length > 0 && (
          <Polyline positions={riskRoute} className="route-danger-glow" pathOptions={{ color: '#ff2a4d', weight: 2, dashArray: '8, 10', opacity: 0.8 }} />
        )}

        {safeRoute.length > 0 && (
          <>
            <Polyline positions={safeRoute} pathOptions={{ color: '#00f0ff', weight: 9, opacity: 0.3, lineCap: 'round', lineJoin: 'round' }} />
            <Polyline positions={safeRoute} className="route-glow" pathOptions={{ color: '#ffffff', weight: 3.5, opacity: 0.95, lineCap: 'round', lineJoin: 'round' }} />
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
        </div>
      </div>

      {/* NEW: TOP-RIGHT ICEBERG INTEL PANEL (Shows when polygon is clicked) */}
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
              <span className="text-slate-400">VISIBLE SURFACE MASS:</span>
              <span className="text-white">12.5%</span>
            </div>
            <div className="flex justify-between border-b border-white/5 pb-1">
              <span className="text-slate-400">UNDERWATER DRAFT:</span>
              <span className="text-red-400 font-bold">280 METERS (CRITICAL)</span>
            </div>
            <div className="flex justify-between border-b border-white/5 pb-1">
              <span className="text-slate-400">EST. TOTAL MASS:</span>
              <span className="text-white">~1.2 Billion Tons</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">DRIFT TRAJECTORY:</span>
              <span className="text-amber-300">0.8 kts NW (Shifting)</span>
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
            {/* Now using dynamic liveSpeed state */}
            <p className="text-xs font-bold text-white mt-1">{liveSpeed} <span className="text-[9px] text-slate-400 font-normal">kts</span></p>
          </div>
          <div className="p-2 rounded-xl bg-white/[0.03] border border-white/5">
            <span className="text-[9px] text-slate-400 uppercase tracking-widest flex items-center gap-1 font-sans"><Compass size={10} className="text-cyan-400" /> Heading</span>
            <p className="text-xs font-bold text-white mt-1">198° SW</p>
          </div>
          <div className="p-2 rounded-xl bg-white/[0.03] border border-white/5">
            <span className="text-[9px] text-slate-400 uppercase tracking-widest flex items-center gap-1 font-sans"><Waves size={10} className="text-cyan-400" /> Current</span>
            {/* Now using dynamic liveCurrent state */}
            <p className="text-xs font-bold text-white mt-1">{liveCurrent} <span className="text-[9px] text-slate-400 font-normal">kts</span></p>
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
            <span className={`px-2 py-0.5 rounded border font-bold text-[9px] ${metrics.risk === 'SAFE TRAJECTORY' ? 'bg-cyan-400/10 border-cyan-400/40 text-cyan-300' : 'bg-red-500/10 border-red-500/40 text-red-500'}`}>
              {metrics.risk}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}