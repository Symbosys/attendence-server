import { z } from "zod";

export const createGeofenceSchema = z.object({
  name: z.string().min(1, "Geofence name is required"),
  latitude: z.number().min(-90).max(90, "Invalid latitude"),
  longitude: z.number().min(-180).max(180, "Invalid longitude"),
  radius: z.number().positive("Radius must be a positive number"),
});

export const updateGeofenceSchema = createGeofenceSchema.partial();

export const geofenceIdSchema = z.object({
  id: z.string().cuid("Invalid geofence ID"),
});
