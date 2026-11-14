import { Gate } from "@/components/Gate";
import Studio from "@/pieces/glass/Studio";

// vellum, behind Sign in with publik. It calls no AI and uploads nothing, so signing in is enough.
export default function GlassPage() {
  return (
    <Gate piece="glass">
      <Studio />
    </Gate>
  );
}
