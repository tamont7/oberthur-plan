import { useEffect, useRef, useState } from "react";
import {
  Cartesian3,
  Color,
  ColorGeometryInstanceAttribute,
  Credit,
  CylinderGeometry,
  EllipsoidGeometry,
  GeometryInstance,
  HeadingPitchRange,
  HeadingPitchRoll,
  ImageryLayer,
  Math as CesiumMath,
  Matrix4,
  PerInstanceColorAppearance,
  PolygonHierarchy,
  Primitive,
  PrimitiveCollection,
  Quaternion,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
  Transforms,
  TranslationRotationScale,
  UrlTemplateImageryProvider,
  Viewer,
} from "cesium";

import {
  treeColor,
  treeHighlight,
  type Tree,
} from "./data";

import { PARK_PLAN_BOUNDS } from "./park";

import {
  isParkLandmark,
  type ParkLandmark,
  type ParkPlan,
} from "./plan";

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

type TreeMeasurements = Tree & {
  crownDiameter?: number | null;
  firstLeafHeight?: number | null;
};

type TreeShape =
  | "round"
  | "conical"
  | "columnar"
  | "spreading"
  | "compact";

type TreeProportions = {
  trunkHeight: number;
  trunkRadius: number;
  crownHeight: number;
  crownRadiusX: number;
  crownRadiusY: number;
};

type MapTooltip = {
  name: string;
  count?: number;
  height?: number | null;
  circumference?: number | null;
  crownDiameter?: number | null;
  x: number;
  y: number;
};

const PLAN_HEIGHT = 0.25;

const TREE_TRUNK_COLOR =
  Color.fromCssColorString("#735039");

const TREE_SELECTED_COLOR =
  Color.fromCssColorString("#255bca");

const TREE_HOVER_COLOR =
  Color.fromCssColorString("#6fa4ff");

const FILTER_COLOR = "#255bca";

function positions(
  coordinates: readonly (readonly number[])[],
  height = PLAN_HEIGHT,
) {
  return coordinates.map(
    ([longitude, latitude]) =>
      Cartesian3.fromDegrees(
        longitude,
        latitude,
        height,
      ),
  );
}

function setParkView(
  viewer: Viewer,
  bounds: readonly number[],
) {
  const [west, south, east, north] =
    bounds;

  const centre =
    Cartesian3.fromDegrees(
      (west + east) / 2,
      (south + north) / 2,
    );

  const range = Math.max(
    620,
    Math.max(
      (east - west) * 74_000,
      (north - south) * 111_000,
    ) * 1.3,
  );

  viewer.camera.lookAt(
    centre,
    new HeadingPitchRange(
      CesiumMath.toRadians(6),
      CesiumMath.toRadians(-70),
      range,
    ),
  );

  viewer.camera.lookAtTransform(
    Matrix4.IDENTITY,
  );
}

function getTreeHeight(tree: Tree) {
  if (
    tree.height !== null &&
    Number.isFinite(tree.height) &&
    tree.height >= 2 &&
    tree.height <= 60
  ) {
    return tree.height;
  }

  return 10;
}

function getTreeTrunkRadius(tree: Tree) {
  if (
    tree.circumference !== null &&
    Number.isFinite(tree.circumference) &&
    tree.circumference > 0
  ) {
    const radius =
      tree.circumference /
      100 /
      (2 * Math.PI);

    return Math.max(
      0.06,
      Math.min(1.2, radius),
    );
  }

  return 0.18;
}

function getTreeCrownDiameter(tree: Tree) {
  const value =
    (tree as TreeMeasurements)
      .crownDiameter;

  if (
    value !== null &&
    value !== undefined &&
    Number.isFinite(value) &&
    value > 0
  ) {
    return value;
  }

  /*
   * Fallback uniquement quand Rennes
   * ne fournit pas de houppier.
   */
  return getTreeHeight(tree) * 0.3;
}

function getTreeFirstLeafHeight(tree: Tree) {
  const height =
    getTreeHeight(tree);

  const value =
    (tree as TreeMeasurements)
      .firstLeafHeight;

  if (
    value !== null &&
    value !== undefined &&
    Number.isFinite(value) &&
    value >= 0 &&
    value < height
  ) {
    return value;
  }

  /*
   * Fallback uniquement quand Rennes
   * ne fournit pas cette mesure.
   */
  return height * 0.3;
}

function normalizeTreeText(tree: Tree) {
  return [
    tree.name,
    tree.scientificName,
    tree.species,
  ]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase("fr");
}

function getTreeShape(
  tree: Tree,
): TreeShape {
  const text =
    normalizeTreeText(tree);

  if (
    text.includes("cedrus") ||
    text.includes("cèdre") ||
    text.includes("cedre") ||
    text.includes("abies") ||
    text.includes("sapin") ||
    text.includes("picea") ||
    text.includes("épicéa") ||
    text.includes("epicea") ||
    text.includes("cryptomeria") ||
    text.includes("sequoia") ||
    text.includes("séquoia") ||
    text.includes("thuja")
  ) {
    return "conical";
  }

  if (
    text.includes("populus") ||
    text.includes("peuplier") ||
    text.includes("betula") ||
    text.includes("bouleau") ||
    text.includes("cupressus") ||
    text.includes("cyprès") ||
    text.includes("cypres")
  ) {
    return "columnar";
  }

  if (
    text.includes("quercus") ||
    text.includes("chêne") ||
    text.includes("chene") ||
    text.includes("fagus") ||
    text.includes("hêtre") ||
    text.includes("hetre") ||
    text.includes("platanus") ||
    text.includes("platane") ||
    text.includes("castanea") ||
    text.includes("châtaignier") ||
    text.includes("chataignier")
  ) {
    return "spreading";
  }

  if (
    text.includes("malus") ||
    text.includes("pommier") ||
    text.includes("prunus") ||
    text.includes("cerisier") ||
    text.includes("magnolia") ||
    text.includes("amelanchier")
  ) {
    return "compact";
  }

  return "round";
}

function hashTree(tree: Tree) {
  let hash = 2166136261;

  for (
    let i = 0;
    i < tree.id.length;
    i += 1
  ) {
    hash ^= tree.id.charCodeAt(i);

    hash = Math.imul(
      hash,
      16777619,
    );
  }

  return hash >>> 0;
}

function treeRotation(tree: Tree) {
  return CesiumMath.toRadians(
    hashTree(tree) % 360,
  );
}

function getTreeBrightness(tree: Tree) {
  const values = [
    0.9,
    0.94,
    0.97,
    1,
    1.03,
    1.06,
    1.1,
  ];

  return values[
    hashTree(tree) %
    values.length
  ];
}

function getTreeHueVariation(tree: Tree) {
  return (
    ((hashTree(tree) >> 4) % 5) -
    2
  );
}

function varyColor(
  tree: Tree,
  cssColor: string,
) {
  const base =
    Color.fromCssColorString(
      cssColor,
    );

  const brightness =
    getTreeBrightness(tree);

  const hue =
    getTreeHueVariation(tree);

  /*
   * Variation de teinte très légère :
   * la luminosité reste l'élément
   * principal de différenciation.
   */
  const hueAmount =
    hue * 0.012;

  const red =
    base.red * brightness +
    hueAmount;

  const green =
    base.green * brightness +
    Math.abs(hueAmount) * 0.25;

  const blue =
    base.blue * brightness -
    hueAmount;

  return new Color(
    Math.max(
      0,
      Math.min(1, red),
    ),
    Math.max(
      0,
      Math.min(1, green),
    ),
    Math.max(
      0,
      Math.min(1, blue),
    ),
    1,
  );
}

function getBaseCrownColor(tree: Tree) {
  return varyColor(
    tree,
    treeColor(tree, false),
  );
}

function getFilteredCrownColor(
  tree: Tree,
) {
  return varyColor(
    tree,
    FILTER_COLOR,
  );
}

function getTreeProportions(
  tree: Tree,
): TreeProportions {
  const height =
    getTreeHeight(tree);

  const trunkRadius =
    getTreeTrunkRadius(tree);

  const crownDiameter =
    getTreeCrownDiameter(tree);

  const firstLeafHeight =
    getTreeFirstLeafHeight(tree);

  const crownHeight =
    Math.max(
      1,
      height - firstLeafHeight,
    );

  const crownRadius =
    crownDiameter / 2;

  /*
   * Petite asymétrie déterministe.
   * Elle ne modifie presque pas
   * l'enveloppe du houppier mais aide
   * à distinguer deux arbres qui se
   * chevauchent.
   */
  const variation =
    0.97 +
    (hashTree(tree) % 7) /
    100;

  let radiusX =
    crownRadius * variation;

  let radiusY =
    crownRadius *
    (2 - variation);

  /*
   * On reste volontairement subtil :
   * les dimensions Rennes doivent
   * rester prioritaires.
   */
  if (
    getTreeShape(tree) ===
    "columnar"
  ) {
    radiusX *= 0.96;
    radiusY *= 0.96;
  }

  if (
    getTreeShape(tree) ===
    "spreading"
  ) {
    radiusX *= 1.01;
    radiusY *= 1.01;
  }

  return {
    trunkHeight:
      firstLeafHeight,

    trunkRadius,

    crownHeight,

    crownRadiusX:
      radiusX,

    crownRadiusY:
      radiusY,
  };
}

function makeTreeMatrix(
  tree: Tree,
  translationZ: number,
  scaleX: number,
  scaleY: number,
  scaleZ: number,
) {
  const position =
    Cartesian3.fromDegrees(
      tree.longitude,
      tree.latitude,
      PLAN_HEIGHT,
    );

  const worldMatrix =
    Transforms.eastNorthUpToFixedFrame(
      position,
    );

  const rotation =
    Quaternion.fromHeadingPitchRoll(
      new HeadingPitchRoll(
        treeRotation(tree),
        0,
        0,
      ),
    );

  const trs =
    new TranslationRotationScale();

  trs.translation =
    new Cartesian3(
      0,
      0,
      translationZ,
    );

  trs.rotation =
    rotation;

  trs.scale =
    new Cartesian3(
      scaleX,
      scaleY,
      scaleZ,
    );

  const localMatrix =
    Matrix4.fromTranslationRotationScale(
      trs,
      new Matrix4(),
    );

  return Matrix4.multiply(
    worldMatrix,
    localMatrix,
    new Matrix4(),
  );
}

function getPickedId(
  picked: unknown,
): string {
  if (
    !picked ||
    typeof picked !== "object"
  ) {
    return "";
  }

  const candidate =
    picked as {
      id?:
      | string
      | {
        id?: string;
      };
    };

  let id = "";

  if (
    typeof candidate.id ===
    "string"
  ) {
    id = candidate.id;
  } else if (
    candidate.id &&
    typeof candidate.id ===
    "object" &&
    typeof candidate.id.id ===
    "string"
  ) {
    id =
      candidate.id.id;
  }

  return id.replace(
    /-(?:roof|roof-outline|label)$/,
    "",
  );
}

export default function MapView(
  props: MapViewProps,
) {
  /*
   * Défense runtime :
   * évite le crash visibleTrees.length
   * même après un HMR imparfait.
   */
  const trees =
    Array.isArray(props.trees)
      ? props.trees
      : [];

  const visibleTrees =
    Array.isArray(
      props.visibleTrees,
    )
      ? props.visibleTrees
      : [];

  const {
    plan,
    selectedTree,
    hoveredTreeId,
    filtersActive,
    onSelectTree,
    onSelectLandmark,
    recenter,
  } = props;

  const elementRef =
    useRef<HTMLDivElement>(null);

  const creditsRef =
    useRef<HTMLDivElement>(null);

  const viewerRef =
    useRef<Viewer | null>(null);

  const treePrimitivesRef =
    useRef<PrimitiveCollection | null>(
      null,
    );

  const crownPrimitivesRef =
    useRef<
      Partial<
        Record<
          TreeShape,
          Primitive
        >
      >
    >({});

  const treeShapeByIdRef =
    useRef<
      Map<
        string,
        TreeShape
      >
    >(new Map());

  const treesRef =
    useRef<Tree[]>(trees);

  const visibleTreesRef =
    useRef<Tree[]>(
      visibleTrees,
    );

  const planRef =
    useRef(plan);

  const onSelectRef =
    useRef(onSelectTree);

  const onSelectLandmarkRef =
    useRef(onSelectLandmark);

  const [revision, setRevision] =
    useState(0);

  const [phase, setPhase] =
    useState<
      "loading" |
      "ready" |
      "error"
    >("loading");

  const [
    mapHoveredTreeId,
    setMapHoveredTreeId,
  ] =
    useState<string | null>(
      null,
    );

  const [tooltip, setTooltip] =
    useState<MapTooltip | null>(
      null,
    );

  useEffect(() => {
    treesRef.current =
      trees;

    visibleTreesRef.current =
      visibleTrees;

    planRef.current =
      plan;

    onSelectRef.current =
      onSelectTree;

    onSelectLandmarkRef.current =
      onSelectLandmark;
  }, [
    trees,
    visibleTrees,
    plan,
    onSelectTree,
    onSelectLandmark,
  ]);

  /*
   * Viewer Cesium
   */
  useEffect(() => {
    if (
      !elementRef.current ||
      !creditsRef.current
    ) {
      return;
    }

    setPhase("loading");

    let viewer:
      | Viewer
      | undefined;

    let interactions:
      | ScreenSpaceEventHandler
      | undefined;

    const cleanups:
      Array<() => void> =
      [];

    let stopped = false;

    try {
      const contextLayer =
        new ImageryLayer(
          new UrlTemplateImageryProvider({
            url:
              "https://public.sig.rennesmetropole.fr/" +
              "geowebcache/service/tms/1.0.0/" +
              "ref_fonds%3Apvci_simple_gris@" +
              "EPSG%3A3857@png/{z}/{x}/{reverseY}.png",

            maximumLevel: 22,

            credit: new Credit(
              "© Rennes Métropole — Plan de ville simplifié gris",
            ),
          }),
        );

      contextLayer.alpha =
        0.72;

      viewer =
        new Viewer(
          elementRef.current,
          {
            animation: false,
            baseLayer:
              contextLayer,
            baseLayerPicker:
              false,
            fullscreenButton:
              false,
            geocoder: false,
            homeButton: false,
            infoBox: false,
            navigationHelpButton:
              false,
            sceneModePicker:
              false,
            selectionIndicator:
              false,
            timeline: false,
            creditContainer:
              creditsRef.current,
            showRenderLoopErrors:
              false,

            /*
             * Plus raisonnable sur mobile
             * que le rendu forcé très dense.
             */
            useBrowserRecommendedResolution:
              true,

            requestRenderMode:
              true,

            maximumRenderTimeChange:
              Number.POSITIVE_INFINITY,

            shouldAnimate:
              false,
          },
        );

      viewerRef.current =
        viewer;

      viewer.resolutionScale =
        1;

      viewer.scene.backgroundColor =
        Color.fromCssColorString(
          "#e8efe5",
        );

      viewer.scene.globe.baseColor =
        Color.fromCssColorString(
          "#e8efe5",
        );

      viewer.scene.skyBox.show =
        false;

      viewer.scene.sun.show =
        false;

      viewer.scene.moon.show =
        false;

      viewer.scene.screenSpaceCameraController.minimumZoomDistance =
        8;

      setParkView(
        viewer,
        plan?.bbox ??
        PARK_PLAN_BOUNDS,
      );

      let firstFrame =
        true;

      cleanups.push(
        viewer.scene.postRender.addEventListener(
          () => {
            if (
              firstFrame &&
              !stopped
            ) {
              firstFrame =
                false;

              setPhase(
                "ready",
              );
            }
          },
        ),
      );

      cleanups.push(
        viewer.scene.renderError.addEventListener(
          (error) => {
            console.error(
              "Erreur de rendu Cesium",
              error,
            );

            if (!stopped) {
              setPhase(
                "error",
              );
            }
          },
        ),
      );

      viewer.screenSpaceEventHandler.removeInputAction(
        ScreenSpaceEventType.LEFT_DOUBLE_CLICK,
      );

      interactions =
        new ScreenSpaceEventHandler(
          viewer.scene.canvas,
        );

      interactions.setInputAction(
        (
          event:
            ScreenSpaceEventHandler.PositionedEvent,
        ) => {
          const picked =
            viewer?.scene.pick(
              event.position,
            );

          const id =
            getPickedId(
              picked,
            );

          const tree =
            visibleTreesRef.current.find(
              (item) =>
                item.id === id,
            );

          if (tree) {
            onSelectRef.current(
              tree,
            );

            return;
          }

          const landmark =
            planRef.current
              ?.features.find(
                (
                  feature,
                ): feature is ParkLandmark =>
                  isParkLandmark(
                    feature,
                  ) &&
                  feature.id ===
                  id,
              );

          if (landmark) {
            onSelectLandmarkRef.current(
              landmark,
            );
          }
        },
        ScreenSpaceEventType.LEFT_CLICK,
      );

      interactions.setInputAction(
        (
          event:
            ScreenSpaceEventHandler.MotionEvent,
        ) => {
          const picked =
            viewer?.scene.pick(
              event.endPosition,
            );

          const id =
            getPickedId(
              picked,
            );

          const tree =
            visibleTreesRef.current.find(
              (item) =>
                item.id === id,
            );

          const landmark =
            planRef.current
              ?.features.find(
                (
                  feature,
                ): feature is ParkLandmark =>
                  isParkLandmark(
                    feature,
                  ) &&
                  feature.id ===
                  id,
              );

          viewer!.scene.canvas.style.cursor =
            tree ||
              landmark
              ? "pointer"
              : "";

          setMapHoveredTreeId(
            (current) =>
              current ===
                tree?.id
                ? current
                : tree?.id ??
                null,
          );

          if (tree) {
            const measurements =
              tree as TreeMeasurements;

            setTooltip({
              name: tree.name,

              count: treesRef.current.filter(
                (item) => item.species === tree.species,
              ).length,

              height: tree.height,
              circumference: tree.circumference,
              crownDiameter:
                measurements.crownDiameter ?? null,

              x: event.endPosition.x,
              y: event.endPosition.y,
            });

            return;
          }

          if (landmark) {
            setTooltip({
              name:
                landmark
                  .properties
                  .label,

              x:
                event
                  .endPosition.x,

              y:
                event
                  .endPosition.y,
            });

            return;
          }

          setTooltip(null);
        },
        ScreenSpaceEventType.MOUSE_MOVE,
      );

      const hideTooltip =
        () => {
          viewer?.scene.canvas.style.removeProperty(
            "cursor",
          );

          setMapHoveredTreeId(
            null,
          );

          setTooltip(
            null,
          );
        };

      viewer.scene.canvas.addEventListener(
        "mouseleave",
        hideTooltip,
      );

      cleanups.push(
        () =>
          viewer?.scene.canvas.removeEventListener(
            "mouseleave",
            hideTooltip,
          ),
      );
    } catch (error) {
      console.error(
        "Erreur de démarrage Cesium",
        error,
      );

      setPhase("error");
    }

    return () => {
      stopped = true;

      cleanups.forEach(
        (cleanup) =>
          cleanup(),
      );

      interactions?.destroy();

      treePrimitivesRef.current =
        null;

      crownPrimitivesRef.current =
        {};

      treeShapeByIdRef.current.clear();

      if (
        viewer &&
        !viewer.isDestroyed()
      ) {
        viewer.destroy();
      }

      viewerRef.current =
        null;
    };
  }, [revision]);

  /*
   * Plan et bâtiments.
   *
   * On garde le système Entity actuel
   * pour ceux-ci. Les arbres, eux,
   * sont dans des Primitive séparées.
   */
  useEffect(() => {
    const viewer =
      viewerRef.current;

    if (!viewer) {
      return;
    }

    viewer.entities.suspendEvents();

    try {
      viewer.entities.removeAll();

      plan?.features.forEach(
        (feature) => {
          if (
            feature.geometry.type ===
            "MultiPolygon"
          ) {
            feature.geometry.coordinates.forEach(
              (
                polygon,
                index,
              ) => {
                const [
                  outer,
                  ...holes
                ] = polygon;

                const outlinePositions =
                  positions(
                    outer,
                  );

                viewer.entities.add({
                  id:
                    `${feature.id}-${index}`,

                  polygon: {
                    hierarchy:
                      new PolygonHierarchy(
                        outlinePositions,

                        holes.map(
                          (
                            hole,
                          ) =>
                            new PolygonHierarchy(
                              positions(
                                hole,
                              ),
                            ),
                        ),
                      ),

                    material:
                      Color.fromCssColorString(
                        "#d9e9d5",
                      ).withAlpha(
                        0.88,
                      ),

                    height:
                      PLAN_HEIGHT,
                  },
                });

                viewer.entities.add({
                  id:
                    `${feature.id}-${index}-outline`,

                  polyline: {
                    positions:
                      outlinePositions,

                    width: 2,

                    material:
                      Color.fromCssColorString(
                        "#789b79",
                      ),
                  },
                });
              },
            );

            return;
          }

          if (
            feature.geometry.type ===
            "Polygon" &&
            isParkLandmark(feature)
          ) {
            const [
              outer,
              ...holes
            ] =
              feature.geometry
                .coordinates;

            const structureHeight =
              PLAN_HEIGHT +
              feature.properties
                .height_m;

            const building =
              feature.properties
                .kind ===
              "building";

            const wall =
              Color.fromCssColorString(
                building
                  ? "#a9745d"
                  : "#b88d45",
              ).withAlpha(
                0.94,
              );

            const roof =
              Color.fromCssColorString(
                building
                  ? "#704738"
                  : "#7c5a2d",
              ).withAlpha(
                0.98,
              );

            const hierarchy =
              new PolygonHierarchy(
                positions(
                  outer,
                ),

                holes.map(
                  (
                    hole,
                  ) =>
                    new PolygonHierarchy(
                      positions(
                        hole,
                      ),
                    ),
                ),
              );

            viewer.entities.add({
              id:
                feature.id,

              name:
                feature.properties
                  .label,

              polygon: {
                hierarchy,
                material:
                  wall,
                height:
                  PLAN_HEIGHT +
                  0.03,
                extrudedHeight:
                  structureHeight,
              },
            });

            viewer.entities.add({
              id:
                `${feature.id}-roof`,

              polygon: {
                hierarchy,
                material:
                  roof,
                height:
                  structureHeight +
                  0.03,
              },
            });

            viewer.entities.add({
              id:
                `${feature.id}-roof-outline`,

              polyline: {
                positions:
                  positions(
                    outer,
                    structureHeight +
                    0.06,
                  ),

                width: 1.8,

                material:
                  Color.fromCssColorString(
                    "#f7eddd",
                  ),
              },
            });

            return;
          }

          if (
            feature.geometry.type ===
            "Polygon"
          ) {
            const [
              outer,
              ...holes
            ] =
              feature.geometry
                .coordinates;

            const outlinePositions =
              positions(
                outer,
              );

            viewer.entities.add({
              id:
                feature.id,

              polygon: {
                hierarchy:
                  new PolygonHierarchy(
                    outlinePositions,

                    holes.map(
                      (
                        hole,
                      ) =>
                        new PolygonHierarchy(
                          positions(
                            hole,
                          ),
                        ),
                    ),
                  ),

                material:
                  Color.fromCssColorString(
                    "#9fc5d0",
                  ).withAlpha(
                    0.94,
                  ),

                height:
                  PLAN_HEIGHT +
                  0.01,
              },
            });

            viewer.entities.add({
              id:
                `${feature.id}-outline`,

              polyline: {
                positions:
                  outlinePositions,

                width: 1.5,

                material:
                  Color.fromCssColorString(
                    "#6f9eaa",
                  ),
              },
            });

            return;
          }

          viewer.entities.add({
            id:
              feature.id,

            polyline: {
              positions:
                positions(
                  feature.geometry
                    .coordinates,
                ),

              width: 2.8,

              material:
                Color.fromCssColorString(
                  "#f9f5e9",
                ),
            },
          });
        },
      );
    } finally {
      viewer.entities.resumeEvents();
    }

    viewer.scene.requestRender();
  }, [
    plan,
    revision,
  ]);

  /*
   * ARBRES 3D
   *
   * Une Primitive pour les troncs +
   * une Primitive par type de houppier.
   *
   * Pas une Entity par arbre :
   * beaucoup plus léger.
   */
  useEffect(() => {
    const viewer =
      viewerRef.current;

    if (!viewer) {
      return;
    }

    if (
      treePrimitivesRef.current
    ) {
      viewer.scene.primitives.remove(
        treePrimitivesRef.current,
      );

      treePrimitivesRef.current =
        null;
    }

    crownPrimitivesRef.current =
      {};

    treeShapeByIdRef.current =
      new Map();

    const collection =
      new PrimitiveCollection();

    viewer.scene.primitives.add(
      collection,
    );

    treePrimitivesRef.current =
      collection;

    const visibleIds =
      new Set(
        visibleTrees.map(
          (tree) =>
            tree.id,
        ),
      );

    const trunkGeometry =
      new CylinderGeometry({
        length: 1,

        topRadius: 1,

        bottomRadius: 1,

        slices: 8,

        vertexFormat:
          PerInstanceColorAppearance.VERTEX_FORMAT,
      });

    const ellipsoidGeometry =
      new EllipsoidGeometry({
        radii:
          new Cartesian3(
            1,
            1,
            1,
          ),

        stackPartitions: 7,

        slicePartitions: 10,

        vertexFormat:
          PerInstanceColorAppearance.VERTEX_FORMAT,
      });

    const conicalGeometry =
      new CylinderGeometry({
        length: 1,

        topRadius: 0.07,

        bottomRadius: 1,

        slices: 10,

        vertexFormat:
          PerInstanceColorAppearance.VERTEX_FORMAT,
      });

    const trunks:
      GeometryInstance[] =
      [];

    const crowns:
      Record<
        TreeShape,
        GeometryInstance[]
      > = {
      round: [],
      conical: [],
      columnar: [],
      spreading: [],
      compact: [],
    };

    for (
      const tree of trees
    ) {
      if (
        !visibleIds.has(
          tree.id,
        )
      ) {
        continue;
      }

      const shape =
        getTreeShape(
          tree,
        );

      treeShapeByIdRef.current.set(
        tree.id,
        shape,
      );

      const {
        trunkHeight,
        trunkRadius,
        crownHeight,
        crownRadiusX,
        crownRadiusY,
      } =
        getTreeProportions(
          tree,
        );

      const trunkCenter =
        trunkHeight / 2;

      const crownCenter =
        trunkHeight +
        crownHeight / 2;

      /*
       * Tronc
       */
      trunks.push(
        new GeometryInstance({
          id:
            tree.id,

          geometry:
            trunkGeometry,

          modelMatrix:
            makeTreeMatrix(
              tree,

              trunkCenter,

              trunkRadius,

              trunkRadius,

              Math.max(
                0.5,
                trunkHeight,
              ),
            ),

          attributes: {
            color:
              ColorGeometryInstanceAttribute.fromColor(
                TREE_TRUNK_COLOR,
              ),
          },
        }),
      );

      /*
       * Houppier
       */
      crowns[
        shape
      ].push(
        new GeometryInstance({
          id:
            tree.id,

          geometry:
            shape ===
              "conical"
              ? conicalGeometry
              : ellipsoidGeometry,

          modelMatrix:
            makeTreeMatrix(
              tree,

              crownCenter,

              crownRadiusX,

              crownRadiusY,

              shape ===
                "conical"
                ? crownHeight
                : crownHeight /
                2,
            ),

          attributes: {
            color:
              ColorGeometryInstanceAttribute.fromColor(
                getBaseCrownColor(
                  tree,
                ),
              ),
          },
        }),
      );
    }

    if (
      trunks.length > 0
    ) {
      collection.add(
        new Primitive({
          geometryInstances:
            trunks,

          appearance:
            new PerInstanceColorAppearance(
              {
                flat: true,

                translucent:
                  false,

                closed:
                  true,
              },
            ),

          asynchronous:
            false,

          allowPicking:
            true,

          releaseGeometryInstances:
            false,
        }),
      );
    }

    const shapes:
      TreeShape[] = [
        "round",
        "conical",
        "columnar",
        "spreading",
        "compact",
      ];

    for (
      const shape of
      shapes
    ) {
      const instances =
        crowns[shape];

      if (
        instances.length === 0
      ) {
        continue;
      }

      const primitive =
        new Primitive({
          geometryInstances:
            instances,

          appearance:
            new PerInstanceColorAppearance(
              {
                flat: true,

                /*
                 * Pas de transparence :
                 * choix volontaire.
                 */
                translucent:
                  false,

                closed:
                  true,
              },
            ),

          asynchronous:
            false,

          allowPicking:
            true,

          releaseGeometryInstances:
            false,
        });

      collection.add(
        primitive,
      );

      crownPrimitivesRef.current[
        shape
      ] =
        primitive;
    }

    viewer.scene.requestRender();

    return () => {
      if (
        !viewer.isDestroyed() &&
        treePrimitivesRef.current ===
        collection
      ) {
        viewer.scene.primitives.remove(
          collection,
        );

        treePrimitivesRef.current =
          null;

        crownPrimitivesRef.current =
          {};

        treeShapeByIdRef.current.clear();
      }
    };
  }, [
    trees,
    visibleTrees,
    revision,
  ]);

  /*
   * Hover / sélection :
   *
   * on modifie uniquement la couleur
   * de l'instance. On ne reconstruit
   * jamais les géométries ici.
   */
  useEffect(() => {
    const viewer =
      viewerRef.current;

    if (!viewer) {
      return;
    }

    const activeHoveredTreeId =
      hoveredTreeId ??
      mapHoveredTreeId;

    const hoveredTree =
      trees.find(
        (tree) =>
          tree.id ===
          activeHoveredTreeId,
      ) ?? null;

    const highlightedTaxon =
      hoveredTree ??
      selectedTree;

    const visibleIds =
      new Set(
        visibleTrees.map(
          (tree) =>
            tree.id,
        ),
      );

    const applyColors =
      () => {
        for (
          const tree of trees
        ) {
          if (
            !visibleIds.has(
              tree.id,
            )
          ) {
            continue;
          }

          const shape =
            treeShapeByIdRef.current.get(
              tree.id,
            );

          if (!shape) {
            continue;
          }

          const primitive =
            crownPrimitivesRef.current[
            shape
            ];

          if (
            !primitive ||
            !primitive.ready
          ) {
            continue;
          }

          let attributes;

          try {
            attributes =
              primitive.getGeometryInstanceAttributes(
                tree.id,
              );
          } catch {
            continue;
          }

          if (
            !attributes?.color
          ) {
            continue;
          }

          const highlight =
            treeHighlight(
              tree,

              selectedTree?.id ??
              null,

              highlightedTaxon,
            );

          let color =
            getBaseCrownColor(
              tree,
            );

          if (
            highlight ===
            "selected"
          ) {
            color =
              TREE_SELECTED_COLOR;
          } else if (
            highlight ===
            "hovered"
          ) {
            color =
              TREE_HOVER_COLOR;
          } else if (
            highlight ===
            "same_species"
          ) {
            /*
             * Même espèce :
             * bleu, mais variations
             * conservées.
             */
            color =
              getFilteredCrownColor(
                tree,
              );
          } else if (
            filtersActive
          ) {
            /*
             * Un filtre actif conserve
             * des différences entre les
             * arbres au lieu de tous les
             * rendre exactement bleus.
             */
            color =
              getFilteredCrownColor(
                tree,
              );
          }

          attributes.color =
            ColorGeometryInstanceAttribute.toValue(
              color,
              attributes.color,
            );
        }

        viewer.scene.requestRender();
      };

    const primitives =
      Object.values(
        crownPrimitivesRef.current,
      ).filter(
        (
          primitive,
        ): primitive is Primitive =>
          Boolean(primitive),
      );

    if (
      primitives.every(
        (primitive) =>
          primitive.ready,
      )
    ) {
      applyColors();
      return;
    }

    const removeListener =
      viewer.scene.postRender.addEventListener(
        () => {
          const current =
            Object.values(
              crownPrimitivesRef.current,
            ).filter(
              (
                primitive,
              ): primitive is Primitive =>
                Boolean(
                  primitive,
                ),
            );

          if (
            !current.every(
              (primitive) =>
                primitive.ready,
            )
          ) {
            return;
          }

          removeListener();

          applyColors();
        },
      );

    viewer.scene.requestRender();

    return () => {
      removeListener();
    };
  }, [
    trees,
    visibleTrees,
    selectedTree,
    hoveredTreeId,
    mapHoveredTreeId,
    filtersActive,
    revision,
  ]);

  /*
   * Recentrage quand le plan change.
   */
  useEffect(() => {
    const viewer =
      viewerRef.current;

    if (
      !viewer ||
      !plan
    ) {
      return;
    }

    setParkView(
      viewer,
      plan.bbox,
    );

    viewer.scene.requestRender();
  }, [plan]);

  /*
   * Bouton "Recentrer".
   */
  useEffect(() => {
    const viewer =
      viewerRef.current;

    if (
      !viewer ||
      recenter === 0
    ) {
      return;
    }

    viewer.camera.cancelFlight();

    setParkView(
      viewer,
      plan?.bbox ??
      PARK_PLAN_BOUNDS,
    );

    viewer.scene.requestRender();
  }, [
    recenter,
    plan,
  ]);

  return (
    <>
      <div
        ref={elementRef}
        className="cesium-map"
        data-map-state={
          phase
        }
        data-visible-count={
          visibleTrees.length
        }
        data-plan-features={
          plan?.features.length ??
          0
        }
        aria-label="Carte interactive du Parc Oberthür"
      />

      <div
        ref={creditsRef}
        className="map-credits"
      />

      {tooltip && (
        <div
          className="map-tooltip"
          style={{
            left: tooltip.x + 13,
            top: tooltip.y - 10,
          }}
          role="status"
        >
          <strong>
            {tooltip.name}
            {tooltip.count !== undefined && ` (${tooltip.count})`}
          </strong>

          <br />

          {tooltip.height != null && (
            <>↕ {tooltip.height} m</>
          )}

          {tooltip.circumference != null && (
            <> · ⟳ {tooltip.circumference} cm</>
          )}

          {tooltip.crownDiameter != null && (
            <> · ⌀ {tooltip.crownDiameter} m</>
          )}
        </div>
      )}

      {phase ===
        "error" ? (
        <div
          className="map-notice"
          role="alert"
        >
          <p>
            La carte 3D est
            indisponible.
            Vérifiez que WebGL
            est activé ; la
            liste et les fiches
            restent accessibles.
          </p>

          <button
            onClick={() =>
              setRevision(
                (value) =>
                  value + 1,
              )
            }
          >
            Réessayer la carte
          </button>
        </div>
      ) : (
        phase ===
        "loading" && (
          <div
            className="map-loading"
            role="status"
          >
            Chargement du plan
            du parc…
          </div>
        )
      )}
    </>
  );
}