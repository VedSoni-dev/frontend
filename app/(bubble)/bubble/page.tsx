import { Gate } from "@/components/Gate";
import Studio from "@/pieces/bubble/Studio";

// suds, behind Sign in with publik. It calls no AI and uploads nothing, so signing in is enough.
export default function BubblePage() {
  return (
    <Gate piece="bubble">
      <Studio />
    </Gate>
  );
}
