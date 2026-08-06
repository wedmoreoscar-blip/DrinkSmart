import { createRoot } from "react-dom/client";
import { ThemeProvider } from "next-themes";
// Inter, self-hosted: the type scale is specified in Inter metrics, and a CDN
// link would fail in the Capacitor build with no network. 400 body, 500 headings
// — the only two weights the design uses.
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  // Dark is the baseline the design was drawn for, so it is the default rather
  // than following the OS. Light stays available through the Profile toggle.
  <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
    <App />
  </ThemeProvider>
);
