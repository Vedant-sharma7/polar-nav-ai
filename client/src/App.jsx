import React from 'react';
import { MapContainer, TileLayer, Polygon, Polyline, Marker, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Helper function to create tactical HUD markers with pulsing radar dots
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
  const mapCenter = [-54.0, 45.0];

  // Real-world coordinates
  const capeTownPos = [-33.92, 18.42];
  const bharatiPos = [-69.40, 76.19];
  const maitriPos = [-70.76, 11.73];

  // Iceberg A-23a Polygon (Weddell Sea drift corridor boundary)
  const a23aPolygon = [
    [-59.0, 42.0],
    [-58.5, 54.0],
    [-62.5, 58.0],
    [-65.0, 52.0],
    [-64.0, 38.0],
  ];

  // Visual Path Data (Matches Concept 3 curve around the hazard)
  const visualSafeRoute = [
    [-33.92, 18.42], // Cape Town
    [-40.5, 24.0],
    [-47.0, 31.0],
    [-53.0, 38.5],
    [-58.0, 41.0],   // Approach corridor
    [-60.5, 43.5],   // Skirts west boundary of A-23a
    [-65.2, 57.0],   // Clear of hazard zone
    [-68.0, 68.0],
    [-69.40, 76.19], // Bharati Station
  ];

  const visualDirectDangerRoute = [
    [-33.92, 18.42], // Cape Town
    [-61.5, 50.2],   // Directly enters A-23a core zone
    [-69.40, 76.19], // Bharati Station
  ];

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black select-none">
      <MapContainer
        center={mapCenter}
        zoom={3.5}
        minZoom={2}
        maxZoom={7}
        zoomControl={false}
        attributionControl={false}
        className="w-full h-full"
      >
        {/* ESRI High-Resolution Satellite Basemap */}
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          maxZoom={18}
        />

        {/* 1. Iceberg A-23a Hazard Polygon */}
        <Polygon
          positions={a23aPolygon}
          pathOptions={{
            color: '#ff2a4d',
            weight: 2,
            fillColor: '#ff2a4d',
            fillOpacity: 0.35,
            dashArray: '6, 6',
          }}
        >
          <Tooltip permanent direction="center" className="bg-transparent border-none shadow-none text-red-400 font-bold text-xs uppercase tracking-widest pointer-events-none">
            A-23a Hazard Zone
          </Tooltip>
        </Polygon>

        {/* 2. Naive Direct Route (Red Dashed Line) */}
        <Polyline
          positions={visualDirectDangerRoute}
          className="route-danger-glow"
          pathOptions={{
            color: '#ff2a4d',
            weight: 2.5,
            dashArray: '8, 10',
            opacity: 0.8,
          }}
        />

        {/* 3. A* Optimal Trajectory (Layered Dual Glow Cyan Line) */}
        {/* Outer Glow Stroke */}
        <Polyline
          positions={visualSafeRoute}
          pathOptions={{
            color: '#00f0ff',
            weight: 9,
            opacity: 0.35,
            lineCap: 'round',
            lineJoin: 'round',
          }}
        />
        {/* Core Sharp Stroke */}
        <Polyline
          positions={visualSafeRoute}
          className="route-glow"
          pathOptions={{
            color: '#ffffff',
            weight: 3,
            opacity: 0.95,
            lineCap: 'round',
            lineJoin: 'round',
          }}
        />

        {/* 4. Station & Port Markers */}
        <Marker position={capeTownPos} icon={createTacticalIcon('Cape Town Port', '#00f0ff')} />
        <Marker position={bharatiPos} icon={createTacticalIcon('Bharati Station', '#00f0ff')} />
        <Marker position={maitriPos} icon={createTacticalIcon('Maitri Station', '#94a3b8')} />
      </MapContainer>

      {/* Commit Badge */}
      <div className="absolute top-4 right-4 z-[1000] px-3 py-1 bg-black/70 backdrop-blur-md border border-white/10 rounded text-xs text-cyan-400">
        STAGE: GEOSPATIAL OVERLAYS MOUNTED
      </div>
    </div>
  );
}