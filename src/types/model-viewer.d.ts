declare namespace JSX {
  interface IntrinsicElements {
    "model-viewer": React.DetailedHTMLProps<
      React.AllHTMLAttributes<HTMLElement>,
      HTMLElement
    > & {
      src?: string;
      alt?: string;
      ar?: boolean;
      "camera-controls"?: boolean;
      "auto-rotate"?: boolean;
      "shadow-intensity"?: string;
      "ar-modes"?: string;
      "ar-scale"?: string;
      "ios-src"?: string;
      poster?: string;
      reveal?: "auto" | "interaction";
      loading?: "auto" | "lazy" | "eager";
    };
  }
}
