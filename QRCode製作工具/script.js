// script.js
let qrCode = null;
let logoDataUrl = ""; // 用於 update
let currentPayloadType = "url";

const els = {
  // payload
  payloadTypeRadios: [...document.querySelectorAll('input[name="payloadType"]')],
  urlValue: document.getElementById("urlValue"),
  appScheme: document.getElementById("appScheme"),
  emailTo: document.getElementById("emailTo"),
  emailSubject: document.getElementById("emailSubject"),
  emailBody: document.getElementById("emailBody"),
  wifiSsid: document.getElementById("wifiSsid"),
  wifiPassword: document.getElementById("wifiPassword"),
  wifiAuth: document.getElementById("wifiAuth"),
  telNumber: document.getElementById("telNumber"),
  cName: document.getElementById("cName"),
  cGender: document.getElementById("cGender"),
  cBirthday: document.getElementById("cBirthday"),
  cAddress: document.getElementById("cAddress"),

  // appearance
  fgColor: document.getElementById("fgColor"),
  bgColor: document.getElementById("bgColor"),
  useGradient: document.getElementById("useGradient"),
  gradFrom: document.getElementById("gradFrom"),
  gradTo: document.getElementById("gradTo"),
  gradDir: document.getElementById("gradDir"),
  eyeStyle: document.getElementById("eyeStyle"),
  dotsStyle: document.getElementById("dotsStyle"),
  qrSize: document.getElementById("qrSize"),
  ecLevel: document.getElementById("ecLevel"),
  margin: document.getElementById("margin"),
  keepQuietZone: document.getElementById("keepQuietZone"),

  // logo
  logoFile: document.getElementById("logoFile"),
  logoSize: document.getElementById("logoSize"),
  logoUseBorderBg: document.getElementById("logoUseBorderBg"),
  logoBg: document.getElementById("logoBg"),

  // download
  downloadName: document.getElementById("downloadName"),
  outputFormat: document.getElementById("outputFormat"),

  // buttons
  btnGenerate: document.getElementById("btnGenerate"),
  btnDownload: document.getElementById("btnDownload"),
  btnClearLogo: document.getElementById("btnClearLogo"),

  // ui
  gradientOptions: document.getElementById("gradientOptions"),
};

function setGroupVisibility() {
  const t = currentPayloadType;
  document.querySelectorAll(".group[data-group]").forEach(g => {
    const key = g.getAttribute("data-group");
    g.hidden = key !== t;
  });

  // wifi password visibility
  const isNoPass = els.wifiAuth.value === "nopass";
  document.getElementById("wifiPasswordWrap").style.display = isNoPass ? "none" : "block";
}

function getGradientDirectionForCss(dir) {
  // 對應 CSS linear-gradient 方向語意（從起點到終點）
  switch (dir) {
    case "bl-tr": return "to top right";
    case "l-r": return "to right";
    case "t-b": return "to bottom";
    case "tl-br":
    default: return "to bottom right";
  }
}

function buildPayload() {
  const t = currentPayloadType;

  if (t === "url") {
    const v = (els.urlValue.value || "").trim();
    return v;
  }
  if (t === "app") {
    return (els.appScheme.value || "").trim();
  }
  if (t === "email") {
    const to = (els.emailTo.value || "").trim();
    if (!to) return "";
    const subject = (els.emailSubject.value || "").trim();
    const body = (els.emailBody.value || "").trim();
    const params = [];
    if (subject) params.push(`subject=${encodeURIComponent(subject)}`);
    if (body) params.push(`body=${encodeURIComponent(body)}`);
    const qs = params.length ? `?${params.join("&")}` : "";
    return `mailto:${to}${qs}`;
  }
  if (t === "wifi") {
    const ssid = (els.wifiSsid.value || "").trim();
    if (!ssid) return "";
    const auth = els.wifiAuth.value;
    const pass = (els.wifiPassword.value || "").trim();

    // WIFI:T:WPA;S:ssid;P:pass;;
    if (auth === "nopass") {
      return `WIFI:T:nopass;S:${escapeWifi(ssid)};;`;
    }
    return `WIFI:T:${auth};S:${escapeWifi(ssid)};P:${escapeWifi(pass)};;`;
  }
  if (t === "tel") {
    return (els.telNumber.value || "").trim();
  }
  if (t === "contact") {
    const name = (els.cName.value || "").trim();
    if (!name) return "";
    const gender = (els.cGender.value || "").trim();
    const bday = els.cBirthday.value || ""; // YYYY-MM-DD
    const adr = (els.cAddress.value || "").trim();

    // 常見 MECARD 格式（不同掃描器支援差異）
    // MECARD:N:Name;GENDER:...;BDAY:...;ADR:...;;
    const parts = [];
    if (gender) parts.push(`GENDER:${escapeMecard(gender)}`);
    if (bday) parts.push(`BDAY:${escapeMecard(bday)}`);
    if (adr) parts.push(`ADR:${escapeMecard(adr)}`);

    return `MECARD:N:${escapeMecard(name)};${parts.join(";")};;`;
  }
  return "";
}

function escapeMecard(s) {
  // 保守處理：避免 ; : 等分隔符破壞格式
  return String(s).replace(/[;:]/g, " ");
}

function escapeWifi(s) {
  return String(s).replace(/[;,:]/g, (m) => ({ ';': '\\;', ':': '\\:', ',': '\\,' }[m] || m));
}

function getOptions() {
  const size = Math.max(120, Math.min(1200, Number(els.qrSize.value) || 520));
  const ecLevel = els.ecLevel.value || "M";
  const margin = Number(els.margin.value) || 0;
  const bg = els.bgColor.value;
  const fg = els.fgColor.value;

  const useGradient = els.useGradient.checked;
  const gradFrom = els.gradFrom.value;
  const gradTo = els.gradTo.value;
  const gradDir = els.gradDir.value;

  // qr-code-styling 目前對「漸層前景」支援通常是用 SVG/renderer，
  // 我們用它支援的「gradient」能力（dots/eyes color 顯示用漸層）。
  // 但不同版本可能表現略不同；保底仍能顯示單色。
  const cornersSquareType = els.eyeStyle.value === "dot" ? "dot" : "square";

  const dotsType = els.dotsStyle.value; // rounded / square / dots
  const logoSize = Math.max(0, Math.min(0.6, Number(els.logoSize.value) || 0.3));

  return {
    size,
    ecLevel,
    margin,
    bg,
    fg,
    useGradient,
    gradFrom,
    gradTo,
    gradDir,
    cornersSquareType,
    dotsType,
    keepQuietZone: els.keepQuietZone.checked,
    logoDataUrl,
    logoSize,
    logoUseBorderBg: els.logoUseBorderBg.checked,
    logoBg: els.logoBg.value,
  };
}

function makeQr() {
  const payload = buildPayload();
  if (!payload) {
    alert("請先輸入內容。");
    return;
  }

  const opt = getOptions();

  const gradientDirCss = getGradientDirectionForCss(opt.gradDir);

  // qrcode-styling 的 gradient 設定：
  // colors: { type:"linear", colorStops:[{offset,color},{...}] } 風格，兼容較多版本
  // 若此版本不吃，會自動退回單色。
  const gradientObj = {
    type: "linear",
    rotation: gradientRotation(opt.gradDir),
    colorStops: [
      { offset: 0, color: opt.gradFrom },
      { offset: 1, color: opt.gradTo },
    ]
  };

  const cornersSquareOptions = {
    type: opt.cornersSquareType,
    color: opt.fg,
  };

  const cornersDotOptions = {
    type: opt.cornersSquareType === "dot" ? "dot" : "square",
    color: opt.fg
  };

  const dotsOptions = {
    color: opt.useGradient ? gradientObj : opt.fg,
    type: opt.dotsType,
  };

  const backgroundOptions = {
    color: opt.bg
  };

  const qrOptions = {
    width: opt.size,
    height: opt.size,
    data: payload,
    qrOptions: {
      errorCorrectionLevel: opt.ecLevel,
      // margin: 套件用邊距方案會影響 quiet zone
    },
    margin: opt.keepQuietZone ? opt.margin + 2 : opt.margin,

    // 這些是關鍵：讓你能改碼眼/點/顏色
    dotsOptions,
    cornersSquareOptions: opt.useGradient ? { ...cornersSquareOptions, color: gradientObj } : cornersSquareOptions,
    cornersDotOptions: opt.useGradient ? { ...cornersDotOptions, color: gradientObj } : cornersDotOptions,

    backgroundOptions,

    image: opt.logoDataUrl ? opt.logoDataUrl : "",
    imageOptions: opt.logoDataUrl ? {
      crossOrigin: "anonymous",
      margin: 4,
      imageSize: opt.logoSize,
      hideBackgroundDots: !opt.logoUseBorderBg,
      backgroundColor: opt.logoBg,
      // 如果 hideBackgroundDots true 時不會顯示底板
      // 不同版本對此欄位可能略不同，保守處理
    } : undefined
  };

  const container = document.getElementById("qr");

  // 如果已存在就 update，否則 create
  if (!qrCode) {
    qrCode = new QRCodeStyling(qrOptions);
    container.innerHTML = "";
    qrCode.append(container);
  } else {
    // qrcode-styling update 會重繪
    qrCode.update(qrOptions);
  }
}

function gradientRotation(dir) {
  // 套件 rotation 單位通常是 deg
  // tl-br: 45deg, bl-tr: -45deg, l-r: 0deg, t-b: 90deg
  switch (dir) {
    case "bl-tr": return -45;
    case "l-r": return 0;
    case "t-b": return 90;
    case "tl-br":
    default: return 45;
  }
}

async function download() {
  if (!qrCode) {
    alert("請先產生 QR Code。");
    return;
  }

  const name = (els.downloadName.value || "qrcode.png").trim() || "qrcode.png";
  const lower = name.toLowerCase();

  // qr-code-styling 內建 download（會輸出 png/jpg/svg 等）
  // 不同版本可用 getRawData / download
  // 我們用 getRawData 讓命名更穩
  const format = els.outputFormat.value; // png / image
  let mime = "image/png";

  // 若使用者想輸出 png：就照 png
  const ext = lower.endsWith(".png") ? "png" :
              lower.endsWith(".jpg") || lower.endsWith(".jpeg") ? "jpeg" :
              lower.endsWith(".svg") ? "svg" : "png";

  let requestedType = "png";
  if (ext === "svg") requestedType = "svg";
  else if (ext === "jpeg" || ext === "jpg") requestedType = "jpeg";
  else requestedType = "png";

  qrCode.update({ }); // ensure latest
  qrCode.getRawData(requestedType).then((blobOrDataUrl) => {
    // qrcode-styling 可能回傳 blob
    const blob = blobOrDataUrl instanceof Blob ? blobOrDataUrl : null;

    if (blob) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 500);
      return;
    }

    // fallback: dataURL
    const a = document.createElement("a");
    a.href = blobOrDataUrl;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }).catch(async (e) => {
    // 最後 fallback：把畫面轉 canvas
    const qrEl = document.getElementById("qr");
    const canvas = await html2canvas(qrEl);
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = lower.endsWith(".png") ? name : "qrcode.png";
    a.click();
  });
}

async function loadLogoFile(file) {
  if (!file) return "";
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function wire() {
  els.payloadTypeRadios.forEach(r => {
    r.addEventListener("change", () => {
      currentPayloadType = r.value;
      setGroupVisibility();
      makeQr();
    });
  });

  els.useGradient.addEventListener("change", () => {
    els.gradientOptions.style.display = els.useGradient.checked ? "block" : "none";
    makeQr();
  });

  els.wifiAuth.addEventListener("change", () => {
    const isNoPass = els.wifiAuth.value === "nopass";
    document.getElementById("wifiPasswordWrap").style.display = isNoPass ? "none" : "block";
    makeQr();
  });

  // input changes -> regenerate debounce
  const regenIds = [
    "urlValue","appScheme","emailTo","emailSubject","emailBody","wifiSsid","wifiPassword","wifiAuth","telNumber",
    "cName","cGender","cBirthday","cAddress",
    "fgColor","bgColor","useGradient","gradFrom","gradTo","gradDir","eyeStyle","dotsStyle",
    "qrSize","ecLevel","margin","keepQuietZone","logoSize","logoUseBorderBg","logoBg","downloadName","outputFormat"
  ];

  const debounce = (fn, t=180) => {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(()=>fn(...args), t);
    };
  };

  const onAnyChange = debounce(() => makeQr(), 180);

  regenIds.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener("input", onAnyChange);
    el.addEventListener("change", onAnyChange);
  });

  els.btnGenerate.addEventListener("click", () => makeQr());
  els.btnDownload.addEventListener("click", () => download());

  els.btnClearLogo.addEventListener("click", () => {
    els.logoFile.value = "";
    logoDataUrl = "";
    makeQr();
  });

  els.logoFile.addEventListener("change", async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) {
      logoDataUrl = "";
      makeQr();
      return;
    }
    logoDataUrl = await loadLogoFile(file);
    makeQr();
  });
}

function init() {
  currentPayloadType = document.querySelector('input[name="payloadType"]:checked')?.value || "url";
  setGroupVisibility();
  wire();
  makeQr();
}

document.addEventListener("DOMContentLoaded", init);