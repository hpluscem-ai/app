import { AppScreen } from '../../components/AppScreen';
import { MileagePhotoForm } from '../../components/mileage/MileagePhotoForm';
import { showMileageServerPendingAlert } from '../../utils/alerts';

export default function MileageApplyRoute() {
  return (
    <AppScreen activeTab="apply" showFooter={false} variant="main">
      <MileagePhotoForm
        fillAvailableSpace
        intro="적립 이미지 업로드"
        onValidSubmit={showMileageServerPendingAlert}
        requirement="both"
        submitLabel="사진등록"
      />
    </AppScreen>
  );
}
