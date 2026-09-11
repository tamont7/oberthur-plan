export type UserLocation = {
  longitude: number;
  latitude: number;
  accuracy: number;
  timestamp: number;
};

// A park map needs a pedestrian-scale fix before showing a position.
export const MAX_LOCATION_ACCURACY_METRES = 35;
export const MAX_LOCATION_AGE_MS = 15_000;

export function readLocation(
  { coords, timestamp }: { coords: Pick<GeolocationCoordinates, "longitude" | "latitude" | "accuracy">; timestamp: number },
  now = Date.now(),
): UserLocation | null {
  const { longitude, latitude, accuracy } = coords;
  if (
    ![longitude, latitude, accuracy, timestamp].every(Number.isFinite) ||
    Math.abs(longitude) > 180 || Math.abs(latitude) > 90 ||
    accuracy <= 0 || accuracy > MAX_LOCATION_ACCURACY_METRES ||
    timestamp > now || now - timestamp >= MAX_LOCATION_AGE_MS
  ) return null;

  return { longitude, latitude, accuracy, timestamp };
}

function distanceMetres(a: UserLocation, b: UserLocation) {
  const latitude = (a.latitude + b.latitude) * Math.PI / 360;
  return Math.hypot(
    (b.longitude - a.longitude) * 111_320 * Math.cos(latitude),
    (b.latitude - a.latitude) * 111_320,
  );
}

export function createLocationFilter() {
  let previous: UserLocation | null = null;
  let displayed: UserLocation | null = null;
  let pendingJump: UserLocation | null = null;
  let latestTimestamp = -Infinity;

  return (next: UserLocation): UserLocation | null => {
    // Duplicate or delayed callbacks cannot confirm a jump or refresh a stale dot.
    if (next.timestamp <= latestTimestamp) return null;
    latestTimestamp = next.timestamp;

    if (!previous || next.timestamp - previous.timestamp >= MAX_LOCATION_AGE_MS) {
      previous = displayed = next;
      pendingJump = null;
      return next;
    }

    const elapsed = (next.timestamp - previous.timestamp) / 1000;
    const distance = distanceMetres(previous, next);
    // Allow ordinary walking, measurement uncertainty and longer update intervals.
    const jumpThreshold = Math.max(20, previous.accuracy + next.accuracy, elapsed * 4);
    if (distance > jumpThreshold) {
      const confirmed = pendingJump &&
        next.timestamp - pendingJump.timestamp <= 5000 &&
        distanceMetres(pendingJump, next) <= Math.min(15, Math.max(6, next.accuracy));
      if (!confirmed) {
        pendingJump = next;
        return null;
      }
      // A confirmed relocation must not be slowly interpolated from the old position.
      previous = displayed = next;
      pendingJump = null;
      return next;
    }

    pendingJump = null;
    let result = next;
    if (displayed && elapsed <= 3 && distanceMetres(displayed, next) <= Math.min(8, Math.max(3, next.accuracy))) {
      // Smooth small fluctuations only; larger movements remain immediately visible.
      const weight = 1 - Math.exp(-elapsed / 1.5);
      result = {
        ...next,
        longitude: displayed.longitude + (next.longitude - displayed.longitude) * weight,
        latitude: displayed.latitude + (next.latitude - displayed.latitude) * weight,
      };
      // Smoothing does not improve the sensor's reported accuracy.
      result.accuracy = next.accuracy + distanceMetres(result, next);
    }
    previous = next;
    displayed = result;
    return result;
  };
}
