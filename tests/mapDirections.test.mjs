import assert from 'node:assert/strict';
import test from 'node:test';
import { getWebDirectionsUrl } from '../utils/mapDirections.ts';

test('Web directions select Naver or TMAP and validate the destination', () => {
  const name = '주유소 A&B / #1';
  const coordinate = { latitude: 37.3595, longitude: 127.105 };
  const url = new URL(getWebDirectionsUrl(coordinate, name));
  assert.equal(url.origin, 'https://map.naver.com');
  assert.equal(url.searchParams.get('elat'), '37.3595');
  assert.equal(url.searchParams.get('elng'), '127.105');
  assert.equal(url.searchParams.get('eText'), name);
  assert.equal(url.searchParams.get('pathType'), '0');
  assert.equal(url.hash, '');
  for (const coordinate of [
    { latitude: NaN, longitude: 127 },
    { latitude: 37, longitude: 181 },
    { latitude: -91, longitude: 127 },
  ]) {
    assert.throws(
      () => getWebDirectionsUrl(coordinate, name),
      /INVALID_DESTINATION/,
    );
  }
  assert.equal(getWebDirectionsUrl(coordinate, name, '  '), url.href);
  const tmap = new URL(getWebDirectionsUrl(coordinate, name, 'test-key'));
  assert.equal(tmap.origin, 'https://apis.openapi.sk.com');
  assert.equal(tmap.pathname, '/tmap/app/routes');
  assert.equal(tmap.searchParams.get('appKey'), 'test-key');
  assert.equal(tmap.searchParams.get('goalname'), name);
  assert.equal(tmap.searchParams.get('goalx'), '127.105');
  assert.equal(tmap.searchParams.get('goaly'), '37.3595');
});
