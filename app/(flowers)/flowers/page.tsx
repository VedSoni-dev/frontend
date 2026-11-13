import { Gate } from "@/components/Gate";
import Playground from "@/pieces/flowers/Playground";

// seedbed's workbench (its clone's /app), behind Sign in with publik.
export default function FlowersPage() {
  return (
    <Gate piece="flowers">
      <Playground />
    </Gate>
  );
}
