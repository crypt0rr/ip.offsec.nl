const browserData = document.querySelector("#browser-data");

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

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
