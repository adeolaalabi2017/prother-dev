/**
 * Plain-language meaning of Cloudflare Turnstile client error codes, shown
 * under the widget so a failing visitor (and the editor reading the error
 * stats) can tell a site misconfiguration from a browser problem.
 * Code families: https://developers.cloudflare.com/turnstile/troubleshooting/client-side-errors/error-codes/
 */
export function describeTurnstileError(code: string): string {
  const c = code.trim();
  if (c === "script-blocked") {
    return "the check couldn't load. An ad blocker or privacy extension may be blocking challenges.cloudflare.com.";
  }
  if (c === "110200") return "this site's address isn't allowed for the check. The site owner needs to fix this.";
  if (c === "110100" || c === "110110") return "the site's check is misconfigured. The site owner needs to fix this.";
  if (c === "110500") return "this browser isn't supported. Try an up-to-date Chrome, Firefox, Safari or Edge.";
  if (c === "110510") return "your browser is reporting itself inconsistently. Disable user-agent switchers and try again.";
  if (c === "200100") return "your device clock is wrong. Correct the date and time, then try again.";
  if (c.startsWith("1060") || c.startsWith("1062")) return "the check timed out. Try again.";
  if (c.startsWith("102") || c.startsWith("103") || c.startsWith("104") || c.startsWith("106")) {
    return "the check couldn't finish. Reload the page and try again.";
  }
  if (c.startsWith("300") || c.startsWith("600")) {
    return "Cloudflare couldn't confirm this browser. VPNs, privacy extensions, Brave Shields and embedded or automated browsers often cause this. Try another browser or network.";
  }
  return "the check didn't complete. Try again, or use another browser.";
}
