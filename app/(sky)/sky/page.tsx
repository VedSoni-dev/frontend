import { Gate } from "@/components/Gate";
import Playground from "@/pieces/sky/Playground";

// cirrus, behind Sign in with publik. It calls no AI and uploads nothing, so signing in is enough.
export default function SkyPage() {
  return (
    <Gate piece="sky">
      <Playground />
    </Gate>
  );
}
