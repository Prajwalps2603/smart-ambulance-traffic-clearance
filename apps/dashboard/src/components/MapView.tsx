import React, { useMemo } from "react";
import { MapContainer, TileLayer, Marker, Polyline, Popup } from "react-leaflet";
import L from "leaflet";

type Mission = {
  missionId: string;
  vehicleId: string;
  origin: { lat: number; lng: number };
  destination: { lat: number; lng: number };
  hospitalName: string;
  startedAt: number;
  status: "ACTIVE" | "COMPLETED" | "CANCELLED";
  lastLocation?: { lat: number; lng: number; speedKph?: number; timestamp: number };
};

const ambulanceIcon = new L.Icon({
  iconUrl: "https://cdn.jsdelivr.net/gh/pointhi/leaflet-color-markers@master/img/marker-icon-red.png",
  iconRetinaUrl: "https://cdn.jsdelivr.net/gh/pointhi/leaflet-color-markers@master/img/marker-icon-2x-red.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

export default function MapView({ mission }: { mission: Mission | null }) {
  const center = useMemo(() => {
    if (!mission) return { lat: 12.9716, lng: 77.5946 };
    return mission.lastLocation ?? mission.origin;
  }, [mission]);

  const path = useMemo(() => {
    if (!mission) return [];
    const pts = [];
    pts.push([mission.origin.lat, mission.origin.lng] as [number, number]);
    if (mission.lastLocation) pts.push([mission.lastLocation.lat, mission.lastLocation.lng] as [number, number]);
    pts.push([mission.destination.lat, mission.destination.lng] as [number, number]);
    return pts;
  }, [mission]);

  return (
    <MapContainer center={[center.lat, center.lng]} zoom={13} style={{height:"100%"}}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {mission && (
        <>
          <Marker position={[mission.origin.lat, mission.origin.lng]}>
            <Popup>Origin</Popup>
          </Marker>
          <Marker position={[mission.destination.lat, mission.destination.lng]}>
            <Popup>Hospital: {mission.hospitalName}</Popup>
          </Marker>
          {mission.lastLocation && (
            <Marker position={[mission.lastLocation.lat, mission.lastLocation.lng]} icon={ambulanceIcon}>
              <Popup>Ambulance {mission.vehicleId}<br/>Speed: {Math.round((mission.lastLocation.speedKph ?? 0))} km/h</Popup>
            </Marker>
          )}
          <Polyline positions={path} color="red" />
        </>
      )}
    </MapContainer>
  );
}