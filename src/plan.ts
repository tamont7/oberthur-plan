import { z } from "zod";

const position = z.tuple([z.number().finite(), z.number().finite()]);
const lineString = z.object({ type: z.literal("LineString"), coordinates: z.array(position).min(2) });
const polygon = z.object({ type: z.literal("Polygon"), coordinates: z.array(z.array(position).min(4)).min(1) });
const multiPolygon = z.object({ type: z.literal("MultiPolygon"), coordinates: z.array(z.array(z.array(position).min(4)).min(1)).min(1) });
const photo = z.object({
  url: z.string().url(), page_url: z.string().url(), author: z.string().min(1),
  license: z.literal("CC BY-SA 3.0"), license_url: z.string().url(),
});

const planFeatureSchema = z.union([
  z.object({ type: z.literal("Feature"), id: z.string().min(1), geometry: multiPolygon, properties: z.object({ kind: z.literal("boundary"), source: z.literal("Rennes Métropole"), source_id: z.string().min(1) }) }),
  z.object({ type: z.literal("Feature"), id: z.string().min(1), geometry: polygon, properties: z.object({ kind: z.literal("water"), source: z.literal("OpenStreetMap"), source_id: z.string().min(1) }) }),
  z.object({ type: z.literal("Feature"), id: z.string().min(1), geometry: lineString, properties: z.object({ kind: z.literal("path"), source: z.literal("OpenStreetMap"), source_id: z.string().min(1) }) }),
  z.object({ type: z.literal("Feature"), id: z.literal("rennes-hotel-oberthur"), geometry: polygon, properties: z.object({ kind: z.literal("building"), source: z.literal("Rennes Métropole"), source_id: z.string().min(1), label: z.literal("Hôtel Oberthür"), height_m: z.number().positive(), photo }) }),
  z.object({ type: z.literal("Feature"), id: z.literal("osm-kiosque-oberthur"), geometry: polygon, properties: z.object({ kind: z.literal("landmark"), source: z.literal("OpenStreetMap"), source_id: z.string().min(1), label: z.literal("Kiosque"), height_m: z.number().positive(), photo }) }),
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
type PlanPolygon = PlanPosition[][];
type PlanMultiPolygon = PlanPolygon[];
export type PlanPhoto = { url: string; page_url: string; author: string; license: "CC BY-SA 3.0"; license_url: string };

export type ParkPlanFeature =
  | { type: "Feature"; id: string; geometry: { type: "MultiPolygon"; coordinates: PlanMultiPolygon }; properties: { kind: "boundary"; source: "Rennes Métropole"; source_id: string } }
  | { type: "Feature"; id: string; geometry: { type: "Polygon"; coordinates: PlanPolygon }; properties: { kind: "water"; source: "OpenStreetMap"; source_id: string } }
  | { type: "Feature"; id: string; geometry: { type: "LineString"; coordinates: PlanPosition[] }; properties: { kind: "path"; source: "OpenStreetMap"; source_id: string } }
  | { type: "Feature"; id: "rennes-hotel-oberthur"; geometry: { type: "Polygon"; coordinates: PlanPolygon }; properties: { kind: "building"; source: "Rennes Métropole"; source_id: string; label: "Hôtel Oberthür"; height_m: number; photo: PlanPhoto } }
  | { type: "Feature"; id: "osm-kiosque-oberthur"; geometry: { type: "Polygon"; coordinates: PlanPolygon }; properties: { kind: "landmark"; source: "OpenStreetMap"; source_id: string; label: "Kiosque"; height_m: number; photo: PlanPhoto } };

export type ParkLandmark = Extract<ParkPlanFeature, { properties: { kind: "building" | "landmark" } }>;

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
