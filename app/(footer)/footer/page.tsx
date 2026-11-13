import { Gate } from "@/components/Gate";
import Playground from "@/pieces/footer/Playground";

// grainfoot's playground (its clone's /app), behind Sign in with publik.
export default function FooterPage() {
  return (
    <Gate piece="footer">
      <Playground />
    </Gate>
  );
}
