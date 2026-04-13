export default {
  async fetch(request) {
    try {
      const HTML_URL = "https://raw.githubusercontent.com/Littlemeow0122/HTML.CSS.JS-Things/main/Base64工具/index.html";
      const CSS_URL  = "https://raw.githubusercontent.com/Littlemeow0122/HTML.CSS.JS-Things/main/Base64工具/style.css";
      const JS_URL   = "https://raw.githubusercontent.com/Littlemeow0122/HTML.CSS.JS-Things/main/Base64工具/script.js";

      const ICON = "https://raw.githubusercontent.com/Littlemeow0122/HTML.CSS.JS-Things/main/Icon.PNG";

      const [htmlRes, cssRes, jsRes] = await Promise.all([
        fetch(HTML_URL + "?t=" + Date.now()),
        fetch(CSS_URL + "?t=" + Date.now()),
        fetch(JS_URL + "?t=" + Date.now())
      ]);

      let html = await htmlRes.text();
      const css = await cssRes.text();
      const js = await jsRes.text();

      html = html
        .replace(/<meta[^>]*http-equiv=["']refresh["'][^>]*>/gi, "")
        .replace(/<base[^>]*>/gi, "");

      const headInsert = `
<link rel="icon" href="${ICON}">
<link rel="apple-touch-icon" href="${ICON}">
<meta name="apple-mobile-web-app-capable" content="yes">
<style>${css}</style>
`;

      html = html.replace("</head>", headInsert + "</head>");
      html = html.replace("</body>", `<script>${js}</script></body>`);

      return new Response(html, {
        headers: { "content-type": "text/html;charset=UTF-8" }
      });

    } catch (err) {
      return new Response("Error: " + err.message, { status: 500 });
    }
  }
};
