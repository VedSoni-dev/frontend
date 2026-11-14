import { Gate } from "@/components/Gate";
import Studio from "@/pieces/sharks/Studio";

// shoal, behind Sign in with publik. It calls no AI and uploads nothing, so signing in is enough.
export default function SharksPage() {
  return (
    <Gate piece="sharks">
      <Studio />
    </Gate>
  );
}
