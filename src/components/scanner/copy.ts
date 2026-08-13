/* Copy and formatting rules from the design prototypes' trailing <script> blocks.
   These strings are exact — used verbatim. */

export const SCAN_CAPTURE_COPY = {
  title: "Scan a menu",
  guidance: "One page, filling the frame. If you can read the prices, so can we.",
  shutter: "Take the photo",
  pick: "Choose a photo instead",
  privacy: "The photo is used once and not kept.",
};

export const SCAN_WAIT_COPY = {
  title: "Reading the menu",
  estimate: "Five to ten seconds, usually. Longer on a big menu.",
  leave: "Keep planning", // the 64px primary — waiting is not a wall
  reassure: "We will tell you when it is read — nothing here needs watching.",
  cancel: "Cancel the read",
  doneToast: (n: number) => n + " drinks read — check them", // 1m toast, action "Check"
  slowNote: "Still going. Big menus take a while.", // replaces estimate after 20s
};

export const SCAN_REVIEW_COPY = {
  title: "Check the read",
  count: (n: number) => n + " drinks read",
  gaps: (n: number) => n + (n === 1 ? " gap" : " gaps"), // amber tag; hidden at 0
  lead: (n: number) =>
    n === 1
      ? "Fill one number and the rest is already right."
      : "Fill " + (WORDS[n] ?? String(n)) + " numbers and the rest is already right.",
  reasons: { price: "price unread", abv: "strength unread", serve: "serve unread" },
  cleanHeader: (n: number) => "Read cleanly · " + n,
  cta: (n: number, venue: string) => "Save " + n + " to " + venue,
  footnote: "Anything wrong can be fixed later, drink by drink.",
};

export const WORDS = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];

export const SCAN_FAIL_COPY = {
  timeout: {
    title: "That did not come back",
    body: "The read timed out. Glare and folded pages are the usual reasons — and sometimes it is just us.",
  },
  offline: {
    title: "No connection",
    body: "The read needs the network. The photo is here when you are back on it.",
  },
  nothing: {
    title: "No drinks found on that page",
    body: "It may be a food menu, or the page may be too dark to read.",
  },
  refused: {
    title: "That could not be read",
    body: "Sometimes a second photo at a different angle is all it takes.",
  },
  retry: "Try this photo again",
  reshoot: "Take a new photo",
  manual: "Add drinks by hand instead",
  kept: "Your photo is kept until you leave this screen.",
};
