export type MapCoordinate = {
  latitude: number;
  longitude: number;
};

export type StationDevice = {
  capacity: string;
  model: string;
};

export type MapStation = {
  area: string;
  businessName: string;
  coordinate: MapCoordinate;
  coordinateVerified: boolean;
  devices: ReadonlyArray<StationDevice>;
  id: string;
  note?: string;
  pole: string;
  roadAddress: string;
  siteType: '주유소' | '직판';
};

/**
 * 엑셀 원본의 수도권 설치처를 화면 검토용 임시 좌표에 배치한 데이터입니다.
 * 실제 좌표를 전달받기 전에는 길안내에 사용하지 않습니다.
 */
export const previewMapStations: ReadonlyArray<MapStation> = [
  {
    area: '경기 오산',
    businessName: '오산삼미주유소',
    coordinate: { latitude: 37.1498, longitude: 127.077 },
    coordinateVerified: false,
    devices: [{ capacity: '2,500L', model: 'HEUD-SELF-05' }],
    id: 'station-osan-sammi',
    note: '셀프',
    pole: 'GSC',
    roadAddress: '경기도 오산시 내삼미동 588-3 5892,589-8번지',
    siteType: '주유소',
  },
  {
    area: '경기 수원',
    businessName: '진흥주유소',
    coordinate: { latitude: 37.2636, longitude: 127.0286 },
    coordinateVerified: false,
    devices: [{ capacity: '2,500L', model: 'HEUD-SELF-05' }],
    id: 'station-suwon-jinheung',
    note: '셀프',
    pole: 'GSC',
    roadAddress: '경기도 수원시 권선구 수인로 173',
    siteType: '주유소',
  },
  {
    area: '인천 연수',
    businessName: '송도국제도시주유소',
    coordinate: { latitude: 37.3825, longitude: 126.6569 },
    coordinateVerified: false,
    devices: [{ capacity: '1,400L', model: 'ST2140S' }],
    id: 'station-incheon-songdo',
    pole: 'GSC',
    roadAddress: '인천 연수구 하모니로 128',
    siteType: '주유소',
  },
  {
    area: '경기 화성',
    businessName: '동탄신도시주유소',
    coordinate: { latitude: 37.1997, longitude: 127.0976 },
    coordinateVerified: false,
    devices: [{ capacity: '1,400L', model: 'ST2140S' }],
    id: 'station-hwaseong-dongtan',
    pole: 'GSC',
    roadAddress: '경기 화성시 효행로 1293',
    siteType: '주유소',
  },
  {
    area: '서울 영등포',
    businessName: '신길주유소',
    coordinate: { latitude: 37.5066, longitude: 126.9139 },
    coordinateVerified: false,
    devices: [{ capacity: '1,400L', model: 'ST2140S' }],
    id: 'station-seoul-singil',
    pole: 'GSC',
    roadAddress: '서울특별시 영드포구 신길로 74',
    siteType: '주유소',
  },
];
