import { useEffect, useRef, useState } from "react";
import {
  BoundingSphere,
  CallbackProperty,
  Cartesian3,
  Color,
  ColorGeometryInstanceAttribute,
  ComponentDatatype,
  CylinderGeometry,
  DirectionalLight,
  EllipsoidGeometry,
  Geometry,
  GeometryAttribute,
  GeometryAttributes,
  GeometryInstance,
  HeadingPitchRange,
  HeadingPitchRoll,
  Math as CesiumMath,
  Matrix3,
  Matrix4,
  PerInstanceColorAppearance,
  PolygonHierarchy,
  Primitive,
  PrimitiveCollection,
  PrimitiveType,
  Quaternion,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
  Transforms,
  TranslationRotationScale,
  Viewer,
} from "cesium";

import {
  TREE_COLORS,
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
  focusTreeId: string | null;
  focusRequest: number;
  viewMode: "2d" | "3d";
  onChangeViewMode: () => void;
  isMobile: boolean;
  hoveredTreeId: string | null;
  onSelectTree: (tree: Tree) => void;
  onSelectLandmark: (landmark: ParkLandmark) => void;
  onRecenter: () => void;
  recenter: number;
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

type CrownPlacement = {
  centerZ: number;
  scaleZ: number;
  trunkOverlap: number;
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
  Color.fromCssColorString("#d99020");

const TREE_HOVER_COLOR =
  Color.fromCssColorString("#f2b84b");

const ORGANIC_CROWN_MAX_LOBE_COUNT = 4;

function makeTreeTooltip(tree: Tree, count: number, x: number, y: number): MapTooltip {
  return {
    name: tree.name,
    count,
    height: tree.height,
    circumference: tree.circumference,
    crownDiameter: tree.crownDiameter,
    x,
    y,
  };
}

function isInsideMapCanvas(viewer: Viewer, position: { x: number; y: number }) {
  const { clientWidth, clientHeight } = viewer.scene.canvas;
  return position.x >= 0 && position.y >= 0 && position.x < clientWidth && position.y < clientHeight;
}

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
  viewMode: "2d" | "3d" = "3d",
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
      CesiumMath.toRadians(viewMode === "2d" ? -87 : -70),
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
  const value = tree.crownDiameter;

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

  const value = tree.firstLeafHeight;

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

function treeRandom(
  tree: Tree,
  salt: number,
) {
  let value =
    hashTree(tree) ^
    Math.imul(salt + 1, 0x9e3779b1);

  value ^= value >>> 16;
  value = Math.imul(value, 0x85ebca6b);
  value ^= value >>> 13;

  return (value >>> 0) / 0x1_0000_0000;
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
    TREE_COLORS.normal,
  );
}

function getCrownLayerColor(
  tree: Tree,
  shade: number,
) {
  const base =
    getBaseCrownColor(tree);

  return Color.lerp(
    base,
    shade < 0
      ? Color.BLACK
      : Color.WHITE,
    Math.abs(shade),
    new Color(),
  );
}

function getRelatedCrownColor(
  tree: Tree,
) {
  return Color.lerp(
    getBaseCrownColor(tree),
    TREE_HOVER_COLOR,
    0.72,
    new Color(),
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

/*
 * Le tronc doit entrer dans le houppier : un simple contact ponctuel
 * au bas d'un ellipsoïde le fait paraître suspendu. La couronne conserve
 * donc sa base botanique ; c'est le tronc qui y entre légèrement.
 */
function getCrownPlacement(
  trunkHeight: number,
  crownHeight: number,
  shape: TreeShape,
): CrownPlacement {
  const overlap = Math.min(
    1.2,
    Math.max(
      0.25,
      crownHeight * 0.1,
    ),
  );

  return {
    centerZ:
      trunkHeight +
      crownHeight / 2,
    scaleZ:
      shape === "conical"
        ? crownHeight
        : crownHeight / 2,
    trunkOverlap: overlap,
  };
}

function makeTreeMatrix(
  tree: Tree,
  translationZ: number,
  scaleX: number,
  scaleY: number,
  scaleZ: number,
  translationX = 0,
  translationY = 0,
  headingOffset = 0,
  pitch = 0,
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
        treeRotation(tree) +
        headingOffset,
        pitch,
        0,
      ),
    );

  const trs =
    new TranslationRotationScale();

  trs.translation =
    new Cartesian3(
      translationX,
      translationY,
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

function getTreeLocalDirection(
  tree: Tree,
  headingOffset: number,
  pitch: number,
) {
  const rotation =
    Quaternion.fromHeadingPitchRoll(
      new HeadingPitchRoll(
        treeRotation(tree) +
        headingOffset,
        pitch,
        0,
      ),
    );

  return Matrix3.multiplyByVector(
    Matrix3.fromQuaternion(
      rotation,
      new Matrix3(),
    ),
    Cartesian3.UNIT_Z,
    new Cartesian3(),
  );
}

function crownLobeId(
  treeId: string,
  lobeIndex: number,
) {
  return `${treeId}--crown-lobe-${lobeIndex}`;
}

function coniferTierId(
  treeId: string,
  tierIndex: number,
) {
  return `${treeId}--conifer-tier-${tierIndex}`;
}

function getCrownInstanceIds(
  tree: Tree,
  shape: TreeShape,
) {
  const ids = [tree.id];

  if (hasOrganicCrownLobes(shape)) {
    for (
      let index = 1;
      index <= getOrganicCrownLobeCount(tree);
      index += 1
    ) {
      ids.push(crownLobeId(tree.id, index));
    }
  }

  if (shape === "conical") {
    for (
      let index = 1;
      index < getConiferTierCount(tree);
      index += 1
    ) {
      ids.push(coniferTierId(tree.id, index));
    }
  }

  return ids;
}

function getCrownPartShade(
  tree: Tree,
  shape: TreeShape,
  partIndex: number,
) {
  if (shape === "conical") {
    return [-0.14, -0.075, -0.015, 0.05][partIndex] ?? 0;
  }

  if (hasOrganicCrownLobes(shape)) {
    const base =
      [-0.1, 0.04, -0.025, 0.06, 0.015][partIndex] ?? 0;

    return base +
      (treeRandom(tree, partIndex + 30) - 0.5) *
      0.045;
  }

  return 0;
}

function hasOrganicCrownLobes(
  shape: TreeShape,
) {
  /*
   * Les feuillus gagnent une silhouette moins
   * parfaite avec quelques volumes secondaires.
   * Les conifères et les arbres colonnaires
   * restent volontairement lisibles d'un coup d'œil.
   */
  return (
    shape === "round" ||
    shape === "spreading" ||
    shape === "compact"
  );
}

function getOrganicCrownLobeCount(
  tree: Tree,
) {
  return 2 +
    Math.floor(
      treeRandom(tree, 20) * 3,
    );
}

function getConiferTierCount(
  tree: Tree,
) {
  return 3 +
    Math.floor(
      treeRandom(tree, 12) * 2,
    );
}

function getConiferTiers(
  tree: Tree,
  crownRadiusX: number,
  crownRadiusY: number,
  trunkHeight: number,
  crownHeight: number,
) {
  const tierCount =
    getConiferTierCount(tree);

  return Array.from(
    { length: tierCount },
    (_, index) => {
      const heightFactor =
        0.54 -
        index * 0.075;
      const centreFactor =
        Math.min(
          1 - heightFactor / 2,
          0.27 + index * 0.235,
        );
      const radiusFactor =
        0.96 -
        index *
        0.54 /
        Math.max(1, tierCount - 1);
      const variationX =
        0.94 +
        treeRandom(tree, index + 60) * 0.12;
      const variationY =
        0.94 +
        treeRandom(tree, index + 70) * 0.12;

      return {
        centerZ:
          trunkHeight +
          crownHeight *
          centreFactor,
        scaleX:
          crownRadiusX *
          radiusFactor *
          variationX,
        scaleY:
          crownRadiusY *
          radiusFactor *
          variationY,
        scaleZ:
          crownHeight *
          heightFactor,
        x:
          (treeRandom(tree, index + 80) - 0.5) *
          crownRadiusX *
          0.065,
        y:
          (treeRandom(tree, index + 90) - 0.5) *
          crownRadiusY *
          0.065,
      };
    },
  );
}

function getOrganicCrownLobes(
  tree: Tree,
  crownRadiusX: number,
  crownRadiusY: number,
  crownHeight: number,
  crownScaleZ: number,
) {
  const lobeCount =
    getOrganicCrownLobeCount(tree);
  const rotation =
    treeRandom(tree, 21) *
    Math.PI * 2;

  return Array.from(
    { length: lobeCount },
    (_, index) => {
      const angle =
        rotation +
        index / lobeCount * Math.PI * 2 +
        (treeRandom(tree, index + 22) - 0.5) *
        0.42;
      const distance =
        0.2 +
        treeRandom(tree, index + 26) * 0.18;

      return {
        x:
          Math.cos(angle) *
          crownRadiusX *
          distance,
        y:
          Math.sin(angle) *
          crownRadiusY *
          distance,
        z:
          (treeRandom(tree, index + 34) - 0.47) *
          crownHeight *
          0.22,
        scaleX:
          crownRadiusX *
          (0.4 + treeRandom(tree, index + 38) * 0.16),
        scaleY:
          crownRadiusY *
          (0.4 + treeRandom(tree, index + 42) * 0.16),
        scaleZ:
          crownScaleZ *
          (0.43 + treeRandom(tree, index + 46) * 0.17),
      };
    },
  );
}

function getMainBranches(
  tree: Tree,
  shape: TreeShape,
  trunkHeight: number,
  crownHeight: number,
  crownRadiusX: number,
  crownRadiusY: number,
) {
  if (
    !hasOrganicCrownLobes(shape) ||
    trunkHeight < 2 ||
    crownHeight < 4
  ) {
    return [];
  }

  const count =
    3 +
    Math.floor(
      treeRandom(tree, 100) * 2,
    );
  const baseRotation =
    treeRandom(tree, 101) *
    Math.PI * 2;
  const crownRadius =
    Math.min(crownRadiusX, crownRadiusY);

  return Array.from(
    { length: count },
    (_, index) => {
      const heading =
        baseRotation +
        index / count * Math.PI * 2 +
        (treeRandom(tree, index + 102) - 0.5) *
        0.22;
      const length =
        Math.max(
          1.2,
          Math.min(
            crownRadius *
            (0.42 + treeRandom(tree, index + 108) * 0.16),
            crownHeight * 0.42,
          ),
        );
      const pitch =
        CesiumMath.toRadians(
          42 +
          treeRandom(tree, index + 114) * 12,
        );
      return {
        startZ:
          trunkHeight *
          (0.84 + treeRandom(tree, index + 120) * 0.1),
        length,
        heading,
        pitch,
        radius:
          0.055 +
          Math.min(
            0.12,
            crownRadius * 0.012,
          ),
      };
    },
  );
}

type CrownProfilePoint = {
  z: number;
  radius: number;
};

/*
 * Ces profils donnent une silhouette volontairement dessinée : bords
 * doucement festonnés pour les feuillus, étages fondus dans une seule forme
 * pour les conifères. Ils remplacent les sphères et cônes génériques tout en
 * restant des géométries partagées par les arbres d'un même type.
 */
function getStylizedCrownProfile(
  shape: TreeShape,
): {
  profile: CrownProfilePoint[];
  lobeCount: number;
  lobeDepth: number;
} {
  if (shape === "conical") {
    return {
      profile: [
        { z: -0.43, radius: 0.88 },
        { z: -0.28, radius: 0.66 },
        { z: -0.18, radius: 0.72 },
        { z: -0.03, radius: 0.46 },
        { z: 0.06, radius: 0.52 },
        { z: 0.19, radius: 0.3 },
        { z: 0.27, radius: 0.34 },
        { z: 0.42, radius: 0.1 },
      ],
      lobeCount: 6,
      lobeDepth: 0.055,
    };
  }

  if (shape === "spreading") {
    return {
      profile: [
        { z: -0.8, radius: 0.3 },
        { z: -0.57, radius: 0.78 },
        { z: -0.25, radius: 1.05 },
        { z: 0.1, radius: 1.1 },
        { z: 0.42, radius: 0.88 },
        { z: 0.72, radius: 0.5 },
        { z: 0.9, radius: 0.2 },
      ],
      lobeCount: 7,
      lobeDepth: 0.075,
    };
  }

  if (shape === "compact") {
    return {
      profile: [
        { z: -0.8, radius: 0.3 },
        { z: -0.55, radius: 0.72 },
        { z: -0.15, radius: 0.94 },
        { z: 0.25, radius: 0.9 },
        { z: 0.62, radius: 0.61 },
        { z: 0.88, radius: 0.22 },
      ],
      lobeCount: 5,
      lobeDepth: 0.09,
    };
  }

  if (shape === "columnar") {
    return {
      profile: [
        { z: -0.88, radius: 0.28 },
        { z: -0.55, radius: 0.55 },
        { z: -0.08, radius: 0.63 },
        { z: 0.36, radius: 0.5 },
        { z: 0.73, radius: 0.26 },
      ],
      lobeCount: 5,
      lobeDepth: 0.045,
    };
  }

  return {
    profile: [
      { z: -0.82, radius: 0.34 },
      { z: -0.58, radius: 0.72 },
      { z: -0.2, radius: 1 },
      { z: 0.2, radius: 0.98 },
      { z: 0.56, radius: 0.76 },
      { z: 0.83, radius: 0.37 },
    ],
    lobeCount: 6,
    lobeDepth: 0.075,
  };
}

function createStylizedCrownGeometry(
  shape: TreeShape,
) {
  const {
    profile,
    lobeCount,
    lobeDepth,
  } = getStylizedCrownProfile(shape);
  const slices = 24;
  const positions: number[] = [0, 0, shape === "conical" ? -0.5 : -1];
  const normals: number[] = [0, 0, -1];
  const indices: number[] = [];

  for (
    let ringIndex = 0;
    ringIndex < profile.length;
    ringIndex += 1
  ) {
    const point = profile[ringIndex];
    const previous = profile[Math.max(0, ringIndex - 1)];
    const next = profile[Math.min(profile.length - 1, ringIndex + 1)];
    const radiusSlope =
      (next.radius - previous.radius) /
      (next.z - previous.z || 1);

    for (
      let slice = 0;
      slice < slices;
      slice += 1
    ) {
      const angle = slice / slices * Math.PI * 2;
      const scallop =
        1 +
        Math.cos(angle * lobeCount) *
        lobeDepth;
      const radius = point.radius * scallop;
      const normalLength = Math.hypot(1, radiusSlope);

      positions.push(
        Math.cos(angle) * radius,
        Math.sin(angle) * radius,
        point.z,
      );

      normals.push(
        Math.cos(angle) / normalLength,
        Math.sin(angle) / normalLength,
        -radiusSlope / normalLength,
      );
    }
  }

  const bottomIndex = 0;
  const firstRing = 1;
  const topIndex =
    firstRing +
    profile.length * slices;
  const topZ =
    shape === "conical" ? 0.5 : 1;

  positions.push(0, 0, topZ);
  normals.push(0, 0, 1);

  for (
    let slice = 0;
    slice < slices;
    slice += 1
  ) {
    const nextSlice =
      (slice + 1) % slices;

    indices.push(
      bottomIndex,
      firstRing + nextSlice,
      firstRing + slice,
    );

    for (
      let ringIndex = 0;
      ringIndex < profile.length - 1;
      ringIndex += 1
    ) {
      const lower =
        firstRing +
        ringIndex * slices +
        slice;
      const lowerNext =
        firstRing +
        ringIndex * slices +
        nextSlice;
      const upper = lower + slices;
      const upperNext = lowerNext + slices;

      indices.push(
        lower,
        lowerNext,
        upperNext,
        lower,
        upperNext,
        upper,
      );
    }

    const lastRing =
      firstRing +
      (profile.length - 1) * slices;

    indices.push(
      topIndex,
      lastRing + slice,
      lastRing + nextSlice,
    );
  }

  const positionValues =
    new Float64Array(positions);
  const attributes =
    new GeometryAttributes();

  attributes.position =
    new GeometryAttribute({
      componentDatatype: ComponentDatatype.DOUBLE,
      componentsPerAttribute: 3,
      values: positionValues,
    });

  attributes.normal =
    new GeometryAttribute({
      componentDatatype: ComponentDatatype.FLOAT,
      componentsPerAttribute: 3,
      values: new Float32Array(normals),
    });

  return new Geometry({
    attributes,
    indices: new Uint16Array(indices),
    primitiveType: PrimitiveType.TRIANGLES,
    boundingSphere: BoundingSphere.fromVertices(positions),
  });
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
    /(?:-(?:roof|roof-outline|label)|--(?:crown-lobe|branch|conifer-tier)-\d+)$/,
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
    focusTreeId,
    focusRequest,
    viewMode,
    onChangeViewMode,
    isMobile,
    hoveredTreeId,
    onSelectTree,
    onSelectLandmark,
    onRecenter,
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

  const isMobileRef = useRef(isMobile);

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

  const [cameraHeading, setCameraHeading] = useState(0);
  const displayedHeadingRef = useRef(0);

  useEffect(() => {
    treesRef.current =
      trees;

    visibleTreesRef.current =
      visibleTrees;

    planRef.current =
      plan;

    onSelectRef.current =
      onSelectTree;

    isMobileRef.current = isMobile;

    onSelectLandmarkRef.current =
      onSelectLandmark;
  }, [
    trees,
    visibleTrees,
    plan,
    onSelectTree,
    onSelectLandmark,
    isMobile,
  ]);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || phase !== "ready") return;

    // Cesium ne signale `camera.changed` qu'après un déplacement important
    // par défaut (50 %). La boussole doit suivre les petites rotations aussi.
    viewer.camera.percentageChanged = 0.01;
    displayedHeadingRef.current = viewer.camera.heading;

    const updateHeading = () => {
      const nextHeading = viewer.camera.heading;
      let delta = nextHeading - displayedHeadingRef.current;

      // Évite le saut de rotation lorsque le cap passe de +π à -π.
      while (delta > Math.PI) delta -= Math.PI * 2;
      while (delta < -Math.PI) delta += Math.PI * 2;

      displayedHeadingRef.current += delta;
      setCameraHeading(displayedHeadingRef.current);
    };

    updateHeading();
    return viewer.camera.changed.addEventListener(updateHeading);
  }, [phase, revision]);

  /* Centre le cadrage uniquement via le bouton ⌖ de la liste. */
  useEffect(() => {
    const viewer = viewerRef.current;
    const treeToFocus = focusTreeId ? trees.find((tree) => tree.id === focusTreeId) ?? null : null;
    if (!viewer || !treeToFocus) return;

    const proportions = getTreeProportions(treeToFocus);
    const radius = Math.max(proportions.crownRadiusX, proportions.crownRadiusY, 7);
    const centre = Cartesian3.fromDegrees(
      treeToFocus.longitude,
      treeToFocus.latitude,
      proportions.trunkHeight + proportions.crownHeight / 2,
    );

    viewer.camera.cancelFlight();
    viewer.camera.flyToBoundingSphere(new BoundingSphere(centre, radius), {
      duration: 0.75,
      offset: new HeadingPitchRange(
        CesiumMath.toRadians(6),
        CesiumMath.toRadians(-66),
        Math.max(28, radius * 2.8),
      ),
    });
  }, [trees, focusTreeId, focusRequest, revision]);

  /* Houppier temporairement rendu au premier plan lors d'un cadrage. */
  useEffect(() => {
    const viewer = viewerRef.current;
    const treeToFocus = focusTreeId ? trees.find((tree) => tree.id === focusTreeId) ?? null : null;
    if (!viewer || !treeToFocus || focusRequest === 0) return;

    const proportions = getTreeProportions(treeToFocus);
    const shape = getTreeShape(treeToFocus);
    const crownPlacement = getCrownPlacement(
      proportions.trunkHeight,
      proportions.crownHeight,
      shape,
    );
    const crownGeometry =
      createStylizedCrownGeometry(shape);
    const focusCrown = viewer.scene.primitives.add(new Primitive({
      geometryInstances: new GeometryInstance({
        geometry: crownGeometry,
        modelMatrix: makeTreeMatrix(
          treeToFocus,
          crownPlacement.centerZ,
          proportions.crownRadiusX,
          proportions.crownRadiusY,
          crownPlacement.scaleZ,
        ),
        attributes: { color: ColorGeometryInstanceAttribute.fromColor(TREE_SELECTED_COLOR) },
      }),
      appearance: new PerInstanceColorAppearance({
        flat: false,
        translucent: false,
        closed: true,
        renderState: { depthTest: { enabled: false } },
      }),
      asynchronous: false,
      releaseGeometryInstances: true,
    }));
    viewer.scene.requestRender();

    focusCrown.show = false;
    let flashes = 0;
    let removeTimer: number | undefined;
    const flashTimer = window.setInterval(() => {
      focusCrown.show = !focusCrown.show;
      if (focusCrown.show) flashes += 1;
      viewer.scene.requestRender();
      if (flashes === 3) {
        window.clearInterval(flashTimer);
        removeTimer = window.setTimeout(() => {
          if (!viewer.isDestroyed()) {
            viewer.scene.primitives.remove(focusCrown);
            viewer.scene.requestRender();
          }
        }, 180);
      }
    }, 180);

    return () => {
      window.clearInterval(flashTimer);
      if (removeTimer !== undefined) window.clearTimeout(removeTimer);
      if (!viewer.isDestroyed()) viewer.scene.primitives.remove(focusCrown);
    };
  }, [trees, focusTreeId, focusRequest, plan, revision]);

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

    let dragStart:
      | { x: number; y: number }
      | null = null;

    let draggedAt = 0;

    try {
      viewer =
        new Viewer(
          elementRef.current,
          {
            animation: false,
            /* Le fond SIG Rennes Métropole est désactivé par défaut. */
            baseLayer: false,
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

      /*
       * Une lumière fixe et douce rend les volumes lisibles sans
       * dépendre de l'heure de visite ni afficher le soleil Cesium.
       */
      viewer.scene.light =
        new DirectionalLight({
          direction:
            Cartesian3.normalize(
              new Cartesian3(
                0.35,
                0.55,
                -0.76,
              ),
              new Cartesian3(),
            ),
        });

      /* Adoucit les contours fins sans modifier les proportions réelles. */
      viewer.scene.postProcessStages.fxaa.enabled =
        true;

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
        (event: ScreenSpaceEventHandler.PositionedEvent) => {
          dragStart = event.position;
        },
        ScreenSpaceEventType.LEFT_DOWN,
      );

      interactions.setInputAction(
        (event: ScreenSpaceEventHandler.PositionedEvent) => {
          if (
            dragStart &&
            Math.hypot(
              event.position.x - dragStart.x,
              event.position.y - dragStart.y,
            ) > 24
          ) {
            draggedAt = Date.now();
          }
          dragStart = null;
        },
        ScreenSpaceEventType.LEFT_UP,
      );

      interactions.setInputAction(
        (
          event:
            ScreenSpaceEventHandler.PositionedEvent,
        ) => {
          if (Date.now() - draggedAt < 400) return;

          if (!isInsideMapCanvas(viewer!, event.position)) return;

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
          if (isMobileRef.current) {
            setMapHoveredTreeId(null);
            setTooltip(null);
            return;
          }

          if (!isInsideMapCanvas(viewer!, event.endPosition)) {
            setMapHoveredTreeId(null);
            setTooltip(null);
            return;
          }

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
            setTooltip(makeTreeTooltip(
              tree,
              treesRef.current.filter((item) => item.species === tree.species).length,
              event.endPosition.x,
              event.endPosition.y,
            ));

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
                building
                  ? 1
                  : 0.94,
              );

            const roof =
              Color.fromCssColorString(
                building
                  ? "#704738"
                  : "#7c5a2d",
              ).withAlpha(
                building
                  ? 1
                  : 0.98,
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

        topRadius: 0.72,

        bottomRadius: 1,

        slices: 12,

        vertexFormat:
          PerInstanceColorAppearance.VERTEX_FORMAT,
      });

    const branchGeometry =
      new CylinderGeometry({
        length: 1,
        topRadius: 0.58,
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

        stackPartitions: 12,

        slicePartitions: 18,

        vertexFormat:
          PerInstanceColorAppearance.VERTEX_FORMAT,
      });

    const coniferTierGeometry =
      new CylinderGeometry({
        length: 1,
        topRadius: 0.06,
        bottomRadius: 1,
        slices: 20,
        vertexFormat:
          PerInstanceColorAppearance.VERTEX_FORMAT,
      });

    const crownGeometries = {
      round: createStylizedCrownGeometry("round"),
      columnar: createStylizedCrownGeometry("columnar"),
      spreading: createStylizedCrownGeometry("spreading"),
      compact: createStylizedCrownGeometry("compact"),
    };

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

      const crownPlacement =
        getCrownPlacement(
          trunkHeight,
          crownHeight,
          shape,
        );

      const trunkLength =
        Math.max(
          0.5,
          trunkHeight +
          crownPlacement.trunkOverlap,
        );

      const trunkCenter =
        trunkLength / 2;

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

              trunkLength,
            ),

          attributes: {
            color:
              ColorGeometryInstanceAttribute.fromColor(
                TREE_TRUNK_COLOR,
              ),
          },
        }),
      );

      getMainBranches(
        tree,
        shape,
        trunkHeight,
        crownHeight,
        crownRadiusX,
        crownRadiusY,
      ).forEach(
        (branch, branchIndex) => {
          const direction =
            getTreeLocalDirection(
              tree,
              branch.heading,
              branch.pitch,
            );

          trunks.push(
            new GeometryInstance({
              id: `${tree.id}--branch-${branchIndex + 1}`,
              geometry: branchGeometry,
              modelMatrix: makeTreeMatrix(
                tree,
                branch.startZ +
                direction.z *
                branch.length / 2,
                branch.radius,
                branch.radius,
                branch.length,
                direction.x *
                branch.length / 2,
                direction.y *
                branch.length / 2,
                branch.heading,
                branch.pitch,
              ),
              attributes: {
                color:
                  ColorGeometryInstanceAttribute.fromColor(
                    TREE_TRUNK_COLOR,
                  ),
              },
            }),
          );
        },
      );

      /*
       * Houppier
       */
      if (shape === "conical") {
        getConiferTiers(
          tree,
          crownRadiusX,
          crownRadiusY,
          trunkHeight,
          crownHeight,
        ).forEach(
          (tier, tierIndex) => {
            crowns[shape].push(
              new GeometryInstance({
                id: tierIndex === 0
                  ? tree.id
                  : coniferTierId(tree.id, tierIndex),
                geometry: coniferTierGeometry,
                modelMatrix: makeTreeMatrix(
                  tree,
                  tier.centerZ,
                  tier.scaleX,
                  tier.scaleY,
                  tier.scaleZ,
                  tier.x,
                  tier.y,
                ),
                attributes: {
                  color:
                    ColorGeometryInstanceAttribute.fromColor(
                      getCrownLayerColor(
                        tree,
                        getCrownPartShade(
                          tree,
                          shape,
                          tierIndex,
                        ),
                      ),
                    ),
                },
              }),
            );
          },
        );
      } else {
        crowns[shape].push(
          new GeometryInstance({
            id:
              tree.id,

            geometry:
              crownGeometries[shape],

            modelMatrix:
              makeTreeMatrix(
                tree,

                crownPlacement.centerZ,

                hasOrganicCrownLobes(
                  shape,
                )
                  ? crownRadiusX * 0.8
                  : crownRadiusX,

                hasOrganicCrownLobes(
                  shape,
                )
                  ? crownRadiusY * 0.8
                  : crownRadiusY,

                hasOrganicCrownLobes(
                  shape,
                )
                  ? crownPlacement.scaleZ * 0.88
                  : crownPlacement.scaleZ,
              ),

            attributes: {
              color:
                ColorGeometryInstanceAttribute.fromColor(
                  getCrownLayerColor(
                    tree,
                    getCrownPartShade(tree, shape, 0),
                  ),
                ),
            },
          }),
        );
      }

      if (
        hasOrganicCrownLobes(
          shape,
        )
      ) {
        /*
         * Trois volumes décalés donnent aux feuillus
         * un bord moins géométrique. Ils restent attachés à la
         * même Primitive, donc le coût de rendu demeure faible.
         */
        getOrganicCrownLobes(
          tree,
          crownRadiusX,
          crownRadiusY,
          crownHeight,
          crownPlacement.scaleZ,
        ).forEach(
          (lobe, lobeIndex) => {
            crowns[shape].push(
              new GeometryInstance({
                id: crownLobeId(
                  tree.id,
                  lobeIndex + 1,
                ),

                geometry: ellipsoidGeometry,

                modelMatrix: makeTreeMatrix(
                  tree,
                  crownPlacement.centerZ + lobe.z,
                  lobe.scaleX,
                  lobe.scaleY,
                  lobe.scaleZ,
                  lobe.x,
                  lobe.y,
                ),

                attributes: {
                  color:
                    ColorGeometryInstanceAttribute.fromColor(
                      getCrownLayerColor(
                        tree,
                        getCrownPartShade(
                          tree,
                          shape,
                          lobeIndex + 1,
                        ),
                      ),
                    ),
                },
              }),
            );
          },
        );
      }
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
                flat: false,

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
                flat: false,

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

          const highlight =
            treeHighlight(
              tree,

              selectedTree?.id ??
              null,

              highlightedTaxon,
            );

          let highlightColor:
            | Color
            | null = null;

          if (
            highlight ===
            "selected"
          ) {
            highlightColor =
              TREE_SELECTED_COLOR;
          } else if (
            highlight ===
            "hovered"
          ) {
            highlightColor =
              TREE_HOVER_COLOR;
          } else if (
            highlight ===
            "same_species"
          ) {
            /*
             * Même taxon : une version
             * plus discrète de l'ambre
             * de l'arbre survolé.
             */
            highlightColor =
              getRelatedCrownColor(
                tree,
              );
          }

          const instanceIds =
            getCrownInstanceIds(
              tree,
              shape,
            );

          for (
            const [partIndex, instanceId] of
            instanceIds.entries()
          ) {
            let attributes;

            try {
              attributes =
                primitive.getGeometryInstanceAttributes(
                  instanceId,
                );
            } catch {
              continue;
            }

            if (
              !attributes?.color
            ) {
              continue;
            }

            attributes.color =
              ColorGeometryInstanceAttribute.toValue(
                highlightColor ??
                getCrownLayerColor(
                  tree,
                  getCrownPartShade(
                    tree,
                    shape,
                    partIndex,
                  ),
                ),
                attributes.color,
              );
          }
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
    revision,
  ]);

  /*
   * Repère animé lors du survol depuis la liste :
   * la couronne devient ambrée et cette impulsion
   * matérialise rapidement son emprise au sol.
   */
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    viewer.entities.removeById("tree-hover-pulse");

    const activeHoveredTreeId = hoveredTreeId ?? mapHoveredTreeId;
    const hoveredTree = trees.find((tree) => tree.id === activeHoveredTreeId);
    if (!hoveredTree) {
      viewer.scene.requestRender();
      return;
    }

    const proportions = getTreeProportions(hoveredTree);
    const crownRadius = Math.max(proportions.crownRadiusX, proportions.crownRadiusY);
    const pulseRadius = new CallbackProperty(() => {
      const phase = (Math.sin(Date.now() / 120) + 1) / 2;
      return crownRadius * (1.08 + phase * 0.28);
    }, false);

    viewer.entities.add({
      id: "tree-hover-pulse",
      position: Cartesian3.fromDegrees(hoveredTree.longitude, hoveredTree.latitude, PLAN_HEIGHT + 0.08),
      ellipse: {
        semiMajorAxis: pulseRadius,
        semiMinorAxis: pulseRadius,
        height: PLAN_HEIGHT + 0.08,
        material: Color.fromCssColorString("#f2b84b").withAlpha(0.18),
        outline: true,
        outlineColor: Color.fromCssColorString("#f2b84b"),
      },
    });

    const renderTimer = window.setInterval(() => viewer.scene.requestRender(), 50);
    return () => {
      window.clearInterval(renderTimer);
      if (!viewer.isDestroyed()) {
        viewer.entities.removeById("tree-hover-pulse");
        viewer.scene.requestRender();
      }
    };
  }, [trees, hoveredTreeId, mapHoveredTreeId, plan, revision]);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    setParkView(viewer, plan?.bbox ?? PARK_PLAN_BOUNDS, viewMode);
    viewer.scene.requestRender();
  }, [plan, revision]);

  /*
   * Le passage 2D/3D ne doit pas modifier le zoom ni le centre courant.
   * On ne change donc que l'inclinaison de la caméra.
   */
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    viewer.camera.setView({
      orientation: {
        heading: viewer.camera.heading,
        pitch: CesiumMath.toRadians(viewMode === "2d" ? -87 : -70),
        roll: viewer.camera.roll,
      },
    });
    viewer.scene.requestRender();
  }, [viewMode]);

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
      viewMode,
    );

    viewer.scene.requestRender();
  }, [
    recenter,
    plan,
    viewMode,
  ]);

  const changeZoom = (direction: "in" | "out") => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    const distance = Math.max(12, viewer.camera.positionCartographic.height * 0.2);
    if (direction === "in") viewer.camera.zoomIn(distance);
    else viewer.camera.zoomOut(distance);
    viewer.scene.requestRender();
  };

  const orientNorth = () => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    viewer.camera.setView({ orientation: { heading: 0, pitch: viewer.camera.pitch, roll: 0 } });
    viewer.scene.requestRender();
  };

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

      <div className={`map-navigation ${selectedTree ? "is-tree-open" : ""}`} aria-label="Navigation de la carte">
        <button type="button" className="map-recenter-button" onClick={onRecenter} aria-label="Recentrer la carte sur le parc" title="Recentrer sur le parc">
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="7.5" /><circle cx="12" cy="12" r="2" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /></svg>
        </button>
        <button type="button" className="map-compass" onClick={orientNorth} aria-label="Orienter la carte vers le nord">
          <span className="compass-dial" aria-hidden="true" style={{ transform: `rotate(${-cameraHeading}rad)` }}>
            <svg viewBox="0 0 24 24"><path d="m12 2 5 14-5-3-5 3L12 2Z" /><path d="M12 9v13" /></svg><span>N</span>
          </span>
        </button>
        <button type="button" className="map-dimension-button" onClick={onChangeViewMode} aria-label={`Passer en vue ${viewMode === "3d" ? "2D" : "3D"}`}>{viewMode.toUpperCase()}</button>
        <div className="map-zoom-controls">
          <button type="button" className="map-control-button" onClick={() => changeZoom("in")} aria-label="Zoomer">+</button>
          <button type="button" className="map-control-button" onClick={() => changeZoom("out")} aria-label="Dézoomer">−</button>
        </div>
      </div>

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
