// script.js
import QRCode from "https://cdn.jsdelivr.net/npm/qrcode@1.5.4/+esm";

const $ = (id) => document.getElementById(id);

const el = {
  contentType: $("contentType"),

  boxLink: $("box-link"),
  boxApp: $("box-app"),
  boxEmail: $("box-email"),
  boxWifi: $("box-wifi"),
  boxPhone: $("box-phone"),
  boxContact: $("box-contact"),

  // inputs
  linkUrl: $("linkUrl"),
  appScheme: $("appScheme"),

  emailTo: $("emailTo"),
  emailSubject: $("emailSubject"),
  emailBody: $("emailBody"),

  wifiSsid: $("wifiSsid"),
  wifiAuth: $("wifiAuth"),
  wifiPass: $("wifiPass"),

  phoneNumber: $("phoneNumber"),

  contactName: $("contactName"),
  contactGender: $("contactGender"),
  contactBirthday: $("contactBirthday"),
  contactAddress: $("contactAddress"),
  contactExtra: $("contactExtra"),

  // QR settings
  eccLevel: $("eccLevel"),
  size: $("size"),
  marginModules: $("marginModules"),
  downloadScale: $("downloadScale"),

  // color
  bgColor: $("bgColor"),
  fgMode: $("fgMode"),
  fgSolidColor: $("fgSolidColor"),
  gradAngle: $("gradAngle"),
  gradType: $("gradType"),
  gradStart: $("gradStart"),
  gradEnd: $("gradEnd"),

  // gradient boxes
  boxSolid: $("box-solid"),
  boxGradient: $("box-gradient"),

  // eye styles
  eyeStyle: $("eyeStyle"),
  eyeRadiusPct: $("eyeRadiusPct"),
  eyeColorMode: $("eyeColorMode"),
  eyeCustomColor: $("eyeCustomColor"),

  // dots
  dotStyle: $("dotStyle"),
  dotRadiusPct: $("dotRadiusPct"),

  // center
  centerMode: $("centerMode"),
  centerSizePct: $("centerSizePct"),
  centerImageBox: $("centerImageBox"),
  centerImage: $("centerImage"),
  centerTextBox: $("centerTextBox"),
  centerText: $("centerText"),
  centerTextColor: $("centerTextColor"),
  centerTextBg: $("centerTextBg"),
  centerTextBgOn: $("centerTextBgOn"),
  centerBorderPx: $("centerBorderPx"),
  centerBorderColor: $("centerBorderColor"),
  quietZone: $("quietZone"),
  invertTest: $("invertTest"),

  // download
  filename: $("filename"),
  downloadType: $("downloadType"),

  // buttons & preview
  generateBtn: $("generateBtn"),
  downloadBtn: $("downloadBtn"),
  qrImg: $("qrImg"),
  status: $("status"),
  contentPreview: $("contentPreview"),
};

let lastGenerated = {
  dataUrl: null,
  canvas: null,
  pixelSize: 0,
  payload: "",
};

// ---------- UI show/hide ----------
function showContentFields(type){
  const boxes = {
    link: el.boxLink,
    app: el.boxApp,
    email: el.boxEmail,
    wifi: el.boxWifi,
    phone: el.boxPhone,
    contact: el.boxContact
  };
  for (const k of Object.keys(boxes)){
    boxes[k].classList.toggle("hidden", k !== type);
  }
}

function showColorMode(){
  const isGrad = el.fgMode.value === "gradient";
  el.boxSolid.classList.toggle("hidden", isGrad);
  el.boxGradient.classList.toggle("hidden", !isGrad);
}

function showCenterMode(){
  const mode = el.centerMode.value;
  el.centerImageBox.classList.toggle("hidden", mode !== "image");
  el.centerTextBox.classList.toggle("hidden", mode !== "text");
}

// ---------- Payload builders ----------
function escapeVC(str){
  return String(str ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/;/g, "\\;");
}

function formatBirthdayVC(dateStr){
  // "YYYY-MM-DD" -> "YYYYMMDD"
  if (!dateStr) return "";
  const m = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return "";
  return `${m[1]}${m[2]}${m[3]}`;
}

function buildPayload(){
  const type = el.contentType.value;

  if (type === "link"){
    return el.linkUrl.value.trim();
  }

  if (type === "app"){
    return el.appScheme.value.trim();
  }

  if (type === "email"){
    const to = el.emailTo.value.trim();
    const subject = el.emailSubject.value.trim();
    const body = el.emailBody.value.trim();

    const params = new URLSearchParams();
    if (subject) params.set("subject", subject);
    if (body) params.set("body", body);

    const qs = params.toString();
    // mailto:to?subject=...&body=...
    return `mailto:${to}${qs ? `?${qs}` : ""}`;
  }

  if (type === "wifi"){
    const ssid = el.wifiSsid.value;
    const auth = el.wifiAuth.value;
    const pass = el.wifiPass.value ?? "";

    // Common QR WiFi format:
    // WIFI:T:WPA;S:MySSID;P:mypassword;H:false;;
    // For nopass: use T:nopass;P:; ...
    const T = auth === "nopass" ? "nopass" : auth;
    const P = pass;
    return `WIFI:T:${T};S:${ssid};P:${P};H:false;;`;
  }

  if (type === "phone"){
    const num = el.phoneNumber.value.trim();
    return `tel:${num}`;
  }

  if (type === "contact"){
    const name = el.contactName.value.trim() || "Unknown";
    const gender = el.contactGender.value.trim();
    const bday = formatBirthdayVC(el.contactBirthday.value);
    const addr = el.contactAddress.value.trim();
    const extra = el.contactExtra.value.trim();

    // Minimal vCard 3.0
    // We put FN and N, plus optional fields.
    let lines = [];
    lines.push("BEGIN:VCARD");
    lines.push("VERSION:3.0");
    lines.push(`FN:${escapeVC(name)}`);

    // N: Family;Given;Additional;Prefix;Suffix
    lines.push(`N:${escapeVC(name)};;;;`);

    if (gender){
      // GENDER is supported in vCard.
      // Some clients may show it as X-.
      lines.push(`GENDER:${escapeVC(gender === "M" ? "M" : "F")}`);
    }
    if (bday){
      lines.push(`BDAY:${bday}`);
    }
    if (addr){
      // ADR: PO Box;Extended;Street;City;Region;PostalCode;Country
      // We only have a single "住址字串"，塞進 Street (3rd) 欄位。
      // Many readers will still parse it.
      lines.push(`ADR:;;${escapeVC(addr)};;;;`);
    }

    if (extra){
      // Add raw extra lines; user may include EMAIL/URL/etc.
      lines.push(extra);
    }

    lines.push("END:VCARD");
    return lines.join("\n");
  }

  return "";
}

// ---------- Color helpers ----------
function hexToRgb(hex){
  const h = String(hex).replace("#","");
  const full = h.length === 3 ? h.split("").map(c => c+c).join("") : h;
  const n = parseInt(full, 16);
  return { r: (n>>16)&255, g: (n>>8)&255, b: n&255 };
}
function clamp01(x){ return Math.max(0, Math.min(1, x)); }
function mix(a,b,t){ return a + (b-a)*t; }

function parseHexOrFallback(hex, fallback){
  try { return hexToRgb(hex); } catch { return hexToRgb(fallback); }
}

function makeGradientColorAt(t){
  // t in [0..1]
  const a = parseHexOrFallback(el.gradStart.value, "#000000");
  const b = parseHexOrFallback(el.gradEnd.value, "#000000");
  const tt = clamp01(t);
  const r = Math.round(mix(a.r,b.r,tt));
  const g = Math.round(mix(a.g,b.g,tt));
  const bl = Math.round(mix(a.b,b.b,tt));
  return `rgb(${r},${g},${bl})`;
}

function getForegroundAt(x, y, canvasW, canvasH){
  if (el.fgMode.value === "solid"){
    return el.fgSolidColor.value;
  }
  // linear gradient with angle
  const angleDeg = Number(el.gradAngle.value || 0);
  const rad = angleDeg * Math.PI / 180;

  // compute projection onto gradient direction
  const cx = canvasW / 2;
  const cy = canvasH / 2;
  const dx = x - cx;
  const dy = y - cy;

  // direction vector for angle:
  // We'll interpret 0deg as left->right, 90deg as top->bottom (CSS-like is tricky),
  // but this mapping feels intuitive for QR usage.
  const ux = Math.cos(rad);
  const uy = Math.sin(rad);

  const proj = dx * ux + dy * uy;

  // normalize proj to [0..1]
  const maxProj = Math.hypot(cx, cy);
  const t = (proj / maxProj + 1) / 2;
  return makeGradientColorAt(t);
}

// ---------- Drawing (custom QR look) ----------
function clearCanvas(ctx, w, h){
  ctx.clearRect(0,0,w,h);
}

function roundRectPath(ctx, x, y, w, h, r){
  const rr = Math.min(r, w/2, h/2);
  ctx.beginPath();
  ctx.moveTo(x+rr, y);
  ctx.arcTo(x+w, y, x+w, y+h, rr);
  ctx.arcTo(x+w, y+h, x, y+h, rr);
  ctx.arcTo(x, y+h, x, y, rr);
  ctx.arcTo(x, y, x+w, y, rr);
  ctx.closePath();
}

function diamondPath(ctx, x,y, w,h){
  ctx.beginPath();
  ctx.moveTo(x + w/2, y);
  ctx.lineTo(x + w, y + h/2);
  ctx.lineTo(x + w/2, y + h);
  ctx.lineTo(x, y + h/2);
  ctx.closePath();
}

async function loadCenterImage(file){
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

// We will draw modules using the `qrcode` library's internal matrix.
// qrcode@1.5.4 exposes getModuleCount() and isDark(row,col)
async function renderQR(canvas, payload){
  const sizePx = Number(el.size.value || 420);
  const modulesPadding = Number(el.marginModules.value || 0);

  // Determine "quiet zone": qrcode QR generation uses "margin" as quiet zone (in modules)
  const margin = el.quietZone.value === "1" ? modulesPadding : 0;

  const opts = {
    errorCorrectionLevel: el.eccLevel.value,
    margin,
    // We won't use built-in drawing; we'll generate matrix and paint ourselves.
    // Make it large enough for crisp rendering.
    width: sizePx,
    color: { dark: "#111827", light: el.bgColor.value },
  };

  const qr = await QRCode.create(payload, opts);

  const moduleCount = qr.getModuleCount();
  const W = canvas.width;
  const H = canvas.height;

  const ctx = canvas.getContext("2d");
  clearCanvas(ctx, W, H);

  // background
  ctx.fillStyle = el.bgColor.value;
  ctx.fillRect(0,0,W,H);

  // Inversion test: if requested, swap background/foreground behaviors
  const invert = el.invertTest.value === "1";
  const fgSolid = el.fgSolidColor.value;

  // Effective module size (we paint only the actual QR area including quiet zone margins,
  // but since margin is handled by library when generating width, we map within canvas to moduleCount).
  const qAreaSize = Math.min(W, H);
  const startX = (W - qAreaSize) / 2;
  const startY = (H - qAreaSize) / 2;
  const scale = qAreaSize / moduleCount;

  // Determine center square size in modules
  const centerSizePct = Number(el.centerSizePct.value || 16) / 100;
  const centerPx = qAreaSize * centerSizePct;

  // draw modules
  // To make gradient per-module: compute color at module center pixel.
  const eyeStyle = el.eyeStyle.value;
  const eyeRadius = Number(el.eyeRadiusPct.value || 28) / 100;
  const dotStyle = el.dotStyle.value;
  const dotRadius = Number(el.dotRadiusPct.value || 18) / 100;

  const eyeColorMode = el.eyeColorMode.value;
  const eyeCustom = el.eyeCustomColor.value;

  const setFillFor = (x, y) => {
    if (invert){
      // invert test: dark becomes light and vice versa (roughly)
      // background is bgColor, so "foreground" becomes white-ish
      // We'll simply compute foreground then invert by using bgColor as foreground and white as background-like.
      // But for simplicity: use computed color, and for dark use it; inversion will look dramatic anyway.
    }
    return getForegroundAt(x, y, W, H);
  };

  // Helper: Determine if module at (r,c) is part of finder patterns.
  // Finder patterns are 7x7 plus separator. In a standard QR:
  // Top-left: rows 0..6 cols 0..6
  // Top-right: rows 0..6 cols moduleCount-7..moduleCount-1
  // Bottom-left: rows moduleCount-7..moduleCount-1 cols 0..6
  function inFinder(r,c){
    const m = moduleCount;
    const tl = (r<=6 && c<=6);
    const tr = (r<=6 && c>=m-7);
    const bl = (r>=m-7 && c<=6);
    return tl || tr || bl;
  }

  function inFinderInner(r,c){
    // inner 5x5 (typical finder border)
    const m = moduleCount;
    const tl = (r>=2 && r<=4 && c>=2 && c<=4);
    const tr = (r>=2 && r<=4 && c>=m-5 && c<=m-3);
    const bl = (r>=m-5 && r<=m-3 && c>=2 && c<=4);
    return tl || tr || bl;
  }

  // We also want a logo/text mask area in the center.
  const centerX = startX + qAreaSize/2;
  const centerY = startY + qAreaSize/2;

  // center overlay background
  let drawCenterBgLater = (el.centerMode.value !== "none") ;

  // We'll paint dark modules first.
  for (let r=0; r<moduleCount; r++){
    for (let c=0; c<moduleCount; c++){
      if (!qr.isDark(r,c)) continue;

      const x = startX + c * scale;
      const y = startY + r * scale;

      const mW = scale;
      const pad = Math.max(0, (mW*0.12));
      const w = mW - pad*2;
      const h = mW - pad*2;

      // Decide eye vs data dot
      const isEye = inFinder(r,c);

      let fill;
      if (isEye){
        if (eyeColorMode === "custom") fill = eyeCustom;
        else fill = setFillFor(x+w/2, y+h/2);
      } else {
        fill = setFillFor(x+w/2, y+h/2);
      }

      ctx.fillStyle = fill;

      // Eye styles
      if (isEye){
        const rr = w * eyeRadius;

        if (eyeStyle === "circle"){
          ctx.beginPath();
          ctx.arc(x+w/2, y+h/2, Math.min(w,h)/2, 0, Math.PI*2);
          ctx.fill();
        } else if (eyeStyle === "diamond"){
          diamondPath(ctx, x, y, w, h);
          ctx.fill();
        } else if (eyeStyle === "square"){
          ctx.fillRect(x, y, w, h);
        } else if (eyeStyle === "pill"){
          // capsule (rounded rect)
          roundRectPath(ctx, x, y, w, h, Math.min(w,h)/2);
          ctx.fill();
        } else { // roundedSquare
          roundRectPath(ctx, x, y, w, h, rr);
          ctx.fill();
        }
      } else {
        // Data modules (dots)
        const rr = w * dotRadius;
        if (dotStyle === "circle"){
          ctx.beginPath();
          ctx.arc(x+w/2, y+h/2, Math.min(w,h)/2, 0, Math.PI*2);
          ctx.fill();
        } else if (dotStyle === "roundedSquare"){
          roundRectPath(ctx, x, y, w, h, rr);
          ctx.fill();
        } else {
          ctx.fillRect(x, y, w, h);
        }
      }
    }
  }

  // Draw center overlay
  if (drawCenterBgLater){
    const borderPx = Number(el.centerBorderPx.value || 0);
    const borderColor = el.centerBorderColor.value;

    const boxW = centerPx;
    const boxH = centerPx;
    const bx = centerX - boxW/2;
    const by = centerY - boxH/2;

    // Outer border
    if (borderPx > 0){
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = borderPx;
      ctx.strokeRect(bx, by, boxW, boxH);
    }

    if (el.centerMode.value === "image"){
      const file = el.centerImage.files?.[0];
      if (file){
        const img = await loadCenterImage(file);
        // Fit image into box
        const iw = img.naturalWidth || img.width;
        const ih = img.naturalHeight || img.height;
        const s = Math.max(boxW / iw, boxH / ih);
        const dw = iw*s, dh = ih*s;
        const dx = centerX - dw/2;
        const dy = centerY - dh/2;
        ctx.drawImage(img, dx, dy, dw, dh);
      }
    } else if (el.centerMode.value === "text"){
      const text = el.centerText.value || "";
      const tc = el.centerTextColor.value;
      const bgOn = el.centerTextBgOn.value === "1";
      const tbg = el.centerTextBg.value;

      // text background
      if (bgOn){
        // rounded background panel
        ctx.fillStyle = tbg;
        roundRectPath(ctx, bx, by, boxW, boxH, Math.min(boxW, boxH)*0.12);
        ctx.fill();
      }

      // text
      ctx.fillStyle = tc;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      // font size relative to box
      const fs = Math.max(10, boxW*0.22);
      ctx.font = `800 ${fs}px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial`;
      // wrap? keep it simple single line
      ctx.fillText(text, centerX, centerY);
    }
  }
}

// ---------- Main operations ----------
function setStatus(msg){
  el.status.textContent = msg || "";
}

function normalizeFilename(name){
  const n = (name || "").trim() || "qrcode.png";
  if (!n.toLowerCase().endsWith(".png")) return n + ".png";
  return n;
}

async function generate(){
  const payload = buildPayload();
  if (!payload){
    setStatus("請先填入內容（例如連結/APP/Email/WiFi/電話/聯絡人）。");
    return;
  }

  el.contentPreview.textContent = payload.length > 40 ? payload.slice(0,40) + "..." : payload;

  // size
  const baseSize = Number(el.size.value || 420);
  const scale = Number(el.downloadScale.value || 2);
  const outSize = Math.round(baseSize * scale);

  const canvas = document.createElement("canvas");
  canvas.width = outSize;
  canvas.height = outSize;

  setStatus("產生中...");

  try{
    await renderQR(canvas, payload);
  }catch(e){
    console.error(e);
    setStatus("產生失敗：請確認內容格式或再試一次。");
    return;
  }

  const dataUrl = canvas.toDataURL("image/png");

  lastGenerated = { dataUrl, canvas, pixelSize: outSize, payload };
  el.qrImg.src = dataUrl;
  setStatus("完成。");
}

function download(){
  if (!lastGenerated.dataUrl){
    setStatus("請先產生 QRCode。");
    return;
  }
  const filename = normalizeFilename(el.filename.value);
  const a = document.createElement("a");
  a.href = lastGenerated.dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function wireEvents(){
  el.contentType.addEventListener("change", () => showContentFields(el.contentType.value));
  el.fgMode.addEventListener("change", showColorMode);
  el.centerMode.addEventListener("change", showCenterMode);

  // generate on input changes (optional gentle behavior)
  const inputs = [
    "linkUrl","appScheme","emailTo","emailSubject","emailBody",
    "wifiSsid","wifiAuth","wifiPass","phoneNumber",
    "contactName","contactGender","contactBirthday","contactAddress","contactExtra",
    "eccLevel","size","marginModules","downloadScale",
    "bgColor","fgSolidColor","gradAngle","gradStart","gradEnd",
    "eyeStyle","eyeRadiusPct","eyeColorMode","eyeCustomColor",
    "dotStyle","dotRadiusPct",
    "centerMode","centerSizePct","centerBorderPx","centerBorderColor",
    "quietZone","invertTest","centerText","centerTextColor","centerTextBg","centerTextBgOn"
  ];

  const handler = () => {
    // keep preview responsive, but avoid on every keystroke heavy work:
    // We'll debounce via generate button. Still do a light debounce.
  };

  let t = null;
  for (const id of inputs){
    const node = $(id);
    if (!node) continue;
    const evt = (node.tagName === "TEXTAREA" || node.tagName === "INPUT" || node.tagName === "SELECT") ? "input" : "change";
    node.addEventListener(evt, () => {
      window.clearTimeout(t);
      t = window.setTimeout(() => generate(), 350);
    });
  }

  el.generateBtn.addEventListener("click", generate);
  el.downloadBtn.addEventListener("click", download);
}

async function init(){
  showContentFields(el.contentType.value);
  showColorMode();
  showCenterMode();

  // default preview generate
  el.linkUrl.value = el.linkUrl.value || "https://example.com";
  await generate();
  // If centerMode is image, need to allow file; no auto.
  wireEvents();
}

init();