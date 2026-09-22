export type MapCoordinate = {
  latitude: number;
  longitude: number;
};

export type StationDevice = {
  capacity: string;
  model: string;
};

export type MapStation = {
  businessName: string;
  coordinate: MapCoordinate;
  coordinateVerified: boolean;
  devices: ReadonlyArray<StationDevice>;
  id: string;
  note?: string;
  pole: string;
  roadAddress: string;
};

export function hasMapCoordinate(value: {
  latitude: unknown;
  longitude: unknown;
}): value is MapCoordinate {
  return typeof value.latitude === 'number' &&
    Number.isFinite(value.latitude) && Math.abs(value.latitude) <= 90 &&
    typeof value.longitude === 'number' &&
    Number.isFinite(value.longitude) && Math.abs(value.longitude) <= 180;
}
