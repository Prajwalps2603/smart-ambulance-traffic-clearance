import React, { useEffect, useMemo, useState } from "react";
import { io, Socket } from "socket.io-client";
import MapView from "./components/MapView";

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

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

export default function App() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    const s = io(API_BASE_URL, { transports: ["websocket"] });
    setSocket(s);
    s.on("mission_started", (m: Mission) => setMissions((prev) => upsert(prev, m)));
    s.on("mission_location", (m: Mission) => setMissions((prev) => upsert(prev, m)));
    s.on("mission_completed", (m: Mission) => setMissions((prev) => upsert(prev, m)));
    return () => { s.disconnect(); };
  }, []);

  useEffect(() => {
    // initial fetch
    fetch(`${API_BASE_URL}/api/v1/missions`).then(r => r.json()).then(d => setMissions(d.missions ?? []));
  }, []);

  const selectedMission = useMemo(() => missions.find(m => m.missionId === selected) ?? missions[0], [missions, selected]);

  return (
    <div className="container">
      <div className="sidebar">
        <h2>Control Center</h2>
        <p>API: {API_BASE_URL}</p>
        <h3>Missions</h3>
        {missions.length === 0 && <p>No missions yet. Start one from the mobile app or POST /missions/start.</p>}
        <ul>
          {missions.map(m => (
            <li key={m.missionId} style={{marginBottom:8, cursor:"pointer"}} onClick={() => setSelected(m.missionId)}>
              <strong>{m.vehicleId}</strong> → {m.hospitalName}
              <span className={`badge ${m.status === "ACTIVE" ? "status-active" : "status-completed"}`}>
                {m.status}
              </span>
              <div style={{fontSize:12, color:"#666"}}>Started: {new Date(m.startedAt*1000).toLocaleString()}</div>
            </li>
          ))}
        </ul>
      </div>
      <div className="content">
        <MapView mission={selectedMission ?? null} />
      </div>
    </div>
  );
}

function upsert(arr: Mission[], item: Mission) {
  const i = arr.findIndex(x => x.missionId === item.missionId);
  if (i >= 0) {
    const copy = arr.slice();
    copy[i] = item;
    return copy;
  }
  return [item, ...arr];
}