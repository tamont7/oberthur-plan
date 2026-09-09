import { Component, lazy, Suspense, useEffect, useMemo, useRef, useState, type PointerEvent, type ReactNode } from "react";
import { filterTrees, normalizeSearch, parseTreeData, TREE_COLORS, type Tree, type TreeData } from "./data";
import { PARK_PLAN_SOURCE_URL, SOURCE_URL } from "./park";
import { parseParkPlan, type ParkLandmark, type ParkPlan } from "./plan";

const DATA_URL = `${import.meta.env.BASE_URL}data/arbres-rennes.geojson`;
const PLAN_URL = `${import.meta.env.BASE_URL}data/parc-oberthur.geojson`;
const THABOR_PLAN_URL = `${import.meta.env.BASE_URL}data/parc-thabor.geojson`;
const EMPTY_TREES: Tree[] = [];
type ParkView = "oberthur" | "thabor";
type MapViewMode = "2d" | "3d";
const WIKIPEDIA_SEARCH_URL = "https://fr.wikipedia.org/w/index.php?search=";
const WIKIPEDIA_API_URL = "https://fr.wikipedia.org/w/api.php?action=query&list=search&srlimit=1&format=json&origin=*&srsearch=";
type TreeSort = "vernacular" | "scientific" | "count" | "height" | "crown";
type SpeciesOption = { taxon: string; vernacularName: string; count: number };

const treeSortLabel: Record<TreeSort, string> = {
  vernacular: "nom usuel", scientific: "nom scientifique", count: "nombre d’arbres",
  height: "hauteur", crown: "houppier",
};
const TREE_SORT_ORDER: TreeSort[] = ["vernacular", "scientific", "count", "height", "crown"];

function speciesOptionLabel({ taxon, vernacularName }: SpeciesOption, sort: TreeSort) {
  return sort === "scientific" ? `${taxon} · ${vernacularName}` : `${vernacularName} · ${taxon}`;
}

function compareOptionalMeasurements(a: number | null, b: number | null) {
  if (a === null) return b === null ? 0 : 1;
  if (b === null) return -1;
  return b - a;
}

function wikipediaArticleUrl(title: string) {
  return `https://fr.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}`;
}

async function resolveWikipediaArticle(tab: Window, scientificName: string) {
  try {
    const response = await fetch(`${WIKIPEDIA_API_URL}${encodeURIComponent(scientificName)}`);
    if (!response.ok) return;
    const result = await response.json() as { query?: { search?: Array<{ title?: string }> } };
    const title = result.query?.search?.[0]?.title;
    if (title && !tab.closed) tab.location.replace(wikipediaArticleUrl(title));
  } catch {
    // Le nouvel onglet garde la recherche Wikipédia de secours.
  }
}

function SpeciesName({ option, sort }: { option: SpeciesOption; sort: TreeSort }) {
  const primary = sort === "scientific" ? option.taxon : option.vernacularName;
  const secondary = sort === "scientific" ? option.vernacularName : option.taxon;
  return <span className="species-option-content"><span className="species-option-copy"><span className="species-option-primary">{primary}</span><span className="species-option-secondary">{secondary}</span></span><span className="species-option-count">{option.count} {option.count > 1 ? "arbres" : "arbre"}</span></span>;
}

function SpeciesPicker({ options, selectedTaxon, sort, onSelect }: {
  options: SpeciesOption[]; selectedTaxon: string; sort: TreeSort; onSelect: (taxon: string) => void;
}) {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const selectedOption = options.find((option) => option.taxon === selectedTaxon);
  const choose = (taxon: string) => { onSelect(taxon); detailsRef.current?.removeAttribute("open"); };
  return <div className="select-field">
    <details className="species-picker" ref={detailsRef}>
      <summary aria-label="Choisir une espèce">
        {selectedOption ? <SpeciesName option={selectedOption} sort={sort} /> : <span className="species-picker-placeholder">Toutes les espèces</span>}
        <span className="species-picker-chevron" aria-hidden="true" />
      </summary>
      <div className="species-picker-menu" role="group" aria-label="Toutes les espèces">
        <button type="button" className={`species-option ${!selectedTaxon ? "is-selected" : ""}`} onClick={() => choose("")}>
          <span className="species-option-primary">Toutes les espèces</span>
        </button>
        {options.map((option) => <button type="button" className={`species-option ${option.taxon === selectedTaxon ? "is-selected" : ""}`} key={option.taxon} onClick={() => choose(option.taxon)}>
          <SpeciesName option={option} sort={sort} />
        </button>)}
      </div>
    </details>
  </div>;
}

function TreeSortPicker({ sort, onChange }: { sort: TreeSort; onChange: (sort: TreeSort) => void }) {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const choose = (nextSort: TreeSort) => { onChange(nextSort); detailsRef.current?.removeAttribute("open"); };
  return <details className="sort-picker" ref={detailsRef}>
    <summary aria-label="Trier les arbres">
      <span className="sort-picker-label">Trier par</span><span className="sort-picker-value">{treeSortLabel[sort]}</span><span className="species-picker-chevron" aria-hidden="true" />
    </summary>
    <div className="sort-picker-menu" role="group" aria-label="Choisir le tri">
      {TREE_SORT_ORDER.map((option) => <button type="button" className={`sort-option ${option === sort ? "is-selected" : ""}`} key={option} onClick={() => choose(option)}>{treeSortLabel[option]}</button>)}
    </div>
  </details>;
}

function LeafIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 4C12 4 6 7 5 13c-1 5 6 9 10 4 2-3 3-7 5-13Z" /><path d="M4 20 15 11" /></svg>;
}
function CloseIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>;
}
function InfoIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5" /><path d="M12 10.8v5.2M12 7.8h.01" /></svg>;
}
function dateLabel(value: string | null) {
  return value ? new Intl.DateTimeFormat("fr-FR", { timeZone: "UTC" }).format(new Date(value)) : "Non renseignée";
}

class MapBoundary extends Component<{ children: ReactNode; onRetry: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    return this.state.failed ? <div className="map-notice" role="alert">
      <p>La carte n’a pas pu démarrer. La liste et les fiches restent disponibles.</p>
      <button onClick={this.props.onRetry}>Réessayer la carte</button>
    </div> : this.props.children;
  }
}

function TreeDetail({
  tree,
  count,
  onClose,
  isMobile,
}: {
  tree: Tree;
  count: number;
  onClose: () => void;
  isMobile: boolean;
}) {
  const headingRef =
    useRef<HTMLHeadingElement>(
      null,
    );

  const scientificName =
    tree.scientificName;

  const [
    detailsOpen,
    setDetailsOpen,
  ] =
    useState(false);

  const touchStartY =
    useRef<number | null>(
      null,
    );

  const [
    dragOffset,
    setDragOffset,
  ] =
    useState(0);

  /*
   * Compatibilité pendant la transition :
   * les propriétés seront typées directement
   * dans data.ts juste après.
   */
  const measurements =
    tree as Tree & {
      crownDiameter?:
      | number
      | null;

      firstLeafHeight?:
      | number
      | null;
    };

  useEffect(() => {
    const timer =
      window.setTimeout(
        () =>
          headingRef.current?.focus(),
        0,
      );

    return () =>
      window.clearTimeout(
        timer,
      );
  }, [tree.id]);

  useEffect(
    () =>
      setDetailsOpen(
        false,
      ),
    [tree.id],
  );

  const beginSwipe = (
    event:
      PointerEvent<HTMLElement>,
  ) => {
    if (
      event.pointerType ===
      "touch"
    ) {
      touchStartY.current =
        event.clientY;
    }
  };

  const moveSwipe = (
    event:
      PointerEvent<HTMLElement>,
  ) => {
    if (
      touchStartY.current !==
      null
    ) {
      setDragOffset(
        Math.max(
          0,
          event.clientY -
          touchStartY.current,
        ),
      );
    }
  };

  const endSwipe =
    () => {
      if (
        dragOffset > 72
      ) {
        onClose();
      }

      touchStartY.current =
        null;

      setDragOffset(0);
    };

  return (
    <article
      className={`tree-detail ${isMobile ? "is-mobile" : ""}`}
      aria-labelledby="detail-title"
      onPointerDown={
        beginSwipe
      }
      onPointerMove={
        moveSwipe
      }
      onPointerUp={
        endSwipe
      }
      onPointerCancel={
        endSwipe
      }
      style={{
        transform:
          `translateY(${dragOffset}px)`,
      }}
    >
      <div className="detail-topline">
        <h2
          id="detail-title"
          ref={headingRef}
          tabIndex={-1}
        >
          {tree.name} ({count})
        </h2>

        <button
          className="icon-button"
          onClick={onClose}
          aria-label="Fermer la fiche"
        >
          <CloseIcon />
        </button>
      </div>

      <p className="tree-summary">
        {tree.height != null && (
          <>↕ {tree.height} m</>
        )}

        {tree.circumference != null && (
          <> · ⟳ {tree.circumference} cm</>
        )}

        {measurements.crownDiameter != null && (
          <> · ⌀ {measurements.crownDiameter} m</>
        )}
      </p>

      <button
        className="detail-toggle"
        onClick={() =>
          setDetailsOpen(
            (open) =>
              !open,
          )
        }
        aria-expanded={
          detailsOpen
        }
      >
        <span>
          {detailsOpen
            ? "Réduire"
            : "Voir la fiche"}
        </span>

        <span
          className="detail-toggle-mark"
          aria-hidden="true"
        >
          {detailsOpen
            ? "−"
            : "+"}
        </span>
      </button>

      {detailsOpen && (
        <div className="tree-detail-extra">
          <p className="scientific-name">
            {scientificName ? (
              <a
                href={`${WIKIPEDIA_SEARCH_URL}${encodeURIComponent(
                  scientificName,
                )}`}
                target="_blank"
                rel="noreferrer"
                aria-label={`Ouvrir le premier résultat Wikipédia pour ${scientificName}`}
                onClick={(
                  event,
                ) => {
                  const tab =
                    window.open(
                      `${WIKIPEDIA_SEARCH_URL}${encodeURIComponent(
                        scientificName,
                      )}`,
                      "_blank",
                    );

                  if (!tab) {
                    return;
                  }

                  event.preventDefault();

                  tab.opener =
                    null;

                  void resolveWikipediaArticle(
                    tab,
                    scientificName,
                  );
                }}
              >
                {scientificName}

                <span
                  aria-hidden="true"
                >
                  {" "}
                  ↗
                </span>
              </a>
            ) : (
              "Taxon non renseigné"
            )}
          </p>

          {tree.sourceName &&
            tree.sourceName !==
            tree.name && (
              <p className="source-name">
                Nom publié :{" "}
                {
                  tree.sourceName
                }
              </p>
            )}

          <p className="tree-reference">
            Référence{" "}
            {tree.managementId ??
              tree.sourceId}
          </p>

          {tree.photoUrl && (
            <img
              className="tree-photo"
              src={
                tree.photoUrl
              }
              alt={tree.name}
              loading="lazy"
            />
          )}

          {tree.description && (
            <p className="detail-description">
              {
                tree.description
              }
            </p>
          )}

          <dl className="tree-facts">
            <div>
              <dt>
                Hauteur
              </dt>

              <dd>
                {tree.height ===
                  null
                  ? "Non renseignée"
                  : `${tree.height} m`}
              </dd>
            </div>

            <div>
              <dt>
                Circonférence
              </dt>

              <dd>
                {tree.circumference ===
                  null
                  ? "Non renseignée"
                  : `${tree.circumference} cm`}
              </dd>
            </div>

            <div>
              <dt>
                Diamètre du
                houppier
              </dt>

              <dd>
                {measurements
                  .crownDiameter ===
                  null ||
                  measurements
                    .crownDiameter ===
                  undefined
                  ? "Non renseigné"
                  : `${measurements.crownDiameter} m`}
              </dd>
            </div>

            <div>
              <dt>
                Hauteur de
                première feuille
              </dt>

              <dd>
                {measurements
                  .firstLeafHeight ===
                  null ||
                  measurements
                    .firstLeafHeight ===
                  undefined
                  ? "Non renseignée"
                  : `${measurements.firstLeafHeight} m`}
              </dd>
            </div>

            <div>
              <dt>
                Plantation
              </dt>

              <dd>
                {dateLabel(
                  tree.plantedAt,
                )}
              </dd>
            </div>

            <div>
              <dt>
                Type de taille
              </dt>

              <dd>
                {tree.pruning ??
                  "Non renseigné"}
              </dd>
            </div>

            <div>
              <dt>
                Remarquable
              </dt>

              <dd>
                {tree.remarkable ===
                  null
                  ? "Non renseigné"
                  : tree.remarkable
                    ? "Oui"
                    : "Non"}
              </dd>
            </div>

            <div>
              <dt>
                Mise à jour de
                la fiche source
              </dt>

              <dd>
                {dateLabel(
                  tree.updatedAt,
                )}
              </dd>
            </div>
          </dl>

          <p className="coordinates">
            GPS :{" "}
            {tree.latitude.toFixed(
              6,
            )}
            ,{" "}
            {tree.longitude.toFixed(
              6,
            )}
          </p>
        </div>
      )}
    </article>
  );
}

function LandmarkDetail({ landmark, onClose }: { landmark: ParkLandmark; onClose: () => void }) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    const timer = window.setTimeout(() => headingRef.current?.focus(), 0);
    return () => window.clearTimeout(timer);
  }, [landmark.id]);
  const { photo } = landmark.properties;
  return <article className="tree-detail landmark-detail" aria-labelledby="landmark-title">
    <div className="detail-topline">
      <span className="detail-kicker">Repère du parc · volume 3D</span>
      <button className="icon-button" onClick={onClose} aria-label="Fermer la fiche"><CloseIcon /></button>
    </div>
    <h2 id="landmark-title" ref={headingRef} tabIndex={-1}>{landmark.properties.label}</h2>
    <p className="landmark-description">Emprise géographique et volume de repérage sur la carte. La hauteur est illustrative : la source ne publie pas de hauteur de bâtiment.</p>
    <img className="tree-photo" src={photo.url} alt={landmark.properties.label} loading="lazy" />
    <p className="photo-credit">Photo : <a href={photo.page_url} target="_blank" rel="noreferrer">{photo.author} · {photo.license}</a></p>
    <p className="coordinates">Source géométrique : {landmark.properties.source} · {landmark.properties.source_id}</p>
  </article>;
}

export default function App() {
  const [data, setData] = useState<TreeData | null>(null);
  const [plan, setPlan] = useState<ParkPlan | null>(null);
  const [dataError, setDataError] = useState(false);
  const [dataAttempt, setDataAttempt] = useState(0);
  const [mapAttempt, setMapAttempt] = useState(0);
  const MapView = useMemo(() => lazy(() => import("./MapView")), [mapAttempt]);
  const [activePark, setActivePark] = useState<ParkView>(() => new URLSearchParams(window.location.search).get("plan") === "thabor" ? "thabor" : "oberthur");
  const [query, setQuery] = useState("");
  const [selectedSpecies, setSelectedSpecies] = useState("");
  const [speciesSort, setSpeciesSort] = useState<TreeSort>("vernacular");
  const [searchSuggestionsOpen, setSearchSuggestionsOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [focusTreeId, setFocusTreeId] = useState<string | null>(null);
  const [focusRequest, setFocusRequest] = useState(0);
  const [selectedLandmark, setSelectedLandmark] = useState<ParkLandmark | null>(null);
  const [hoveredTreeId, setHoveredTreeId] = useState<string | null>(null);
  const [recenter, setRecenter] = useState(0);
  const [mapViewMode, setMapViewMode] = useState<MapViewMode>("3d");
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.matchMedia("(max-width: 760px)").matches);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const infoDialogRef = useRef<HTMLDialogElement>(null);
  const listTriggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const explorerTouchStartY = useRef<number | null>(null);
  const [explorerDragOffset, setExplorerDragOffset] = useState(0);
  const planOnly = activePark === "thabor";

  useEffect(() => {
    const controller = new AbortController();
    setDataError(false);
    const timeout = window.setTimeout(() => {
      controller.abort();
      setDataError(true);
    }, 20_000);
    setPlan(null);
    const planUrl = activePark === "thabor" ? THABOR_PLAN_URL : PLAN_URL;
    const parkPlan = fetch(planUrl, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("Plan indisponible");
        return response.json() as Promise<unknown>;
      })
      .then(parseParkPlan);
    if (activePark === "thabor") {
      setData(null);
      parkPlan
        .then((nextPlan) => { if (!controller.signal.aborted) setPlan(nextPlan); })
        .catch(() => { if (!controller.signal.aborted) setDataError(true); })
        .finally(() => window.clearTimeout(timeout));
      return () => { window.clearTimeout(timeout); controller.abort(); };
    }
    const treeData = fetch(DATA_URL, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("GeoJSON indisponible");
        return response.json() as Promise<unknown>;
      });
    Promise.all([treeData, parkPlan])
      .then(([trees, nextPlan]) => {
        if (!controller.signal.aborted) {
          setData(parseTreeData(trees));
          setPlan(nextPlan);
        }
      })
      .catch(() => { if (!controller.signal.aborted) setDataError(true); })
      .finally(() => window.clearTimeout(timeout));
    return () => { window.clearTimeout(timeout); controller.abort(); };
  }, [dataAttempt, activePark]);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 760px)");
    const update = () => { setIsMobile(media.matches); setMobilePanelOpen(false); };
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (mobilePanelOpen && !dialog.open) {
      dialog.showModal();
      dialog.focus();
    } else if (!mobilePanelOpen && dialog.open) {
      dialog.close();
    }
  }, [mobilePanelOpen, isMobile]);

  useEffect(() => {
    const dialog = infoDialogRef.current;
    if (!dialog) return;
    if (infoOpen && !dialog.open) dialog.showModal();
    else if (!infoOpen && dialog.open) dialog.close();
  }, [infoOpen]);

  const trees = data?.trees ?? EMPTY_TREES;
  const speciesStats = useMemo(() => {
    const stats = new Map<string, { vernacularName: string; count: number }>();
    for (const tree of trees) {
      const existing = stats.get(tree.species);
      if (existing) existing.count += 1;
      else stats.set(tree.species, { vernacularName: tree.name, count: 1 });
    }
    return stats;
  }, [trees]);
  const speciesOptions = useMemo(() => {
    return [...speciesStats].map(([taxon, { vernacularName, count }]) => ({ taxon, vernacularName, count }))
      .sort((a, b) => {
        if (speciesSort === "count") return b.count - a.count || a.vernacularName.localeCompare(b.vernacularName, "fr") || a.taxon.localeCompare(b.taxon, "fr");
        const scientificFirst = speciesSort === "scientific";
        const primary = scientificFirst ? a.taxon.localeCompare(b.taxon, "fr") : a.vernacularName.localeCompare(b.vernacularName, "fr");
        return primary || (scientificFirst ? a.vernacularName.localeCompare(b.vernacularName, "fr") : a.taxon.localeCompare(b.taxon, "fr"));
      });
  }, [speciesStats, speciesSort]);
  const filteredTrees = useMemo(() => filterTrees(trees, query, selectedSpecies, false), [trees, query, selectedSpecies]);
  const visibleTrees = useMemo(() => [...filteredTrees].sort((a, b) => {
    if (speciesSort === "height") {
      const difference = compareOptionalMeasurements(a.height, b.height);
      if (difference) return difference;
    }
    if (speciesSort === "crown") {
      const difference = compareOptionalMeasurements(a.crownDiameter, b.crownDiameter);
      if (difference) return difference;
    }
    if (speciesSort === "count") {
      const countDifference = (speciesStats.get(b.species)?.count ?? 0) - (speciesStats.get(a.species)?.count ?? 0);
      if (countDifference) return countDifference;
    }
    const primaryA = speciesSort === "scientific" ? a.scientificName ?? a.name : a.name;
    const primaryB = speciesSort === "scientific" ? b.scientificName ?? b.name : b.name;
    const primary = primaryA.localeCompare(primaryB, "fr");
    if (primary) return primary;
    const secondaryA = speciesSort === "scientific" ? a.name : a.scientificName ?? a.name;
    const secondaryB = speciesSort === "scientific" ? b.name : b.scientificName ?? b.name;
    return secondaryA.localeCompare(secondaryB, "fr");
  }), [filteredTrees, speciesSort, speciesStats]);
  const suggestedSpecies = useMemo(() => {
    const terms = normalizeSearch(query).split(/\s+/).filter(Boolean);
    if (!terms.length || selectedSpecies) return [];
    return speciesOptions.filter((option) => {
      const text = normalizeSearch(`${option.vernacularName} ${option.taxon}`);
      return terms.every((term) => text.includes(term));
    }).slice(0, 8);
  }, [query, selectedSpecies, speciesOptions]);
  const showSpeciesSuggestions = searchSuggestionsOpen && suggestedSpecies.length > 0;
  const selectedTree = visibleTrees.find((tree) => tree.id === selectedId) ?? null;

  useEffect(() => {
    if (selectedId && !visibleTrees.some((tree) => tree.id === selectedId)) setSelectedId(null);
    listRef.current?.scrollTo({ top: 0 });
  }, [visibleTrees]);

  useEffect(() => {
    if (hoveredTreeId && !visibleTrees.some((tree) => tree.id === hoveredTreeId)) setHoveredTreeId(null);
  }, [hoveredTreeId, visibleTrees]);

  const closeDetail = () => {
    const previousId = selectedId;
    setSelectedId(null);
    if (isMobile) listTriggerRef.current?.focus();
    else listRef.current?.querySelector<HTMLButtonElement>(`[data-tree-id="${previousId}"]`)?.focus();
  };
  const closeLandmark = () => setSelectedLandmark(null);
  useEffect(() => {
    if ((!selectedTree && !selectedLandmark) || mobilePanelOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") selectedLandmark ? closeLandmark() : closeDetail(); };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [selectedId, selectedLandmark, mobilePanelOpen, isMobile]);

  const chooseTree = (tree: Tree) => {
    setFocusTreeId(null);
    setSelectedId(tree.id);
    setSelectedLandmark(null);
    setMobilePanelOpen(false);
  };
  const focusTree = (tree: Tree) => {
    setFocusTreeId(tree.id);
    setFocusRequest((request) => request + 1);
    setMobilePanelOpen(false);
  };
  const chooseLandmark = (landmark: ParkLandmark) => { setSelectedLandmark(landmark); setSelectedId(null); setMobilePanelOpen(false); };
  const updateSearch = (value: string) => {
    setQuery(value);
    setSelectedSpecies(speciesOptions.find((option) => speciesOptionLabel(option, speciesSort) === value)?.taxon ?? "");
    setSearchSuggestionsOpen(Boolean(value));
  };
  const chooseSpecies = (taxon: string) => {
    setSelectedSpecies(taxon);
    const option = speciesOptions.find((item) => item.taxon === taxon);
    setQuery(option ? speciesOptionLabel(option, speciesSort) : "");
    setSearchSuggestionsOpen(false);
  };
  const clearSearch = () => {
    setQuery("");
    setSelectedSpecies("");
    setSearchSuggestionsOpen(false);
    searchRef.current?.focus();
  };
  const changeTreeSort = (nextSort: TreeSort) => {
    setSpeciesSort(nextSort);
    const option = speciesOptions.find((item) => item.taxon === selectedSpecies);
    if (option) setQuery(speciesOptionLabel(option, nextSort));
  };
  const clearFilters = () => { clearSearch(); setSpeciesSort("vernacular"); };
  const returnToPark = () => { setSelectedId(null); setSelectedLandmark(null); setRecenter((value) => value + 1); };
  const changePark = (nextPark: ParkView) => {
    if (nextPark === activePark) return;
    setActivePark(nextPark);
    setSelectedId(null);
    setSelectedLandmark(null);
    setMobilePanelOpen(false);
    const url = new URL(window.location.href);
    if (nextPark === "thabor") url.searchParams.set("plan", "thabor");
    else url.searchParams.delete("plan");
    window.history.pushState({}, "", url);
  };
  const beginExplorerSwipe = (event: PointerEvent<HTMLElement>) => {
    if (event.pointerType === "touch") explorerTouchStartY.current = event.clientY;
  };
  const moveExplorerSwipe = (event: PointerEvent<HTMLElement>) => {
    if (explorerTouchStartY.current !== null) setExplorerDragOffset(Math.max(0, event.clientY - explorerTouchStartY.current));
  };
  const endExplorerSwipe = () => {
    if (explorerDragOffset > 72) setMobilePanelOpen(false);
    explorerTouchStartY.current = null;
    setExplorerDragOffset(0);
  };
  const hasFilters = Boolean(query || speciesSort !== "vernacular");
  const openInfo = () => {
    setMobilePanelOpen(false);
    setInfoOpen(true);
  };

  const explorer = <>
    <div className="search-combobox">
      <div className="search-field">
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.5" /><path d="m16 16 4.2 4.2" /></svg>
        <label className="sr-only" htmlFor="tree-search">Rechercher un arbre ou une espèce</label>
        <input id="tree-search" ref={searchRef} type="search" value={query} aria-controls="species-suggestions" aria-expanded={showSpeciesSuggestions} onFocus={() => setSearchSuggestionsOpen(true)} onBlur={() => window.setTimeout(() => setSearchSuggestionsOpen(false), 120)} onChange={(event) => updateSearch(event.target.value)} placeholder="Arbre ou espèce…" />
        {query && <button type="button" className="search-clear" onMouseDown={(event) => event.preventDefault()} onClick={clearSearch} aria-label="Effacer la recherche"><CloseIcon /></button>}
      </div>
      {showSpeciesSuggestions && <div className="species-suggestions" id="species-suggestions" aria-label="Suggestions d’espèces">
        {suggestedSpecies.map((option) => <button type="button" className="species-option" key={option.taxon} onMouseDown={(event) => event.preventDefault()} onClick={() => chooseSpecies(option.taxon)}>
          <SpeciesName option={option} sort={speciesSort} />
        </button>)}
      </div>}
    </div>
    <div className="filters">
      <SpeciesPicker options={speciesOptions} selectedTaxon={selectedSpecies} sort={speciesSort} onSelect={chooseSpecies} />
      <TreeSortPicker sort={speciesSort} onChange={changeTreeSort} />
    </div>
    <div className="results-heading">
      <p role="status">{data ? `${visibleTrees.length} / ${trees.length} arbres` : dataError ? "Données indisponibles" : "Chargement des arbres…"}</p>
      {hasFilters && <button className="text-button" onClick={clearFilters}>Réinitialiser</button>}
    </div>
    <div className="tree-list" ref={listRef} aria-busy={!data && !dataError}>
      {dataError ? <div className="empty-state" role="alert">
        <p>Les données n’ont pas pu être chargées.</p>
        <button onClick={() => setDataAttempt((value) => value + 1)}>Réessayer les données</button>
      </div> : !data ? <p className="empty-state">Lecture de l’inventaire…</p> : visibleTrees.length ? visibleTrees.map((tree) => (
        <div key={tree.id} className="tree-list-row" onMouseEnter={() => setHoveredTreeId(tree.id)} onMouseLeave={() => setHoveredTreeId(null)}>
          <button data-tree-id={tree.id} className={`tree-list-item ${tree.id === selectedId ? "is-selected" : ""}`}
            aria-pressed={tree.id === selectedId} onFocus={() => setHoveredTreeId(tree.id)} onBlur={() => setHoveredTreeId(null)} onClick={() => chooseTree(tree)}>
          <span className="tree-dot" style={{ backgroundColor: tree.id === selectedId ? TREE_COLORS.selected : TREE_COLORS.normal }} aria-hidden="true" />
          <span className="tree-list-copy">
            <strong>{tree.name}</strong>
            <span>{tree.scientificName ?? "Taxon non renseigné"}</span>
            {(tree.height != null || tree.circumference != null || tree.crownDiameter != null) && <span className="tree-list-measurements">
              {tree.height != null && <>↕ {tree.height} m</>}
              {tree.circumference != null && <>{tree.height != null && " · "}⟳ {tree.circumference} cm</>}
              {tree.crownDiameter != null && <>{(tree.height != null || tree.circumference != null) && " · "}⌀ {tree.crownDiameter} m</>}
            </span>}
          </span>
          </button>
          <button type="button" className="focus-tree-button" onFocus={() => setHoveredTreeId(tree.id)} onBlur={() => setHoveredTreeId(null)} onClick={() => focusTree(tree)} aria-label={`Centrer la carte sur ${tree.name}`}>⌖</button>
        </div>
      )) : <div className="empty-state"><LeafIcon /><p>Aucun arbre ne correspond à ces critères.</p><button className="text-button" onClick={clearFilters}>Effacer les filtres</button></div>}
    </div>
    <footer className="panel-footer">
      <button className="info-button" onClick={openInfo} aria-haspopup="dialog" aria-label="Informations sur les données"><InfoIcon /></button>
    </footer>
  </>;

  return <main className="app-shell">
    <section className="map-area" aria-label="Carte et fiche arbre">
      <MapBoundary key={mapAttempt} onRetry={() => setMapAttempt((value) => value + 1)}>
        <Suspense fallback={<div className="map-notice" role="status">Chargement de la carte…</div>}>
          <MapView trees={planOnly ? EMPTY_TREES : trees} plan={plan} visibleTrees={planOnly ? EMPTY_TREES : visibleTrees} selectedTree={planOnly ? null : selectedTree} focusTreeId={planOnly ? null : focusTreeId} focusRequest={focusRequest} viewMode={mapViewMode} onChangeViewMode={() => setMapViewMode((mode) => mode === "3d" ? "2d" : "3d")} isMobile={isMobile} hoveredTreeId={planOnly ? null : hoveredTreeId} onSelectTree={chooseTree} onSelectLandmark={chooseLandmark} recenter={recenter} />
        </Suspense>
      </MapBoundary>
      <header className="map-header">
        <button className="brand" onClick={returnToPark} aria-label="Parc Oberthür — Revenir au parc">
          <span className="brand-mark"><LeafIcon /></span>
          <span><strong>{planOnly ? "Parc du Thabor" : "Parc Oberthür"}</strong></span>
        </button>
      </header>
      <div className="park-switcher" role="group" aria-label="Choisir un parc">
        <button type="button" className={`park-choice ${activePark === "oberthur" ? "is-active" : ""}`} onClick={() => changePark("oberthur")} aria-pressed={activePark === "oberthur"}>
          <i className="park-choice-symbol oberthur" aria-hidden="true" /><span>Oberthür</span>
        </button>
        <button type="button" className={`park-choice ${activePark === "thabor" ? "is-active" : ""}`} onClick={() => changePark("thabor")} aria-pressed={activePark === "thabor"}>
          <i className="park-choice-symbol thabor" aria-hidden="true" /><span>Thabor</span>
        </button>
      </div>
      {!planOnly && selectedTree && <TreeDetail tree={selectedTree} count={speciesStats.get(selectedTree.species)?.count ?? 1} onClose={closeDetail} isMobile={isMobile} />}
      {!planOnly && selectedLandmark && <LandmarkDetail landmark={selectedLandmark} onClose={closeLandmark} />}
      {!planOnly && <button ref={listTriggerRef} className={`mobile-list-trigger ${selectedTree ? "is-hidden" : ""}`} onClick={() => setMobilePanelOpen(true)}
        aria-haspopup="dialog" aria-expanded={mobilePanelOpen} aria-controls="mobile-explorer">
        {data ? `Explorer les ${visibleTrees.length} arbres` : "Ouvrir la liste"} <span aria-hidden="true">↑</span>
      </button>}
    </section>
    {planOnly ? <aside className="thabor-panel" aria-label="Plan du Parc du Thabor">
      <p className="eyebrow">Plan préparé</p><h1>Parc du Thabor</h1>
      <p>Emprise officielle, allées et plans d’eau. Les bâtiments et l’inventaire d’arbres seront ajoutés plus tard.</p>
      <p className="thabor-source"><a href="https://data.rennesmetropole.fr/explore/dataset/espaces_verts/" target="_blank" rel="noreferrer">Rennes Métropole</a> · <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> · <a href={THABOR_PLAN_URL} download>GeoJSON</a> · ODbL 1.0</p>
    </aside> : isMobile ? <dialog id="mobile-explorer" className="explorer-panel" ref={dialogRef} aria-label="Liste des arbres" tabIndex={-1} style={{ transform: `translateY(${explorerDragOffset}px)` }}
      onCancel={(event) => { event.preventDefault(); setMobilePanelOpen(false); }}
      onClose={() => setMobilePanelOpen(false)}><button type="button" className="mobile-panel-handle" aria-label="Fermer la liste des arbres" onClick={() => setMobilePanelOpen(false)}
        onPointerDown={beginExplorerSwipe} onPointerMove={moveExplorerSwipe} onPointerUp={endExplorerSwipe} onPointerCancel={endExplorerSwipe} />{explorer}</dialog>
      : <aside className="explorer-panel" aria-label="Liste des arbres">{explorer}</aside>}
    {!planOnly && <dialog className="info-dialog" ref={infoDialogRef} aria-labelledby="info-title" onClose={() => setInfoOpen(false)}>
      <div className="info-dialog-topline">
        <div><p className="eyebrow">Informations</p><h2 id="info-title">Données et sources</h2></div>
        <button className="icon-button" autoFocus onClick={() => setInfoOpen(false)} aria-label="Fermer les informations"><CloseIcon /></button>
      </div>
      <p>Les positions et caractéristiques présentées proviennent d’un inventaire ; elles ne constituent pas une observation en temps réel.</p>
      <dl className="info-list">
        <div><dt>Version</dt><dd>V1.4 · Rennes Métropole</dd></div>
        <div><dt>Inventaire</dt><dd><a href={SOURCE_URL} target="_blank" rel="noreferrer">Rennes Métropole</a> · <a href="https://opendatacommons.org/licenses/odbl/1-0/" target="_blank" rel="noreferrer">ODbL 1.0</a></dd></div>
        {data && <div><dt>Extrait</dt><dd>{dateLabel(data.metadata.imported_at)} · <a href={DATA_URL} download>GeoJSON</a></dd></div>}
        <div><dt>Couverture</dt><dd>Arbres situés dans l’emprise GPS du parc ; inventaire potentiellement incomplet.</dd></div>
        <div><dt>Plan du parc</dt><dd><a href={PARK_PLAN_SOURCE_URL} target="_blank" rel="noreferrer">Emprise : Rennes Métropole</a> · <a href="https://public.sig.rennesmetropole.fr/header/geoservices" target="_blank" rel="noreferrer">Bords d’allées et Hôtel : RTGE Rennes Métropole</a> · <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">Axes, étang et kiosque : OpenStreetMap contributors</a> · <a href={PLAN_URL} download>GeoJSON</a> · ODbL 1.0</dd></div>
        <div><dt>Repères 3D</dt><dd>Volumes indicatifs : les hauteurs de bâtiments ne sont pas publiées par les sources. Photos au clic : Wikimedia Commons · CC BY-SA 3.0.</dd></div>
      </dl>
    </dialog>}
  </main>;
}
