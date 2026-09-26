export const webPageNames: Record<string, string> = {
  '/': '',
  '/mileage': '',
  '/login': '로그인',
  '/sign-up': '회원가입',
  '/find-email': '이메일 찾기',
  '/find-password': '비밀번호 찾기',
  '/reset-password': '비밀번호 재설정',
  '/map': '지도',
  '/mileage/apply': '적립',
  '/mileage/pending': '대기 · 사진보기',
  '/mileage/rejected': '반려 · 사유보기',
  '/mypage': '내정보',
  '/term': '이용약관',
  '/privacy': '개인정보처리방침',
  '/collection': '개인정보 수집 및 이용 동의',
  '/marketing': '마케팅 정보 수신 동의',
};

export function getWebMetadata(path: string) {
  const pathname = path.split(/[?#]/)[0].replace(/\/+$/, '') || '/';
  const route = Object.hasOwn(webPageNames, pathname) ? pathname : '/';
  const pageName = webPageNames[route];
  return {
    title: pageName ? `하얀100 | ${pageName}` : '하얀100',
    url: `https://www.hayan100.kr${route}`,
  };
}
