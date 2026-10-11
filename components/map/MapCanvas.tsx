import { useEffect, useImperativeHandle, useRef } from 'react';
import { StyleSheet } from 'react-native';
import {
  NaverMapView,
  type NaverMapViewRef,
  type Region,
} from '@mj-studio/react-native-naver-map';

import { StationMarker } from './StationMarker';
import type { MapCanvasProps, MapRegion } from './types';

export function MapCanvas({ ref, ...props }: MapCanvasProps) {
  const clientId = process.env.EXPO_PUBLIC_NAVER_MAP_CLIENT_ID?.trim();
  const map = useRef<NaverMapViewRef>(null);
  const ready = useRef(false);
  const reportedMissingClientId = useRef(false);
  const pending = useRef<{ region: MapRegion; duration: number } | null>(null);
  useImperativeHandle(
    ref,
    () => ({
      animateToRegion(region, duration) {
        pending.current = { region, duration };
        if (ready.current)
          map.current?.animateRegionTo({
            ...toNaverRegion(region),
            duration,
          });
      },
    }),
    [],
  );

  useEffect(() => {
    if (ready.current)
      map.current?.setLocationTrackingMode(
        props.locationEnabled ? 'NoFollow' : 'None',
      );
  }, [props.locationEnabled]);

  useEffect(() => {
    if (clientId) {
      reportedMissingClientId.current = false;
      return;
    }
    if (!reportedMissingClientId.current) {
      reportedMissingClientId.current = true;
      props.onError(new Error('NAVER_MAP_NOT_CONFIGURED'));
    }
  }, [clientId, props.onError]);

  if (!clientId) return null;

  return (
    <NaverMapView
      initialRegion={toNaverRegion(props.initialRegion)}
      mapPadding={{ bottom: props.bottomPadding, left: 0, right: 0, top: 0 }}
      onCameraIdle={({ region }) =>
        props.onRegionChangeComplete(fromNaverRegion(region))
      }
      onInitialized={() => {
        if (ready.current) return;
        ready.current = true;
        map.current?.setLocationTrackingMode(
          props.locationEnabled ? 'NoFollow' : 'None',
        );
        if (pending.current)
          map.current?.animateRegionTo({
            ...toNaverRegion(pending.current.region),
            duration: pending.current.duration,
          });
        props.onReady();
      }}
      onTapMap={props.onPress}
      isRotateGesturesEnabled={false}
      isShowCompass={false}
      isShowIndoorLevelPicker={false}
      isShowLocationButton={false}
      isShowScaleBar={false}
      isShowZoomControls={false}
      isTiltGesturesEnabled={false}
      ref={map}
      logoAlign="TopLeft"
      style={StyleSheet.absoluteFill}
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
    </NaverMapView>
  );
}

function toNaverRegion(region: MapRegion): Region {
  return {
    latitude: region.latitude - region.latitudeDelta / 2,
    latitudeDelta: region.latitudeDelta,
    longitude: region.longitude - region.longitudeDelta / 2,
    longitudeDelta: region.longitudeDelta,
  };
}

function fromNaverRegion(region: Region): MapRegion {
  return {
    latitude: region.latitude + region.latitudeDelta / 2,
    latitudeDelta: region.latitudeDelta,
    longitude: region.longitude + region.longitudeDelta / 2,
    longitudeDelta: region.longitudeDelta,
  };
}
