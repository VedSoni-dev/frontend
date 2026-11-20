import { Gate } from "@/components/Gate";
import Backlit from "@/pieces/backlit/Backlit";

// backlit, behind Sign in with publik. It calls no AI and uploads nothing, so signing in is enough.
export default function BacklitPage() {
  return (
    <Gate piece="backlit">
      <Backlit />
    </Gate>
  );
}
