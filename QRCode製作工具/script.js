// script.js
let qrCode;

const $ = (id) => document.getElementById(id);

function updateGradientVisibility() {
  const v = $("gradient-switch").value;
  $("gradient-options").style.display = v !== "off" ? "grid" : "none";
}

function getBackgroundStyle() {
  const grad = $("gradient-switch").value;
  const gs = $("gradient-start").value;
  const ge = $("gradient-end").value;

  if (grad === "horizontal") return `linear-gradient(to right, ${gs}, ${ge})`;
  if (grad === "vertical") return `linear-gradient(to bottom, ${gs}, ${ge})`;
  return $("bg-color").value;
}

function generateQRCode() {
  const data = $("data").value;
  const fg = $("fg-color").value;
  const bg = $("bg-color").value;
  const file = $("logo").files[0];
  const corner = $("corner-style").value;
  const ec = $("error-correction").value;
  const size = +$("size").value;

  const bgStyle = getBackgroundStyle();

  qrCode = new QRCodeStyling({
    width: size,
    height: size,
    data,
    qrOptions: {
      errorCorrectionLevel: ec,
    },
    // 讓 QR 本體維持「前景顏色」，背景透明，外層用 CSS/容器做漸層/底色
    dotsOptions: {
      color: fg,
      type: "rounded",
    },
    backgroundOptions: {
      color: "rgba(0,0,0,0)",
    },
    cornersSquareOptions: {
      type: corner,
      color: fg,
    },
    cornersDotOptions: {
      type: corner,
      color: fg,
    },
    image: "",
    imageOptions: {
      crossOrigin: "anonymous",
      margin: 10,
      imageSize: 0.3,
    },
  });

  const qrDiv = $("qr");
  qrDiv.innerHTML = "";

  // 設定容器背景（單色/漸層）
  qrDiv.style.background = bgStyle === bg ? bg : bgStyle;

  const render = async () => {
    const blob = await qrCode.getRawData("png");
    const url = URL.createObjectURL(blob);

    const img = new Image();
    img.src = url;
    img.onload = () => URL.revokeObjectURL(url);

    img.style.width = size + "px";
    img.style.height = size + "px";

    qrDiv.innerHTML = "";
    qrDiv.appendChild(img);
  };

  if (!file) {
    render();
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    qrCode.update({ image: e.target.result });
    render();
  };
  reader.readAsDataURL(file);
}

function downloadQRCode() {
  const el = $("qr");
  html2canvas(el).then((canvas) => {
    const a = document.createElement("a");
    a.download = "qr-with-bg.png";
    a.href = canvas.toDataURL();
    a.click();
  });
}

// events
$("gradient-switch").addEventListener("change", updateGradientVisibility);

$("btn-generate").addEventListener("click", generateQRCode);
$("btn-download").addEventListener("click", downloadQRCode);

// default
updateGradientVisibility();
$("btn-generate").click();

// keep your service worker registration if you still use it
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then(console.log)
      .catch(console.error);
  });
}