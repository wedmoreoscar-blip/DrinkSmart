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
  // Dark is the only aesthetic that has actually been designed. The light
  // theme in index.css is derived, not drawn, so it is not shipped: forcedTheme
  // pins rendering to dark and overrides any stored or OS preference, including
  // a stale profiles.theme = "light" on an existing account.
  //
  // The machinery below it stays wired on purpose. When Claude Design delivers
  // a real light palette, drop it into the :root block in index.css, remove
  // forcedTheme here, and flip LIGHT_THEME_AVAILABLE in Profile.tsx. Nothing
  // else has to change.
  <ThemeProvider attribute="class" defaultTheme="dark" enableSystem forcedTheme="dark">
    <App />
  </ThemeProvider>
);
