# 주유소 지도 화면 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Figma 112:1692의 /map 화면을 네이티브 지도로 구현하고, 현재 위치·줌 기반 클러스터·주유소/장비 상세·티맵 길안내를 실제 서버 데이터로 교체하기 쉬운 경계로 만든다.

**Architecture:** 기존 AppScreen의 main 변형, 로고 헤더, 푸터, 하단 메뉴를 유지한다. /map 라우트는 위치 권한, 지도 카메라, 클러스터, 선택 상태와 외부 앱 실행만 조정하고, 마커와 드래그 가능한 패널은 화면 컴포넌트로 분리한다. 현재 엑셀은 장비 단위이므로 앱에서는 같은 업체명+설치주소를 한 주유소로 묶고 devices 배열로 보관하며, 서버 계약 전에는 API service·전역 store·Provider를 만들지 않는다.

**Tech Stack:** Expo SDK 57, Expo Router, React Native 0.86, TypeScript 6, react-native-maps 1.27.2, expo-location ~57.0.10, supercluster 8.0.1, React Native Animated/PanResponder, Expo Linking

## Global Constraints

- 코드를 쓰기 전에 Expo SDK 57의 react-native-maps, expo-location, Linking 문서를 다시 확인한다.
- iOS는 Apple Maps, Android는 Google Maps의 플랫폼 기본 지도를 사용한다.
- Expo Go에서 화면·위치·클러스터를 검토할 수 있어야 하며, 지도 때문에 TMAP SDK나 별도 dev client를 추가하지 않는다.
- 주유소 좌표는 WGS84 latitude/longitude를 데이터로 받는다. 앱 시작 시 주소 196개를 지오코딩하지 않는다.
- 사용자 현재 위치 권한은 foreground만 요청한다. 허용 또는 조회에 실패하면 서울시청 좌표 37.5665, 126.9780을 사용한다.
- 클러스터는 앱에서 계산하며, 클러스터 탭은 자동 확대하지 않고 포함 주유소 목록을 연다.
- 바텀시트는 drag handle을 위로 끌어 확장하고 아래로 끌어 축소/닫으며, 닫기 버튼과 지도 빈 영역 탭도 지원한다.
- 길안내 대상은 TMAP 하나다. TMAP 실행 실패 시 플랫폼별 공식 스토어 페이지를 연다.
- 로컬 주유소 데이터는 레이아웃 검토용이며, 가짜 서버 성공·쿼리 preview·개발 전용 결과 분기는 만들지 않는다.
- 현재 작업 트리의 다른 변경은 되돌리거나 함께 커밋하지 않는다.
- 자동 테스트 도구가 없는 저장소이므로 이번 화면만 위해 테스트 프레임워크를 추가하지 않는다. typecheck, Expo 설정 검사, 양 플랫폼 번들, 시뮬레이터/기기 시나리오로 검증한다.

---

## 1. 확정된 제품 결정

| 항목 | 결정 |
|---|---|
| 지도 | react-native-maps, iOS Apple Maps / Android Google Maps |
| 현재 위치 | 권한 허용 시 현재 위치, 거부·오류 시 서울시청 |
| 원본 데이터 | 첨부 엑셀의 설치 현황을 기준으로 하고 초기에는 검토용 일부 데이터만 로컬에 둠 |
| 데이터 단위 | 마커 1개 = 주유소 1곳, 상세 내부 devices = 해당 주소의 장비들 |
| 마커 문구 | Pole + 업체명. 긴 이름은 한 줄 말줄임 |
| 상세 정보 | Pole, 업체명, 소재지, 설치주소, 주유소/직판, 비고, 장비별 모델명·용량 |
| 클러스터 | 현재 지도 bbox와 zoom으로 앱에서 계산 |
| 클러스터 탭 | 포함 주유소 목록 패널을 열고 자동 확대하지 않음 |
| 목록 선택 | 해당 주유소로 카메라 이동 후 단일 주유소 상세로 전환 |
| 패널 | 닫힘 / 축소 / 확장 3상태, 손잡이 drag와 명시적 닫기 버튼 |
| 길안내 | TMAP만 사용, 미설치·실행 실패 시 App Store 또는 Play Store |
| 화면 상태 | 실제 map ready 로딩과 실제 빈 배열만 표시. 발생하지 않는 가짜 서버 오류 상태는 만들지 않음 |

### 엑셀에서 확인한 데이터 특성

- 장비 데이터는 208행이다.
- 업체명+설치주소를 공백 정리 후 묶으면 주유소는 196곳이다.
- 10곳은 같은 주유소에 장비가 2~3대 있고, 한 곳의 최대 장비 수는 3대다.
- 구분 값은 주유소 201행, 직판 7행이다.
- 위도·경도 열은 없다.
- 용량과 모델 표기가 일부 불규칙하므로 원문을 임의 보정하지 않고 display label로 보관한다.
- 임시 그룹 키는 정규화한 업체명+설치주소를 사용하지만, 운영 서버는 변하지 않는 stationId를 제공해야 한다.

## 2. 실행 전에 필요한 최종 입력

### 좌표

초기 화면에 넣을 주유소 5곳의 정확한 WGS84 위도·경도가 필요하다. 주소와 도시 중심을 이용한 임의 좌표는 지도 배치 검토에는 쓸 수 있지만 TMAP 목적지로 전달하면 잘못된 장소를 안내할 수 있으므로, 정확한 좌표가 오기 전에는 길안내 버튼을 활성화하지 않는다.

권장 초기 5곳은 수도권 화면에서 함께 확인하기 쉬운 아래 행이다.

| no. | 업체명 | 설치주소 |
|---:|---|---|
| 11 | 오산삼미주유소 | 경기도 오산시 내삼미동 588-3 5892,589-8번지 |
| 18 | 진흥주유소 | 경기도 수원시 권선구 수인로 173 |
| 69 | 송도국제도시주유소 | 인천 연수구 하모니로 128 |
| 73 | 동탄신도시주유소 | 경기 화성시 효행로 1293 |
| 81 | 신길주유소 | 서울특별시 영드포구 신길로 74 |

주소 오탈자도 원본 데이터에 있으므로 좌표를 만들기 전에 원본 관리자가 주소를 확인한다. 특히 no.81의 영드포구는 영등포구 여부를 확인해야 한다.

### TMAP 연동 방식

현재 공식 TMAP 가이드는 native TMapTapi/TMapApi의 invokeRoute와 앱 설치 확인을 제공하지만 React Native Linking용 URL scheme을 명시적으로 보장하지 않는다. 첫 구현은 가장 작은 방식인 아래 URL scheme을 사용하고 iOS/Android 실기기에서 검증한다.

~~~text
tmap://route?goalname=<업체명>&goalx=<경도>&goaly=<위도>
~~~

공식 SDK 사용이 필수라는 제품 요구가 생기면 이 계획과 분리해 API key 발급, native SDK, config plugin/bridge, dev client 빌드를 별도 계획으로 다룬다.

## 3. 데이터 경계

Create: data/mapStations.ts

~~~ts
export type Coordinate = {
  latitude: number;
  longitude: number;
};

export type StationDevice = {
  capacityLabel: string;
  modelName: string;
  sourceNo: number;
};

export type MapStation = {
  area: string;
  businessName: string;
  coordinate: Coordinate;
  coordinateVerified: boolean;
  devices: StationDevice[];
  id: string;
  note?: string;
  pole: string;
  roadAddress: string;
  siteType: '주유소' | '직판';
};
~~~

- coordinateVerified가 false이면 지도 마커와 상세 검토는 가능하지만 길안내 버튼은 비활성화한다.
- 초기 상수는 PREVIEW_MAP_STATIONS 한 개만 export한다.
- 원본 Excel을 앱 번들에 포함하거나 런타임에 읽지 않는다.
- 서버 연결 시 PREVIEW_MAP_STATIONS를 응답으로 교체하되 MapStation UI 타입을 유지한다.
- 별도 map.types.ts, repository, DTO mapper, context, store는 만들지 않는다.

## 4. 화면 상태

~~~ts
type SheetContent =
  | { kind: 'cluster'; stations: MapStation[] }
  | { kind: 'station'; station: MapStation }
  | null;

type SheetSnap = 'closed' | 'collapsed' | 'expanded';
~~~

~~~text
화면 진입
  → 서울시청 region으로 즉시 지도 표시
  → foreground 위치 권한 요청
  → 허용되면 현재 위치로 카메라 이동
  → 거부·조회 실패면 서울 region 유지

지도 zoom/pan 완료
  → 현재 bbox와 zoom 계산
  → supercluster에서 보이는 단일 마커/클러스터 조회

단일 마커 탭
  → 선택 마커를 파란색으로 변경
  → 카메라를 패널에 가리지 않는 위치로 이동
  → 하단 메뉴 숨김
  → 주유소 상세 패널을 collapsed로 표시

클러스터 탭
  → getLeaves로 포함 주유소 조회
  → 자동 zoom 없이 목록 패널을 collapsed로 표시
  → 하단 메뉴 숨김

클러스터 목록 항목 탭
  → 해당 주유소를 선택
  → 카메라 이동
  → 같은 패널에서 station 상세로 전환

패널 위 drag
  → expanded

패널 아래 drag
  → expanded이면 collapsed
  → collapsed이면 closed

닫기 버튼 또는 지도 빈 영역 탭
  → 패널 closed
  → 선택 해제
  → 하단 메뉴 overlay 복원

길안내 탭
  → 검증 좌표이면 TMAP URL 실행
  → 실행 실패면 플랫폼 스토어 URL 실행
  → 스토어도 실패하면 오류 Alert
~~~

## 5. 최소 파일 구조

~~~text
app/
  _layout.tsx
  map.tsx
components/
  AppScreen.tsx
  map/
    StationMarker.tsx
    StationSheet.tsx
  icons/
    DirectionsIcon.tsx
constants/
  assets.ts
  theme.ts
data/
  mapStations.ts
utils/
  alerts.ts
docs/
  development-notes.md
package.json
pnpm-lock.yaml
app.json
~~~

### 분리 기준

- app/map.tsx: 위치 권한, MapView ref, region, supercluster index, sheet content, TMAP 호출을 조정한다.
- data/mapStations.ts: 원본에서 옮긴 검토용 데이터와 지도 화면 공용 타입만 가진다.
- StationMarker.tsx: 단일/선택/클러스터 마커의 시각 표현만 가진다.
- StationSheet.tsx: 상세/목록 표시와 닫힘/축소/확장 gesture만 가진다.
- DirectionsIcon.tsx: 프로젝트 규칙대로 Figma SVG를 독립 아이콘으로 관리한다.
- 한 화면에서만 쓰는 작은 로딩·빈 상태 view는 app/map.tsx의 private component로 둔다.
- StationSheet가 350줄을 넘거나 두 번째 지도 화면에서 목록/상세가 재사용될 때만 내부 view를 추가 파일로 분리한다.

---

### Task 1: 지도 의존성과 앱 설정

**Files:**
- Modify: package.json
- Modify: pnpm-lock.yaml
- Modify: app.json
- Modify: app/_layout.tsx

**Interfaces:**
- Produces: /map 라우트, react-native-maps, expo-location, supercluster

- [ ] **Step 1: SDK 57 호환 native dependency를 설치한다**

~~~bash
pnpm exec expo install react-native-maps expo-location
pnpm add supercluster@8.0.1
pnpm add -D @types/supercluster
~~~

Expected: react-native-maps 1.27.2와 expo-location ~57.0.10이 선택되고 supercluster는 pure JavaScript dependency로 추가된다.

- [ ] **Step 2: foreground 위치 권한 문구를 설정한다**

app.json의 plugins에 다음 항목을 추가한다.

~~~json
[
  "expo-location",
  {
    "locationWhenInUsePermission": "현재 위치 주변의 요소수 주유소를 지도에 표시하기 위해 위치 정보에 접근합니다."
  }
]
~~~

Background location, always permission, Android foreground service는 추가하지 않는다.

- [ ] **Step 3: /map 라우트를 등록한다**

~~~tsx
<Stack.Screen name="map" options={{ headerShown: false }} />
~~~

- [ ] **Step 4: 설정을 검증한다**

~~~bash
pnpm exec expo install --check
pnpm exec expo config --type public
pnpm typecheck
git diff --check
~~~

Expected: SDK 불일치가 없고 API key나 좌표 파일 경로 같은 로컬 비밀값이 public config에 노출되지 않는다.

- [ ] **Step 5: 이 단계만 커밋한다**

~~~bash
git add package.json pnpm-lock.yaml app.json app/_layout.tsx
git commit -m "build(map): add native map dependencies"
~~~

### Task 2: 실제 엑셀 구조에 맞는 검토용 데이터

**Files:**
- Create: data/mapStations.ts

**Interfaces:**
- Produces: Coordinate, StationDevice, MapStation, PREVIEW_MAP_STATIONS

- [ ] **Step 1: 데이터 타입을 작성한다**

3절의 타입을 그대로 작성한다. capacityLabel은 1,500L처럼 렌더 가능한 문자열로 두고, 앱에서 의심스러운 원본 값을 추정해 숫자로 고치지 않는다.

- [ ] **Step 2: 사용자가 제공한 정확 좌표가 있으면 5곳을 입력한다**

각 station은 devices 배열을 갖는다. 같은 업체명+설치주소가 여러 행이면 마커를 복제하지 않고 다음처럼 장비만 추가한다.

~~~ts
{
  id: 'station-gosan',
  businessName: '고산주유소',
  devices: [
    { sourceNo: 2, modelName: 'HEUD-SELF-05', capacityLabel: '2,500L' },
    { sourceNo: 4, modelName: 'HEUD-SELF-05', capacityLabel: '2,500L' },
    { sourceNo: 10, modelName: 'HEUD-SELF-05', capacityLabel: '2,500L' },
  ],
}
~~~

정확 좌표가 없으면 수도권 5곳에 사용자가 승인한 임시 좌표를 넣고 coordinateVerified를 false로 둔다. 이 상태에서 TMAP 버튼은 비활성화한다.

- [ ] **Step 3: 원본 데이터의 의미를 보존한다**

- Pole은 pole
- 업체명은 businessName
- 소재지는 area
- 설치주소는 roadAddress
- 무제목 열의 주유소/직판 값은 siteType
- 비고는 note
- no./모델명/용량은 devices의 sourceNo/modelName/capacityLabel

- [ ] **Step 4: 정적 검증 후 커밋한다**

~~~bash
pnpm typecheck
git diff --check
git add data/mapStations.ts
git commit -m "feat(map): add preview station data"
~~~

### Task 3: AppScreen의 지도용 하단 메뉴 배치

**Files:**
- Modify: components/AppScreen.tsx

**Interfaces:**
- Produces: DockMode = 'flow' | 'overlay' | 'hidden'
- Consumes: main variant의 activeTab과 children

- [ ] **Step 1: main variant에만 dockMode를 추가한다**

~~~ts
type DockMode = 'flow' | 'hidden' | 'overlay';

type MainAppScreenProps = {
  activeTab: MainTab;
  children: ReactNode;
  dockMode?: DockMode;
  scrollEnabled?: boolean;
  variant: 'main';
};
~~~

기본값은 dockMode=flow, scrollEnabled=true다. auth와 plain 변형에는 두 prop을 노출하지 않는다.

- [ ] **Step 2: 지도 탭 경로를 활성화한다**

~~~ts
{ href: '/map', icon: 'map', key: 'map', label: '지도' }
~~~

DockItem의 href union에도 /map을 추가한다.

- [ ] **Step 3: overlay와 hidden을 기존 구조 안에 구현한다**

~~~tsx
{props.variant === 'main' && dockMode === 'overlay' ? (
  <View style={styles.overlayBody}>
    {props.children}
    <View pointerEvents="box-none" style={styles.overlayDock}>
      <DockBar activeTab={props.activeTab} />
    </View>
  </View>
) : (
  props.children
)}

{props.variant === 'main' && dockMode === 'flow' ? (
  <DockBar activeTab={props.activeTab} />
) : null}
~~~

overlayDock은 children 하단에서 8px 띄우고 중앙 정렬한다. hidden은 children 뒤에 DockBar를 렌더링하지 않는다. AppFooter의 순서는 모든 모드에서 children/DockBar 다음으로 유지한다.

- [ ] **Step 4: main 화면만 ScrollView gesture를 제어할 수 있게 한다**

~~~tsx
<ScrollView
  scrollEnabled={
    props.variant === 'main' ? (props.scrollEnabled ?? true) : true
  }
>
  {content}
</ScrollView>
~~~

지도 touch 동안만 false로 전달하기 위한 prop이며 기본 동작은 바꾸지 않는다.

- [ ] **Step 5: 현재 main 화면 회귀를 확인하고 커밋한다**

~~~bash
pnpm typecheck
git diff --check
git add components/AppScreen.tsx
git commit -m "refactor(ui): support overlay dock mode"
~~~

수동 확인: /mileage, /mileage/apply, /mypage는 prop을 추가하지 않아도 기존 flow 배치를 유지해야 한다.

### Task 4: 단일·선택·클러스터 마커

**Files:**
- Create: components/map/StationMarker.tsx
- Modify: constants/theme.ts

**Interfaces:**
- Consumes: coordinate, label/count, selected, onPress
- Produces: react-native-maps Marker 한 개

~~~ts
type StationMarkerProps = {
  accessibilityLabel: string;
  coordinate: Coordinate;
  count?: number;
  label?: string;
  onPress: () => void;
  selected?: boolean;
};
~~~

- [ ] **Step 1: Figma 색상 토큰을 확인한다**

기존 mileageAction #4C69FE가 같은 값이면 새 brand500을 만들지 않고 mileageAction을 재사용할지 리뷰에서 결정한다. 지도 외 의미까지 같은 공용 action 색이라는 합의가 없으면 mapMarkerSelected라는 목적 토큰 하나를 추가한다.

- [ ] **Step 2: 세 가지 시각 상태를 작성한다**

- count가 있으면 28x28 원형 클러스터와 숫자
- count가 없으면 높이 28의 흰 pill과 Pole+업체명
- selected이면 #4C69FE 배경과 흰 글자
- label은 한 줄, 최대 폭 164, tail 말줄임

- [ ] **Step 3: marker update 비용을 제한한다**

Marker key에 station id와 selected 상태를 포함해 선택 전환 시 해당 marker만 다시 mount하고 tracksViewChanges는 false로 둔다. cluster key는 supercluster의 cluster_id를 사용한다.

- [ ] **Step 4: 접근성 label을 넣고 커밋한다**

단일 마커는 GSC 진흥주유소, 요소수 주유소처럼 읽고, 클러스터는 주유소 5곳처럼 읽는다.

~~~bash
pnpm typecheck
git diff --check
git add components/map/StationMarker.tsx constants/theme.ts
git commit -m "feat(map): add station markers"
~~~

### Task 5: 지도·현재 위치·클러스터 상태 조정

**Files:**
- Create: app/map.tsx

**Interfaces:**
- Consumes: PREVIEW_MAP_STATIONS, StationMarker, AppScreen
- Produces: route-local region, visible points, SheetContent

- [ ] **Step 1: 기본 region과 위치 권한 흐름을 작성한다**

~~~ts
const SEOUL_REGION = {
  latitude: 37.5665,
  longitude: 126.978,
  latitudeDelta: 1.1,
  longitudeDelta: 1.1,
};

const permission = await Location.requestForegroundPermissionsAsync();
if (permission.status === 'granted') {
  const position = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });
  mapRef.current?.animateToRegion({
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    latitudeDelta: 0.25,
    longitudeDelta: 0.25,
  });
}
~~~

지도는 권한 응답을 기다리지 않고 SEOUL_REGION으로 즉시 렌더링한다. deny, timeout, 조회 오류는 catch해 서울 region을 그대로 유지한다. background 위치나 위치 저장은 하지 않는다.

- [ ] **Step 2: station feature와 cluster index를 한 번 만든다**

~~~ts
const features = stations.map((station) => ({
  type: 'Feature' as const,
  properties: { stationId: station.id },
  geometry: {
    type: 'Point' as const,
    coordinates: [
      station.coordinate.longitude,
      station.coordinate.latitude,
    ],
  },
}));

const clusterIndex = new Supercluster<{ stationId: string }>({
  maxZoom: 18,
  radius: 48,
}).load(features);
~~~

stations가 바뀔 때만 useMemo로 index를 다시 만든다.

- [ ] **Step 3: region을 bbox와 정수 zoom으로 변환한다**

~~~ts
const bbox: [number, number, number, number] = [
  region.longitude - region.longitudeDelta / 2,
  region.latitude - region.latitudeDelta / 2,
  region.longitude + region.longitudeDelta / 2,
  region.latitude + region.latitudeDelta / 2,
];

const zoom = Math.max(
  0,
  Math.min(20, Math.round(Math.log2(360 / region.longitudeDelta))),
);
~~~

한국 영역만 다루므로 이 화면에서는 날짜변경선 wrapping 분기를 추가하지 않는다.

- [ ] **Step 4: 실제 MapView와 화면 상태를 렌더링한다**

~~~tsx
<AppScreen
  activeTab="map"
  dockMode={sheetContent ? 'hidden' : 'overlay'}
  scrollEnabled={screenScrollEnabled}
  variant="main"
>
  <View
    onTouchCancel={() => setScreenScrollEnabled(true)}
    onTouchEnd={() => setScreenScrollEnabled(true)}
    onTouchStart={() => setScreenScrollEnabled(false)}
    style={styles.mapFrame}
  >
    <MapView
      initialRegion={SEOUL_REGION}
      onMapReady={() => setMapReady(true)}
      onPress={dismissSheet}
      onRegionChangeComplete={setRegion}
      ref={mapRef}
      showsUserLocation={locationGranted}
      style={StyleSheet.absoluteFill}
    >
      {markers}
    </MapView>
    {!mapReady ? <MapLoadingOverlay /> : null}
    {mapReady && stations.length === 0 ? <MapEmptyOverlay /> : null}
  </View>
</AppScreen>
~~~

MapLoadingOverlay는 ActivityIndicator와 지도 불러오는 중 문구를, MapEmptyOverlay는 표시할 주유소가 없습니다 문구를 렌더링한다. 서버 요청이 없으므로 사용되지 않는 error/retry 상태는 만들지 않는다. mapFrame touch가 시작되면 AppScreen의 세로 scroll을 잠그고 touch 종료/취소에서 즉시 복원해 지도 pan과 페이지 scroll의 책임을 분리한다.

- [ ] **Step 5: marker/cluster 선택을 연결한다**

- 단일 marker: selected station 설정, 해당 좌표로 animateCamera, station sheet collapsed
- cluster: getLeaves(clusterId, Infinity)로 station 목록 생성, cluster sheet collapsed
- cluster tap에서 getClusterExpansionZoom을 호출하지 않음
- cluster 목록 item 선택: station sheet로 전환하고 카메라 이동
- 지도 빈 영역: sheet를 닫고 선택 해제

- [ ] **Step 6: 지도와 상위 ScrollView gesture를 실제 기기에서 확인한다**

지도 위 세로 drag는 MapView pan으로, 지도 밖 세로 drag는 AppScreen scroll로 동작해야 한다. touch cancel 후 scrollEnabled가 true로 복구되는지도 확인한다. 실패해도 gesture library를 추가하지 않고 touch event 경계부터 수정한다.

- [ ] **Step 7: 정적 검증 후 커밋한다**

~~~bash
pnpm typecheck
git diff --check
git add app/map.tsx
git commit -m "feat(map): add station map and clustering"
~~~

### Task 6: 드래그 가능한 주유소/클러스터 패널

**Files:**
- Create: components/map/StationSheet.tsx
- Modify: app/map.tsx

**Interfaces:**
- Consumes: SheetContent, SheetSnap, onDismiss, onSelectStation, onDirections
- Produces: closed/collapsed/expanded panel

~~~ts
type StationSheetProps = {
  content: Exclude<SheetContent, null>;
  onDirections: (station: MapStation) => void;
  onDismiss: () => void;
  onSelectStation: (station: MapStation) => void;
};
~~~

- [ ] **Step 1: map frame 높이로 snap 위치를 계산한다**

mapFrame의 onLayout 높이를 전달하고 다음 규칙을 사용한다.

- closed: panel 전체가 지도 아래
- collapsed: Figma의 선택 패널과 맞춰 지도 하단 약 136px 노출
- expanded: 지도 상단 24px를 남기고 노출

Animated.Value 하나를 translateY로 사용하고, 레이아웃 측정 전에는 panel을 렌더링하지 않는다.

- [ ] **Step 2: drag handle에만 PanResponder를 연결한다**

~~~ts
const panResponder = PanResponder.create({
  onMoveShouldSetPanResponder: (_, gesture) =>
    Math.abs(gesture.dy) > 4,
  onPanResponderMove: (_, gesture) => {
    translateY.setValue(clamp(startY + gesture.dy, expandedY, closedY));
  },
  onPanResponderRelease: (_, gesture) => {
    settleToNearestSnap(gesture.dy, gesture.vy);
  },
});
~~~

handle만 drag를 소유해 내부 FlatList 스크롤과 충돌하지 않게 한다. 위 drag는 expanded, 아래 drag는 expanded→collapsed→closed 순서로 정착시킨다.

- [ ] **Step 3: 명시적 닫기 버튼을 추가한다**

기존 CloseIcon을 재사용하고 accessibilityLabel은 상세 정보 닫기로 둔다. 닫힘 animation 완료 후 route의 selected station/sheet content를 null로 만든다.

- [ ] **Step 4: station 상세를 렌더링한다**

- 제목: Pole + 업체명
- badge: siteType과 note가 있을 때만 표시
- 소재지와 설치주소
- devices 전체: 모델명 / 용량
- 좌표 검증 전: 길안내 버튼 disabled와 정확한 좌표 확인 후 이용할 수 있습니다 문구
- 좌표 검증 후: 길안내 button

- [ ] **Step 5: cluster 목록을 FlatList로 렌더링한다**

제목은 이 지역 주유소 N곳이다. 각 행은 Pole+업체명, 소재지, 설치주소를 표시하고 button role로 선택할 수 있게 한다. list item을 누르면 route가 station 상세로 전환한다.

- [ ] **Step 6: reduced motion과 접근성을 처리한다**

AccessibilityInfo.isReduceMotionEnabled가 true이면 snap animation duration을 0으로 한다. 패널 제목에는 accessibilityRole header를, 상태 변경 안내에는 polite live region을 사용한다.

- [ ] **Step 7: 정적 검증 후 커밋한다**

~~~bash
pnpm typecheck
git diff --check
git add components/map/StationSheet.tsx app/map.tsx
git commit -m "feat(map): add draggable station sheet"
~~~

### Task 7: TMAP 길안내와 아이콘

**Files:**
- Create: components/icons/DirectionsIcon.tsx
- Modify: constants/assets.ts
- Modify: utils/alerts.ts
- Modify: app/map.tsx

**Interfaces:**
- Consumes: verified MapStation coordinate
- Produces: TMAP route URL, store fallback, final error alert

- [ ] **Step 1: Figma 길안내 SVG를 프로젝트 아이콘 규칙대로 옮긴다**

SVG path는 constants/assets.ts에 한 번만 저장하고 DirectionsIcon.tsx가 react-native-svg로 렌더링한다. 새 icon library나 transformer는 추가하지 않는다.

- [ ] **Step 2: 목적지 URL을 만든다**

~~~ts
const query = new URLSearchParams({
  goalname: station.businessName,
  goalx: String(station.coordinate.longitude),
  goaly: String(station.coordinate.latitude),
});
const tmapUrl = 'tmap://route?' + query.toString();
~~~

경도는 goalx, 위도는 goaly다. 업체명은 URLSearchParams로 encode한다.

- [ ] **Step 3: 실행 실패를 스토어 fallback으로 연결한다**

~~~ts
const storeUrl = Platform.select({
  ios: 'https://apps.apple.com/kr/app/id431589174',
  android:
    'https://play.google.com/store/apps/details?id=com.skt.tmap.ku',
});

try {
  await Linking.openURL(tmapUrl);
} catch {
  try {
    await Linking.openURL(storeUrl);
  } catch {
    showTmapOpenFailedAlert();
  }
}
~~~

canOpenURL을 먼저 호출하지 않아 iOS LSApplicationQueriesSchemes와 Android package visibility 설정을 불필요하게 늘리지 않는다.

- [ ] **Step 4: 현재 방식의 지원 경계를 기록한다**

URL scheme은 lightweight 검토 구현이다. iOS/Android에서 목적지명과 좌표가 모두 들어가는지 실기기로 검증하지 못하면 완료 보고에 미검증으로 남긴다. 실패하면 임의 parameter 조합을 늘리지 않고 공식 TMAP SDK 계획으로 전환한다.

- [ ] **Step 5: 정적 검증 후 커밋한다**

~~~bash
pnpm typecheck
git diff --check
git add components/icons/DirectionsIcon.tsx constants/assets.ts utils/alerts.ts app/map.tsx
git commit -m "feat(map): add tmap directions"
~~~

### Task 8: 개발 기록과 서버 요구사항

**Files:**
- Modify: docs/development-notes.md

- [ ] **Step 1: React Native/Expo 학습 내용을 한국어로 기록한다**

- MapView는 웹 DOM 지도가 아니라 플랫폼 native view를 감싼다는 점
- region/camera ref와 React state의 역할 차이
- foreground 위치 권한과 서울 fallback
- supercluster가 [longitude, latitude] 순서의 GeoJSON을 사용한다는 점
- PanResponder handle과 FlatList scroll gesture 경계
- Linking으로 외부 앱을 열 때 설치 여부와 실패 경로를 다뤄야 한다는 점

- [ ] **Step 2: AI 지원과 개발자 결정을 분리한다**

AI 지원에는 Figma 구조 분석, 엑셀 데이터 구조 분석, Expo/TMAP 문서 조사, 구현 초안을 기록한다. 개발자 결정에는 지도 공급자, TMAP 단일 선택, 클러스터 목록 동작, 현재 위치 fallback, 바텀시트 동작을 기록한다.

- [ ] **Step 3: MAP-001 서버 백로그를 추가한다**

- 변하지 않는 stationId
- 검증된 WGS84 latitude/longitude
- 업체명, Pole, 소재지, 설치주소, 주유소/직판, 비고
- station 아래 복수 devices와 장비별 model/capacity
- 주소 정규화·오탈자 검수와 중복 station 병합 정책
- 좌표 생성/검수 파이프라인; 앱 런타임 대량 geocoding 금지
- 전체 또는 지도 bbox 기반 조회와 갱신 주기
- 빈 결과와 조회 실패의 구분
- 잘못된 좌표 제외와 데이터 품질 모니터링

- [ ] **Step 4: 실제 실행한 검증만 기록하고 커밋한다**

~~~bash
git diff --check
git add docs/development-notes.md
git commit -m "docs(map): record map implementation decisions"
~~~

### Task 9: 정적·번들·기기 검증

**Files:**
- Verify only

- [ ] **Step 1: 정적·설정 검사를 실행한다**

~~~bash
pnpm typecheck
pnpm exec expo install --check
pnpm exec expo config --type public
git diff --check
~~~

- [ ] **Step 2: 양 플랫폼 Metro 번들을 만든다**

~~~bash
pnpm exec expo export --platform ios --output-dir /tmp/hpluseco-map-ios
pnpm exec expo export --platform android --output-dir /tmp/hpluseco-map-android
~~~

- [ ] **Step 3: iOS 시뮬레이터에서 확인한다**

- /map 직접 진입
- 서울 fallback과 위치 권한 허용/거부
- MapView pan, pinch zoom, 상위 화면 scroll
- zoom 변화에 따른 cluster 병합/분리
- cluster tap 목록, drag 확장, item 선택
- 단일 marker 선택, 선택 색상, camera 이동
- 닫기 버튼, 아래 drag, 지도 빈 영역 탭
- 하단 메뉴 숨김/복원과 푸터 순서
- TMAP 미설치 상태의 App Store fallback
- /mileage, /mileage/apply, /mypage의 DockBar 회귀

- [ ] **Step 4: Android emulator 또는 실기기에서 같은 흐름을 확인한다**

특히 Google 지도 tile, custom marker snapshot, 지도와 ScrollView의 세로 gesture, Play Store fallback을 확인한다.

- [ ] **Step 5: TMAP 설치 실기기에서 목적지를 확인한다**

업체명, longitude, latitude가 실제 목적지로 전달되는지 iOS와 Android 각각 확인한다. 한 플랫폼이라도 실행하지 못하면 통과로 기록하지 않는다.

- [ ] **Step 6: Figma와 시각 비교한다**

390px 기준으로 header 52, map 540, dock 284x64, marker 높이 28, sheet handle 64x4, 패널 간격과 선택 색상을 screenshot으로 비교한다.

---

## 코드 리뷰 권장 순서

1. data/mapStations.ts
   - 장비 행을 주유소 devices로 올바르게 묶었는지
   - 좌표 검증 여부와 원본 주소를 숨기거나 보정하지 않았는지
2. app/map.tsx
   - 위치 실패가 서울 fallback으로 끝나는지
   - region→bbox/zoom→cluster 흐름과 선택 상태가 한 방향인지
   - 가짜 서버 상태, 불필요한 Provider/store가 없는지
3. components/map/StationSheet.tsx
   - 상세/클러스터 목록 두 모드와 closed/collapsed/expanded 동작
   - handle gesture가 FlatList와 충돌하지 않는지
4. components/map/StationMarker.tsx
   - 단일/선택/클러스터 표현, label 말줄임, 접근성
   - tracksViewChanges와 key 전략이 과도한 redraw를 막는지
5. components/AppScreen.tsx
   - flow 기본값이 기존 화면을 보존하는지
   - overlay/hidden이 지도 화면 안에서만 동작하는지
6. app/map.tsx의 TMAP 처리와 utils/alerts.ts
   - goalx=longitude, goaly=latitude인지
   - 검증 좌표만 실행하고 실패 시 정확한 스토어로 가는지
7. app.json, package.json, pnpm-lock.yaml, app/_layout.tsx
   - SDK 57 호환 버전, foreground 권한만 요청, /map 등록
8. DirectionsIcon.tsx, constants/assets.ts, constants/theme.ts
   - SVG 원본·기존 색상 토큰 재사용과 중복 여부
9. docs/development-notes.md
   - 실제 실행한 검증만 적었는지
   - 서버 기술/API 모양을 미리 확정하지 않았는지

## 완료 조건

- /map이 실제 native MapView를 사용한다.
- 권한 허용 시 현재 위치, 실패 시 서울시청 기준으로 열린다.
- zoom에 따라 주유소가 cluster로 합쳐지고 cluster tap 시 목록이 열린다.
- 같은 주유소의 복수 장비가 별도 marker가 아니라 상세 devices로 보인다.
- panel은 위 drag 확장, 아래 drag 축소/닫기, 닫기 버튼, 지도 탭 닫기를 지원한다.
- panel이 열리면 DockBar가 숨고 닫히면 지도 위 overlay로 복원된다.
- 검증된 좌표만 TMAP에 전달하고 미설치 시 스토어로 이동한다.
- 기존 main/auth/plain 화면 셸과 DockBar 배치가 회귀하지 않는다.
- 서버 응답, 좌표 정확성, 기기 검증 결과를 임의로 성공 처리하지 않는다.
- 수행한 테스트와 미검증 항목이 개발 기록과 최종 보고에 정확히 남는다.
