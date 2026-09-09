import { useEffect, useRef, useState } from "react";
import { Cartesian3, Color, ConstantProperty, HeadingPitchRange, HorizontalOrigin, LabelStyle, Math as CesiumMath, Matrix4, PolygonHierarchy, ScreenSpaceEventHandler, ScreenSpaceEventType, VerticalOrigin, Viewer } from "cesium";
import { treeColor, treeHighlight, type Tree } from "./data";
import { PARK_PLAN_BOUNDS } from "./park";
import { isParkLandmark, type ParkLandmark, type ParkPlan } from "./plan";

type MapViewProps = {
  trees: Tree[];
  plan: ParkPlan | null;
  visibleTrees: Tree[];
  selectedTree: Tree | null;
  hoveredTreeId: string | null;
  filtersActive: boolean;
  onSelectTree: (tree: Tree) => void;
  onSelectLandmark: (landmark: ParkLandmark) => void;
  recenter: number;
};
type MapTooltip = { name: string; count?: number; x: number; y: number };
const PLAN_HEIGHT = 0.25;

function positions(coordinates: readonly (readonly number[])[], height = PLAN_HEIGHT) {
  return coordinates.map(([longitude, latitude]) => Cartesian3.fromDegrees(longitude, latitude, height));
}

function centrePosition(coordinates: readonly (readonly number[])[], height: number) {
  const points = coordinates.length > 1 && coordinates[0][0] === coordinates.at(-1)?.[0] && coordinates[0][1] === coordinates.at(-1)?.[1] ? coordinates.slice(0, -1) : coordinates;
  const [longitude, latitude] = points.reduce<[number, number]>(([sumLongitude, sumLatitude], [pointLongitude, pointLatitude]) => [sumLongitude + pointLongitude, sumLatitude + pointLatitude], [0, 0]);
  return Cartesian3.fromDegrees(longitude / points.length, latitude / points.length, height);
}

function setParkView(viewer: Viewer, bounds: readonly number[]) {
  const [west, south, east, north] = bounds;
  const centre = Cartesian3.fromDegrees((west + east) / 2, (south + north) / 2);
  const range = Math.max(620, Math.max((east - west) * 74_000, (north - south) * 111_000) * 1.3);
  viewer.camera.lookAt(centre, new HeadingPitchRange(CesiumMath.toRadians(6), CesiumMath.toRadians(-70), range));
  viewer.camera.lookAtTransform(Matrix4.IDENTITY);
}

export default function MapView({ trees, plan, visibleTrees, selectedTree, hoveredTreeId, filtersActive, onSelectTree, onSelectLandmark, recenter }: MapViewProps) {
  const elementRef = useRef<HTMLDivElement>(null);
  const creditsRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Viewer | null>(null);
  const onSelectRef = useRef(onSelectTree);
  const onSelectLandmarkRef = useRef(onSelectLandmark);
  const treesRef = useRef(trees);
  const visibleTreesRef = useRef(visibleTrees);
  const planRef = useRef(plan);
  const [revision, setRevision] = useState(0);
  const [phase, setPhase] = useState<"loading" | "ready" | "error">("loading");
  const [tooltip, setTooltip] = useState<MapTooltip | null>(null);
  const [mapHoveredTreeId, setMapHoveredTreeId] = useState<string | null>(null);

  useEffect(() => { onSelectRef.current = onSelectTree; onSelectLandmarkRef.current = onSelectLandmark; treesRef.current = trees; visibleTreesRef.current = visibleTrees; planRef.current = plan; }, [onSelectTree, onSelectLandmark, trees, visibleTrees, plan]);

  useEffect(() => {
    if (!elementRef.current || !creditsRef.current) return;
    setPhase("loading");
    let viewer: Viewer | undefined;
    let interactions: ScreenSpaceEventHandler | undefined;
    const cleanups: (() => void)[] = [];
    let stopped = false;
    try {
      viewer = new Viewer(elementRef.current, {
        animation: false, baseLayer: false, baseLayerPicker: false,
        fullscreenButton: false, geocoder: false, homeButton: false, infoBox: false,
        navigationHelpButton: false, sceneModePicker: false, selectionIndicator: false, timeline: false,
        creditContainer: creditsRef.current, showRenderLoopErrors: false,
        // Rendu à la résolution native, essentiel sur les dalles mobiles très denses.
        useBrowserRecommendedResolution: false,
        requestRenderMode: true, maximumRenderTimeChange: Number.POSITIVE_INFINITY,
        shouldAnimate: false,
      });
      viewerRef.current = viewer;
      viewer.resolutionScale = 1;
      viewer.scene.backgroundColor = Color.fromCssColorString("#e8efe5");
      viewer.scene.globe.baseColor = Color.fromCssColorString("#e8efe5");
      viewer.scene.skyBox.show = false;
      viewer.scene.sun.show = false;
      viewer.scene.moon.show = false;
      viewer.scene.screenSpaceCameraController.minimumZoomDistance = 30;
      setParkView(viewer, plan?.bbox ?? PARK_PLAN_BOUNDS);
      let firstFrame = true;
      cleanups.push(viewer.scene.postRender.addEventListener(() => {
        if (firstFrame && !stopped) { firstFrame = false; setPhase("ready"); }
      }));
      cleanups.push(viewer.scene.renderError.addEventListener(() => { if (!stopped) setPhase("error"); }));
      // React possède la sélection. Les entités Cesium sont conservées entre les clics.
      viewer.screenSpaceEventHandler.removeInputAction(ScreenSpaceEventType.LEFT_DOUBLE_CLICK);
      interactions = new ScreenSpaceEventHandler(viewer.scene.canvas);
      interactions.setInputAction((event: ScreenSpaceEventHandler.PositionedEvent) => {
        const entity = viewer?.scene.pick(event.position)?.id;
        const id = typeof entity?.id === "string" ? entity.id.replace(/-(?:roof|roof-outline|label)$/, "") : "";
        const tree = visibleTreesRef.current.find((item) => item.id === id);
        if (tree) onSelectRef.current(tree);
        else {
          const landmark = planRef.current?.features.find((feature): feature is ParkLandmark => isParkLandmark(feature) && feature.id === id);
          if (landmark) onSelectLandmarkRef.current(landmark);
        }
      }, ScreenSpaceEventType.LEFT_CLICK);
      interactions.setInputAction((event: ScreenSpaceEventHandler.MotionEvent) => {
        const entity = viewer?.scene.pick(event.endPosition)?.id;
        const id = typeof entity?.id === "string" ? entity.id.replace(/-(?:roof|roof-outline|label)$/, "") : "";
        const tree = visibleTreesRef.current.find((item) => item.id === id);
        const landmark = planRef.current?.features.find((feature): feature is ParkLandmark => isParkLandmark(feature) && feature.id === id);
        viewer!.scene.canvas.style.cursor = tree || landmark ? "pointer" : "";
        setMapHoveredTreeId((current) => current === tree?.id ? current : tree?.id ?? null);
        setTooltip(tree ? { name: tree.name, count: treesRef.current.filter((item) => item.species === tree.species).length, x: event.endPosition.x, y: event.endPosition.y } : landmark ? { name: landmark.properties.label, x: event.endPosition.x, y: event.endPosition.y } : null);
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
      plan?.features.forEach((feature) => {
        if (feature.geometry.type === "MultiPolygon") {
          feature.geometry.coordinates.forEach((polygon, index) => {
            const [outer, ...holes] = polygon;
            const outlinePositions = positions(outer);
            viewer.entities.add({
              id: `${feature.id}-${index}`,
              polygon: {
                hierarchy: new PolygonHierarchy(outlinePositions, holes.map((hole) => new PolygonHierarchy(positions(hole)))),
                material: Color.fromCssColorString("#d9e9d5").withAlpha(0.88),
                height: PLAN_HEIGHT,
              },
            });
            viewer.entities.add({ id: `${feature.id}-${index}-outline`, polyline: { positions: outlinePositions, width: 2, material: Color.fromCssColorString("#789b79") } });
          });
        } else if (feature.geometry.type === "Polygon" && isParkLandmark(feature)) {
          const [outer, ...holes] = feature.geometry.coordinates;
          const structureHeight = PLAN_HEIGHT + feature.properties.height_m;
          const hotel = feature.properties.kind === "building";
          const wall = Color.fromCssColorString(hotel ? "#a9745d" : "#b88d45").withAlpha(0.94);
          const roof = Color.fromCssColorString(hotel ? "#704738" : "#7c5a2d").withAlpha(0.98);
          const hierarchy = new PolygonHierarchy(positions(outer), holes.map((hole) => new PolygonHierarchy(positions(hole))));
          viewer.entities.add({
            id: feature.id,
            name: feature.properties.label,
            polygon: { hierarchy, material: wall, height: PLAN_HEIGHT + 0.03, extrudedHeight: structureHeight },
          });
          viewer.entities.add({ id: `${feature.id}-roof`, polygon: { hierarchy, material: roof, height: structureHeight + 0.03 } });
          viewer.entities.add({ id: `${feature.id}-roof-outline`, polyline: { positions: positions(outer, structureHeight + 0.06), width: 1.8, material: Color.fromCssColorString("#f7eddd") } });
          viewer.entities.add({
            id: `${feature.id}-label`, name: feature.properties.label,
            position: centrePosition(outer, structureHeight + 1.5),
            label: {
              text: feature.properties.label, font: "600 13px DM Sans", style: LabelStyle.FILL_AND_OUTLINE,
              fillColor: Color.fromCssColorString("#3c291f"), outlineColor: Color.WHITE, outlineWidth: 3,
              horizontalOrigin: HorizontalOrigin.CENTER, verticalOrigin: VerticalOrigin.BOTTOM,
              disableDepthTestDistance: Number.POSITIVE_INFINITY,
            },
          });
        } else if (feature.geometry.type === "Polygon") {
          const [outer, ...holes] = feature.geometry.coordinates;
          const outlinePositions = positions(outer);
          viewer.entities.add({
            id: feature.id,
            polygon: {
              hierarchy: new PolygonHierarchy(outlinePositions, holes.map((hole) => new PolygonHierarchy(positions(hole)))),
              material: Color.fromCssColorString("#9fc5d0").withAlpha(0.94),
              height: PLAN_HEIGHT + 0.01,
            },
          });
          viewer.entities.add({ id: `${feature.id}-outline`, polyline: { positions: outlinePositions, width: 1.5, material: Color.fromCssColorString("#6f9eaa") } });
        } else {
          viewer.entities.add({ id: feature.id, polyline: { positions: positions(feature.geometry.coordinates), width: 2.8, material: Color.fromCssColorString("#f9f5e9") } });
        }
      });
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
  }, [trees, plan, revision]);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || !plan) return;
    setParkView(viewer, plan.bbox);
    viewer.scene.requestRender();
  }, [plan]);

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
    setParkView(viewer, plan?.bbox ?? PARK_PLAN_BOUNDS);
    viewer.scene.requestRender();
  }, [recenter, plan]);

  return <>
    <div ref={elementRef} className="cesium-map" data-map-state={phase} data-visible-count={visibleTrees.length} data-plan-features={plan?.features.length ?? 0} aria-label="Carte interactive du Parc Oberthür" />
    <div ref={creditsRef} className="map-credits" />
    {tooltip && <div className="map-tooltip" style={{ left: tooltip.x + 13, top: tooltip.y - 10 }} role="status">{tooltip.name} {tooltip.count !== undefined && <span>({tooltip.count})</span>}</div>}
    {phase === "error" ? <div className="map-notice" role="alert">
      <p>La carte 3D est indisponible. Vérifiez que WebGL est activé ; la liste et les fiches restent accessibles.</p>
      <button onClick={() => setRevision((value) => value + 1)}>Réessayer la carte</button>
    </div> : phase === "loading" && <div className="map-loading" role="status">Chargement du plan du parc…</div>}
  </>;
}
