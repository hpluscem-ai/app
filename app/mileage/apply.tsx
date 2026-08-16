import { AppScreen } from '../../components/AppScreen';
import { MileagePhotoForm } from '../../components/mileage/MileagePhotoForm';
import { showMileageServerPendingAlert } from '../../utils/alerts';

export default function MileageApplyRoute() {
  return (
    <AppScreen activeTab="apply" variant="main">
      <MileagePhotoForm
        intro="적립 이미지 업로드"
        onValidSubmit={showMileageServerPendingAlert}
        requirement="both"
        submitLabel="사진 등록"
      />
    </AppScreen>
  );
}
