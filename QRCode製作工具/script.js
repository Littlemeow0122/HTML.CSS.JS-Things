document.getElementById("gradient-switch").addEventListener("change", function () {
  document.getElementById("gradient-options").classList.toggle("hidden", this.value === "off");
});

let qrCode;

function generateQRCode() {
  const data = document.getElementById("data").value;
  const fg = document.getElementById("fg-color").value;
  const bg = document.getElementById("bg-color").value;
  const file = document.getElementById("logo").files[0];
  const corner = document.getElementById("corner-style").value;
  const ec = document.getElementById("error-correction").value;
  const size = +document.getElementById("size").value;
  const grad = document.getElementById("gradient-switch").value;
  const gs = document.getElementById("gradient-start").value;
  const ge = document.getElementById("gradient-end").value;

  qrCode = new QRCodeStyling({
    width: size,
    height: size,
    data,
    qrOptions: { errorCorrectionLevel: ec },
    dotsOptions: { color: fg, type: "rounded" },
    backgroundOptions: { color: "rgba(0,0,0,0)" },
    cornersSquareOptions: { type: corner, color: fg },
    cornersDotOptions: { type: corner, color: fg },
    image: "",
    imageOptions: {
      crossOrigin: "anonymous",
      margin: 10,
      imageSize: 0.3
    }
  });

  const qrDiv = document.getElementById("qr");
  qrDiv.innerHTML = "";

  qrDiv.style.background =
    grad === "horizontal"
      ? `linear-gradient(to right, ${gs}, ${ge})`
      : grad === "vertical"
      ? `linear-gradient(to bottom, ${gs}, ${ge})`
      : bg;

  const render = () => {
    qrCode.getRawData("png").then(blob => {
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.src = url;
      img.style.width = size + "px";
      img.style.height = size + "px";
      qrDiv.innerHTML = "";
      qrDiv.appendChild(img);
    });
  };

  if (file) {
    const reader = new FileReader();
    reader.onload = e => {
      qrCode.update({ image: e.target.result });
      render();
    };
    reader.readAsDataURL(file);
  } else {
    render();
  }
}

function downloadQRCode() {
  html2canvas(document.getElementById("qr")).then(canvas => {
    const a = document.createElement("a");
    a.download = "qr-with-bg.png";
    a.href = canvas.toDataURL();
    a.click();
  });
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js")
      .then(console.log)
      .catch(console.error);
  });
}