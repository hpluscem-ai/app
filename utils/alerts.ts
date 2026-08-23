import { ActionSheetIOS, Alert, Platform } from 'react-native';

type ImageSourceActions = {
  onCamera: () => void;
  onLibrary: () => void;
};

export function showImageSourceActions({
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

export function showCameraPermissionAlert() {
  Alert.alert(
    '카메라 권한이 필요합니다.',
    '사진을 촬영하려면 설정에서 카메라 접근을 허용해주세요.',
  );
}

export function showImagePickerErrorAlert() {
  Alert.alert(
    '사진을 불러오지 못했습니다.',
    '잠시 후 다시 시도해주세요.',
  );
}

export function showImageSizeLimitAlert() {
  Alert.alert('사진 용량 초과', '50MB 이하의 이미지만 등록할 수 있습니다.');
}

export function showImageSizeUnavailableAlert() {
  Alert.alert(
    '사진 용량 확인 필요',
    '파일 용량을 확인할 수 없는 이미지는 등록할 수 없습니다.',
  );
}

export function showUnsupportedImageFormatAlert() {
  Alert.alert(
    '지원하지 않는 이미지 형식',
    'JPG, PNG, HEIC 또는 HEIF 이미지를 선택해주세요.',
  );
}

export function showMileageImagesRequiredAlert() {
  Alert.alert(
    '사진을 확인해주세요.',
    '영수증과 계기판 사진을 모두 등록해주세요.',
  );
}

export function showMileageAtLeastOneImageRequiredAlert() {
  Alert.alert('사진을 확인해주세요.', '재등록할 사진을 한 장 이상 등록해주세요.');
}

export function showMileageServerPendingAlert() {
  Alert.alert(
    '마일리지 적립 서버 연동 필요',
    '사진 업로드와 적립 신청 API가 정해진 뒤 등록 요청을 연결합니다.',
  );
}

export function showMileageReRegistrationServerPendingAlert() {
  Alert.alert(
    '마일리지 재등록 서버 연동 필요',
    '재등록 사진 업로드와 적립 신청 API가 정해진 뒤 재등록 요청을 연결합니다.',
  );
}

export function showLoginServerPendingAlert() {
  Alert.alert(
    '로그인 입력 확인 완료',
    '서버 연동 전이라 로그인 요청은 전송하지 않습니다.',
  );
}

export function showSignUpServerPendingAlert() {
  Alert.alert(
    '회원가입 서버 연동 필요',
    '소속 목록, 카카오톡 휴대폰 인증, 중복 확인과 계정 생성 API가 정해진 뒤 가입 요청을 연결합니다.',
  );
}

export function showOrganizationPendingAlert() {
  Alert.alert(
    '소속 목록 준비 중',
    '소속과 서비스 가격·기간을 제공할 서버 API가 정해진 뒤 선택 목록을 연결합니다.',
  );
}

export function showKakaoVerificationRequestPendingAlert() {
  Alert.alert(
    '인증번호 발송 준비 중',
    '카카오톡 인증번호 발송은 서버 연동 후 동작합니다.',
  );

  return { status: 'unavailable' } as const;
}

export function showKakaoVerificationCheckPendingAlert() {
  Alert.alert(
    '인증번호 확인 준비 중',
    '인증번호 확인과 인증 증명 발급은 서버 연동 후 동작합니다.',
  );

  return { status: 'unavailable' } as const;
}

export function showPhoneVerificationRequiredAlert() {
  Alert.alert('휴대폰 인증 필요', '인증번호 확인을 완료해주세요.');
}

export function showProfileServerPendingAlert() {
  Alert.alert(
    '정보 변경 서버 연동 필요',
    '내 정보 저장 API가 정해진 뒤 변경 요청을 연결합니다.',
  );
}

export function showFindEmailServerPendingAlert() {
  Alert.alert(
    '이메일 찾기 서버 연동 필요',
    '카카오톡 본인 인증과 가입 이메일 조회 API가 정해진 뒤 결과를 연결합니다.',
  );
}

export function showFindPasswordServerPendingAlert() {
  Alert.alert(
    '비밀번호 찾기 서버 연동 필요',
    '카카오톡 본인 인증과 비밀번호 재설정 링크 발송 API가 정해진 뒤 결과를 연결합니다.',
  );
}

export function showResetPasswordServerPendingAlert() {
  Alert.alert(
    '비밀번호 변경 서버 연동 필요',
    '재설정 Token 검증과 비밀번호 변경 API가 정해진 뒤 변경 요청을 연결합니다.',
  );
}

export function showTmapOpenFailedAlert() {
  Alert.alert(
    '티맵을 열 수 없습니다.',
    '티맵 또는 앱 스토어를 열지 못했습니다. 잠시 후 다시 시도해주세요.',
  );
}
