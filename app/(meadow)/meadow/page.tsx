import { Gate } from "@/components/Gate";
import Playground from "@/pieces/meadow/Playground";

// loam, behind Sign in with publik. It calls no AI and uploads nothing, so signing in is enough.
export default function MeadowPage() {
  return (
    <Gate piece="meadow">
      <Playground />
    </Gate>
  );
}
