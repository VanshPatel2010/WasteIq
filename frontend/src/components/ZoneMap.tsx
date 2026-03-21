"use client";
import { MapContainer, TileLayer, CircleMarker, Popup, Marker, Polyline } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

interface Zone { id: number; name: string; lat: number; lng: number; current_fill_level: number; fill_level_source: string; ml_trust_score: number; zone_type: string; }
interface Truck { id: number; vehicle_number: string; current_lat?: number; current_lng?: number; status: string; driver_name?: string; }
interface Route { id: number; truck_id: number; status: string; zone_sequence: any[]; }

const getFillColor = (level: number) => {
  if (level >= 75) return "#B91C1C"; // Red max
  if (level >= 40) return "#D97706"; // Amber mid
  return "#15803D"; // Green min
};

const getSourceIcon = (source: string) => {
  switch (source) {
    case "worker_reported": return "👷";
    case "driver_reported": return "🚛";
    default: return "🤖";
  }
};

const TRUCK_COLORS = [
  "#3B82F6", "#8B5CF6", "#EC4899", "#F59E0B", "#10B981", 
  "#06B6D4", "#6366F1", "#D946EF", "#F43F5E", "#84CC16",
  "#14B8A6", "#8B5CF6", "#F97316", "#0EA5E9", "#A855F7"
];

const truckIcon = new L.DivIcon({ html: '<div style="font-size:24px;text-align:center">🚛</div>', className: "", iconSize: [30, 30], iconAnchor: [15, 15] });

export default function ZoneMap({ zones = [], trucks = [], routes = [] }: { zones: Zone[]; trucks: Truck[]; routes?: Route[] }) {
  if (zones.length === 0) return <div className="h-[400px] flex items-center justify-center text-[#5F5E5A]">Loading map...</div>;

  const center: [number, number] = [zones[0]?.lat || 21.17, zones[0]?.lng || 72.83];

  return (
    <MapContainer center={center} zoom={12} style={{ height: 400, width: "100%", borderRadius: 12 }} scrollWheelZoom={true}>
      <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>' />
      
      {/* Route Lines */}
      {routes?.filter(r => r.status !== 'completed').map((route, i) => {
        const truck = trucks.find(t => t.id === route.truck_id);
        const color = TRUCK_COLORS[route.truck_id % TRUCK_COLORS.length];
        
        // Connect truck's current location to the first zone if possible, then connect the zones
        const startPoint = truck?.current_lat && truck?.current_lng ? [[truck.current_lat, truck.current_lng] as [number, number]] : [];
        const zonePoints = (route.zone_sequence || []).map((s: any) => [s.lat, s.lng] as [number, number]);
        const allPoints = [...startPoint, ...zonePoints];

        if (allPoints.length < 2) return null;

        return (
          <Polyline 
            key={`route-${route.id}`} 
            positions={allPoints} 
            pathOptions={{ color, weight: 3, opacity: 0.8, dashArray: "5, 10" }} 
          />
        );
      })}

      {/* Zone Markers */}
      {zones.map((z) => (
        <CircleMarker key={z.id} center={[z.lat, z.lng]} radius={Math.max(12, z.current_fill_level / 4)} pathOptions={{ color: getFillColor(z.current_fill_level), fillColor: getFillColor(z.current_fill_level), fillOpacity: 0.6, weight: 2 }}>
          <Popup className="zone-popup">
            <div className="min-w-[200px] text-[#1F2937]">
              <h4 className="font-bold text-base mb-2 pb-1 border-b border-gray-200">{z.name}</h4>
              <div className="space-y-2 text-sm mt-2">
                <div className="flex justify-between items-center"><span className="text-[#6B7280] font-medium tracking-wide">Fill Level</span><span className="font-bold text-lg" style={{ color: getFillColor(z.current_fill_level) }}>{Math.round(z.current_fill_level)}%</span></div>
                <div className="flex justify-between items-center"><span className="text-[#6B7280] font-medium tracking-wide">Source</span><span className="bg-gray-100 px-2 py-0.5 rounded-md text-xs font-semibold">{getSourceIcon(z.fill_level_source)} {z.fill_level_source.replace("_", " ")}</span></div>
                <div className="flex justify-between items-center"><span className="text-[#6B7280] font-medium tracking-wide">Zone Type</span><span className="capitalize font-semibold text-gray-700">{z.zone_type}</span></div>
                <div className="flex justify-between items-center pt-1"><span className="text-[#6B7280] font-medium tracking-wide">ML Trust</span>
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden border border-gray-300 shadow-inner"><div className="h-full bg-gradient-to-r" style={{ width: `${z.ml_trust_score * 100}%`, background: z.ml_trust_score >= 0.8 ? "#15803D" : z.ml_trust_score >= 0.5 ? "#D97706" : "#B91C1C" }} /></div>
                    <span className="text-xs font-bold text-gray-600">{Math.round(z.ml_trust_score * 100)}%</span>
                  </div>
                </div>
              </div>
            </div>
          </Popup>
        </CircleMarker>
      ))}

      {/* Truck Markers */}
      {trucks.filter(t => t.current_lat && t.current_lng && t.status !== "off_duty").map((t) => {
        const truckColor = TRUCK_COLORS[t.id % TRUCK_COLORS.length];
        const iconHtml = `<div style="font-size:24px;text-align:center;background:${truckColor};border-radius:50%;width:30px;height:30px;display:flex;align-items:center;justify-content:center;box-shadow:0 0 10px ${truckColor}">🚛</div>`;
        const customIcon = new L.DivIcon({ html: iconHtml, className: "", iconSize: [30, 30], iconAnchor: [15, 15] });

        return (
          <Marker key={t.id} position={[t.current_lat!, t.current_lng!]} icon={customIcon}>
            <Popup><b>{t.vehicle_number}</b><br/>{t.driver_name}<br/>Status: {t.status}</Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
