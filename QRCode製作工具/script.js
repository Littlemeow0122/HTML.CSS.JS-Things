// script.js
const $ = (s) => document.querySelector(s);

const payloadTypeRadios = [...document.querySelectorAll('input[name="payloadType"]')];

const els = {
  // content inputs
  urlValue: $('#urlValue'),
  appScheme: $('#appScheme'),
  emailTo: $('#emailTo'),
  emailSubject: $('#emailSubject'),
  emailBody: $('#emailBody'),
  wifiSsid: $('#wifiSsid'),
  wifiPassword: $('#wifiPassword'),
  wifiAuth: $('#wifiAuth'),
  telNumber: $('#telNumber'),
  cName: $('#cName'),
  cGender: $('#cGender'),
  cBirthday: $('#cBirthday'),
  cAddress: $('#cAddress'),

  // appearance
  fgColor: $('#fgColor'),
  bgColor: $('#bgColor'),
  useGradient: $('#useGradient'),
  gradFrom: $('#gradFrom'),
  gradTo: $('#gradTo'),
  gradDir: $('#gradDir'),
  eyeStyle: $('#eyeStyle'),

  qrSize: $('#qrSize'),
  ecLevel: $('#ecLevel'),
  margin: $('#margin'),

  logoFile: $('#logoFile'),
  logoSizePct: $('#logoSizePct'),
  logoUseBorderBg: $('#logoUseBorderBg'),
  logoBg: $('#logoBg'),
  logoRadius: $('#logoRadius'),
  keepQuietZone: $('#keepQuietZone'),

  downloadName: $('#downloadName'),
  outputFormat: $('#outputFormat'),

  // buttons
  btnGenerate: $('#btnGenerate'),
  btnDownload: $('#btnDownload'),
  btnClearLogo: $('#btnClearLogo'),

  // preview
  qrPreviewImg: $('#qrPreviewImg'),
  qrCanvas: $('#qrCanvas'),
  qrSvg: $('#qrSvg'),
  payloadDebug: $('#payloadDebug'),
};

let logoImage = null; // HTMLImageElement

function currentPayloadType(){
  const r = payloadTypeRadios.find(x => x.checked);
  return r ? r.value : 'url';
}

/**
 * Build QR payload:
 * - url/app: use as-is
 * - email: "mailto:to?subject=...&body=..."
 * - wifi: "WIFI:T:WPA;S:ssid;P:pass;;" (nopass uses T:nopass, P omitted)
 * - tel: "tel:number"
 * - contact: use MECARD format (common for QR)
 */
function buildPayload(){
  const t = currentPayloadType();

  if(t === 'url'){
    return els.urlValue.value.trim();
  }
  if(t === 'app'){
    return els.appScheme.value.trim();
  }
  if(t === 'email'){
    const to = els.emailTo.value.trim();
    if(!to) return '';
    const subject = (els.emailSubject.value || '').trim();
    const body = (els.emailBody.value || '').trim();

    const params = [];
    if(subject) params.push(`subject=${encodeURIComponent(subject)}`);
    if(body) params.push(`body=${encodeURIComponent(body)}`);

    const qs = params.length ? `?${params.join('&')}` : '';
    return `mailto:${to}${qs}`;
  }
  if(t === 'wifi'){
    const ssid = (els.wifiSsid.value || '').trim();
    const auth = els.wifiAuth.value;
    if(!ssid) return '';

    if(auth === 'nopass'){
      // No password
      return `WIFI:T:nopass;S:${escapeMecardLike(ssid)};;`;
    }
    const pass = (els.wifiPassword.value || '').trim();
    return `WIFI:T:${auth};S:${escapeMecardLike(ssid)};P:${escapeMecardLike(pass)};;`;
  }
  if(t === 'tel'){
    const n = (els.telNumber.value || '').trim();
    if(!n) return '';
    return `tel:${n}`;
  }
  if(t === 'contact'){
    const name = (els.cName.value || '').trim();
    if(!name) return '';

    // MECARD: 型式：MECARD:N:姓名;TEL:...;EMAIL:...;ADR:...;BDAY:...;GENDER:...;; (不同掃描器支援差異)
    // 我們用可用欄位：name, gender, bday, address
    const gender = (els.cGender.value || '').trim();
    const genderPart = gender ? `GENDER:${escapeMecardLike(gender)};` : '';
    const bday = els.cBirthday.value ? els.cBirthday.value : '';
    const bdayPart = bday ? `BDAY:${escapeMecardLike(bday)};` : '';
    const adr = (els.cAddress.value || '').trim();
    const adrPart = adr ? `ADR:${escapeMecardLike(adr)};` : '';

    // N: is safer as plain
    return `MECARD:N:${escapeMecardLike(name)};${genderPart}${bdayPart}${adrPart};;`;
  }
  return '';
}

function escapeMecardLike(s){
  // keep it simple: replace special separators
  return String(s).replace(/[:;\\]/g, (m) => ({':':'%3A',';':'%3B','\\':'%5C'}[m]));
}

function gradVector(dir){
  // 0..1 -> used in gradient endpoints
  switch(dir){
    case 'bl-tr': return {x1:0, y1:1, x2:1, y2:0};
    case 'l-r': return {x1:0, y1:0.5, x2:1, y2:0.5};
    case 't-b': return {x1:0, y1:0, x2:1, y2:1};
    case 'tl-br':
    default: return {x1:0, y1:0, x2:1, y2:1};
  }
}

function getOptions(){
  const size = Math.max(120, Math.min(1200, Number(els.qrSize.value) || 520));
  const ecLevel = els.ecLevel.value || 'M';
  const margin = Number(els.margin.value) || 2;

  return {
    size,
    ecLevel,
    margin,
    keepQuietZone: els.keepQuietZone.checked,
    useGradient: els.useGradient.checked,

    fg: els.fgColor.value,
    bg: els.bgColor.value,
    gradFrom: els.gradFrom.value,
    gradTo: els.gradTo.value,
    gradDir: els.gradDir.value,

    eyeStyle: els.eyeStyle.value,

    logoSizePct: Math.max(0, Math.min(40, Number(els.logoSizePct.value) || 18)),
    logoUseBorderBg: els.logoUseBorderBg.checked,
    logoBg: els.logoBg.value,
    logoRadius: Math.max(0, Math.min(60, Number(els.logoRadius.value) || 14)),

    outputFormat: els.outputFormat.value,
    downloadName: (els.downloadName.value || 'qrcode.png').trim(),
  };
}

function isEyeCell(r, c, N){
  // finder patterns: top-left, top-right, bottom-left
  const inRange = (x, y, size) => x >= y && x < y + size;
  const sz = 7; // finder area size in modules
  const tl = r < sz && c < sz;
  const tr = r < sz && c >= N - sz;
  const bl = r >= N - sz && c < sz;
  return tl || tr || bl;
}

function isEyeSeparatorCell(r,c,N){
  // "separator" around finder patterns is typically 8x8 area.
  const sz = 8;
  const tl = r < sz && c < sz;
  const tr = r < sz && c >= N - sz;
  const bl = r >= N - sz && c < sz;
  return tl || tr || bl;
}

async function renderQR(){
  const payload = buildPayload();
  els.payloadDebug.value = payload ? payload : '（尚未輸入內容）';

  if(!payload){
    // Clear preview
    els.qrPreviewImg.removeAttribute('src');
    return;
  }

  const opt = getOptions();

  // Generate modules first (no built-in color), then custom draw.
  const qr = await QRCode.toNumber? null : null; // dummy to satisfy lint
  const qrObj = await QRCode.toCanvas; // dummy

  // Use qrcode library to get matrix via toDataURL isn't suitable for custom eye shapes.
  // We'll use QRCode.create from the library? qrcode has QRCode.create(text, ecc) but not guaranteed globally.
  // Use QRCode.create by dynamic call:
  const qrCode = QRCode.create(payload, opt.ecLevel);

  const N = qrCode.modules.size;
  const modules = qrCode.modules; // boolean matrix

  const canvas = els.qrCanvas;
  const svg = els.qrSvg;

  // Determine quiet zone
  const marginModules = opt.keepQuietZone ? Math.max(opt.margin, 2) : Math.max(opt.margin, 0);
  const totalModules = N + marginModules * 2;

  // Make cells not too blurry
  canvas.width = opt.size;
  canvas.height = opt.size;

  const ctx = canvas.getContext('2d');
  ctx.clearRect(0,0,opt.size,opt.size);

  // Background
  ctx.fillStyle = opt.bg;
  ctx.fillRect(0,0,opt.size,opt.size);

  // Compute cell size
  const cell = opt.size / totalModules;

  // Gradient setup (for dots/eyes)
  const {x1,y1,x2,y2} = gradVector(opt.gradDir);
  const grad = ctx.createLinearGradient(
    opt.size * x1, opt.size * y1,
    opt.size * x2, opt.size * y2
  );
  grad.addColorStop(0, opt.useGradient ? opt.gradFrom : opt.fg);
  grad.addColorStop(1, opt.useGradient ? opt.gradTo : opt.fg);

  // Draw modules
  // Use "rounded dot" style or eyes style.
  const fg = opt.useGradient ? grad : opt.fg;

  const eyeStyle = opt.eyeStyle;

  // For performance, we can compute positions
  const radiusDot = cell * 0.35;
  const squarePad = cell * 0.12;

  // Optional: draw "eyes" separately for style control
  for(let r=0; r<N; r++){
    for(let c=0; c<N; c++){
      if(!modules.get(r,c)) continue;

      const rr = r + marginModules;
      const cc = c + marginModules;
      const x = cc * cell;
      const y = rr * cell;

      if(isEyeCell(r,c,N)){
        // Eye cell styling
        if(eyeStyle === 'none'){
          // skip
          continue;
        } else if(eyeStyle === 'circle'){
          ctx.fillStyle = fg;
          ctx.beginPath();
          ctx.arc(x + cell/2, y + cell/2, Math.max(0, radiusDot), 0, Math.PI*2);
          ctx.fill();
        } else if(eyeStyle === 'square'){
          ctx.fillStyle = fg;
          ctx.fillRect(x + squarePad, y + squarePad, cell - squarePad*2, cell - squarePad*2);
        } else {
          // default
          ctx.fillStyle = fg;
          ctx.fillRect(x, y, cell, cell);
        }
      } else {
        // Non-eye module styling: use dots to look nicer with gradients
        ctx.fillStyle = fg;
        ctx.beginPath();
        ctx.arc(x + cell/2, y + cell/2, Math.max(0, radiusDot), 0, Math.PI*2);
        ctx.fill();
      }
    }
  }

  // Center logo
  if(logoImage){
    const logoSizePx = Math.round(opt.size * (opt.logoSizePct/100));
    if(logoSizePx > 0){
      const cx = opt.size/2;
      const cy = opt.size/2;
      const x = cx - logoSizePx/2;
      const y = cy - logoSizePx/2;

      // Logo background plate
      if(opt.logoUseBorderBg){
        ctx.save();
        roundRect(ctx, x, y, logoSizePx, logoSizePx, opt.logoRadius);
        ctx.fillStyle = opt.logoBg;
        ctx.fill();
        // Subtle border
        ctx.strokeStyle = 'rgba(0,0,0,0.06)';
        ctx.lineWidth = Math.max(1, logoSizePx*0.01);
        ctx.stroke();
        ctx.restore();
      } else {
        // clip to rounded
        ctx.save();
        roundRect(ctx, x, y, logoSizePx, logoSizePx, opt.logoRadius);
        ctx.clip();
      }

      // Draw logo
      ctx.drawImage(logoImage, x, y, logoSizePx, logoSizePx);

      if(!opt.logoUseBorderBg){
        ctx.restore();
      }
    }
  }

  // Preview image
  const dataUrl = canvas.toDataURL('image/png');
  els.qrPreviewImg.src = dataUrl;
}

function roundRect(ctx, x, y, w, h, r){
  const rr = Math.max(0, Math.min(r, Math.min(w,h)/2));
  ctx.beginPath();
  ctx.moveTo(x+rr, y);
  ctx.arcTo(x+w, y, x+w, y+h, rr);
  ctx.arcTo(x+w, y+h, x, y+h, rr);
  ctx.arcTo(x, y+h, x, y, rr);
  ctx.arcTo(x, y, x+w, y, rr);
  ctx.closePath();
}

async function download(){
  const opt = getOptions();
  const name = normalizeFilename(opt.downloadName);

  // Ensure render up-to-date
  await renderQR();

  if(opt.outputFormat === 'svg'){
    // Simple approach: convert canvas to SVG via image tag
    // (外觀仍以 canvas 為主；SVG 可用但不會是真正向量 QR)
    const canvas = els.qrCanvas;
    const dataUrl = canvas.toDataURL('image/png');
    const svgEl = els.qrSvg;
    svgEl.innerHTML = '';

    const w = canvas.width, h = canvas.height;
    svgEl.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    svgEl.setAttribute('width', String(w));
    svgEl.setAttribute('height', String(h));

    const img = document.createElementNS('http://www.w3.org/2000/svg','image');
    img.setAttributeNS('http://www.w3.org/1999/xlink','href', dataUrl);
    img.setAttribute('x','0');
    img.setAttribute('y','0');
    img.setAttribute('width', String(w));
    img.setAttribute('height', String(h));
    svgEl.appendChild(img);

    const blob = new Blob([svgEl.outerHTML], {type:'image/svg+xml;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    triggerDownload(url, name.replace(/\.(png|svg)$/i,'') + '.svg');
    URL.revokeObjectURL(url);
    return;
  }

  // PNG download
  const canvas = els.qrCanvas;
  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
  const url = URL.createObjectURL(blob);
  triggerDownload(url, name.endsWith('.png') ? name : name + '.png');
  setTimeout(() => URL.revokeObjectURL(url), 500);
}

function normalizeFilename(s){
  let v = (s || 'qrcode.png').trim();
  if(!v) v = 'qrcode.png';
  // remove slashes
  v = v.replace(/[\\/]/g,'_');
  return v;
}

function triggerDownload(url, filename){
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function bindPayloadGroups(){
  payloadTypeRadios.forEach(r=>{
    r.addEventListener('change', ()=>{
      const t = currentPayloadType();
      document.querySelectorAll('.group[data-group]').forEach(g=>{
        g.hidden = g.getAttribute('data-group') !== t;
      });
      renderQR().catch(console.error);
    });
  });
}

async function loadLogoFile(file){
  if(!file){
    logoImage = null;
    return;
  }
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.crossOrigin = 'anonymous';
  await new Promise((resolve, reject)=>{
    img.onload = resolve;
    img.onerror = reject;
    img.src = url;
  });
  // Revoke after load
  URL.revokeObjectURL(url);
  logoImage = img;
}

function hookLogo(){
  els.logoFile.addEventListener('change', async (e)=>{
    const file = e.target.files && e.target.files[0];
    if(file){
      try{
        await loadLogoFile(file);
      }catch(err){
        console.error(err);
        alert('中心圖案載入失敗，請換另一張圖片。');
        logoImage = null;
      }
    }else{
      logoImage = null;
    }
    await renderQR();
  });

  els.btnClearLogo.addEventListener('click', async ()=>{
    els.logoFile.value = '';
    logoImage = null;
    await renderQR();
  });
}

function bindEvents(){
  els.btnGenerate.addEventListener('click', ()=> renderQR().catch(console.error));
  els.btnDownload.addEventListener('click', ()=> download().catch(console.error));

  // Auto regenerate when important fields change
  const regenIds = [
    'fgColor','bgColor','useGradient','gradFrom','gradTo','gradDir','eyeStyle',
    'qrSize','ecLevel','margin','logoSizePct','logoUseBorderBg','logoBg','logoRadius',
    'keepQuietZone','downloadName','outputFormat'
  ];
  const toListen = [];
  regenIds.forEach(id=>{
    const el = document.getElementById(id);
    if(el) toListen.push(el);
  });

  // Also content inputs
  [
    'urlValue','appScheme','emailTo','emailSubject','emailBody',
    'wifiSsid','wifiPassword','wifiAuth','telNumber',
    'cName','cGender','cBirthday','cAddress'
  ].forEach(id=>{
    const el = document.getElementById(id);
    if(el) toListen.push(el);
  });

  toListen.forEach(el=>{
    el.addEventListener('input', ()=>{
      // debounce a bit
      clearTimeout(window.__regenT);
      window.__regenT = setTimeout(()=>renderQR().catch(console.error), 120);
    });
    el.addEventListener('change', ()=>{
      clearTimeout(window.__regenT);
      window.__regenT = setTimeout(()=>renderQR().catch(console.error), 120);
    });
  });
}

async function init(){
  bindPayloadGroups();
  hookLogo();
  bindEvents();

  // Default content
  els.urlValue.value = 'https://example.com';

  // First render
  await renderQR();
}

init().catch(console.error);