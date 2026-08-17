/**
 * A v4 UUID that works off a secure origin.
 *
 * `crypto.randomUUID()` is only defined in a secure context — HTTPS, or
 * `localhost`. Served over plain HTTP on a LAN address (`http://172.28.x.x:8080`,
 * which is how the app is reached from a phone or another machine on the
 * network) the property is `undefined`, so calling it throws a TypeError.
 *
 * That threw from inside click handlers, where React swallows it: pressing
 * `Add 1` did nothing at all, with no error surfaced to the user and the drink
 * never added. It worked on localhost and failed everywhere else, which is
 * exactly the configuration a phone test uses.
 *
 * `crypto.getRandomValues` has no secure-context requirement, so it carries the
 * real entropy here. The `Math.random` path is a last resort for environments
 * without WebCrypto at all; ids are local React keys and plan-entry handles,
 * never anything security-bearing, so a weaker source degrades the app rather
 * than breaking it.
 */
export function uuid(): string {
  const cryptoObj = typeof globalThis !== "undefined" ? globalThis.crypto : undefined;

  if (typeof cryptoObj?.randomUUID === "function") {
    return cryptoObj.randomUUID();
  }

  const bytes = new Uint8Array(16);
  if (typeof cryptoObj?.getRandomValues === "function") {
    cryptoObj.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i += 1) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }

  // Version 4, variant 1 — the bits RFC 4122 fixes.
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex: string[] = [];
  for (let i = 0; i < bytes.length; i += 1) {
    hex.push(bytes[i].toString(16).padStart(2, "0"));
  }

  return (
    hex.slice(0, 4).join("") +
    "-" +
    hex.slice(4, 6).join("") +
    "-" +
    hex.slice(6, 8).join("") +
    "-" +
    hex.slice(8, 10).join("") +
    "-" +
    hex.slice(10, 16).join("")
  );
}
