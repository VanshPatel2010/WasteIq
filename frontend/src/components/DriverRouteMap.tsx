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
      <div className="h-[250px] flex items-center justify-center text-[#5F5E5A] text-sm">
        No route data available
      </div>
    );

  const center: [number, number] = [validStops[0].lat!, validStops[0].lng!];
  const polylinePoints: [number, number][] = validStops.map((s) => [s.lat!, s.lng!]);

  return (
    <MapContainer
      center={center}
      zoom={13}
      style={{ height: 250, width: "100%", borderRadius: 12 }}
      scrollWheelZoom={true}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
      />
      {/* Route polyline */}
      <Polyline
        positions={polylinePoints}
        pathOptions={{ color: "#534AB7", weight: 3, opacity: 0.7, dashArray: "8 4" }}
      />
      {/* Zone stops */}
      {validStops.map((s) => (
        <CircleMarker
          key={s.zone_id}
          center={[s.lat!, s.lng!]}
          radius={14}
          pathOptions={{
            color: s.completed ? "#14A37F" : "#534AB7",
            fillColor: s.completed ? "#14A37F" : "#534AB7",
            fillOpacity: 0.7,
            weight: 2,
          }}
        >
          <Popup>
            <div style={{ minWidth: 140 }}>
              <b>
                #{s.order} — {s.zone_name}
              </b>
              <br />
              Fill: {Math.round(s.fill_level || 0)}%
              <br />
              {s.completed ? "✅ Completed" : "⏳ Pending"}
            </div>
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
