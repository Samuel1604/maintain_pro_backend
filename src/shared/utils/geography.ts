export type Coordinates = [number, number];
export function distanceInKilometers(
  from: Coordinates | undefined,
  to: Coordinates,
  maxDistanceKm: number,
): boolean {
  if (!from) return false;
  const [fromLongitude, fromLatitude] = from;
  const [toLongitude, toLatitude] = to;
  const radians = Math.PI / 180;
  const latitudeDelta = (toLatitude - fromLatitude) * radians;
  const longitudeDelta = (toLongitude - fromLongitude) * radians;
  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(fromLatitude * radians) *
      Math.cos(toLatitude * radians) *
      Math.sin(longitudeDelta / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) <= maxDistanceKm;
}
