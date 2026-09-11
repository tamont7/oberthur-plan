import assert from "node:assert/strict";
import test from "node:test";
import { createLocationFilter, readLocation, type UserLocation } from "../src/geolocation";

const now = 100_000;
function fix(accuracy: number, timestamp = now) {
  return {
    coords: { longitude: -1.66, latitude: 48.11, accuracy, altitude: null, altitudeAccuracy: null, heading: null, speed: null },
    timestamp,
  };
}

test("accepte une localisation approximative et conserve son incertitude", () => {
  assert.equal(readLocation(fix(500), now)?.accuracy, 500);
  assert.deepEqual(readLocation(fix(8), now), {
    longitude: -1.66, latitude: 48.11, accuracy: 8, timestamp: now,
  });
  assert.equal(readLocation(fix(100), now)?.accuracy, 100);
  assert.equal(readLocation(fix(0), now)?.accuracy, 0);
});

test("rejette les positions anciennes ou invalides", () => {
  assert(readLocation(fix(8, now - 15_000), now));
  assert.equal(readLocation(fix(8, now - 60_000), now), null);
  assert.equal(readLocation(fix(8, now + 1), now), null);
  for (const accuracy of [-1, NaN, Infinity]) {
    assert.equal(readLocation(fix(accuracy), now), null);
  }
  const invalid = fix(8);
  invalid.coords.latitude = 100;
  assert.equal(readLocation(invalid, now), null);
});

function location(northMetres: number, seconds: number, accuracy = 5): UserLocation {
  return { longitude: -1.66, latitude: 48.11 + northMetres / 111_320, accuracy, timestamp: now + seconds * 1000 };
}

test("ignore un saut isolé puis retrouve la marche normale", () => {
  const filter = createLocationFilter();
  filter(location(0, 0));
  assert.equal(filter(location(70, 1)), null);
  const recovered = filter(location(3, 2))!;
  assert(recovered.latitude >= location(0, 0).latitude);
  assert(recovered.latitude <= location(3, 2).latitude);
});

test("accepte un déplacement brusque confirmé par une nouvelle mesure proche", () => {
  const filter = createLocationFilter();
  filter(location(0, 0));
  assert.equal(filter(location(70, 1)), null);
  assert.equal(filter(location(70, 1)), null);
  assert.equal(filter(location(71, 0.5)), null);
  const confirmed = location(72, 2);
  assert.deepEqual(filter(confirmed), confirmed);
});

test("des sauts incohérents ou des confirmations trop tardives restent écartés", () => {
  const filter = createLocationFilter();
  filter(location(0, 0));
  assert.equal(filter(location(70, 1)), null);
  assert.equal(filter(location(-70, 2)), null);
  assert.equal(filter(location(-70, 8)), null);
});

test("atténue les oscillations sans prétendre améliorer la précision GPS", () => {
  const filter = createLocationFilter();
  filter(location(0, 0));
  const smoothed = filter(location(3, 1))!;
  assert(smoothed.latitude > location(0, 0).latitude);
  assert(smoothed.latitude < location(3, 1).latitude);
  assert(smoothed.accuracy >= 5);
  assert.equal(smoothed.timestamp, now + 1000);
});

test("suit une marche continue avec moins de trois mètres de retard", () => {
  const filter = createLocationFilter();
  filter(location(0, 0));
  for (let second = 1; second <= 30; second++) {
    const current = location(second * 1.5, second);
    const displayed = filter(current)!;
    assert(displayed);
    assert(Math.abs(current.latitude - displayed.latitude) * 111_320 < 3);
  }
});

test("reprend directement après une interruption du signal", () => {
  const filter = createLocationFilter();
  filter(location(0, 0));
  const resumed = location(100, 15);
  assert.deepEqual(filter(resumed), resumed);
});
