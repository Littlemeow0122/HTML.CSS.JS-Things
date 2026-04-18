export default {
  async fetch(request) {
    const url = new URL(request.url);

    const HTML_URL = "https://raw.githubusercontent.com/Littlemeow0122/HTML.CSS.JS-Things/main/Base64工具/index.html";
    const LIGHT_CSS = "https://raw.githubusercontent.com/Littlemeow0122/HTML.CSS.JS-Things/main/Base64工具/style.css";
    const DARK_CSS  = "https://raw.githubusercontent.com/Littlemeow0122/HTML.CSS.JS-Things/main/Base64工具/dark.css";
    const JS_URL    = "https://raw.githubusercontent.com/Littlemeow0122/HTML.CSS.JS-Things/main/Base64工具/script.js";

    const ICON = "https://raw.githubusercontent.com/Littlemeow0122/HTML.CSS.JS-Things/main/Icon.PNG";

    const isDark = url.pathname.includes("/dark");
    const useEruda = url.pathname.includes("/console");

    const cssUrl = isDark ? DARK_CSS : LIGHT_CSS;

    const [htmlRes, cssRes, jsRes] = await Promise.all([
      fetch(HTML_URL + "?t=" + Date.now()),
      fetch(cssUrl + "?t=" + Date.now()),
      fetch(JS_URL + "?t=" + Date.now())
    ]);

    let html = await htmlRes.text();
    const css = await cssRes.text();
    const js = await jsRes.text();

    html = html
      .replace(/<meta[^>]*http-equiv=["']refresh["'][^>]*>/gi, "")
      .replace(/<base[^>]*>/gi, "");

    const head = `
<link rel="icon" href="${ICON}">
<link rel="apple-touch-icon" href="${ICON}">
<meta name="apple-mobile-web-app-capable" content="yes">
<style>${css}</style>
`;

    html = html.replace("</head>", head + "</head>");

    const erudaScript = useEruda ? `
<script>
(function () {
  if (window.__ERUDA_LOADED__) return;
  window.__ERUDA_LOADED__ = true;

  const CDN = "https://cdn.jsdelivr.net/npm/";
  const plugins = ["dom","vue","monitor","features","benchmark","geolocation","timing","code","orientation","touches"];

  const load = (src, cb) => {
    const s = document.createElement("script");
    s.src = src;
    s.onload = cb;
    document.documentElement.appendChild(s);
  };

  function init() {
    load(CDN + "eruda", () => {
      eruda.init();
      let i = 0;

      function next() {
        if (i < plugins.length) {
          const name = plugins[i++];
          load(CDN + "eruda-" + name, () => {
            const pluginName = "eruda" + name.charAt(0).toUpperCase() + name.slice(1);
            if (window[pluginName]) eruda.add(window[pluginName]);
            next();
          });
        } else {
          eruda.show();
        }
      }

      next();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
</script>
` : "";

    html = html.replace(
      "</body>",
      `<script>${js}</script>${erudaScript}</body>`
    );

    return new Response(html, {
      headers: { "content-type": "text/html;charset=UTF-8" }
    });
  }
};
