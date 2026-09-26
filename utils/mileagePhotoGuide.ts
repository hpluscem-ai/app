import { File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';

const KEY = 'hpluseco.mileage-photo-guide.v1';
let confirmed = false;

export function hasConfirmedMileagePhotoGuide(): boolean {
  if (confirmed) return true;
  try {
    return Platform.OS === 'web'
      ? localStorage.getItem(KEY) === '1'
      : new File(Paths.document, KEY).exists;
  } catch {
    return false;
  }
}

export function confirmMileagePhotoGuide(): void {
  confirmed = true;
  try {
    if (Platform.OS === 'web') localStorage.setItem(KEY, '1');
    else new File(Paths.document, KEY).write('1');
  } catch {
    // Storage can be unavailable. Keep confirmation for this run without blocking uploads.
  }
}
