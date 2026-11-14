import { Gate } from "@/components/Gate";
import Studio from "@/pieces/effects/Studio";

// tincture, behind Sign in with publik. It calls no AI and uploads nothing, so signing in is enough.
export default function EffectsPage() {
  return (
    <Gate piece="effects">
      <Studio />
    </Gate>
  );
}
