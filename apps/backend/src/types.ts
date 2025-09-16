import { z } from "zod";

export const LatLngSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export const StartMissionSchema = z.object({
  vehicleId: z.string().min(1),
  origin: LatLngSchema,
  destination: LatLngSchema,
  hospitalName: z.string().min(1),
});

export type StartMissionInput = z.infer<typeof StartMissionSchema>;

export const LocationUpdateSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  speedKph: z.number().min(0).max(200).optional(),
});

export type LocationUpdateInput = z.infer<typeof LocationUpdateSchema>;

export type Mission = {
  missionId: string;
  vehicleId: string;
  origin: { lat: number; lng: number };
  destination: { lat: number; lng: number };
  hospitalName: string;
  startedAt: number; // epoch seconds
  status: "ACTIVE" | "COMPLETED" | "CANCELLED";
  lastLocation?: { lat: number; lng: number; speedKph?: number; timestamp: number };
};