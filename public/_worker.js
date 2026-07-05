const SENSITIVE_HEADERS = new Set([
  "authorization",
  "cookie",
  "proxy-authorization",
  "x-api-key",
  "x-auth-token"
]);

const TEXT_FIELDS = new Map([
  ["/ip", "ip"],
  ["/plain", "ip"],
  ["/ua", "userAgent"],
  ["/asn", "asn"],
  ["/country", "country"],
  ["/city", "city"],
  ["/colo", "colo"]
]);

export default {
  async fetch(request, env) {
    if (!["GET", "HEAD", "OPTIONS"].includes(request.method)) {
      return methodNotAllowed(request.method);
    }

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: baseHeaders() });
    }

    const url = new URL(request.url);
    const path = normalizePath(url.pathname);
    const info = collectRequestInfo(request, url);
    const wantsHead = request.method === "HEAD";

    if (TEXT_FIELDS.has(path)) {
      return textResponse(valueForField(info, TEXT_FIELDS.get(path)), wantsHead);
    }

    if (path === "/json") {
      return jsonResponse(info, wantsHead);
    }

    if (path === "/headers") {
      return jsonResponse({ headers: info.headers }, wantsHead);
    }

    if (path === "/help") {
      return helpResponse(wantsHead);
    }

    if (path === "/") {
      if (wantsJson(request)) {
        return jsonResponse(info, wantsHead);
      }

      if (wantsHtml(request)) {
        return htmlResponse(renderPage(info), wantsHead);
      }

      return textResponse(info.ip, wantsHead);
    }

    if (env?.ASSETS) {
      const assetResponse = await env.ASSETS.fetch(request);
      if (assetResponse.status !== 404) {
        return assetResponse;
      }
    }

    return notFound(wantsHead);
  }
};

export function collectRequestInfo(request, url = new URL(request.url)) {
  const cf = request.cf || {};
  const ip = firstHeader(request, ["cf-connecting-ip", "x-real-ip"]) || "unknown";
  const headers = sanitizedHeaders(request.headers);
  const ray = request.headers.get("cf-ray") || null;
  const userAgent = request.headers.get("user-agent") || "";

  return {
    ip,
    ipVersion: ip.includes(":") ? "IPv6" : ip === "unknown" ? "unknown" : "IPv4",
    asn: numberOrNull(cf.asn),
    asOrganization: cf.asOrganization || null,
    country: cf.country || request.headers.get("cf-ipcountry") || null,
    region: cf.region || null,
    regionCode: cf.regionCode || null,
    city: cf.city || null,
    postalCode: cf.postalCode || null,
    timezone: cf.timezone || null,
    latitude: cf.latitude || null,
    longitude: cf.longitude || null,
    continent: cf.continent || null,
    isEUCountry: cf.isEUCountry === "1" || cf.isEUCountry === true,
    colo: cf.colo || rayColo(ray),
    ray,
    httpProtocol: cf.httpProtocol || null,
    tlsVersion: cf.tlsVersion || null,
    tlsCipher: cf.tlsCipher || null,
    clientTcpRtt: numberOrNull(cf.clientTcpRtt),
    clientQuicRtt: numberOrNull(cf.clientQuicRtt),
    method: request.method,
    scheme: url.protocol.replace(":", ""),
    host: url.host,
    path: url.pathname,
    query: url.search || null,
    userAgent,
    acceptLanguage: request.headers.get("accept-language") || null,
    headers
  };
}

function normalizePath(pathname) {
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }

  return pathname;
}

function firstHeader(request, names) {
  for (const name of names) {
    const value = request.headers.get(name);
    if (value) return value;
  }

  return null;
}

function sanitizedHeaders(headers) {
  return [...headers.entries()]
    .filter(([name]) => !SENSITIVE_HEADERS.has(name.toLowerCase()))
    .sort(([a], [b]) => a.localeCompare(b))
    .reduce((result, [name, value]) => {
      result[name] = value;
      return result;
    }, {});
}

function numberOrNull(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function rayColo(ray) {
  if (!ray || !ray.includes("-")) return null;
  return ray.split("-").pop().toUpperCase();
}

function wantsJson(request) {
  const accept = request.headers.get("accept") || "";
  return accept.toLowerCase().includes("application/json");
}

function wantsHtml(request) {
  const accept = request.headers.get("accept") || "";
  const userAgent = request.headers.get("user-agent") || "";

  if (/\b(curl|wget|httpie|fetch|go-http-client|python-requests)\b/i.test(userAgent)) {
    return false;
  }

  return accept.toLowerCase().includes("text/html");
}

function valueForField(info, field) {
  const value = info[field];
  if (value === null || value === undefined || value === "") return "unknown";
  return String(value);
}

function baseHeaders(extra = {}) {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
    "Access-Control-Allow-Headers": "Accept, Content-Type",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
    ...extra
  };
}

function dynamicHeaders(contentType) {
  return baseHeaders({
    "Cache-Control": "no-store",
    "Content-Type": contentType
  });
}

function textResponse(value, head = false) {
  return new Response(head ? null : `${value}\n`, {
    headers: dynamicHeaders("text/plain; charset=utf-8")
  });
}

function jsonResponse(value, head = false) {
  return new Response(head ? null : `${JSON.stringify(value, null, 2)}\n`, {
    headers: dynamicHeaders("application/json; charset=utf-8")
  });
}

function htmlResponse(html, head = false) {
  return new Response(head ? null : html, {
    headers: dynamicHeaders("text/html; charset=utf-8")
  });
}

function helpResponse(head = false) {
  const body = [
    "ip.offsec.nl endpoints",
    "",
    "curl http://ip.offsec.nl",
    "curl https://ip.offsec.nl",
    "curl https://ip.offsec.nl/ip",
    "curl https://ip.offsec.nl/json",
    "curl https://ip.offsec.nl/headers",
    "curl https://ip.offsec.nl/asn",
    "curl https://ip.offsec.nl/country",
    "curl https://ip.offsec.nl/city",
    "curl https://ip.offsec.nl/colo",
    "curl https://ip.offsec.nl/ua"
  ].join("\n");

  return new Response(head ? null : `${body}\n`, {
    headers: dynamicHeaders("text/plain; charset=utf-8")
  });
}

function notFound(head = false) {
  return new Response(head ? null : "Not found\n", {
    status: 404,
    headers: dynamicHeaders("text/plain; charset=utf-8")
  });
}

function methodNotAllowed(method) {
  return new Response(`${method} is not allowed\n`, {
    status: 405,
    headers: baseHeaders({
      "Allow": "GET, HEAD, OPTIONS",
      "Cache-Control": "no-store",
      "Content-Type": "text/plain; charset=utf-8"
    })
  });
}

function renderPage(info) {
  const location = compact([
    info.city,
    info.regionCode || info.region,
    info.country
  ]).join(", ") || "Unknown";

  const diagnostics = [
    ["IP address", info.ip],
    ["IP version", info.ipVersion],
    ["ASN", info.asn ? `AS${info.asn}` : null],
    ["ASN organization", info.asOrganization],
    ["Location", location],
    ["Country", info.country],
    ["Region", compact([info.region, info.regionCode]).join(" / ")],
    ["Postal code", info.postalCode],
    ["Timezone", info.timezone],
    ["Coordinates", compact([info.latitude, info.longitude]).join(", ")],
    ["Continent", info.continent],
    ["EU country", info.isEUCountry ? "yes" : "no"],
    ["Cloudflare colo", info.colo],
    ["Cloudflare Ray ID", info.ray],
    ["HTTP protocol", info.httpProtocol],
    ["TLS version", info.tlsVersion],
    ["TLS cipher", info.tlsCipher],
    ["TCP RTT", info.clientTcpRtt === null ? null : `${info.clientTcpRtt} ms`],
    ["QUIC RTT", info.clientQuicRtt === null ? null : `${info.clientQuicRtt} ms`],
    ["Scheme", info.scheme],
    ["User agent", info.userAgent],
    ["Accept-Language", info.acceptLanguage],
    ["Request path", `${info.path}${info.query || ""}`]
  ];

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="Check your public IP address and request diagnostics.">
  <title>ip.offsec.nl - Public IP address</title>
  <link rel="stylesheet" href="/styles.css">
</head>
<body>
  <main class="shell">
    <section class="hero" aria-labelledby="title">
      <p class="eyebrow">ip.offsec.nl</p>
      <h1 id="title">Your public IP address</h1>
      <div class="ip-line">
        <code id="ip-address">${escapeHtml(info.ip)}</code>
        <button class="copy-button" data-copy="${escapeAttr(info.ip)}" type="button">Copy</button>
      </div>
      <p class="summary">${escapeHtml(compact([info.ipVersion, info.asOrganization, location]).join(" - "))}</p>
    </section>

    <section class="section" aria-labelledby="diagnostics-title">
      <h2 id="diagnostics-title">Request diagnostics</h2>
      <dl class="details">
        ${diagnostics.map(([label, value]) => detailRow(label, value)).join("")}
      </dl>
    </section>

    <section class="section" aria-labelledby="browser-title">
      <h2 id="browser-title">Browser data</h2>
      <dl class="details" id="browser-data">
        <div><dt>JavaScript</dt><dd>Loading...</dd></div>
      </dl>
    </section>

    <section class="section" aria-labelledby="programmatic-title">
      <h2 id="programmatic-title">Programmatic use</h2>
      <div class="commands">
        ${command("curl http://ip.offsec.nl")}
        ${command("curl https://ip.offsec.nl")}
        ${command("curl https://ip.offsec.nl/json")}
        ${command("curl -H 'Accept: application/json' https://ip.offsec.nl")}
        ${command("curl https://ip.offsec.nl/asn")}
      </div>
    </section>

    <section class="section" aria-labelledby="headers-title">
      <h2 id="headers-title">Headers</h2>
      <p class="muted">Sensitive headers such as cookies and authorization values are filtered.</p>
      <dl class="details compact">
        ${Object.entries(info.headers).map(([label, value]) => detailRow(label, value)).join("")}
      </dl>
    </section>
  </main>
  <script src="/app.js" defer></script>
</body>
</html>`;
}

function detailRow(label, value) {
  return `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value || "unknown")}</dd></div>`;
}

function command(value) {
  return `<div class="command"><code>${escapeHtml(value)}</code><button class="copy-button" data-copy="${escapeAttr(value)}" type="button">Copy</button></div>`;
}

function compact(values) {
  return values.filter((value) => value !== null && value !== undefined && value !== "");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeAttr(value) {
  return escapeHtml(value).replaceAll("`", "&#96;");
}
