import { Gate } from "@/components/Gate";
import Backdrop from "@/pieces/dither/Backdrop";

// backdrop, behind Sign in with publik. It calls no AI and uploads nothing, so signing in is enough.
export default function DitherPage() {
  return (
    <Gate piece="dither">
      <Backdrop />
    </Gate>
  );
}
