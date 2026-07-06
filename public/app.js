const browserData = document.querySelector("#browser-data");
const ipAddress = document.querySelector("#ip-address");
const summary = document.querySelector(".summary");
const heroCopyButton = document.querySelector(".ip-line [data-copy]");

if (browserData) {
  const values = [
    ["Language", navigator.language || "unknown"],
    ["Languages", Array.isArray(navigator.languages) ? navigator.languages.join(", ") : "unknown"],
    ["Timezone", Intl.DateTimeFormat().resolvedOptions().timeZone || "unknown"],
    ["Display", `${screen.width} x ${screen.height}`],
    ["Window", `${window.innerWidth} x ${window.innerHeight}`],
    ["Device pixel ratio", window.devicePixelRatio || "unknown"],
    ["JS user agent", navigator.userAgent || "unknown"]
  ];

  browserData.innerHTML = values
    .map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`)
    .join("");
}

refreshServerData();
window.addEventListener("pageshow", (event) => {
  if (event.persisted) {
    refreshServerData();
  }
});

for (const button of document.querySelectorAll("[data-copy]")) {
  button.addEventListener("click", async () => {
    const value = button.getAttribute("data-copy") || "";

    try {
      await navigator.clipboard.writeText(value);
      const original = button.textContent;
      button.textContent = "Copied";
      window.setTimeout(() => {
        button.textContent = original;
      }, 1200);
    } catch {
      button.textContent = "Copy failed";
    }
  });
}

async function refreshServerData() {
  if (!ipAddress) return;

  try {
    const response = await fetch(`/json?_=${Date.now()}`, {
      cache: "no-store",
      headers: {
        accept: "application/json"
      }
    });

    if (!response.ok) return;

    const data = await response.json();
    if (!data.ip) return;

    ipAddress.textContent = data.ip;
    if (heroCopyButton) {
      heroCopyButton.setAttribute("data-copy", data.ip);
    }

    if (summary) {
      const location = [data.city, data.regionCode || data.region, data.country]
        .filter(Boolean)
        .join(", ");
      summary.textContent = [data.ipVersion, data.asOrganization, location]
        .filter(Boolean)
        .join(" - ");
    }
  } catch {
    // Keep the server-rendered values if the fresh check fails.
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
