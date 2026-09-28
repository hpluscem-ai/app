/// <reference types="navermaps" />

import { useEffect, useImperativeHandle, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { StationMarkerContent } from './StationMarkerContent';
import type { MapCanvasProps, MapRegion } from './types';

declare global {
  interface Window {
    navermap_authFailure?: () => void;
  }
}

let sdkPromise: Promise<typeof naver.maps> | undefined;

function loadMaps(clientId: string): Promise<typeof naver.maps> {
  if (typeof naver !== 'undefined' && naver.maps)
    return Promise.resolve(naver.maps);
  if (!sdkPromise) {
    sdkPromise = new Promise<typeof naver.maps>((resolve, reject) => {
      const script = document.createElement('script');
      const fail = () => {
        clearTimeout(timer);
        script.remove();
        reject(new Error('NAVER_MAP_LOAD_FAILED'));
      };
      const timer = setTimeout(fail, 15_000);
      script.async = true;
      script.src = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${encodeURIComponent(clientId)}`;
      script.onerror = fail;
      script.onload = () => {
        clearTimeout(timer);
        if (typeof naver === 'undefined' || !naver.maps) fail();
        else resolve(naver.maps);
      };
      document.head.appendChild(script);
    }).catch((error: unknown) => {
      sdkPromise = undefined;
      throw error;
    });
  }
  return sdkPromise;
}

function boundsFor(region: MapRegion) {
  return new naver.maps.LatLngBounds(
    new naver.maps.LatLng(
      region.latitude - region.latitudeDelta / 2,
      region.longitude - region.longitudeDelta / 2,
    ),
    new naver.maps.LatLng(
      region.latitude + region.latitudeDelta / 2,
      region.longitude + region.longitudeDelta / 2,
    ),
  );
}

type MarkerEntry = { marker: naver.maps.Marker; element: HTMLDivElement };

export function MapCanvas({ ref, ...props }: MapCanvasProps) {
  const host = useRef<HTMLDivElement>(null);
  const latest = useRef(props);
  const mapRef = useRef<naver.maps.Map | null>(null);
  const goal = useRef(props.initialRegion);
  const markerCache = useRef(new Map<string, MarkerEntry>());
  const [map, setMap] = useState<naver.maps.Map | null>(null);
  const [markerElements, setMarkerElements] = useState(
    new Map<string, MarkerEntry>(),
  );
  const clientId = process.env.EXPO_PUBLIC_NAVER_MAP_CLIENT_ID?.trim();

  useEffect(() => {
    latest.current = props;
  });
  useImperativeHandle(
    ref,
    () => ({
      animateToRegion(region, duration) {
        goal.current = region;
        mapRef.current?.panToBounds(
          boundsFor(region),
          { duration },
          { top: 0, left: 0, right: 0, bottom: 0 },
        );
      },
    }),
    [],
  );

  useEffect(() => {
    let active = true;
    let failed = false;
    let instance: naver.maps.Map | undefined;
    let observer: ResizeObserver | undefined;
    const listeners: naver.maps.MapEventListener[] = [];
    const fail = (error: unknown) => {
      if (!active || failed) return;
      failed = true;
      latest.current.onError(error);
    };
    if (!clientId) {
      fail(new Error('NAVER_MAP_NOT_CONFIGURED'));
      return;
    }
    const previousAuthFailure = window.navermap_authFailure;
    const authFailure = () => fail(new Error('NAVER_MAP_AUTH_FAILED'));
    window.navermap_authFailure = authFailure;
    void loadMaps(clientId)
      .then((maps) => {
        if (!active || failed || !host.current) return;
        instance = new maps.Map(host.current, {
          center: new maps.LatLng(
            goal.current.latitude,
            goal.current.longitude,
          ),
          padding: {
            top: 0,
            left: 0,
            right: 0,
            bottom: latest.current.bottomPadding,
          },
          logoControlOptions: { position: maps.Position.TOP_LEFT },
          mapDataControlOptions: { position: maps.Position.TOP_RIGHT },
          scaleControl: false,
          mapTypeControl: false,
          zoomControl: false,
        });
        mapRef.current = instance;
        const createdMap = instance;
        listeners.push(
          maps.Event.addListener(createdMap, 'idle', () => {
            if (!active || failed) return;
            const bounds = createdMap.getBounds();
            const min = bounds.getMin();
            const max = bounds.getMax();
            latest.current.onRegionChangeComplete({
              latitude: (min.y + max.y) / 2,
              longitude: (min.x + max.x) / 2,
              latitudeDelta: Math.max(Number.EPSILON, max.y - min.y),
              longitudeDelta: Math.max(Number.EPSILON, max.x - min.x),
            });
          }),
        );
        listeners.push(
          maps.Event.addListener(
            createdMap,
            'click',
            (event: naver.maps.PointerEvent) => {
              const target = event.pointerEvent?.target;
              if (
                target instanceof Element &&
                target.closest('[data-station-marker]')
              )
                return;
              latest.current.onPress();
            },
          ),
        );
        createdMap.fitBounds(boundsFor(goal.current), {
          top: 0,
          right: 0,
          bottom: 0,
          left: 0,
        });
        observer = new ResizeObserver(() => {
          if (active && host.current) {
            createdMap.setSize(
              new maps.Size(
                host.current.clientWidth,
                host.current.clientHeight,
              ),
            );
          }
        });
        observer.observe(host.current);
        setMap(createdMap);
        latest.current.onReady();
      })
      .catch(fail);

    return () => {
      active = false;
      observer?.disconnect();
      if (typeof naver !== 'undefined')
        naver.maps.Event.removeListener(listeners);
      markerCache.current.forEach((entry) => entry.marker.setMap(null));
      markerCache.current.clear();
      instance?.destroy();
      mapRef.current = null;
      if (window.navermap_authFailure === authFailure)
        window.navermap_authFailure = previousAuthFailure;
    };
  }, [clientId]);

  useEffect(() => {
    if (map === mapRef.current) {
      map?.setOptions({
        padding: { top: 0, right: 0, left: 0, bottom: props.bottomPadding },
      });
    }
  }, [map, props.bottomPadding]);

  useEffect(() => {
    if (!map || map !== mapRef.current) return;
    const cache = markerCache.current;
    const ids = new Set(props.markers.map((item) => item.id));
    for (const [id, entry] of cache) {
      if (!ids.has(id)) {
        entry.marker.setMap(null);
        cache.delete(id);
      }
    }
    for (const item of props.markers) {
      let entry = cache.get(item.id);
      if (!entry) {
        const element = document.createElement('div');
        element.dataset.stationMarker = item.id;
        element.style.width = 'max-content';
        element.style.transform = 'translate(-50%, -50%)';
        entry = {
          element,
          marker: new naver.maps.Marker({
            map,
            position: new naver.maps.LatLng(
              item.coordinate.latitude,
              item.coordinate.longitude,
            ),
            icon: { content: element, anchor: new naver.maps.Point(0, 0) },
          }),
        };
        cache.set(item.id, entry);
      }
      entry.marker.setPosition(
        new naver.maps.LatLng(
          item.coordinate.latitude,
          item.coordinate.longitude,
        ),
      );
      entry.marker.setZIndex(item.selected ? 1 : 0);
    }
    setMarkerElements(new Map(cache));
  }, [map, props.markers]);

  return (
    <>
      <div ref={host} style={{ position: 'absolute', inset: 0 }} />
      {props.markers.map((item) => {
        const entry = markerElements.get(item.id);
        return entry
          ? createPortal(
              <StationMarkerContent
                count={item.count}
                label={item.label}
                selected={item.selected}
                onPress={() => latest.current.onMarkerPress(item.id)}
              />,
              entry.element,
              item.id,
            )
          : null;
      })}
    </>
  );
}
