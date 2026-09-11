function normalizeTaxon(value: string | null) {
  return value?.trim().replace(/\s+/g, " ").toLocaleLowerCase("fr") ?? "";
}

// Corrections éditoriales limitées à des taxons dont le nom français est sans ambiguïté.
// Le nom publié par la collectivité est toujours conservé séparément.
const preferredCommonNames: Record<string, string> = {
  "fagus sylvatica purpurea": "Hêtre pourpre",
  "fagus sylvatica pendula": "Hêtre pleureur",
};

export function preferredCommonName(sourceName: string | null, scientificName: string | null) {
  return preferredCommonNames[normalizeTaxon(scientificName)] ?? sourceName;
}
