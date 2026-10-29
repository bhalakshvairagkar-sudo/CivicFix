import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';

const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyBIAiue876R42ADE8dDATi24sk0qaARayc';

// Configured Map Tile Providers
const MAP_PROVIDERS = {
  google_roadmap: {
    id: 'google_roadmap',
    name: 'Google Maps',
    icon: '🗺️',
    url: `https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&key=${GOOGLE_API_KEY}`,
    attribution: '© Google Maps',
    maxZoom: 20,
    subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
  },
  google_satellite: {
    id: 'google_satellite',
    name: 'Google Satellite',
    icon: '🛰️',
    url: `https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}&key=${GOOGLE_API_KEY}`,
    attribution: '© Google Maps Satellite',
    maxZoom: 20,
    subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
  },
  google_terrain: {
    id: 'google_terrain',
    name: 'Google Terrain',
    icon: '⛰️',
    url: `https://mt1.google.com/vt/lyrs=p&x={x}&y={y}&z={z}&key=${GOOGLE_API_KEY}`,
    attribution: '© Google Maps Terrain',
    maxZoom: 20,
    subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
  },
  carto_dark: {
    id: 'carto_dark',
    name: 'Dark Municipal',
    icon: '🌙',
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution: '© CARTO, OpenStreetMap',
    maxZoom: 19,
    subdomains: 'abcd'
  },
  osm_standard: {
    id: 'osm_standard',
    name: 'OpenStreetMap',
    icon: '🌐',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19,
    subdomains: 'abc'
  }
};

export default function InteractiveMap({
  cases = [],
  sensitiveLocations = [],
  selectedCaseId = null,
  onCaseSelect = null,
  height = '500px'
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const currentTileLayerRef = useRef(null);
  const markersLayerRef = useRef(null);
  const sensitiveLayerRef = useRef(null);

  // Active Map Tile Provider (default to Google Maps)
  const [activeLayerKey, setActiveLayerKey] = useState('google_roadmap');

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      // Default center: Metro Civic District (Lat: 12.9716, Lng: 77.5946)
      const map = L.map(mapContainerRef.current, {
        center: [12.9716, 77.5946],
        zoom: 14,
        zoomControl: true,
        attributionControl: false
      });

      // Initial Tile Layer: Google Maps
      const initialProvider = MAP_PROVIDERS[activeLayerKey] || MAP_PROVIDERS.google_roadmap;
      const tileLayer = L.tileLayer(initialProvider.url, {
        maxZoom: initialProvider.maxZoom,
        subdomains: initialProvider.subdomains,
        attribution: initialProvider.attribution
      }).addTo(map);

      currentTileLayerRef.current = tileLayer;
      markersLayerRef.current = L.layerGroup().addTo(map);
      sensitiveLayerRef.current = L.layerGroup().addTo(map);

      mapInstanceRef.current = map;
    }

    return () => {
      // Cleanup on unmount
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Switch Active Map Tile Provider
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const provider = MAP_PROVIDERS[activeLayerKey] || MAP_PROVIDERS.google_roadmap;

    // Remove existing tile layer
    if (currentTileLayerRef.current) {
      map.removeLayer(currentTileLayerRef.current);
    }

    // Add new selected tile layer
    const newTileLayer = L.tileLayer(provider.url, {
      maxZoom: provider.maxZoom,
      subdomains: provider.subdomains,
      attribution: provider.attribution
    }).addTo(map);

    // Keep tiles beneath markers and circles
    newTileLayer.bringToBack();
    currentTileLayerRef.current = newTileLayer;
  }, [activeLayerKey]);

  // Update Markers & Sensitive Layers
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !markersLayerRef.current || !sensitiveLayerRef.current) return;

    markersLayerRef.current.clearLayers();
    sensitiveLayerRef.current.clearLayers();

    // 1. Draw Sensitive Locations (Hospitals, Schools) Buffer Circles
    sensitiveLocations.forEach((loc) => {
      const isHospital = loc.type === 'HOSPITAL';
      const isSchool = loc.type === 'SCHOOL';
      const color = isHospital ? '#ef4444' : isSchool ? '#f59e0b' : '#3b82f6';

      const circle = L.circle([parseFloat(loc.latitude), parseFloat(loc.longitude)], {
        color: color,
        fillColor: color,
        fillOpacity: 0.16,
        weight: 2,
        radius: loc.buffer_meters || 350
      });

      circle.bindTooltip(`<b>${loc.name}</b> (${loc.type})<br/>Safety Priority Buffer: ${loc.buffer_meters}m`, {
        className: 'glass-card text-xs p-1'
      });
      sensitiveLayerRef.current.addLayer(circle);
    });

    // 2. Draw Case Markers
    const bounds = [];

    cases.forEach((c) => {
      const lat = parseFloat(c.latitude);
      const lng = parseFloat(c.longitude);
      if (isNaN(lat) || isNaN(lng)) return;

      bounds.push([lat, lng]);

      const isSelected = selectedCaseId === c.case_id;
      const isCritical = c.priority_level === 'CRITICAL' || c.severity === 'CRITICAL';
      const isClosed = c.status === 'VERIFIED_CLOSED' || c.status === 'RESOLVED';
      const isRecurring = Boolean(c.is_recurring_failure);

      let pinColor = '#10b981'; // Green
      if (isClosed) pinColor = '#3b82f6'; // Blue
      else if (isCritical) pinColor = '#ef4444'; // Red
      else if (c.priority_level === 'HIGH') pinColor = '#f97316'; // Orange
      else if (c.priority_level === 'MEDIUM') pinColor = '#eab308'; // Yellow

      // Custom SVG Pin Icon
      const iconHtml = `
        <div style="
          position: relative;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transform: ${isSelected ? 'scale(1.3)' : 'scale(1)'};
          transition: transform 0.2s ease;
        ">
          ${isRecurring ? `
            <div style="
              position: absolute;
              inset: -4px;
              border-radius: 9999px;
              border: 2.5px dashed #a855f7;
              animation: spin 6s linear infinite;
            "></div>
          ` : ''}
          <div style="
            width: 26px;
            height: 26px;
            border-radius: 9999px;
            background: ${pinColor};
            border: 2.5px solid #ffffff;
            box-shadow: 0 4px 12px rgba(0,0,0,0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            color: #ffffff;
            font-size: 11px;
            font-weight: 800;
          ">
            ${c.priority_score ? Math.round(c.priority_score) : '!'}
          </div>
        </div>
      `;

      const customIcon = L.divIcon({
        className: 'custom-leaflet-marker',
        html: iconHtml,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -18]
      });

      const marker = L.marker([lat, lng], { icon: customIcon });

      const popupHtml = `
        <div style="font-family: 'Plus Jakarta Sans', sans-serif; padding: 2px; width: 230px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
            <span style="font-size: 10px; font-weight: bold; color: #10b981; font-family: monospace;">#${c.case_number}</span>
            <span style="font-size: 10px; padding: 2px 6px; border-radius: 4px; background: rgba(0,0,0,0.4); color: #cbd5e1; font-weight: 500;">${c.category}</span>
          </div>
          <h4 style="font-size: 13px; font-weight: 700; color: #0f172a; margin: 0 0 6px 0; line-height: 1.3;">${c.title}</h4>
          <div style="font-size: 11px; color: #475569; margin-bottom: 8px;">
            Status: <b style="color: #0f172a;">${c.status}</b><br/>
            Priority: <b style="color: ${pinColor}; font-weight: 700;">${c.priority_level} (${c.priority_score || 'N/A'})</b>
            ${isRecurring ? '<br/><span style="color: #7e22ce; font-weight: bold;">⚠️ Recurring Defect</span>' : ''}
          </div>
          <button id="btn-inspect-${c.case_id}" style="
            width: 100%;
            padding: 6px 0;
            background: #10b981;
            color: white;
            border: none;
            border-radius: 6px;
            font-size: 11px;
            font-weight: 600;
            cursor: pointer;
            box-shadow: 0 2px 4px rgba(16,185,129,0.3);
          ">
            Inspect Repair Case →
          </button>
        </div>
      `;

      marker.bindPopup(popupHtml);

      marker.on('popupopen', () => {
        const btn = document.getElementById(`btn-inspect-${c.case_id}`);
        if (btn && onCaseSelect) {
          btn.onclick = () => onCaseSelect(c);
        }
      });

      marker.on('click', () => {
        if (onCaseSelect) onCaseSelect(c);
      });

      markersLayerRef.current.addLayer(marker);
    });

    // Auto-fit bounds if markers exist
    if (bounds.length > 0 && !selectedCaseId) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    } else if (selectedCaseId) {
      const selectedCase = cases.find((c) => c.case_id === selectedCaseId);
      if (selectedCase) {
        map.flyTo([parseFloat(selectedCase.latitude), parseFloat(selectedCase.longitude)], 16, { duration: 1.2 });
      }
    }
  }, [cases, sensitiveLocations, selectedCaseId, onCaseSelect]);

  return (
    <div className="relative w-full overflow-hidden rounded-2xl border border-slate-800 shadow-xl" style={{ height }}>
      {/* Map Container */}
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Google Maps Layer Selector Controls */}
      <div className="absolute top-3 right-3 z-[1000] flex items-center gap-1.5 p-1 rounded-xl bg-slate-900/90 backdrop-blur-md border border-slate-700/80 shadow-2xl">
        <div className="flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-emerald-400 border-r border-slate-700/80 mr-0.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>Google Maps API</span>
        </div>

        {Object.values(MAP_PROVIDERS).map((provider) => {
          const isActive = activeLayerKey === provider.id;
          return (
            <button
              key={provider.id}
              onClick={() => setActiveLayerKey(provider.id)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                isActive
                  ? 'bg-emerald-500 text-white shadow-md'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
              }`}
              title={provider.name}
            >
              <span>{provider.icon}</span>
              <span className="hidden sm:inline">{provider.name}</span>
            </button>
          );
        })}
      </div>

      {/* Legend Overlay */}
      <div className="absolute bottom-4 right-4 z-[1000] glass-card p-3 rounded-xl shadow-lg border border-slate-700/60 text-[11px] space-y-1.5 pointer-events-auto">
        <div className="font-semibold text-slate-200 uppercase tracking-wider text-[10px] pb-1 border-b border-slate-700 flex items-center justify-between">
          <span>Map Priority Legend</span>
          <span className="text-[9px] font-mono text-emerald-400">Live</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
          <span className="text-slate-300">Critical Priority</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
          <span className="text-slate-300">High Priority</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-yellow-400"></span>
          <span className="text-slate-300">Medium Priority</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
          <span className="text-slate-300">Verified Closed</span>
        </div>
        <div className="flex items-center gap-2 pt-1 border-t border-slate-700/60">
          <span className="w-3.5 h-3.5 rounded-full border-2 border-dashed border-purple-400"></span>
          <span className="text-purple-300 font-medium">Recurring Failure</span>
        </div>
      </div>
    </div>
  );
}
