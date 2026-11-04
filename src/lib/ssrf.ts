/**
 * SSRF (Server-Side Request Forgery) protection utilities.
 * Validates external URLs and performs guarded HTTP fetches.
 */

// Blocked exact hostnames and suffix domains
const BLOCKED_HOST_SUFFIXES = [
  "localhost",
  ".localhost",
  ".local",
  ".internal",
  ".lan",
  ".home.arpa",
  ".corp",
];

/**
 * Checks if an IPv4 address falls within private, loopback, link-local,
 * carrier-grade NAT, or multicast ranges.
 */
function isPrivateIPv4(ip: string): boolean {
  // Normalize octets (handles standard dot-decimal; rejects non-standard octal/hex notation as unsafe)
  const parts = ip.split(".");
  if (parts.length !== 4) return true;

  const octets = parts.map((p) => {
    // If it has leading zeros or non-digits, treat as suspicious
    if (!/^\d+$/.test(p) || (p.length > 1 && p.startsWith("0"))) return NaN;
    return parseInt(p, 10);
  });

  if (octets.some((o) => isNaN(o) || o < 0 || o > 255)) return true;

  const [a, b, c, d] = octets as [number, number, number, number];

  // 0.0.0.0/8 (Current network)
  if (a === 0) return true;

  // 127.0.0.0/8 (Loopback)
  if (a === 127) return true;

  // 10.0.0.0/8 (Private)
  if (a === 10) return true;

  // 172.16.0.0/12 (Private 172.16 - 172.31)
  if (a === 172 && b >= 16 && b <= 31) return true;

  // 192.168.0.0/16 (Private)
  if (a === 192 && b === 168) return true;

  // 169.254.0.0/16 (Link-local & AWS/GCP/Azure Cloud Metadata 169.254.169.254)
  if (a === 169 && b === 254) return true;

  // 100.64.0.0/10 (Shared Address Space / CGNAT)
  if (a === 100 && b >= 64 && b <= 127) return true;

  // 192.0.0.0/24, 192.0.2.0/24 (Documentation / reserved)
  if (a === 192 && b === 0 && (c === 0 || c === 2)) return true;

  // 198.51.100.0/24, 203.0.113.0/24 (TEST-NET)
  if (a === 198 && b === 51 && c === 100) return true;
  if (a === 203 && b === 0 && c === 113) return true;

  // 224.0.0.0/4 (Multicast) and 240.0.0.0/4 (Reserved)
  if (a >= 224) return true;

  // 255.255.255.255 (Broadcast)
  if (a === 255 && b === 255 && c === 255 && d === 255) return true;

  return false;
}

/**
 * Expands an IPv6 address into its eight 16-bit groups, or null if malformed.
 * Accepts a trailing dotted IPv4 part (e.g. `::ffff:1.2.3.4`).
 */
function expandIPv6(ip: string): number[] | null {
  let addr = ip;
  const tail: number[] = [];
  const dotted = addr.match(/^(.*:)(\d{1,3}(?:\.\d{1,3}){3})$/);
  if (dotted) {
    const o = dotted[2]!.split(".").map((p) => parseInt(p, 10));
    if (o.some((n) => n > 255)) return null;
    tail.push((o[0]! << 8) | o[1]!, (o[2]! << 8) | o[3]!);
    addr = dotted[1]!.endsWith("::") ? dotted[1]! : dotted[1]!.slice(0, -1);
  }
  const halves = addr.split("::");
  if (halves.length > 2) return null;
  const parse = (h: string) => (h ? h.split(":") : []);
  const head = parse(halves[0]!);
  const rest = halves.length === 2 ? parse(halves[1]!) : [];
  const groups = [...head, ...rest];
  if (groups.some((g) => !/^[0-9a-f]{1,4}$/.test(g))) return null;
  const total = groups.length + tail.length;
  if (halves.length === 1 && total !== 8) return null;
  if (halves.length === 2 && total > 7) return null;
  const zeros = new Array(8 - total).fill(0);
  const nums = (gs: string[]) => gs.map((g) => parseInt(g, 16));
  return halves.length === 2
    ? [...nums(head), ...zeros, ...nums(rest), ...tail]
    : [...nums(head), ...tail];
}

/**
 * Returns the IPv4 address embedded in an IPv4-mapped (::ffff:0:0/96),
 * IPv4-compatible (::/96), or NAT64 (64:ff9b::/96) IPv6 address, else null.
 */
function embeddedIPv4(ip: string): string | null {
  const g = expandIPv6(ip);
  if (!g) return null;
  const first5Zero = g.slice(0, 5).every((n) => n === 0);
  const mapped = first5Zero && g[5] === 0xffff;
  const compat = first5Zero && g[5] === 0 && (g[6] !== 0 || g[7]! > 1);
  const nat64 = g[0] === 0x64 && g[1] === 0xff9b && g.slice(2, 6).every((n) => n === 0);
  if (!mapped && !compat && !nat64) return null;
  return [g[6]! >> 8, g[6]! & 0xff, g[7]! >> 8, g[7]! & 0xff].join(".");
}

/**
 * Checks if an IPv6 address is loopback, unique-local, link-local, or IPv4-mapped private.
 */
function isPrivateIPv6(ip: string): boolean {
  const normalized = ip.toLowerCase().replace(/^\[|\]$/g, "");

  // Loopback (::1) and Unspecified (::)
  if (normalized === "::1" || normalized === "::" || /^0*(?::0*)*:?0*1$/.test(normalized)) {
    return true;
  }

  // IPv4-mapped / IPv4-compatible / NAT64 IPv6. The WHATWG URL parser
  // serializes `[::ffff:127.0.0.1]` as `[::ffff:7f00:1]`, so both the dotted
  // and the hex forms must be decoded back to IPv4 before checking.
  const embedded = embeddedIPv4(normalized);
  if (embedded !== null) return isPrivateIPv4(embedded);

  // Unique local addresses (fc00::/7 -> fc00... or fd00...)
  if (/^f[cd][0-9a-f]{2}:/i.test(normalized)) return true;

  // Link-local unicast (fe80::/10 -> fe8, fe9, fea, feb)
  if (/^fe[89ab][0-9a-f]:/i.test(normalized)) return true;

  return false;
}

/**
 * Validates whether a hostname or IP string represents a private, internal,
 * or cloud metadata address.
 */
export function isPrivateOrBlockedHost(hostname: string): boolean {
  const host = hostname.toLowerCase().trim().replace(/^\[|\]$/g, "");

  if (!host) return true;

  // Check suffix domain blocks
  for (const suffix of BLOCKED_HOST_SUFFIXES) {
    if (host === suffix || host.endsWith(suffix)) return true;
  }

  // Check decimal integer / octal / hex encoded IPs (e.g. "2130706433" or "0x7f000001")
  if (/^\d+$/.test(host) || /^0x[0-9a-f]+$/i.test(host)) {
    return true;
  }

  // Check standard IPv4 address
  if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host)) {
    return isPrivateIPv4(host);
  }

  // Check IPv6 address
  if (host.includes(":")) {
    return isPrivateIPv6(host);
  }

  return false;
}

/**
 * Validates that a string is a safe HTTP/HTTPS URL not pointing to private or metadata hosts.
 */
export function validateSafeUrl(rawUrl: string): { ok: true; url: URL } | { ok: false; error: string } {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return { ok: false, error: "invalid_url_format" };
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { ok: false, error: "unsupported_protocol" };
  }

  if (isPrivateOrBlockedHost(parsed.hostname)) {
    return { ok: false, error: "private_or_restricted_host" };
  }

  return { ok: true, url: parsed };
}

/** Resolves a hostname to its A/AAAA addresses. */
export type DnsResolver = (hostname: string) => Promise<string[]>;

/**
 * DNS-over-HTTPS lookup (Workers have no `dns` module). Uses Cloudflare's
 * JSON API; throws on network or protocol failure so callers fail closed.
 */
export const resolveViaDoH: DnsResolver = async (hostname) => {
  const lookup = async (type: "A" | "AAAA") => {
    const res = await fetch(
      `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(hostname)}&type=${type}`,
      { headers: { accept: "application/dns-json" }, signal: AbortSignal.timeout(3000) }
    );
    if (!res.ok) throw new Error(`doh_http_${res.status}`);
    const body = (await res.json()) as { Status?: number; Answer?: { type: number; data: string }[] };
    // Status 3 = NXDOMAIN; anything else non-zero is a resolver failure.
    if (body.Status !== 0 && body.Status !== 3) throw new Error(`doh_status_${body.Status}`);
    const want = type === "A" ? 1 : 28;
    return (body.Answer ?? []).filter((a) => a.type === want).map((a) => a.data);
  };
  const [a, aaaa] = await Promise.all([lookup("A"), lookup("AAAA")]);
  return [...a, ...aaaa];
};

/**
 * Resolves `hostname` and reports whether any address is private.
 * IP literals were already checked by validateSafeUrl and skip the lookup.
 * Fails closed: lookup errors and empty answers are not treated as public.
 */
export async function resolvesToPrivateAddress(
  hostname: string,
  resolver: DnsResolver = resolveViaDoH
): Promise<"public" | "resolves_to_private_address" | "dns_lookup_failed"> {
  const host = hostname.replace(/^\[|\]$/g, "");
  if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(host) || host.includes(":")) return "public";
  let addrs: string[];
  try {
    addrs = await resolver(host);
  } catch {
    return "dns_lookup_failed";
  }
  if (addrs.length === 0) return "dns_lookup_failed";
  return addrs.some((ip) => isPrivateOrBlockedHost(ip)) ? "resolves_to_private_address" : "public";
}

/**
 * SSRF-safe fetch wrapper with manual redirect verification.
 * Follows at most maxRedirects and validates every intermediate hop against private IPs.
 */
export async function safeFetch(
  targetUrl: string,
  options: RequestInit = {},
  maxRedirects = 3,
  resolver: DnsResolver = resolveViaDoH
): Promise<Response> {
  let currentUrl = targetUrl;
  let redirectsRemaining = maxRedirects;

  while (redirectsRemaining >= 0) {
    const validated = validateSafeUrl(currentUrl);
    if (!validated.ok) {
      throw new Error(`SSRF blocked: ${validated.error} (${currentUrl})`);
    }
    // Hostname strings can still resolve to private addresses (e.g.
    // 127.0.0.1.nip.io or attacker-controlled A records). Resolve and check
    // every hop. Production Workers also run with `global_fetch_strictly_public`,
    // which closes the resolve-then-fetch rebinding window at the network layer.
    const dns = await resolvesToPrivateAddress(validated.url.hostname, resolver);
    if (dns !== "public") {
      throw new Error(`SSRF blocked: ${dns} (${currentUrl})`);
    }

    const res = await fetch(validated.url.toString(), {
      ...options,
      redirect: "manual",
    });

    // Check for HTTP redirect status codes (301, 302, 303, 307, 308)
    if ([301, 302, 303, 307, 308].includes(res.status)) {
      const location = res.headers.get("location");
      if (!location) {
        return res; // No location header, return redirect response as-is
      }

      if (redirectsRemaining === 0) {
        throw new Error("SSRF blocked: too many redirects");
      }

      // Resolve relative redirects against current URL
      const nextUrl = new URL(location, validated.url).toString();
      currentUrl = nextUrl;
      redirectsRemaining--;
      continue;
    }

    return res;
  }

  throw new Error("SSRF blocked: redirect resolution error");
}
