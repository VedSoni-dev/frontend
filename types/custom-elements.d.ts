// <seedbed-garden>: the custom element public/flowers/seedbed.js defines (used live on the index).
import type { DetailedHTMLProps, HTMLAttributes } from "react";

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "seedbed-garden": DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & { preset?: string; radius?: string; night?: string; pitch?: string };
    }
  }
}
