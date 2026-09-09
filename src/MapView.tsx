import { useEffect, useRef, useState } from "react";
import { Cartesian3, Color, ConstantProperty, Credit, ImageryLayer, OpenStreetMapImageryProvider, Rectangle, ScreenSpaceEventHandler, ScreenSpaceEventType, Viewer } from "cesium";
import { treeColor, treeHighlight, type Tree } from "./data";
import { PARK_BOUNDS } from "./park";

type MapViewProps = {
  trees: Tree[];
  visibleTrees: Tree[];
  selectedTree: Tree | null;
  hoveredTreeId: string | null;
  filtersActive: boolean;
  onSelectTree: (tree: Tree) => void;
  recenter: number;
};
const PARK_VIEW = Rectangle.fromDegrees(...PARK_BOUNDS);
type MapTooltip = { name: string; count: number; x: number; y: number };

export default function MapView({ trees, visibleTrees, selectedTree, hoveredTreeId, filtersActive, onSelectTree, recenter }: MapViewProps) {
  const elementRef = useRef<HTMLDivElement>(null);
  const creditsRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Viewer | null>(null);
  const onSelectRef = useRef(onSelectTree);
  const treesRef = useRef(trees);
  const visibleTreesRef = useRef(visibleTrees);
  const [revision, setRevision] = useState(0);
  const [phase, setPhase] = useState<"loading" | "ready" | "error">("loading");
  const [tileError, setTileError] = useState(false);
  const [loadingTiles, setLoadingTiles] = useState(true);
  const [tooltip, setTooltip] = useState<MapTooltip | null>(null);
  const [mapHoveredTreeId, setMapHoveredTreeId] = useState<string | null>(null);

  useEffect(() => { onSelectRef.current = onSelectTree; treesRef.current = trees; visibleTreesRef.current = visibleTrees; }, [onSelectTree, trees, visibleTrees]);

  useEffect(() => {
    if (!elementRef.current || !creditsRef.current) return;
    setPhase("loading");
    setTileError(false);
    setLoadingTiles(true);
    let viewer: Viewer | undefined;
    let interactions: ScreenSpaceEventHandler | undefined;
    const cleanups: (() => void)[] = [];
    let stopped = false;
    try {
      const imagery = new OpenStreetMapImageryProvider({
        url: "https://tile.openstreetmap.org/",
        maximumLevel: 19,
        credit: new Credit('© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors', true),
      });
      cleanups.push(imagery.errorEvent.addEventListener(() => { if (!stopped) setTileError(true); }));
      viewer = new Viewer(elementRef.current, {
        animation: false, baseLayer: new ImageryLayer(imagery), baseLayerPicker: false,
        fullscreenButton: false, geocoder: false, homeButton: false, infoBox: false,
        navigationHelpButton: false, sceneModePicker: false, selectionIndicator: false, timeline: false,
        creditContainer: creditsRef.current, showRenderLoopErrors: false,
        requestRenderMode: true, maximumRenderTimeChange: Number.POSITIVE_INFINITY,
        shouldAnimate: false,
      });
      viewerRef.current = viewer;
      viewer.resolutionScale = Math.min(1, 1.5 / (window.devicePixelRatio || 1));
      viewer.scene.screenSpaceCameraController.minimumZoomDistance = 30;
      viewer.camera.setView({ destination: PARK_VIEW });
      let firstFrame = true;
      cleanups.push(viewer.scene.postRender.addEventListener(() => {
        if (firstFrame && !stopped) { firstFrame = false; setPhase("ready"); }
      }));
      cleanups.push(viewer.scene.globe.tileLoadProgressEvent.addEventListener((pending: number) => {
        if (!stopped) setLoadingTiles(pending > 0);
      }));
      cleanups.push(viewer.scene.renderError.addEventListener(() => { if (!stopped) setPhase("error"); }));
      // React possède la sélection. Les entités Cesium sont conservées entre les clics.
      viewer.screenSpaceEventHandler.removeInputAction(ScreenSpaceEventType.LEFT_DOUBLE_CLICK);
      interactions = new ScreenSpaceEventHandler(viewer.scene.canvas);
      interactions.setInputAction((event: ScreenSpaceEventHandler.PositionedEvent) => {
        const entity = viewer?.scene.pick(event.position)?.id;
        const tree = visibleTreesRef.current.find((item) => item.id === entity?.id);
        if (tree) onSelectRef.current(tree);
      }, ScreenSpaceEventType.LEFT_CLICK);
      interactions.setInputAction((event: ScreenSpaceEventHandler.MotionEvent) => {
        const entity = viewer?.scene.pick(event.endPosition)?.id;
        const tree = visibleTreesRef.current.find((item) => item.id === entity?.id);
        viewer!.scene.canvas.style.cursor = tree ? "pointer" : "";
        setMapHoveredTreeId((current) => current === tree?.id ? current : tree?.id ?? null);
        setTooltip(tree ? { name: tree.name, count: treesRef.current.filter((item) => item.species === tree.species).length, x: event.endPosition.x, y: event.endPosition.y } : null);
      }, ScreenSpaceEventType.MOUSE_MOVE);
      const hideTooltip = () => { viewer?.scene.canvas.style.removeProperty("cursor"); setMapHoveredTreeId(null); setTooltip(null); };
      viewer.scene.canvas.addEventListener("mouseleave", hideTooltip);
      cleanups.push(() => viewer?.scene.canvas.removeEventListener("mouseleave", hideTooltip));
    } catch {
      setPhase("error");
    }
    return () => {
      stopped = true;
      cleanups.forEach((cleanup) => cleanup());
      interactions?.destroy();
      if (viewer && !viewer.isDestroyed()) viewer.destroy();
      viewerRef.current = null;
    };
  }, [revision]);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    viewer.entities.suspendEvents();
    try {
      viewer.entities.removeAll();
      trees.forEach((tree) => viewer.entities.add({
        id: tree.id,
        name: tree.name,
        position: Cartesian3.fromDegrees(tree.longitude, tree.latitude),
        point: {
          color: Color.fromCssColorString(treeColor(tree, false)),
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
          outlineColor: Color.WHITE, outlineWidth: 2, pixelSize: 11,
        },
      }));
    } finally {
      viewer.entities.resumeEvents();
    }
    viewer.scene.requestRender();
  }, [trees, revision]);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    const visibleIds = new Set(visibleTrees.map((tree) => tree.id));
    const activeHoveredTreeId = hoveredTreeId ?? mapHoveredTreeId;
    const hoveredTree = trees.find((tree) => tree.id === activeHoveredTreeId);
    const highlightedTaxon = hoveredTree ?? selectedTree;
    trees.forEach((tree) => {
      const entity = viewer.entities.getById(tree.id);
      if (!entity?.point) return;
      entity.show = visibleIds.has(tree.id);
      const highlight = treeHighlight(tree, selectedTree?.id ?? null, highlightedTaxon ?? null);
      const filtered = filtersActive && visibleIds.has(tree.id);
      entity.point.color = new ConstantProperty(Color.fromCssColorString(highlight === "hovered" || highlight === "same_species" || filtered ? "#255bca" : treeColor(tree, highlight === "selected")));
      entity.point.pixelSize = new ConstantProperty(highlight === "hovered" ? 18 : highlight === "selected" ? 18 : tree.remarkable === true ? 14 : 11);
      entity.point.outlineWidth = new ConstantProperty(highlight === "hovered" ? 3 : highlight === "selected" ? 3 : 2);
    });
    viewer.scene.requestRender();
  }, [trees, visibleTrees, selectedTree, hoveredTreeId, mapHoveredTreeId, filtersActive, revision]);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || recenter === 0) return;
    viewer.camera.cancelFlight();
    viewer.camera.setView({ destination: PARK_VIEW });
    viewer.scene.requestRender();
  }, [recenter]);

  return <>
    <div ref={elementRef} className="cesium-map" data-map-state={phase} data-visible-count={visibleTrees.length} aria-label="Carte interactive du Parc Oberthür" />
    <div ref={creditsRef} className="map-credits" />
    {tooltip && <div className="map-tooltip" style={{ left: tooltip.x + 13, top: tooltip.y - 10 }} role="status">{tooltip.name} <span>({tooltip.count})</span></div>}
    {phase === "error" ? <div className="map-notice" role="alert">
      <p>La carte 3D est indisponible. Vérifiez que WebGL est activé ; la liste et les fiches restent accessibles.</p>
      <button onClick={() => setRevision((value) => value + 1)}>Réessayer la carte</button>
    </div> : tileError ? <div className="map-notice" role="alert">
      <p>Le fond de carte n’a pas pu être chargé. Les arbres restent consultables.</p>
      <button onClick={() => setRevision((value) => value + 1)}>Réessayer le fond de carte</button>
    </div> : (phase === "loading" || loadingTiles) && <div className="map-loading" role="status">Chargement du fond de carte…</div>}
  </>;
}
