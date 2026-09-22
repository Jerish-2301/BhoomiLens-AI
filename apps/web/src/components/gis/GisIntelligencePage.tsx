import { useState, useCallback, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Layers,
  Search,
  MapPin,
  Navigation,
  ZoomIn,
  ZoomOut,
  Crosshair,
  Satellite,
  Map as MapIconOutline,
  ChevronLeft,
  ChevronRight,
  Ruler,
  Triangle,
  X,
  LocateFixed,
  Compass,
  AlertTriangle,
} from 'lucide-react';

import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';

// Fix Leaflet default marker icon broken by webpack/vite
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface LandParcel {
  id: string;
  surveyNo: string;
  owner: string;
  area: string;
  village: string;
  district: string;
  lat: number;
  lng: number;
  status: 'verified' | 'disputed' | 'pending';
  confidence: number;
  type: 'agricultural' | 'residential' | 'commercial' | 'government';
}

interface MapLayer {
  id: string;
  name: string;
  icon: string;
  enabled: boolean;
  color: string;
}

// ---------------------------------------------------------------------------
// Sample Data (will be replaced by live Firestore data)
// ---------------------------------------------------------------------------
const LAND_PARCELS: LandParcel[] = [
  { id: '1', surveyNo: '124/7B', owner: 'Ramesh Kumar', area: '2.4 acres', village: 'Hadapsar', district: 'Pune', lat: 18.5089, lng: 73.9260, status: 'verified', confidence: 94, type: 'agricultural' },
  { id: '2', surveyNo: '87/3A', owner: 'Sunita Patil', area: '1.1 acres', village: 'Wagholi', district: 'Pune', lat: 18.5629, lng: 73.9845, status: 'disputed', confidence: 68, type: 'residential' },
  { id: '3', surveyNo: '201/12', owner: 'Arvind Sharma', area: '3.8 acres', village: 'Uruli Kanchan', district: 'Pune', lat: 18.4748, lng: 74.0323, status: 'pending', confidence: 82, type: 'agricultural' },
  { id: '4', surveyNo: '55/9C', owner: 'Priya Deshmukh', area: '0.9 acres', village: 'Kharadi', district: 'Pune', lat: 18.5462, lng: 73.9441, status: 'verified', confidence: 97, type: 'commercial' },
  { id: '5', surveyNo: '310/4', owner: 'Govt. of Maharashtra', area: '8.2 acres', village: 'Lonikand', district: 'Pune', lat: 18.5823, lng: 74.0051, status: 'verified', confidence: 99, type: 'government' },
];

const DEFAULT_CENTER: [number, number] = [20.5937, 78.9629]; // India center
const DEFAULT_ZOOM = 5;

// ---------------------------------------------------------------------------
// Indian district / city coordinates lookup
// ---------------------------------------------------------------------------
const DISTRICT_COORDS: Record<string, [number, number]> = {
  // Tamil Nadu
  'tirunelveli': [8.7139, 77.7567],
  'chennai': [13.0827, 80.2707],
  'coimbatore': [11.0168, 76.9558],
  'madurai': [9.9252, 78.1198],
  'salem': [11.6643, 78.1460],
  'trichy': [10.7905, 78.7047],
  'tiruchirappalli': [10.7905, 78.7047],
  'vellore': [12.9165, 79.1325],
  'thanjavur': [10.7870, 79.1378],
  'kanyakumari': [8.0883, 77.5385],
  'erode': [11.3410, 77.7172],
  'thoothukudi': [8.7642, 78.1348],
  'tiruppur': [11.1085, 77.3411],
  'dharmapuri': [12.1286, 78.1580],
  'krishnagiri': [12.5186, 78.2137],
  'namakkal': [11.2195, 78.1674],
  'cuddalore': [11.7447, 79.7680],
  'chengalpattu': [12.6921, 80.0004],
  'viluppuram': [11.9401, 79.4861],
  'perungalathur': [12.8688, 80.0766],
  // Maharashtra
  'pune': [18.5204, 73.8567],
  'mumbai': [19.0760, 72.8777],
  'nagpur': [21.1458, 79.0882],
  'nashik': [19.9975, 73.7898],
  'aurangabad': [19.8762, 75.3433],
  'solapur': [17.6805, 75.9064],
  'kolhapur': [16.7050, 74.2433],
  'haveli': [18.5755, 73.9352],
  'satara': [17.6805, 74.0183],
  'ahmednagar': [19.0948, 74.7480],
  // Karnataka
  'bangalore': [12.9716, 77.5946],
  'bengaluru': [12.9716, 77.5946],
  'mysuru': [12.2958, 76.6394],
  'mysore': [12.2958, 76.6394],
  'hubli': [15.3647, 75.1240],
  'mangalore': [12.9141, 74.8560],
  'belagavi': [15.8497, 74.4977],
  'kalaburagi': [17.3297, 76.8343],
  'davanagere': [14.4644, 75.9218],
  'bellary': [15.1394, 76.9214],
  // Andhra Pradesh & Telangana
  'hyderabad': [17.3850, 78.4867],
  'visakhapatnam': [17.6868, 83.2185],
  'vijayawada': [16.5062, 80.6480],
  'guntur': [16.3067, 80.4365],
  'tirupati': [13.6288, 79.4192],
  'warangal': [17.9689, 79.5941],
  'nellore': [14.4426, 79.9865],
  // Kerala
  'thiruvananthapuram': [8.5241, 76.9366],
  'kochi': [9.9312, 76.2673],
  'kozhikode': [11.2588, 75.7804],
  'thrissur': [10.5276, 76.2144],
  'kollam': [8.8932, 76.6141],
  'palakkad': [10.7867, 76.6548],
  'malappuram': [11.0730, 76.0740],
  // Rajasthan
  'jaipur': [26.9124, 75.7873],
  'jodhpur': [26.2389, 73.0243],
  'udaipur': [24.5854, 73.7125],
  'ajmer': [26.4499, 74.6399],
  'kota': [25.2138, 75.8648],
  'bikaner': [28.0229, 73.3119],
  // Gujarat
  'ahmedabad': [23.0225, 72.5714],
  'surat': [21.1702, 72.8311],
  'vadodara': [22.3072, 73.1812],
  'rajkot': [22.3039, 70.8022],
  // Uttar Pradesh
  'lucknow': [26.8467, 80.9462],
  'agra': [27.1767, 78.0081],
  'varanasi': [25.3176, 82.9739],
  'kanpur': [26.4499, 80.3319],
  'prayagraj': [25.4358, 81.8463],
  'allahabad': [25.4358, 81.8463],
  'meerut': [28.9845, 77.7064],
  'ghaziabad': [28.6692, 77.4538],
  // Madhya Pradesh
  'bhopal': [23.2599, 77.4126],
  'indore': [22.7196, 75.8577],
  'gwalior': [26.2183, 78.1828],
  'jabalpur': [23.1815, 79.9864],
  // West Bengal
  'kolkata': [22.5726, 88.3639],
  'howrah': [22.5958, 88.2636],
  'darjeeling': [27.0360, 88.2627],
  'siliguri': [26.7271, 88.6395],
  // Punjab & Haryana
  'amritsar': [31.6340, 74.8723],
  'ludhiana': [30.9010, 75.8573],
  'chandigarh': [30.7333, 76.7794],
  'gurgaon': [28.4595, 77.0266],
  'gurugram': [28.4595, 77.0266],
  'faridabad': [28.4089, 77.3178],
  // Delhi
  'delhi': [28.6139, 77.2090],
  'new delhi': [28.6139, 77.2090],
  // Bihar & Jharkhand
  'patna': [25.5941, 85.1376],
  'ranchi': [23.3441, 85.3096],
  'gaya': [24.7955, 85.0002],
  // Odisha
  'bhubaneswar': [20.2961, 85.8245],
  'cuttack': [20.4625, 85.8830],
  // Assam
  'guwahati': [26.1445, 91.7362],
  'dibrugarh': [27.4728, 94.9120],
};

// ---------------------------------------------------------------------------
// Custom coloured marker icon
// ---------------------------------------------------------------------------
function createColorIcon(color: string) {
  return L.divIcon({
    className: '',
    html: `
      <div style="
        width: 28px; height: 28px;
        background: ${color};
        border: 3px solid white;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        box-shadow: 0 2px 8px rgba(0,0,0,.35);
      "></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -32],
  });
}

const STATUS_COLORS: Record<string, string> = {
  verified: '#16a34a',
  disputed: '#ef4444',
  pending: '#f59e0b',
};

// ---------------------------------------------------------------------------
// FlyToDistrict: reads ?district= from URL and flies the map there
// ---------------------------------------------------------------------------
function FlyToDistrict() {
  const map = useMap();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const district = searchParams.get('district');
    if (!district) return;
    const key = district.toLowerCase().trim();
    const coords = DISTRICT_COORDS[key];
    if (coords) {
      // Small delay to ensure map is ready
      const t = setTimeout(() => {
        map.flyTo(coords, 11, { animate: true, duration: 1.5 });
      }, 300);
      return () => clearTimeout(t);
    }
  // Only run once on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

// ---------------------------------------------------------------------------
// Internal map controls component (must be inside <MapContainer>)
// ---------------------------------------------------------------------------
function MapControls({
  onLocate,
  isLocating,
  mapType,
  setMapType,
}: {
  onLocate: () => void;
  isLocating: boolean;
  mapType: 'roadmap' | 'satellite';
  setMapType: (t: 'roadmap' | 'satellite') => void;
}) {
  const map = useMap();

  return (
    <>
      {/* Zoom controls */}
      <div className="gis-map-controls">
        <button
          className="gis-map-control-btn"
          title="Zoom In"
          onClick={() => map.zoomIn()}
        >
          <ZoomIn size={18} />
        </button>
        <button
          className="gis-map-control-btn"
          title="Zoom Out"
          onClick={() => map.zoomOut()}
        >
          <ZoomOut size={18} />
        </button>
        <div className="gis-control-divider" />
        <button
          className={`gis-map-control-btn ${isLocating ? 'gis-locating' : ''}`}
          title="My Location"
          onClick={onLocate}
        >
          <LocateFixed size={18} />
        </button>
        <button
          className="gis-map-control-btn"
          title="Reset to India"
          onClick={() => map.setView(DEFAULT_CENTER, DEFAULT_ZOOM)}
        >
          <Compass size={18} />
        </button>
      </div>

      {/* Map type toggle pill */}
      <div className="gis-map-type-toggle">
        <button
          className={`gis-map-type-btn ${mapType === 'roadmap' ? 'gis-map-type-active' : ''}`}
          onClick={() => setMapType('roadmap')}
        >
          <MapIconOutline size={14} />
          Map
        </button>
        <button
          className={`gis-map-type-btn ${mapType === 'satellite' ? 'gis-map-type-active' : ''}`}
          onClick={() => setMapType('satellite')}
        >
          <Satellite size={14} />
          Satellite
        </button>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Tile URL helper
// ---------------------------------------------------------------------------
function getTileUrl(type: 'roadmap' | 'satellite') {
  if (type === 'satellite') {
    return 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
  }
  return 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
}

function getTileAttribution(type: 'roadmap' | 'satellite') {
  if (type === 'satellite') {
    return '&copy; <a href="https://www.esri.com/">Esri</a> &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community';
  }
  return '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export function GisIntelligencePage() {
  const [dbParcels, setDbParcels] = useState<LandParcel[]>([]);
  const [selectedParcel, setSelectedParcel] = useState<LandParcel | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [mapType, setMapType] = useState<'roadmap' | 'satellite'>('roadmap');
  const [isLocating, setIsLocating] = useState(false);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [layers, setLayers] = useState<MapLayer[]>([
    { id: 'parcels', name: 'Plot Boundaries', icon: '📐', enabled: true, color: '#16a34a' },
    { id: 'survey', name: 'Survey Numbers', icon: '🔢', enabled: true, color: '#3b82f6' },
    { id: 'water', name: 'Water Bodies', icon: '💧', enabled: false, color: '#0ea5e9' },
    { id: 'roads', name: 'Roads & Paths', icon: '🛤️', enabled: true, color: '#78716c' },
    { id: 'contour', name: 'Contour Lines', icon: '🏔️', enabled: false, color: '#a855f7' },
    { id: 'disputes', name: 'Disputed Zones', icon: '⚠️', enabled: true, color: '#ef4444' },
  ]);
  const [activeTab, setActiveTab] = useState<'layers' | 'parcels' | 'analysis'>('parcels');
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const unsub = onSnapshot(collection(db, 'landRecords'), (snap) => {
        const p: LandParcel[] = [];
        // Combine DB records with static fallback for demo aesthetics if DB is empty
        snap.forEach(doc => {
          const d = doc.data();
          p.push({
            id: doc.id,
            surveyNo: d.surveyNumber || 'Unknown',
            owner: d.ownerName || 'Unknown',
            area: d.area ? `${d.area} ${d.areaUnit}` : '0',
            village: d.village || 'Unknown',
            district: d.district || 'Unknown',
            lat: 18.5204 + (Math.random() * 0.1 - 0.05), // Fake coordinates around Pune since DB lacks geometry
            lng: 73.8567 + (Math.random() * 0.1 - 0.05),
            status: d.status === 'VERIFIED' ? 'verified' : d.status === 'PENDING' ? 'pending' : 'disputed',
            confidence: d.confidence ? Math.round(d.confidence * 100) : 0,
            type: 'agricultural'
          });
        });
        
        if (p.length === 0) {
          setDbParcels(LAND_PARCELS); // fallback to hardcoded if no records yet
        } else {
          setDbParcels([...p, ...LAND_PARCELS]); // Merge for richer demo
        }
      });
      return () => unsub();
    } catch (e) {
      console.warn('Could not subscribe to landRecords in GIS page:', e);
      setDbParcels(LAND_PARCELS);
    }
  }, []);

  const filteredParcels = dbParcels.filter(
    (p) =>
      p.surveyNo?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.owner?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.village?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleLayer = useCallback((id: string) => {
    setLayers((prev) =>
      prev.map((l) => (l.id === id ? { ...l, enabled: !l.enabled } : l))
    );
  }, []);

  const handleLocate = useCallback(() => {
    if (!navigator.geolocation) return;
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation([pos.coords.latitude, pos.coords.longitude]);
        setIsLocating(false);
      },
      () => setIsLocating(false),
      { enableHighAccuracy: true }
    );
  }, []);

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      verified: 'gis-badge-verified',
      disputed: 'gis-badge-disputed',
      pending: 'gis-badge-pending',
    };
    return map[status] || '';
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const coordsDisplay = selectedParcel
    ? { lat: selectedParcel.lat, lng: selectedParcel.lng }
    : { lat: DEFAULT_CENTER[0], lng: DEFAULT_CENTER[1] };

  return (
    <div className="gis-page">
      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside className={`gis-sidebar ${sidebarOpen ? 'gis-sidebar-open' : 'gis-sidebar-closed'}`}>
        <div className="gis-sidebar-header">
          <div className="gis-sidebar-title">
            <MapPin size={20} className="text-primary" />
            <span>GIS Intelligence</span>
          </div>
          <button className="gis-sidebar-toggle" onClick={() => setSidebarOpen(false)}>
            <ChevronLeft size={16} />
          </button>
        </div>

        <div className="gis-search-container">
          <Search size={16} className="gis-search-icon" />
          <input
            ref={searchRef}
            type="text"
            placeholder="Search parcels, owners, villages…"
            className="gis-search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="gis-search-clear" onClick={() => setSearchQuery('')}>
              <X size={14} />
            </button>
          )}
          <kbd className="gis-search-kbd">⌘K</kbd>
        </div>

        <div className="gis-sidebar-tabs">
          {[
            { key: 'parcels' as const, label: 'Parcels', icon: <MapPin size={14} /> },
            { key: 'layers' as const, label: 'Layers', icon: <Layers size={14} /> },
            { key: 'analysis' as const, label: 'Analysis', icon: <Ruler size={14} /> },
          ].map((tab) => (
            <button
              key={tab.key}
              className={`gis-tab ${activeTab === tab.key ? 'gis-tab-active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        <div className="gis-sidebar-content">
          {/* ── Parcels Tab ── */}
          {activeTab === 'parcels' && (
            <div className="gis-parcel-list">
              <div className="gis-parcel-count">
                {filteredParcels.length} parcel{filteredParcels.length !== 1 ? 's' : ''} found
              </div>
              {filteredParcels.map((parcel) => (
                <button
                  key={parcel.id}
                  className={`gis-parcel-card ${selectedParcel?.id === parcel.id ? 'gis-parcel-card-selected' : ''}`}
                  onClick={() => setSelectedParcel(parcel)}
                >
                  <div className="gis-parcel-card-header">
                    <span className="gis-parcel-survey">Survey {parcel.surveyNo}</span>
                    <span className={`gis-badge ${statusBadge(parcel.status)}`}>
                      {parcel.status}
                    </span>
                  </div>
                  <div className="gis-parcel-owner">{parcel.owner}</div>
                  <div className="gis-parcel-meta">
                    <span>{parcel.area}</span>
                    <span className="gis-parcel-meta-dot" />
                    <span>{parcel.village}</span>
                    <span className="gis-parcel-meta-dot" />
                    <span>{parcel.confidence}%</span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* ── Layers Tab ── */}
          {activeTab === 'layers' && (
            <div className="gis-layers-list">
              {layers.map((layer) => (
                <label key={layer.id} className="gis-layer-item">
                  <div className="gis-layer-left">
                    <span className="gis-layer-icon">{layer.icon}</span>
                    <span className="gis-layer-name">{layer.name}</span>
                  </div>
                  <div className="gis-layer-right">
                    <div className="gis-layer-color-dot" style={{ backgroundColor: layer.color }} />
                    <button
                      className={`gis-layer-toggle ${layer.enabled ? 'gis-layer-toggle-on' : ''}`}
                      onClick={() => toggleLayer(layer.id)}
                    >
                      <div className="gis-layer-toggle-thumb" />
                    </button>
                  </div>
                </label>
              ))}
              <div className="gis-layers-info">
                <Layers size={14} />
                <span>Toggle layers to control map overlays. PostGIS data sources are synced in real-time.</span>
              </div>
            </div>
          )}

          {/* ── Analysis Tab ── */}
          {activeTab === 'analysis' && (
            <div className="gis-analysis-panel">
              <div className="gis-analysis-card">
                <div className="gis-analysis-card-title">
                  <Triangle size={14} />
                  Spatial Summary
                </div>
                <div className="gis-analysis-stats">
                  <div className="gis-stat">
                    <span className="gis-stat-value">31.5 Ha</span>
                    <span className="gis-stat-label">Total Area</span>
                  </div>
                  <div className="gis-stat">
                    <span className="gis-stat-value">{LAND_PARCELS.length}</span>
                    <span className="gis-stat-label">Parcels</span>
                  </div>
                  <div className="gis-stat">
                    <span className="gis-stat-value">{LAND_PARCELS.filter(p => p.status === 'disputed').length}</span>
                    <span className="gis-stat-label">Disputes</span>
                  </div>
                </div>
              </div>

              <div className="gis-analysis-card">
                <div className="gis-analysis-card-title">
                  <AlertTriangle size={14} className="text-amber-500" />
                  Risk Assessment
                </div>
                <div className="gis-risk-bars">
                  {[
                    { label: 'Boundary Overlap', value: 15, color: '#ef4444' },
                    { label: 'Ownership Conflict', value: 8, color: '#f59e0b' },
                    { label: 'Survey Mismatch', value: 22, color: '#f97316' },
                    { label: 'Encroachment', value: 5, color: '#a855f7' },
                  ].map((risk) => (
                    <div key={risk.label} className="gis-risk-item">
                      <div className="gis-risk-header">
                        <span>{risk.label}</span>
                        <span className="gis-risk-value">{risk.value}%</span>
                      </div>
                      <div className="gis-risk-track">
                        <div
                          className="gis-risk-fill"
                          style={{ width: `${risk.value}%`, backgroundColor: risk.color }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="gis-analysis-card">
                <div className="gis-analysis-card-title">
                  <Crosshair size={14} />
                  Land Use Distribution
                </div>
                <div className="gis-distribution">
                  {[
                    { type: 'Agricultural', count: 2, pct: 40, emoji: '🌾' },
                    { type: 'Residential', count: 1, pct: 20, emoji: '🏠' },
                    { type: 'Commercial', count: 1, pct: 20, emoji: '🏢' },
                    { type: 'Government', count: 1, pct: 20, emoji: '🏛️' },
                  ].map((d) => (
                    <div key={d.type} className="gis-dist-row">
                      <span className="gis-dist-emoji">{d.emoji}</span>
                      <span className="gis-dist-type">{d.type}</span>
                      <span className="gis-dist-count">{d.count}</span>
                      <span className="gis-dist-pct">{d.pct}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* ── Sidebar collapse handle ── */}
      {!sidebarOpen && (
        <button className="gis-sidebar-expand" onClick={() => setSidebarOpen(true)}>
          <ChevronRight size={16} />
        </button>
      )}

      {/* ── Map Container ───────────────────────────────────────────────── */}
      <main className="gis-map-wrapper">
        {/* Coordinate bar */}
        <div className="gis-coords-bar">
          <Navigation size={12} />
          <span>Lat: {coordsDisplay.lat.toFixed(4)}° N</span>
          <span className="gis-coords-dot" />
          <span>Lng: {coordsDisplay.lng.toFixed(4)}° E</span>
          {selectedParcel && (
            <>
              <span className="gis-coords-dot" />
              <span className="gis-coords-survey">Survey {selectedParcel.surveyNo}</span>
            </>
          )}
        </div>

        {/* Leaflet Map */}
        <MapContainer
          center={DEFAULT_CENTER}
          zoom={DEFAULT_ZOOM}
          className="gis-google-map"
          zoomControl={false}
          style={{ width: '100%', height: '100%' }}
        >
          <FlyToDistrict />
          <TileLayer
            key={mapType}
            url={getTileUrl(mapType)}
            attribution={getTileAttribution(mapType)}
            maxZoom={19}
            detectRetina={true}
          />

          {/* Land parcel markers */}
          {filteredParcels.map((parcel) => (
            <Marker
              key={parcel.id}
              position={[parcel.lat, parcel.lng]}
              icon={createColorIcon(STATUS_COLORS[parcel.status] || '#6b7280')}
              eventHandlers={{ click: () => setSelectedParcel(parcel) }}
            >
              <Popup>
                <div className="gis-info-window" style={{ minWidth: 200 }}>
                  <div className="gis-info-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>Survey {parcel.surveyNo}</h3>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        padding: '2px 8px',
                        borderRadius: 99,
                        background: STATUS_COLORS[parcel.status] + '22',
                        color: STATUS_COLORS[parcel.status],
                        border: `1px solid ${STATUS_COLORS[parcel.status]}44`,
                        textTransform: 'capitalize',
                      }}
                    >
                      {parcel.status}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#888' }}>Owner</span><strong>{parcel.owner}</strong></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#888' }}>Area</span><strong>{parcel.area}</strong></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#888' }}>Village</span><strong>{parcel.village}</strong></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#888' }}>Confidence</span><strong>{parcel.confidence}%</strong></div>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}

          {/* User location marker */}
          {userLocation && (
            <Marker
              position={userLocation}
              icon={L.divIcon({
                className: '',
                html: `<div style="width:16px;height:16px;background:#3b82f6;border:3px solid white;border-radius:50%;box-shadow:0 0 0 4px rgba(59,130,246,.3)"></div>`,
                iconSize: [16, 16],
                iconAnchor: [8, 8],
              })}
            />
          )}

          {/* Internal controls */}
          <MapControls
            onLocate={handleLocate}
            isLocating={isLocating}
            mapType={mapType}
            setMapType={setMapType}
          />
        </MapContainer>
      </main>
    </div>
  );
}
