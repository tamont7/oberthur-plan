import { useEffect, useRef, useState } from "react";
import { Cartesian3, Color, ConstantProperty, Credit, HeightReference, ImageryLayer, OpenStreetMapImageryProvider, Rectangle, ScreenSpaceEventHandler, ScreenSpaceEventType, Viewer } from "cesium";
import { treeColor, type Tree } from "./data";
import { PARK_BOUNDS } from "./park";

type MapViewProps = {
  trees: Tree[];
  visibleTrees: Tree[];
  selectedTree: Tree | null;
  onSelectTree: (tree: Tree) => void;
  recenter: number;
};
const PARK_VIEW = Rectangle.fromDegrees(...PARK_BOUNDS);

export default function MapView({ trees, visibleTrees, selectedTree, onSelectTree, recenter }: MapViewProps) {
  const elementRef = useRef<HTMLDivElement>(null);
  const creditsRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Viewer | null>(null);
  const onSelectRef = useRef(onSelectTree);
  const visibleTreesRef = useRef(visibleTrees);
  const [revision, setRevision] = useState(0);
  const [phase, setPhase] = useState<"loading" | "ready" | "error">("loading");
  const [tileError, setTileError] = useState(false);
  const [loadingTiles, setLoadingTiles] = useState(true);

  useEffect(() => { onSelectRef.current = onSelectTree; visibleTreesRef.current = visibleTrees; }, [onSelectTree, visibleTrees]);

  useEffect(() => {
    if (!elementRef.current || !creditsRef.current) return;
    setPhase("loading");
    setTileError(false);
    setLoadingTiles(true);
    let viewer: Viewer | undefined;
    let clicks: ScreenSpaceEventHandler | undefined;
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
      clicks = new ScreenSpaceEventHandler(viewer.scene.canvas);
      clicks.setInputAction((event: ScreenSpaceEventHandler.PositionedEvent) => {
        const entity = viewer?.scene.pick(event.position)?.id;
        const tree = visibleTreesRef.current.find((item) => item.id === entity?.id);
        if (tree) onSelectRef.current(tree);
      }, ScreenSpaceEventType.LEFT_CLICK);
    } catch {
      setPhase("error");
    }
    return () => {
      stopped = true;
      cleanups.forEach((cleanup) => cleanup());
      clicks?.destroy();
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
          heightReference: HeightReference.CLAMP_TO_GROUND,
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
    trees.forEach((tree) => {
      const entity = viewer.entities.getById(tree.id);
      if (!entity?.point) return;
      entity.show = visibleIds.has(tree.id);
      const selected = tree.id === selectedTree?.id;
      entity.point.color = new ConstantProperty(Color.fromCssColorString(treeColor(tree, selected)));
      entity.point.pixelSize = new ConstantProperty(selected ? 18 : tree.remarkable === true ? 14 : 11);
      entity.point.outlineWidth = new ConstantProperty(selected ? 3 : 2);
    });
    viewer.scene.requestRender();
  }, [trees, visibleTrees, selectedTree, revision]);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || !selectedTree) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    viewer.camera.flyTo({
      destination: Cartesian3.fromDegrees(selectedTree.longitude, selectedTree.latitude, 420),
      duration: reduceMotion ? 0 : 0.7,
    });
    viewer.scene.requestRender();
  }, [selectedTree, revision]);

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
    {phase === "error" ? <div className="map-notice" role="alert">
      <p>La carte 3D est indisponible. Vérifiez que WebGL est activé ; la liste et les fiches restent accessibles.</p>
      <button onClick={() => setRevision((value) => value + 1)}>Réessayer la carte</button>
    </div> : tileError ? <div className="map-notice" role="alert">
      <p>Le fond de carte n’a pas pu être chargé. Les arbres restent consultables.</p>
      <button onClick={() => setRevision((value) => value + 1)}>Réessayer le fond de carte</button>
    </div> : (phase === "loading" || loadingTiles) && <div className="map-loading" role="status">Chargement du fond de carte…</div>}
  </>;
}
