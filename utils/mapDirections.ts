import type { MapCoordinate } from '../data/mapStations';

export function getWebDirectionsUrl(
  coordinate: MapCoordinate,
  name: string,
  tmapAppKey?: string,
) {
  const { latitude, longitude } = coordinate;
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    Math.abs(latitude) > 90 ||
    Math.abs(longitude) > 180 ||
    !name.trim()
  ) {
    throw new Error('INVALID_DESTINATION');
  }
  if (tmapAppKey?.trim()) {
    const query = new URLSearchParams({
      appKey: tmapAppKey.trim(),
      goalname: name,
      goalx: String(longitude),
      goaly: String(latitude),
    });
    return `https://apis.openapi.sk.com/tmap/app/routes?${query}`;
  }
  // Naver redirects this link to its current directions page with the destination filled in.
  const query = new URLSearchParams({
    menu: 'route',
    elng: String(longitude),
    elat: String(latitude),
    eText: name,
    pathType: '0',
  });
  return `https://map.naver.com/index.nhn?${query}`;
}
