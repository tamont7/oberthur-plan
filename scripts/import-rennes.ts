import {
  mkdir,
  writeFile,
  rename,
  unlink,
} from "node:fs/promises";

import {
  fileURLToPath,
  pathToFileURL,
} from "node:url";

import { z } from "zod";

import {
  API_URL,
  PARK_BOUNDS,
  SOURCE_URL,
  isInsideParkBounds,
} from "../src/park";

import {
  preferredCommonName,
} from "../src/botanicalNames";

import {
  createTreeFeatureSchema,
  treeCollectionSchema,
  treeFeatureSchema,
} from "../src/treeSchema";

/* -------------------------------------------------------------------------- */
/*                            SCHÉMA SOURCE RENNES                            */
/* -------------------------------------------------------------------------- */

const recordSchema =
  z
    .object({
      id:
        z
          .number()
          .int()
          .nonnegative(),

      geo_shape:
        z.object({
          geometry:
            z.object({
              type:
                z.literal(
                  "Point",
                ),

              coordinates:
                z.tuple([
                  z.number(),
                  z.number(),
                ]),
            }),
        }),

      localisation:
        z.string().nullable(),

      abattu:
        z.union([
          z.literal(0),
          z.literal(1),
          z.null(),
        ]),

      nom_commun:
        z.string().nullable(),

      genre:
        z.string().nullable(),

      espece:
        z.string().nullable(),

      variete:
        z.string().nullable(),

      /*
       * Mesures fournies par Rennes.
       */
      hauteur:
        z.number().nullable(),

      circonference:
        z.number().nullable(),

      houppier:
        z.number().nullable(),

      hauteur_1_ere_feuille:
        z.number().nullable(),

      date_plantation:
        z
          .string()
          .datetime({
            offset:
              true,
          })
          .nullable(),

      date_maj:
        z
          .string()
          .datetime({
            offset:
              true,
          })
          .nullable(),

      id_gestion:
        z.string().nullable(),

      complement:
        z.string().nullable(),

      type_taille:
        z.string().nullable(),

      fonction:
        z.string().nullable(),
    })
    .passthrough();

/* -------------------------------------------------------------------------- */
/*                              NORMALISATION                                 */
/* -------------------------------------------------------------------------- */

function meaningfulText(
  value:
    | string
    | null,
) {
  const text =
    value?.trim();

  return (
    !text ||
    /^(non renseign[eé]|inconnu|sans objet)$/i.test(
      text,
    )
  )
    ? null
    : text;
}

export function normalizeRecord(
  input: unknown,
  containsPoint = isInsideParkBounds,
) {
  const record =
    recordSchema.parse(
      input,
    );

  const [lon, lat] =
    record.geo_shape
      .geometry
      .coordinates;

  if (
    !containsPoint(
      lon,
      lat,
    )
  ) {
    throw new Error(
      `Arbre ${record.id} hors de l’emprise demandée`,
    );
  }

  if (
    record.abattu ===
    1
  ) {
    return {
      reason:
        "felled" as const,
    };
  }

  const scientificName =
    [
      record.genre,
      record.espece,
      record.variete,
    ]
      .map(
        meaningfulText,
      )
      .filter(Boolean)
      .join(" ") ||
    null;

  const sourceName =
    meaningfulText(
      record.nom_commun,
    );

  /*
   * Zéro ou valeur négative :
   * considéré comme non renseigné.
   *
   * La valeur brute reste malgré tout
   * disponible dans source_properties.
   */
  const measure = (
    value:
      | number
      | null,
    maximum = Infinity,
  ) =>
    value !== null &&
      Number.isFinite(
        value,
      ) &&
      value > 0 &&
      value <= maximum
      ? value
      : null;

  const {
    geo_shape:
    _shape,

    geo_point_2d:
    _point,

    ...raw
  } =
    record;

  return {
    feature:
      (containsPoint === isInsideParkBounds ? treeFeatureSchema : createTreeFeatureSchema(containsPoint)).parse(
        {
          type:
            "Feature",

          id:
            `rennes-arbre-${record.id}`,

          geometry: {
            type:
              "Point",

            coordinates: [
              lon,
              lat,
            ],
          },

          properties: {
            source_id:
              record.id,

            id_gestion:
              meaningfulText(
                record.id_gestion,
              ),

            nom:
              preferredCommonName(
                sourceName,
                scientificName,
              ) ??
              scientificName ??
              `Arbre ${record.id}`,

            nom_source:
              sourceName,

            nom_scientifique:
              scientificName,

            espece:
              meaningfulText(
                record.espece,
              ),

            /*
             * Mesures normalisées.
             */
            hauteur_m:
              measure(
                record.hauteur,
              ),

            circonference_cm:
              measure(
                record.circonference,
              ),

            houppier_m:
              measure(
                record.houppier,
                40,
              ),

            hauteur_1_ere_feuille_m:
              measure(
                record.hauteur_1_ere_feuille,
              ),

            remarquable:
              null,

            photo_url:
              null,

            model_3d_url:
              null,

            description:
              meaningfulText(
                record.complement,
              ),

            date_plantation:
              record.date_plantation,

            date_maj:
              record.date_maj,

            localisation:
              record.localisation,

            type_taille:
              meaningfulText(
                record.type_taille,
              ),

            fonction:
              meaningfulText(
                record.fonction,
              ),

            source_properties:
              raw,
          },
        },
      ),
  };
}

/* -------------------------------------------------------------------------- */
/*                                REQUÊTE                                     */
/* -------------------------------------------------------------------------- */

const [
  west,
  south,
  east,
  north,
] =
  PARK_BOUNDS;

export const WHERE =
  `within(geo_shape, geom'POLYGON((` +
  `${west} ${south},` +
  `${east} ${south},` +
  `${east} ${north},` +
  `${west} ${north},` +
  `${west} ${south}` +
  `))')`;

async function getJson(
  url:
    | string
    | URL,
) {
  const response =
    await fetch(
      url,
      {
        signal:
          AbortSignal.timeout(
            30_000,
          ),
      },
    );

  if (
    !response.ok
  ) {
    throw new Error(
      `API Rennes : HTTP ${response.status}`,
    );
  }

  return response.json() as Promise<unknown>;
}

/* -------------------------------------------------------------------------- */
/*                                  IMPORT                                    */
/* -------------------------------------------------------------------------- */

export async function importRennes() {
  const metadata =
    z
      .object({
        metas:
          z.object({
            default:
              z.object({
                license:
                  z
                    .string()
                    .min(1),

                license_url:
                  z
                    .string()
                    .url(),

                data_processed:
                  z
                    .string()
                    .datetime({
                      offset:
                        true,
                    })
                    .nullable(),
              }),
          }),
      })
      .parse(
        await getJson(
          API_URL,
        ),
      )
      .metas
      .default;

  if (
    metadata.license !==
    "Licence ODbL 1.0"
  ) {
    throw new Error(
      "La licence de la source a changé : vérifier avant de publier.",
    );
  }

  const query =
    new URL(
      `${API_URL}/records`,
    );

  query.searchParams.set(
    "where",
    WHERE,
  );

  query.searchParams.set(
    "order_by",
    "id",
  );

  query.searchParams.set(
    "limit",
    "100",
  );

  const queryUrl =
    query.href;

  const records:
    unknown[] = [];

  let total:
    | number
    | undefined;

  do {
    query.searchParams.set(
      "offset",
      String(
        records.length,
      ),
    );

    const page =
      z
        .object({
          total_count:
            z
              .number()
              .int()
              .nonnegative(),

          results:
            z.array(
              z.unknown(),
            ),
        })
        .parse(
          await getJson(
            query,
          ),
        );

    if (
      total !==
      undefined &&
      page.total_count !==
      total
    ) {
      throw new Error(
        "La source a changé pendant l’import, relancer.",
      );
    }

    total =
      page.total_count;

    if (
      total >
      5000
    ) {
      throw new Error(
        "Volume inattendu pour cette emprise : import interrompu.",
      );
    }

    if (
      records.length <
      total &&
      !page.results.length
    ) {
      throw new Error(
        "Pagination incomplète.",
      );
    }

    records.push(
      ...page.results,
    );
  } while (
    records.length <
    total
  );

  if (
    records.length !==
    total
  ) {
    throw new Error(
      "Nombre de résultats incohérent.",
    );
  }

  const normalized =
    records.map(
      (record) => normalizeRecord(record),
    );

  const features =
    normalized.flatMap(
      (item) =>
        item.feature
          ? [
            item.feature,
          ]
          : [],
    );

  const collection =
    treeCollectionSchema.parse(
      {
        type:
          "FeatureCollection",

        bbox:
          PARK_BOUNDS,

        metadata: {
          schema_version:
            1,

          publisher:
            "Rennes Métropole",

          dataset:
            "arbre",

          source_url:
            SOURCE_URL,

          license:
            metadata.license,

          license_url:
            metadata.license_url.replace(
              /^http:/,
              "https:",
            ),

          imported_at:
            new Date().toISOString(),

          source_processed_at:
            metadata.data_processed,

          selection:
            "Emprise GPS fournie ; abattu=1 exclu.",

          query_url:
            queryUrl,

          bbox_records:
            records.length,

          excluded_felled:
            normalized.filter(
              (item) =>
                item.reason ===
                "felled",
            ).length,

          imported_records:
            features.length,
        },

        features,
      },
    );

  const folder =
    new URL(
      "../public/data/",
      import.meta.url,
    );

  const target =
    new URL(
      "arbres-rennes.geojson",
      folder,
    );

  const temporary =
    new URL(
      `arbres-rennes.${process.pid}.tmp`,
      folder,
    );

  await mkdir(
    folder,
    {
      recursive:
        true,
    },
  );

  try {
    await writeFile(
      temporary,

      `${JSON.stringify(
        collection,
        null,
        2,
      )}\n`,

      {
        flag:
          "wx",
      },
    );

    await rename(
      temporary,
      target,
    );
  } catch (error) {
    await unlink(
      temporary,
    ).catch(
      () => { },
    );

    throw error;
  }

  console.log(
    `${features.length} arbres importés sur ${records.length} points dans l’emprise.`,
  );

  console.log(
    `GeoJSON validé : ${fileURLToPath(target)}`,
  );
}

if (
  process.argv[1] &&
  import.meta.url ===
  pathToFileURL(
    process.argv[1],
  ).href
) {
  importRennes().catch(
    (
      error:
        unknown,
    ) => {
      console.error(
        "Import interrompu. Le précédent fichier reste intact.",
        error,
      );

      process.exitCode =
        1;
    },
  );
}
