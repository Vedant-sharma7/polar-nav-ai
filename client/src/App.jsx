import React from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

export default function App() {
  // Centered over the Southern Ocean between South Africa and Bharati Station
  const mapCenter = [-54.0, 45.0];
  const defaultZoom = 3;

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black select-none">
      <MapContainer
        center={mapCenter}
        zoom={defaultZoom}
        minZoom={2}
        maxZoom={7}
        zoomControl={false}
        attributionControl={false}
        className="w-full h-full"
      >
        {/* Real ESRI High-Resolution Satellite Tiles (Real Ice + Real Continents) */}
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          maxZoom={18}
        />
      </MapContainer>

      {/* Temporary commit checkpoint indicator */}
      <div className="absolute top-4 right-4 z-[1000] px-3 py-1 bg-black/60 backdrop-blur-md border border-white/10 rounded text-xs text-cyan-400">
        STAGE: BASE SATELLITE MOUNTED
      </div>
    </div>
  );
}