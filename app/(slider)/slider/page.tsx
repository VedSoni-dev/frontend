import { Gate } from "@/components/Gate";
import Playground from "@/pieces/slider/Playground";

// detent's workbench (its clone's /app), behind Sign in with publik. Share links and the QR code open /slider?c=…
export default function SliderPage() {
  return (
    <Gate piece="slider">
      <Playground />
    </Gate>
  );
}
