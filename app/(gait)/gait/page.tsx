import { Gate } from "@/components/Gate";
import { Workspace } from "@/pieces/gait/components/Workspace";

// Midstance's workspace (its clone's /app), behind Sign in with publik. It calls no AI, so signing in is enough.
export default function GaitPage() {
  return (
    <Gate piece="gait">
      <Workspace />
    </Gate>
  );
}
