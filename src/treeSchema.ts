import { z } from "zod";

import { isInsideParkBounds } from "./park";

export type ParkContainsPoint = (longitude: number, latitude: number) => boolean;

const optionalText = z.string().min(1).nullable();
const measurement = z.number().finite().positive().nullable();
const optionalDate = z.string().datetime({ offset: true }).nullable();

export function createTreeFeatureSchema(containsPoint: ParkContainsPoint) {
  return z.object({
  type: z.literal("Feature"),

  id: z.string().min(1),

  geometry: z.object({
    type: z.literal("Point"),

    coordinates: z
      .tuple([
        z.number().finite(),
        z.number().finite(),
      ])
      .refine(
        ([lon, lat]) =>
          containsPoint(lon, lat),

        "Arbre hors de l’emprise du parc",
      ),
  }),

  properties: z.object({
    source_id: z
      .number()
      .int()
      .nonnegative(),

    id_gestion: optionalText,

    nom: z.string().min(1),

    nom_source: optionalText,

    nom_scientifique: optionalText,

    espece: optionalText,

    /*
     * Mesures physiques normalisées.
     */
    hauteur_m: measurement,

    circonference_cm: measurement,

    /*
     * Diamètre du houppier.
     */
    houppier_m: measurement,

    /*
     * Hauteur à laquelle commence le feuillage.
     */
    hauteur_1_ere_feuille_m: measurement,

    remarquable:
      z.boolean().nullable(),

    description: optionalText,

    photo_url:
      z.string().url().nullable(),

    model_3d_url:
      z.string().url().nullable(),

    date_plantation:
      optionalDate,

    date_maj:
      optionalDate,

    localisation:
      optionalText,

    type_taille:
      optionalText,

    fonction:
      optionalText,

    /*
     * Valeurs originales conservées
     * pour rendre la normalisation vérifiable.
     */
    source_properties:
      z.record(z.unknown()),
  }),
  });
}

export const treeFeatureSchema = createTreeFeatureSchema(isInsideParkBounds);

export function createTreeCollectionSchema(containsPoint: ParkContainsPoint) {
  const featureSchema = createTreeFeatureSchema(containsPoint);
  return z
    .object({
      type:
        z.literal(
          "FeatureCollection",
        ),

      bbox: z.tuple([
        z.number(),
        z.number(),
        z.number(),
        z.number(),
      ]),

      metadata: z.object({
        schema_version:
          z.literal(1),

        publisher:
          z.literal(
            "Rennes Métropole",
          ),

        dataset:
          z.literal("arbre"),

        source_url:
          z.string().url(),

        license:
          z.string().min(1),

        license_url:
          z.string().url(),

        imported_at:
          z.string().datetime(),

        source_processed_at:
          optionalDate,

        selection:
          z.string().min(1),

        query_url:
          z.string().url(),

        bbox_records:
          z
            .number()
            .int()
            .nonnegative(),

        excluded_felled:
          z
            .number()
            .int()
            .nonnegative(),

        excluded_outside_park:
          z
            .number()
            .int()
            .nonnegative()
            .optional(),

        boundary_source_url:
          z.string().url().optional(),

        boundary_source_id:
          z.string().min(1).optional(),

        imported_records:
          z
            .number()
            .int()
            .positive(),
      }),

      features:
        z
          .array(
            featureSchema,
          )
          .min(1),
    })
    .superRefine(
      (
        collection,
        ctx,
      ) => {
        if (
          new Set(
            collection.features.map(
              (feature) =>
                feature.id,
            ),
          ).size !==
          collection.features.length
        ) {
          ctx.addIssue({
            code:
              "custom",

            message:
              "Identifiants d’arbres dupliqués",
          });
        }

        if (
          collection.metadata
            .imported_records !==
          collection.features.length
        ) {
          ctx.addIssue({
            code:
              "custom",

            message:
              "Nombre d’arbres incohérent",
          });
        }
      },
    );
}

export const treeCollectionSchema = createTreeCollectionSchema(isInsideParkBounds);

export type TreeFeature =
  z.infer<
    typeof treeFeatureSchema
  >;

export type TreeCollection =
  z.infer<
    typeof treeCollectionSchema
  >;
