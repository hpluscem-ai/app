import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as Linking from 'expo-linking';
import * as Location from 'expo-location';
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import MapView, { type Region } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Supercluster from 'supercluster';

import { AppScreen } from '../components/AppScreen';
import {
  STATION_SHEET_COLLAPSED_HEIGHT,
  StationSheet,
  type StationSheetContent,
} from '../components/map/StationSheet';
import { StationMarker } from '../components/map/StationMarker';
import { colors, typography } from '../constants/theme';
import {
  previewMapStations,
  type MapCoordinate,
  type MapStation,
} from '../data/mapStations';
import { showTmapOpenFailedAlert } from '../utils/alerts';

const SEOUL_REGION: Region = {
  latitude: 37.5665,
  latitudeDelta: 1.1,
  longitude: 126.978,
  longitudeDelta: 1.1,
};

type StationPointProperties = {
  stationId: string;
};

type ClusterProperties = Supercluster.AnyProps;
type VisibleFeature =
  | Supercluster.ClusterFeature<ClusterProperties>
  | Supercluster.PointFeature<StationPointProperties>;

export default function MapRoute() {
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);
  const [mapHeight, setMapHeight] = useState(0);
  const [mapReady, setMapReady] = useState(false);
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [region, setRegion] = useState(SEOUL_REGION);
  const [selectedClusterId, setSelectedClusterId] = useState<number>();
  const [selectedStationId, setSelectedStationId] = useState<string>();
  const [sheetContent, setSheetContent] =
    useState<StationSheetContent>();
  const [sheetVisible, setSheetVisible] = useState(false);

  const stationById = useMemo(
    () => new Map(previewMapStations.map((station) => [station.id, station])),
    [],
  );

  const clusterIndex = useMemo(() => {
    const points: Array<Supercluster.PointFeature<StationPointProperties>> =
      previewMapStations.map((station) => ({
        geometry: {
          coordinates: [
            station.coordinate.longitude,
            station.coordinate.latitude,
          ],
          type: 'Point',
        },
        properties: { stationId: station.id },
        type: 'Feature',
      }));

    return new Supercluster<StationPointProperties, ClusterProperties>({
      maxZoom: 17,
      radius: 52,
    }).load(points);
  }, []);

  const visibleFeatures = useMemo(
    () => clusterIndex.getClusters(getBoundingBox(region), getZoom(region)),
    [clusterIndex, region],
  );

  useEffect(() => {
    let active = true;

    async function centerOnCurrentLocation() {
      try {
        const permission = await Location.requestForegroundPermissionsAsync();

        if (!active || permission.status !== Location.PermissionStatus.GRANTED) {
          return;
        }

        setLocationEnabled(true);
        const current = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        if (!active) {
          return;
        }

        const currentRegion: Region = {
          latitude: current.coords.latitude,
          latitudeDelta: 0.35,
          longitude: current.coords.longitude,
          longitudeDelta: 0.35,
        };

        setRegion(currentRegion);
        mapRef.current?.animateToRegion(currentRegion, 350);
      } catch {
        // 권한 또는 위치 조회 실패 시 초기 서울 영역을 그대로 사용합니다.
      }
    }

    void centerOnCurrentLocation();

    return () => {
      active = false;
    };
  }, []);

  const showStation = useCallback(
    (station: MapStation, zoomToStation = false) => {
      setSelectedClusterId(undefined);
      setSelectedStationId(station.id);
      setSheetContent({ kind: 'station', station });
      setSheetVisible(true);

      const nextRegion: Region = {
        latitude: station.coordinate.latitude,
        latitudeDelta: zoomToStation
          ? Math.min(region.latitudeDelta, 0.08)
          : region.latitudeDelta,
        longitude: station.coordinate.longitude,
        longitudeDelta: zoomToStation
          ? Math.min(region.longitudeDelta, 0.08)
          : region.longitudeDelta,
      };

      mapRef.current?.animateToRegion(nextRegion, 350);
    },
    [region.latitudeDelta, region.longitudeDelta],
  );

  const showCluster = useCallback(
    (clusterId: number, coordinate: MapCoordinate) => {
      const stations = clusterIndex
        .getLeaves(clusterId, Infinity)
        .map((feature) => stationById.get(feature.properties.stationId))
        .filter((station): station is MapStation => Boolean(station));

      if (stations.length === 0) {
        return;
      }

      setSelectedClusterId(clusterId);
      setSelectedStationId(undefined);
      setSheetContent({ kind: 'cluster', stations });
      setSheetVisible(true);

      const expansionZoom = clusterIndex.getClusterExpansionZoom(clusterId);
      const longitudeDelta = Math.min(
        region.longitudeDelta,
        360 / 2 ** expansionZoom,
      );
      const nextRegion: Region = {
        latitude: coordinate.latitude,
        latitudeDelta:
          longitudeDelta * (region.latitudeDelta / region.longitudeDelta),
        longitude: coordinate.longitude,
        longitudeDelta,
      };

      mapRef.current?.animateToRegion(nextRegion, 350);
    },
    [
      clusterIndex,
      region.latitudeDelta,
      region.longitudeDelta,
      stationById,
    ],
  );

  const requestSheetClose = useCallback(() => {
    setSheetVisible(false);
  }, []);

  const clearHiddenSheet = useCallback(() => {
    setSheetContent(undefined);
    setSelectedClusterId(undefined);
    setSelectedStationId(undefined);
  }, []);

  const openTmapDirections = useCallback(async (station: MapStation) => {
    if (!station.coordinateVerified) {
      return;
    }

    const destinationName = encodeURIComponent(
      `${station.pole} ${station.businessName}`,
    );
    const tmapUrl =
      `tmap://route?goalname=${destinationName}` +
      `&goalx=${station.coordinate.longitude}` +
      `&goaly=${station.coordinate.latitude}`;

    try {
      await Linking.openURL(tmapUrl);
      return;
    } catch {
      const storeUrl = Platform.select({
        android:
          'https://play.google.com/store/apps/details?id=com.skt.tmap.ku',
        ios: 'https://apps.apple.com/kr/app/id431589174',
      });

      if (!storeUrl) {
        showTmapOpenFailedAlert();
        return;
      }

      try {
        await Linking.openURL(storeUrl);
      } catch {
        showTmapOpenFailedAlert();
      }
    }
  }, []);

  const handleMapLayout = useCallback((event: LayoutChangeEvent) => {
    setMapHeight(event.nativeEvent.layout.height);
  }, []);

  return (
    <AppScreen
      activeTab="map"
      dockMode={sheetContent ? 'hidden' : 'fixed'}
      dockOverContent
      extendUnderBottomInset
      scrollEnabled={false}
      showFooter={false}
      variant="main"
    >
      <View
        onLayout={handleMapLayout}
        style={styles.mapFrame}
      >
        <MapView
          initialRegion={SEOUL_REGION}
          loadingEnabled
          mapPadding={{
            bottom:
              (sheetContent ? STATION_SHEET_COLLAPSED_HEIGHT : 72) +
              insets.bottom,
            left: 0,
            right: 0,
            top: 0,
          }}
          onMapReady={() => setMapReady(true)}
          onPress={requestSheetClose}
          onRegionChangeComplete={setRegion}
          pitchEnabled={false}
          ref={mapRef}
          rotateEnabled={false}
          showsCompass={false}
          showsMyLocationButton={false}
          showsUserLocation={locationEnabled}
          style={StyleSheet.absoluteFill}
          toolbarEnabled={false}
        >
          {visibleFeatures.map((feature) => {
            const [longitude, latitude] = feature.geometry.coordinates;

            if (isClusterFeature(feature)) {
              const clusterId = feature.properties.cluster_id;
              const selected = selectedClusterId === clusterId;

              return (
                <StationMarker
                  coordinate={{ latitude, longitude }}
                  count={feature.properties.point_count}
                  key={`cluster-${clusterId}-${selected}`}
                  label=""
                  onPress={() =>
                    showCluster(clusterId, { latitude, longitude })
                  }
                  selected={selected}
                />
              );
            }

            const station = stationById.get(feature.properties.stationId);

            if (!station) {
              return null;
            }

            const selected = selectedStationId === station.id;

            return (
              <StationMarker
                coordinate={station.coordinate}
                key={`${station.id}-${selected}`}
                label={getStationMarkerLabel(station)}
                onPress={() => showStation(station, true)}
                selected={selected}
              />
            );
          })}
        </MapView>

        {!mapReady ? (
          <View pointerEvents="none" style={styles.loadingOverlay}>
            <ActivityIndicator color={colors.mileageAction} />
            <Text style={styles.loadingLabel}>지도를 불러오고 있습니다.</Text>
          </View>
        ) : null}

        {sheetContent && mapHeight > 0 ? (
          <StationSheet
            content={sheetContent}
            height={mapHeight}
            onDirections={openTmapDirections}
            onHidden={clearHiddenSheet}
            onRequestClose={requestSheetClose}
            onSelectStation={(station) => showStation(station, true)}
            visible={sheetVisible}
          />
        ) : null}
      </View>
    </AppScreen>
  );
}

function isClusterFeature(
  feature: VisibleFeature,
): feature is Supercluster.ClusterFeature<ClusterProperties> {
  return 'cluster' in feature.properties && feature.properties.cluster === true;
}

function getBoundingBox(region: Region): [number, number, number, number] {
  const halfLatitude = region.latitudeDelta / 2;
  const halfLongitude = region.longitudeDelta / 2;

  return [
    region.longitude - halfLongitude,
    region.latitude - halfLatitude,
    region.longitude + halfLongitude,
    region.latitude + halfLatitude,
  ];
}

function getZoom(region: Region) {
  const zoom = Math.round(Math.log2(360 / region.longitudeDelta));

  return Math.max(0, Math.min(20, zoom));
}

function getStationMarkerLabel(station: MapStation) {
  const device = station.devices[0];

  return device
    ? `${device.model} / ${device.capacity}`
    : `${station.pole} ${station.businessName}`;
}

const styles = StyleSheet.create({
  mapFrame: {
    flex: 1,
    width: '100%',
    minHeight: 0,
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: colors.gray100,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.gray50,
  },
  loadingLabel: {
    ...typography.body,
    color: colors.gray800,
  },
});
