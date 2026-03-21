"use client";
import { MapContainer, TileLayer, CircleMarker, Popup, Polyline } from "react-leaflet";
import "leaflet/dist/leaflet.css";

interface RouteStop {
  zone_id: number;
  zone_name: string;
  order: number;
  completed: boolean;
  fill_level: number;
  lat?: number;
  lng?: number;
}

export default function DriverRouteMap({ stops = [] }: { stops: RouteStop[] }) {
  const validStops = stops.filter((s) => s.lat && s.lng);
  if (validStops.length === 0)
    return (
      <div className="h-[250px] flex items-center justify-center text-[#9CA3AF] bg-[#F5F5F0] text-sm font-medium border border-[#D6D3C8] rounded-xl border-dashed">
        No route data available
      </div>
    );

  const center: [number, number] = [validStops[0].lat!, validStops[0].lng!];
  const polylinePoints: [number, number][] = validStops.map((s) => [s.lat!, s.lng!]);

  return (
    <MapContainer
      center={center}
      zoom={13}
      style={{ height: 250, width: "100%", borderRadius: 12, zIndex: 0 }}
      scrollWheelZoom={true}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
      />
      {/* Route polyline */}
      <Polyline
        positions={polylinePoints}
        pathOptions={{ color: "#1B7A4A", weight: 3, opacity: 0.8, dashArray: "8 4" }}
      />
      {/* Zone stops */}
      {validStops.map((s) => (
        <CircleMarker
          key={s.zone_id}
          center={[s.lat!, s.lng!]}
          radius={15}
          pathOptions={{
            color: "white", // White border around marker
            fillColor: s.completed ? "#15803D" : "#1B7A4A",
            fillOpacity: 0.8,
            weight: 3,
          }}
        >
          <Popup>
            <div style={{ minWidth: 140 }} className="text-[#1F2937]">
              <b className="text-base text-[#1B7A4A]">
                #{s.order} — {s.zone_name}
              </b>
              <div className="my-1.5 h-px bg-gray-200"></div>
              <p className="text-sm font-medium text-gray-700">Fill: <strong className="text-gray-900">{Math.round(s.fill_level || 0)}%</strong></p>
              <p className="text-xs font-bold mt-1">
                {s.completed ? <span className="text-green-700 bg-green-100 px-2 py-1 rounded">✅ Completed</span> : <span className="text-amber-700 bg-amber-100 px-2 py-1 rounded">⏳ Pending</span>}
              </p>
            </div>
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
