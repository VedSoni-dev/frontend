import { Gate } from "@/components/Gate";
import Studio from "@/pieces/hold/Studio";

// baize, behind Sign in with publik. It calls no AI and uploads nothing, so signing in is enough.
export default function HoldPage() {
  return (
    <Gate piece="hold">
      <Studio />
    </Gate>
  );
}
