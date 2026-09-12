import { z } from "zod";

const position = z.tuple([z.number().finite(), z.number().finite()]);
const entrance = z.object({
  type: z.literal("Feature"), id: z.string().min(1),
  geometry: z.object({ type: z.literal("Point"), coordinates: position }),
  properties: z.object({ kind: z.literal("entrance"), label: z.string().min(1), source: z.literal("OpenStreetMap"), source_id: z.string().min(1) }),
});
const lineString = z.object({ type: z.literal("LineString"), coordinates: z.array(position).min(2) });
const polygon = z.object({ type: z.literal("Polygon"), coordinates: z.array(z.array(position).min(4)).min(1) });
const multiPolygon = z.object({ type: z.literal("MultiPolygon"), coordinates: z.array(z.array(z.array(position).min(4)).min(1)).min(1) });
const photo = z.object({
  url: z.string().url(), page_url: z.string().url(), author: z.string().min(1),
  license: z.string().min(1), license_url: z.string().url(),
});

const landmark = z.object({
  type: z.literal("Feature"), id: z.string().min(1), geometry: polygon,
  properties: z.object({
    kind: z.union([z.literal("building"), z.literal("landmark")]),
    source: z.union([z.literal("Rennes Métropole"), z.literal("OpenStreetMap")]),
    source_id: z.string().min(1), label: z.string().min(1), height_m: z.number().positive(), photo,
  }),
});

const planFeatureSchema = z.union([
  entrance,
  z.object({ type: z.literal("Feature"), id: z.string().min(1), geometry: multiPolygon, properties: z.object({ kind: z.literal("boundary"), source: z.literal("Rennes Métropole"), source_id: z.string().min(1) }) }),
  z.object({ type: z.literal("Feature"), id: z.string().min(1), geometry: polygon, properties: z.object({ kind: z.literal("water"), source: z.literal("OpenStreetMap"), source_id: z.string().min(1) }) }),
  z.object({ type: z.literal("Feature"), id: z.string().min(1), geometry: lineString, properties: z.object({ kind: z.literal("path"), source: z.literal("OpenStreetMap"), source_id: z.string().min(1) }) }),
  landmark,
]);

const parkPlanSchema = z.object({
  type: z.literal("FeatureCollection"),
  bbox: z.tuple([z.number(), z.number(), z.number(), z.number()]),
  metadata: z.object({
    schema_version: z.literal(1), imported_at: z.string().datetime(),
    rennes_metropole: z.object({ source_url: z.string().url(), license: z.literal("Licence ODbL 1.0"), license_url: z.string().url() }),
    buildings: z.object({ source_url: z.string().url(), license: z.literal("Licence ODbL 1.0"), license_url: z.string().url() }).optional(),
    openstreetmap: z.object({ source_url: z.string().url(), license: z.literal("ODbL 1.0"), license_url: z.string().url() }),
  }),
  features: z.array(planFeatureSchema).min(3),
}).superRefine((plan, ctx) => {
  if (plan.features.filter((feature) => feature.properties.kind === "boundary").length !== 1) {
    ctx.addIssue({ code: "custom", message: "Le plan doit avoir une seule emprise officielle" });
  }
  if (!plan.features.some((feature) => feature.properties.kind === "water")) {
    ctx.addIssue({ code: "custom", message: "Le plan doit contenir le plan d’eau" });
  }
  if (!plan.features.some((feature) => feature.properties.kind === "path")) {
    ctx.addIssue({ code: "custom", message: "Le plan doit contenir des allées" });
  }
});

export type PlanPosition = [number, number];
export type ParkEntrance = z.infer<typeof entrance>;
type PlanPolygon = PlanPosition[][];
type PlanMultiPolygon = PlanPolygon[];
export type PlanPhoto = { url: string; page_url: string; author: string; license: string; license_url: string };

export type ParkLandmark = {
  type: "Feature";
  id: string;
  geometry: { type: "Polygon"; coordinates: PlanPolygon };
  properties: {
    kind: "building" | "landmark";
    source: "Rennes Métropole" | "OpenStreetMap";
    source_id: string;
    label: string;
    height_m: number;
    photo: PlanPhoto;
  };
};

export type ParkPlanFeature =
  | ParkEntrance
  | { type: "Feature"; id: string; geometry: { type: "MultiPolygon"; coordinates: PlanMultiPolygon }; properties: { kind: "boundary"; source: "Rennes Métropole"; source_id: string } }
  | { type: "Feature"; id: string; geometry: { type: "Polygon"; coordinates: PlanPolygon }; properties: { kind: "water"; source: "OpenStreetMap"; source_id: string } }
  | { type: "Feature"; id: string; geometry: { type: "LineString"; coordinates: PlanPosition[] }; properties: { kind: "path"; source: "OpenStreetMap"; source_id: string } }
  | ParkLandmark;

export type ParkPlan = {
  type: "FeatureCollection";
  bbox: [number, number, number, number];
  metadata: {
    schema_version: 1;
    imported_at: string;
    rennes_metropole: { source_url: string; license: "Licence ODbL 1.0"; license_url: string };
    buildings?: { source_url: string; license: "Licence ODbL 1.0"; license_url: string };
    openstreetmap: { source_url: string; license: "ODbL 1.0"; license_url: string };
  };
  features: ParkPlanFeature[];
};

export function parseParkPlan(value: unknown): ParkPlan {
  return parkPlanSchema.parse(value) as ParkPlan;
}

export function isParkLandmark(feature: ParkPlanFeature): feature is ParkLandmark {
  return feature.properties.kind === "building" || feature.properties.kind === "landmark";
}

export function isParkEntrance(feature: ParkPlanFeature): feature is ParkEntrance {
  return feature.properties.kind === "entrance";
}

function pointOnSegment([longitude, latitude]: PlanPosition, [fromLongitude, fromLatitude]: PlanPosition, [toLongitude, toLatitude]: PlanPosition) {
  const cross = (longitude - fromLongitude) * (toLatitude - fromLatitude) - (latitude - fromLatitude) * (toLongitude - fromLongitude);
  if (Math.abs(cross) > 1e-11) return false;
  return longitude >= Math.min(fromLongitude, toLongitude) && longitude <= Math.max(fromLongitude, toLongitude)
    && latitude >= Math.min(fromLatitude, toLatitude) && latitude <= Math.max(fromLatitude, toLatitude);
}

function pointInRing(point: PlanPosition, ring: PlanPosition[]) {
  let inside = false;
  for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index++) {
    const current = ring[index];
    const before = ring[previous];
    if (pointOnSegment(point, before, current)) return true;
    const [longitude, latitude] = point;
    const [x, y] = current;
    const [previousX, previousY] = before;
    if ((y > latitude) !== (previousY > latitude) && longitude < (previousX - x) * (latitude - y) / (previousY - y) + x) inside = !inside;
  }
  return inside;
}

/** True lorsque le point GPS est dans l’emprise officielle, hors de ses trous. */
export function isPointInParkGeometry(boundary: PlanMultiPolygon, point: PlanPosition) {
  return boundary.some(([outer, ...holes]) => pointInRing(point, outer) && !holes.some((hole) => pointInRing(point, hole)));
}

export function isPointInPark(plan: ParkPlan, point: PlanPosition) {
  const boundary = plan.features.find((feature) => feature.properties.kind === "boundary");
  return Boolean(boundary && boundary.geometry.type === "MultiPolygon" && isPointInParkGeometry(boundary.geometry.coordinates, point));
}
