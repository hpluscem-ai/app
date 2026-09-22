import type { MapRegion } from '../components/map/types';
import { hasMapCoordinate, type MapStation } from '../data/mapStations';
import { AuthApiError, request, type SessionOptions } from './authApi';

export type MapBounds = [west: number, south: number, east: number, north: number];

export function getMapBounds(region: MapRegion): MapBounds | undefined {
  if (![region.latitude, region.longitude, region.latitudeDelta, region.longitudeDelta].every(Number.isFinite) ||
    Math.abs(region.latitude) > 90 ||
    region.latitudeDelta <= 0 || region.longitudeDelta <= 0) return;
  const wrap = (longitude: number) => longitude >= -180 && longitude <= 180
    ? longitude : ((longitude + 180) % 360 + 360) % 360 - 180;
  return [
    region.longitudeDelta >= 360 ? -180 : wrap(region.longitude - region.longitudeDelta / 2),
    Math.max(-90, region.latitude - region.latitudeDelta / 2),
    region.longitudeDelta >= 360 ? 180 : wrap(region.longitude + region.longitudeDelta / 2),
    Math.min(90, region.latitude + region.latitudeDelta / 2),
  ];
}

function invalidResponse(): never {
  throw new AuthApiError(
    '서버 응답을 확인하지 못했습니다. 다시 시도해주세요.',
    'INVALID_RESPONSE',
  );
}

function record(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return invalidResponse();
  }
  return value as Record<string, unknown>;
}

function text(value: unknown): string {
  return typeof value === 'string' && value.trim() ? value : invalidResponse();
}

function mapStation(value: unknown): MapStation | null {
  const station = record(value);
  if (typeof station.active !== 'boolean') return invalidResponse();
  if (!station.active || station.latitude === null || station.longitude === null) return null;
  const coordinate = { latitude: station.latitude, longitude: station.longitude };
  if (!hasMapCoordinate(coordinate) ||
    typeof station.coordinateVerified !== 'boolean' ||
    (station.note !== null && typeof station.note !== 'string') ||
    !Array.isArray(station.devices)) return invalidResponse();
  return {
    id: text(station.id),
    businessName: text(station.businessName),
    pole: text(station.pole),
    roadAddress: text(station.roadAddress),
    note: station.note ?? undefined,
    coordinate,
    coordinateVerified: station.coordinateVerified,
    devices: station.devices.map((value: unknown) => {
      const device = record(value);
      if (typeof device.capacityLiters !== 'number' ||
        !Number.isSafeInteger(device.capacityLiters) || device.capacityLiters <= 0) {
        return invalidResponse();
      }
      return {
        model: text(device.model),
        capacity: `${device.capacityLiters.toLocaleString('en-US')}L`,
      };
    }),
  };
}

export async function getMapStations(
  bounds: MapBounds,
  session: SessionOptions,
): Promise<MapStation[]> {
  const [west, south, east, north] = bounds;
  if (!hasMapCoordinate({ latitude: south, longitude: west }) ||
    !hasMapCoordinate({ latitude: north, longitude: east }) || south > north) {
    throw new AuthApiError('요청을 완료하지 못했습니다. 다시 시도해주세요.', 'INVALID_MAP_BOUNDS');
  }
  const query = new URLSearchParams(
    Object.fromEntries(Object.entries({ south, west, north, east })
      // The server accepts decimal query values, not exponent notation.
      .map(([key, value]) => [key, value.toFixed(20)])),
  );
  const data = await request(`/stations/map?${query}`, session);
  if (!Array.isArray(data)) return invalidResponse();
  return data.map(mapStation).filter((station): station is MapStation => station !== null);
}

export async function getMapStation(id: string, session: SessionOptions): Promise<MapStation | null> {
  try {
    const station = mapStation(await request(`/stations/${encodeURIComponent(id)}`, session));
    if (station && station.id !== id) return invalidResponse();
    return station;
  } catch (error) {
    if (error instanceof AuthApiError && error.status === 404 && error.code === 'STATION_NOT_FOUND') {
      return null;
    }
    throw error;
  }
}
