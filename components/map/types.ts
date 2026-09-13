import type { Ref } from 'react';
import type { MapCoordinate } from '../../data/mapStations';

export type MapRegion = MapCoordinate & {
  latitudeDelta: number;
  longitudeDelta: number;
};

export type MapMarkerData = {
  id: string;
  coordinate: MapCoordinate;
  label: string;
  count?: number;
  selected: boolean;
};

export type MapCanvasHandle = {
  animateToRegion: (region: MapRegion, duration: number) => void;
};

export type MapCanvasProps = {
  ref?: Ref<MapCanvasHandle>;
  initialRegion: MapRegion;
  markers: ReadonlyArray<MapMarkerData>;
  bottomPadding: number;
  locationEnabled: boolean;
  onReady: () => void;
  onError: (error: unknown) => void;
  onPress: () => void;
  onMarkerPress: (id: string) => void;
  onRegionChangeComplete: (region: MapRegion) => void;
};
