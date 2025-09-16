import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { StartMissionSchema, LocationUpdateSchema, Mission } from "../types.js";
import { naiveEta, directionsEta } from "../services/geo.js";
import { publish } from "../mqtt.js";
import { emitMissionUpdate } from "../socket.js";

const router = Router();

const missions = new Map<string, Mission>();

router.get("/", (_req, res) => {
  res.json({ missions: Array.from(missions.values()) });
});

router.post("/start", async (req, res) => {
  const parsed = StartMissionSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.format() });
  const { vehicleId, origin, destination, hospitalName } = parsed.data;

  const missionId = uuidv4();
  const mission: Mission = {
    missionId,
    vehicleId,
    origin,
    destination,
    hospitalName,
    startedAt: Math.floor(Date.now() / 1000),
    status: "ACTIVE",
  };

  missions.set(vehicleId, mission);

  const eta = await directionsEta(origin, destination);

  publish("alerts/all", {
    type: "AMBULANCE_ALERT",
    missionId,
    etaSeconds: eta.etaSeconds,
    distanceMeters: eta.distanceMeters,
    direction: "STRAIGHT",
    message: "Ambulance approaching, clear one lane",
    timestamp: Math.floor(Date.now() / 1000),
  });

  publish("traffic/all/command", {
    type: "SET_PHASE",
    missionId,
    phase: "AMBULANCE_PREEMPTION",
    durationSeconds: Math.min(eta.etaSeconds, 120),
    timestamp: Math.floor(Date.now() / 1000),
  });

  emitMissionUpdate("mission_started", mission);

  res.json({ missionId, eta });
});

router.post("/:vehicleId/location", (req, res) => {
  const { vehicleId } = req.params;
  const m = missions.get(vehicleId);
  if (!m) return res.status(404).json({ error: "Mission not found for vehicle" });

  const parsed = LocationUpdateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.format() });
  const { lat, lng, speedKph } = parsed.data;

  m.lastLocation = { lat, lng, speedKph, timestamp: Math.floor(Date.now() / 1000) };
  emitMissionUpdate("mission_location", m);

  const eta = naiveEta({ lat, lng }, m.destination, speedKph ?? 30);

  publish("alerts/all", {
    type: "AMBULANCE_ALERT",
    missionId: m.missionId,
    etaSeconds: eta.etaSeconds,
    distanceMeters: eta.distanceMeters,
    direction: "STRAIGHT",
    message: "Ambulance approaching, clear one lane",
    timestamp: Math.floor(Date.now() / 1000),
  });

  res.json({ ok: true, eta });
});

router.post("/:vehicleId/complete", (req, res) => {
  const { vehicleId } = req.params;
  const m = missions.get(vehicleId);
  if (!m) return res.status(404).json({ error: "Mission not found for vehicle" });
  m.status = "COMPLETED";
  emitMissionUpdate("mission_completed", m);

  publish("traffic/all/command", {
    type: "SET_PHASE",
    missionId: m.missionId,
    phase: "NORMAL_OPERATION",
    durationSeconds: 0,
    timestamp: Math.floor(Date.now() / 1000),
  });

  publish("alerts/all", {
    type: "CLEAR",
    missionId: m.missionId,
    message: "Ambulance has passed, resume normal traffic",
    timestamp: Math.floor(Date.now() / 1000),
  });

  res.json({ ok: true });
});

export default router;