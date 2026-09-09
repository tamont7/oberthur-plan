export const PARK_BOUNDS = [-1.661317, 48.111249, -1.657734, 48.113921] as const;
export const PARK_LOCALISATION = "Parc Hamelin Oberthür, Rennes";
export const SOURCE_URL = "https://data.rennesmetropole.fr/explore/dataset/arbre/";
export const API_URL = "https://data.rennesmetropole.fr/api/explore/v2.1/catalog/datasets/arbre";

export function isInsideParkBounds(longitude: number, latitude: number) {
  const [west, south, east, north] = PARK_BOUNDS;
  return longitude >= west && longitude <= east && latitude >= south && latitude <= north;
}
