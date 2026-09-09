import { z } from "zod";
import { isInsideParkBounds } from "./park";

const optionalText = z.string().min(1).nullable();
const measurement = z.number().finite().positive().nullable();
const optionalDate = z.string().datetime({ offset: true }).nullable();

export const treeFeatureSchema = z.object({
  type: z.literal("Feature"),
  id: z.string().min(1),
  geometry: z.object({
    type: z.literal("Point"),
    coordinates: z.tuple([z.number().finite(), z.number().finite()])
      .refine(([lon, lat]) => isInsideParkBounds(lon, lat), "Arbre hors de l’emprise du parc"),
  }),
  properties: z.object({
    source_id: z.number().int().nonnegative(), id_gestion: optionalText,
    nom: z.string().min(1), nom_scientifique: optionalText, espece: optionalText,
    hauteur_m: measurement, circonference_cm: measurement, remarquable: z.boolean().nullable(),
    description: optionalText, photo_url: z.string().url().nullable(), model_3d_url: z.string().url().nullable(),
    date_plantation: optionalDate, date_maj: optionalDate,
    localisation: z.string().min(1), type_taille: optionalText, fonction: optionalText,
    // Valeurs originales conservées pour rendre la normalisation vérifiable.
    source_properties: z.record(z.unknown()),
  }),
});

export const treeCollectionSchema = z.object({
  type: z.literal("FeatureCollection"),
  bbox: z.tuple([z.number(), z.number(), z.number(), z.number()]),
  metadata: z.object({
    schema_version: z.literal(1), publisher: z.literal("Rennes Métropole"), dataset: z.literal("arbre"),
    source_url: z.string().url(), license: z.string().min(1), license_url: z.string().url(),
    imported_at: z.string().datetime(), source_processed_at: optionalDate,
    selection: z.string().min(1), query_url: z.string().url(),
    bbox_records: z.number().int().nonnegative(), excluded_other_locations: z.number().int().nonnegative(),
    excluded_felled: z.number().int().nonnegative(), imported_records: z.number().int().positive(),
  }),
  features: z.array(treeFeatureSchema).min(1),
}).superRefine((collection, ctx) => {
  if (new Set(collection.features.map((feature) => feature.id)).size !== collection.features.length) {
    ctx.addIssue({ code: "custom", message: "Identifiants d’arbres dupliqués" });
  }
  if (collection.metadata.imported_records !== collection.features.length) {
    ctx.addIssue({ code: "custom", message: "Nombre d’arbres incohérent" });
  }
});

export type TreeFeature = z.infer<typeof treeFeatureSchema>;
export type TreeCollection = z.infer<typeof treeCollectionSchema>;
