import { useImperativeHandle, useRef } from 'react';
import { StyleSheet } from 'react-native';
import MapView from 'react-native-maps';

import { StationMarker } from './StationMarker';
import type { MapCanvasProps, MapRegion } from './types';

export function MapCanvas({ ref, ...props }: MapCanvasProps) {
  const map = useRef<MapView>(null);
  const ready = useRef(false);
  const pending = useRef<MapRegion | null>(null);
  useImperativeHandle(
    ref,
    () => ({
      animateToRegion(region, duration) {
        pending.current = region;
        if (ready.current) map.current?.animateToRegion(region, duration);
      },
    }),
    [],
  );

  return (
    <MapView
      initialRegion={props.initialRegion}
      loadingEnabled
      mapPadding={{ bottom: props.bottomPadding, left: 0, right: 0, top: 0 }}
      onMapReady={() => {
        ready.current = true;
        if (pending.current) map.current?.animateToRegion(pending.current, 350);
        props.onReady();
      }}
      onPress={props.onPress}
      onRegionChangeComplete={props.onRegionChangeComplete}
      pitchEnabled={false}
      ref={map}
      rotateEnabled={false}
      showsCompass={false}
      showsMyLocationButton={false}
      showsUserLocation={props.locationEnabled}
      style={StyleSheet.absoluteFill}
      toolbarEnabled={false}
    >
      {props.markers.map((marker) => (
        <StationMarker
          key={JSON.stringify([marker.id, marker.selected, marker.label, marker.count])}
          coordinate={marker.coordinate}
          count={marker.count}
          label={marker.label}
          onPress={() => props.onMarkerPress(marker.id)}
          selected={marker.selected}
        />
      ))}
    </MapView>
  );
}
