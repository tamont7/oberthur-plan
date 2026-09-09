import { Component, lazy, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { filterTrees, parseTreeData, treeColor, TREE_COLORS, type Tree, type TreeData } from "./data";
import { SOURCE_URL } from "./park";

const DATA_URL = `${import.meta.env.BASE_URL}data/arbres-rennes.geojson`;
const EMPTY_TREES: Tree[] = [];

function LeafIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 4C12 4 6 7 5 13c-1 5 6 9 10 4 2-3 3-7 5-13Z" /><path d="M4 20 15 11" /></svg>;
}
function CloseIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>;
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

function TreeDetail({ tree, onClose }: { tree: Tree; onClose: () => void }) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    const timer = window.setTimeout(() => headingRef.current?.focus(), 0);
    return () => window.clearTimeout(timer);
  }, [tree.id]);
  return <article className="tree-detail" aria-labelledby="detail-title">
    <div className="detail-topline">
      <span className="detail-kicker">{tree.remarkable === true ? "Arbre remarquable" : "Inventaire métropolitain"}</span>
      <button className="icon-button" onClick={onClose} aria-label="Fermer la fiche"><CloseIcon /></button>
    </div>
    <h2 id="detail-title" ref={headingRef} tabIndex={-1}>{tree.name}</h2>
    <p className="scientific-name">{tree.scientificName ?? "Taxon non renseigné"}</p>
    <p className="tree-reference">Référence {tree.managementId ?? tree.sourceId}</p>
    {tree.photoUrl && <img className="tree-photo" src={tree.photoUrl} alt={tree.name} loading="lazy" />}
    {tree.description && <p className="detail-description">{tree.description}</p>}
    <dl className="tree-facts">
      <div><dt>Hauteur</dt><dd>{tree.height === null ? "Non renseignée" : `${tree.height} m`}</dd></div>
      <div><dt>Circonférence</dt><dd>{tree.circumference === null ? "Non renseignée" : `${tree.circumference} cm`}</dd></div>
      <div><dt>Plantation</dt><dd>{dateLabel(tree.plantedAt)}</dd></div>
      <div><dt>Type de taille</dt><dd>{tree.pruning ?? "Non renseigné"}</dd></div>
      <div><dt>Remarquable</dt><dd>{tree.remarkable === null ? "Non renseigné" : tree.remarkable ? "Oui" : "Non"}</dd></div>
      <div><dt>Mise à jour de la fiche source</dt><dd>{dateLabel(tree.updatedAt)}</dd></div>
    </dl>
    <p className="coordinates">GPS : {tree.latitude.toFixed(6)}, {tree.longitude.toFixed(6)}</p>
    <p className="detail-source">Source : <a href={SOURCE_URL} target="_blank" rel="noreferrer">Rennes Métropole</a> · Données d’inventaire, pas une observation en temps réel.</p>
  </article>;
}

export default function App() {
  const [data, setData] = useState<TreeData | null>(null);
  const [dataError, setDataError] = useState(false);
  const [dataAttempt, setDataAttempt] = useState(0);
  const [mapAttempt, setMapAttempt] = useState(0);
  const MapView = useMemo(() => lazy(() => import("./MapView")), [mapAttempt]);
  const [query, setQuery] = useState("");
  const [speciesFilter, setSpeciesFilter] = useState("");
  const [remarkableOnly, setRemarkableOnly] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [recenter, setRecenter] = useState(0);
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.matchMedia("(max-width: 760px)").matches);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const listTriggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    setDataError(false);
    const timeout = window.setTimeout(() => {
      controller.abort();
      setDataError(true);
    }, 20_000);
    fetch(DATA_URL, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("GeoJSON indisponible");
        return response.json();
      })
      .then((value: unknown) => {
        if (!controller.signal.aborted) setData(parseTreeData(value));
      })
      .catch(() => { if (!controller.signal.aborted) setDataError(true); })
      .finally(() => window.clearTimeout(timeout));
    return () => { window.clearTimeout(timeout); controller.abort(); };
  }, [dataAttempt]);

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
      searchRef.current?.focus();
    } else if (!mobilePanelOpen && dialog.open) {
      dialog.close();
    }
  }, [mobilePanelOpen, isMobile]);

  const trees = data?.trees ?? EMPTY_TREES;
  const species = useMemo(() => [...new Set(trees.map((tree) => tree.species))]
    .sort((a, b) => a.localeCompare(b, "fr")), [trees]);
  const remarkableKnown = trees.some((tree) => tree.remarkable !== null);
  const visibleTrees = useMemo(() => filterTrees(trees, query, speciesFilter, remarkableOnly), [trees, query, speciesFilter, remarkableOnly]);
  const selectedTree = visibleTrees.find((tree) => tree.id === selectedId) ?? null;

  useEffect(() => {
    if (selectedId && !visibleTrees.some((tree) => tree.id === selectedId)) setSelectedId(null);
    listRef.current?.scrollTo({ top: 0 });
  }, [visibleTrees]);

  const closeDetail = () => {
    const previousId = selectedId;
    setSelectedId(null);
    if (isMobile) listTriggerRef.current?.focus();
    else listRef.current?.querySelector<HTMLButtonElement>(`[data-tree-id="${previousId}"]`)?.focus();
  };
  useEffect(() => {
    if (!selectedTree || mobilePanelOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") closeDetail(); };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [selectedId, mobilePanelOpen, isMobile]);

  const chooseTree = (tree: Tree) => { setSelectedId(tree.id); setMobilePanelOpen(false); };
  const clearFilters = () => { setQuery(""); setSpeciesFilter(""); setRemarkableOnly(false); };
  const returnToPark = () => { setSelectedId(null); setRecenter((value) => value + 1); };
  const hasFilters = Boolean(query || speciesFilter || remarkableOnly);

  const explorer = <>
    <div className="panel-heading">
      <div><p className="eyebrow">Explorer</p><h1 id="explorer-title">Les arbres du parc</h1></div>
      {isMobile && <button className="icon-button" onClick={() => setMobilePanelOpen(false)} aria-label="Fermer la liste"><CloseIcon /></button>}
    </div>
    <label className="search-field">
      <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.5" /><path d="m16 16 4.2 4.2" /></svg>
      <span className="sr-only">Rechercher un arbre ou une espèce</span>
      <input ref={searchRef} type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nom, espèce ou référence…" />
    </label>
    <div className="filters">
      <label className="select-field"><span>Espèce / taxon</span>
        <select value={speciesFilter} onChange={(event) => setSpeciesFilter(event.target.value)}>
          <option value="">Toutes les espèces</option>
          {species.map((item) => <option key={item}>{item}</option>)}
        </select>
      </label>
      <button className={`filter-chip ${remarkableOnly ? "is-active" : ""}`} disabled={!remarkableKnown} aria-describedby={!remarkableKnown ? "remarkable-help" : undefined}
        onClick={() => setRemarkableOnly((current) => !current)} aria-pressed={remarkableOnly}>★ Remarquables</button>
      {!remarkableKnown && <p id="remarkable-help" className="filter-help">Statut remarquable non renseigné par la source.</p>}
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
        <button key={tree.id} data-tree-id={tree.id} className={`tree-list-item ${tree.id === selectedId ? "is-selected" : ""}`}
          aria-pressed={tree.id === selectedId} onClick={() => chooseTree(tree)}>
          <span className="tree-dot" style={{ backgroundColor: treeColor(tree, tree.id === selectedId) }} aria-hidden="true" />
          <span className="tree-list-copy"><strong>{tree.name}</strong><span>{tree.scientificName ?? "Taxon non renseigné"}</span><small>{tree.managementId ?? tree.sourceId}</small></span>
          {tree.remarkable === true && <span className="remarkable-star" aria-label="Remarquable">★</span>}
        </button>
      )) : <div className="empty-state"><LeafIcon /><p>Aucun arbre ne correspond à ces critères.</p><button className="text-button" onClick={clearFilters}>Effacer les filtres</button></div>}
    </div>
    <footer className="panel-footer">
      <p><a href={SOURCE_URL} target="_blank" rel="noreferrer">Rennes Métropole</a> · <a href="https://opendatacommons.org/licenses/odbl/1-0/" target="_blank" rel="noreferrer">ODbL 1.0</a><br />
        {data && <>Extrait du {dateLabel(data.metadata.imported_at)} · <a href={DATA_URL} download>GeoJSON</a><br /></>}
        Arbres attribués au parc par la source ; inventaire potentiellement incomplet.
        {isMobile && <><br />Fond de carte : © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors.</>}
      </p>
    </footer>
  </>;

  return <main className="app-shell">
    <section className="map-area" aria-label="Carte et fiche arbre">
      <MapBoundary key={mapAttempt} onRetry={() => setMapAttempt((value) => value + 1)}>
        <Suspense fallback={<div className="map-notice" role="status">Chargement de la carte…</div>}>
          <MapView trees={trees} visibleTrees={visibleTrees} selectedTree={selectedTree} onSelectTree={chooseTree} recenter={recenter} />
        </Suspense>
      </MapBoundary>
      <header className="map-header">
        <button className="brand" onClick={returnToPark} aria-label="Parc Oberthür — Revenir au parc">
          <span className="brand-mark"><LeafIcon /></span>
          <span><strong>Parc Oberthür</strong><small>Les arbres du parc</small></span>
        </button>
        <span className="demo-badge">V1.1 · Rennes Métropole</span>
      </header>
      <div className="map-actions"><button onClick={returnToPark}>⌖ Revenir au parc</button></div>
      <div className="map-legend" aria-label="Légende de la carte">
        <span><i className="legend-dot" style={{ backgroundColor: TREE_COLORS.normal }} /> Arbre</span>
        {remarkableKnown && <span><i className="legend-dot" style={{ backgroundColor: TREE_COLORS.remarkable }} /> Remarquable</span>}
        <span><i className="legend-dot" style={{ backgroundColor: TREE_COLORS.selected }} /> Sélection</span>
      </div>
      {selectedTree && <TreeDetail tree={selectedTree} onClose={closeDetail} />}
      <button ref={listTriggerRef} className="mobile-list-trigger" onClick={() => setMobilePanelOpen(true)}
        aria-haspopup="dialog" aria-expanded={mobilePanelOpen} aria-controls="mobile-explorer">
        {data ? `Explorer les ${visibleTrees.length} arbres` : "Ouvrir la liste"} <span aria-hidden="true">↑</span>
      </button>
    </section>
    {isMobile ? <dialog id="mobile-explorer" className="explorer-panel" ref={dialogRef} aria-labelledby="explorer-title"
      onCancel={(event) => { event.preventDefault(); setMobilePanelOpen(false); }}
      onClose={() => setMobilePanelOpen(false)}>{explorer}</dialog>
      : <aside className="explorer-panel" aria-labelledby="explorer-title">{explorer}</aside>}
  </main>;
}
