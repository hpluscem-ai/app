import { useMemo } from 'react';
import { ActionSheetIOS, Alert, Platform } from 'react-native';

import { useNotice } from '../components/NoticeProvider';

type ImageSourceActions = {
  onCamera: () => void;
  onLibrary: () => void;
};

function showNativeImageSourceActions({
  onCamera,
  onLibrary,
}: ImageSourceActions) {
  if (Platform.OS === 'ios') {
    ActionSheetIOS.showActionSheetWithOptions(
      {
        cancelButtonIndex: 2,
        options: ['카메라로 촬영', '갤러리에서 선택', '취소'],
        title: '사진 업로드',
      },
      (buttonIndex) => {
        if (buttonIndex === 0) {
          onCamera();
        } else if (buttonIndex === 1) {
          onLibrary();
        }
      },
    );
    return;
  }

  Alert.alert('사진 업로드', '업로드 방식을 선택해주세요.', [
    { onPress: onCamera, text: '카메라로 촬영' },
    { onPress: onLibrary, text: '갤러리에서 선택' },
    { style: 'cancel', text: '취소' },
  ]);
}

export function useAlerts() {
  const showNotice = useNotice();
  return useMemo(() => {
    function showImageSourceActions(actions: ImageSourceActions) {
      if (Platform.OS !== 'web') {
        showNativeImageSourceActions(actions);
        return;
      }
      actions.onLibrary();
    }

    const notify = (
      title: string,
      message: string,
      onConfirm?: () => void,
      cancelable = true,
    ) => {
      showNotice({ title, message, onConfirm, cancelable });
    };

    function showCameraPermissionAlert() {
      notify(
        '카메라 권한이 필요합니다.',
        '사진을 촬영하려면 설정에서 카메라 접근을 허용해주세요.',
      );
    }

    function showImagePickerErrorAlert() {
      notify('사진을 불러오지 못했습니다.', '잠시 후 다시 시도해주세요.');
    }

    function showImageSizeLimitAlert() {
      notify('사진 용량 초과', '50MB 이하의 이미지만 등록할 수 있습니다.');
    }

    function showImageSizeUnavailableAlert() {
      notify(
        '사진 용량 확인 필요',
        '파일 용량을 확인할 수 없는 이미지는 등록할 수 없습니다.',
      );
    }

    function showUnsupportedImageFormatAlert() {
      notify(
        '지원하지 않는 이미지 형식',
        'JPG, PNG, HEIC 또는 HEIF 이미지를 선택해주세요.',
      );
    }

    function showMileageImagesRequiredAlert() {
      notify(
        '사진을 확인해주세요.',
        '영수증과 계기판 사진을 모두 등록해주세요.',
      );
    }

    function showMileageAtLeastOneImageRequiredAlert() {
      notify(
        '사진을 확인해주세요.',
        '재등록할 사진을 한 장 이상 등록해주세요.',
      );
    }

    function showMileageServerPendingAlert() {
      notify(
        '마일리지 적립 서버 연동 필요',
        '사진 업로드와 적립 신청 API가 정해진 뒤 등록 요청을 연결합니다.',
      );
    }

    function showMileageReRegistrationServerPendingAlert() {
      notify(
        '마일리지 재등록 서버 연동 필요',
        '재등록 사진 업로드와 적립 신청 API가 정해진 뒤 재등록 요청을 연결합니다.',
      );
    }

    function showAuthErrorAlert(message: string, onConfirm?: () => void) {
      notify('요청을 확인해주세요.', message, onConfirm, !onConfirm);
    }

    function showSignupSuccessAlert(onConfirm: () => void) {
      notify('회원가입 완료', '회원가입이 완료되었습니다.', onConfirm, false);
    }

    function showPhoneVerificationRequiredAlert() {
      notify('휴대폰 인증 필요', '인증번호 확인을 완료해주세요.');
    }

    function showTmapOpenFailedAlert() {
      notify(
        '티맵을 열 수 없습니다.',
        '티맵 또는 앱 스토어를 열지 못했습니다. 잠시 후 다시 시도해주세요.',
      );
    }

    return {
      showImageSourceActions,
      showCameraPermissionAlert,
      showImagePickerErrorAlert,
      showImageSizeLimitAlert,
      showImageSizeUnavailableAlert,
      showUnsupportedImageFormatAlert,
      showMileageImagesRequiredAlert,
      showMileageAtLeastOneImageRequiredAlert,
      showMileageServerPendingAlert,
      showMileageReRegistrationServerPendingAlert,
      showAuthErrorAlert,
      showSignupSuccessAlert,
      showPhoneVerificationRequiredAlert,
      showTmapOpenFailedAlert,
    };
  }, [showNotice]);
}
