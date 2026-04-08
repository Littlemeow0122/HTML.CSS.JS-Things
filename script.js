/* script.js */
(() => {
  const modeEls = document.getElementsByName('mode');
  const inputTypeEls = document.getElementsByName('inputType');
  const variantEl = document.getElementById('variant');
  const textInput = document.getElementById('textInput');
  const resultEl = document.getElementById('result');
  const fileControls = document.getElementById('fileControls');
  const fileInput = document.getElementById('fileInput');
  const includeDataUrl = document.getElementById('includeDataUrl');
  const processBtn = document.getElementById('processBtn');
  const copyBtn = document.getElementById('copyBtn');
  const downloadBtn = document.getElementById('downloadBtn');
  const clearBtn = document.getElementById('clearBtn');
  const preview = document.getElementById('preview');

  function getMode(){ return Array.from(modeEls).find(r=>r.checked).value; }
  function getInputType(){ return Array.from(inputTypeEls).find(r=>r.checked).value; }

  // Utilities: bytes <-> base64
  function bytesToBase64(bytes) {
    // bytes: Uint8Array
    let CHUNK = 0x8000;
    let parts = [];
    for (let i = 0; i < bytes.length; i += CHUNK) {
      parts.push(String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK)));
    }
    return btoa(parts.join(''));
  }

  function base64ToBytes(b64) {
    // decode to binary string then to Uint8Array
    const binary = atob(b64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }

  function insertLineBreaks(base64, every=76){
    if (!base64) return base64;
    return base64.replace(new RegExp(`(.{1,${every}})`, 'g'), '$1\r\n').trim();
  }

  function stripWhitespace(s){
    return s.replace(/\s+/g, '');
  }

  function tryShowPreview(mime, blob){
    preview.innerHTML = '';
    if (!mime) return preview.classList.add('hidden');

    const type = mime.split('/')[0];
    if (type === 'image') {
      const img = document.createElement('img');
      img.src = URL.createObjectURL(blob);
      img.onload = () => URL.revokeObjectURL(img.src);
      preview.appendChild(img);
      preview.classList.remove('hidden');
    } else if (type === 'audio') {
      const a = document.createElement('audio');
      a.controls = true;
      a.src = URL.createObjectURL(blob);
      a.onloadeddata = () => URL.revokeObjectURL(a.src);
      preview.appendChild(a);
      preview.classList.remove('hidden');
    } else if (type === 'video') {
      const v = document.createElement('video');
      v.controls = true;
      v.src = URL.createObjectURL(blob);
      v.style.maxHeight = '360px';
      v.onloadeddata = () => URL.revokeObjectURL(v.src);
      preview.appendChild(v);
      preview.classList.remove('hidden');
    } else {
      preview.classList.add('hidden');
    }
  }

  function setResult(text){
    resultEl.value = text;
  }

  function clearPreview(){ preview.innerHTML = ''; preview.classList.add('hidden'); }

  // Handle showing file controls
  function updateInputTypeUI(){
    if (getInputType() === 'file') {
      fileControls.classList.remove('hidden');
      textInput.placeholder = '如果來源為檔案，請選擇檔案，文字區可留空。';
    } else {
      fileControls.classList.add('hidden');
      textInput.placeholder = '在此貼上要編碼/解碼的文字或 Base64。';
    }
  }

  Array.from(inputTypeEls).forEach(el => el.addEventListener('change', updateInputTypeUI));
  updateInputTypeUI();

  clearBtn.addEventListener('click', () => {
    textInput.value = '';
    resultEl.value = '';
    fileInput.value = '';
    includeDataUrl.checked = false;
    clearPreview();
  });

  copyBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(resultEl.value || '');
      copyBtn.textContent = '已複製';
      setTimeout(()=>copyBtn.textContent='複製結果',1200);
    } catch (e) {
      alert('複製失敗：' + e);
    }
  });

  downloadBtn.addEventListener('click', () => {
    const mode = getMode();
    const txt = resultEl.value;
    if (!txt) { alert('沒有可下載的內容'); return; }

    // If decoding produced a data url in the result, try to download original bytes.
    if (mode === 'decode') {
      // try detect data URL
      const dataUrlMatch = txt.match(/^data:([^;]+);base64,(.*)$/s);
      if (dataUrlMatch) {
        const mime = dataUrlMatch[1];
        const b64 = dataUrlMatch[2];
        const bytes = base64ToBytes(stripWhitespace(b64));
        const blob = new Blob([bytes], { type: mime });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'download.' + (mime.split('/')[1] || 'bin');
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(()=>URL.revokeObjectURL(a.href), 1000);
        return;
      }

      // If result looks like pure base64, offer download as binary
      const maybeB64 = txt.trim();
      if (/^[A-Za-z0-9+\/=\r\n]+$/.test(maybeB64)) {
        try {
          const clean = stripWhitespace(maybeB64);
          const bytes = base64ToBytes(clean);
          const blob = new Blob([bytes], { type: 'application/octet-stream' });
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = 'download.bin';
          document.body.appendChild(a);
          a.click();
          a.remove();
          setTimeout(()=>URL.revokeObjectURL(a.href), 1000);
          return;
        } catch (e) {
          // fall through to text download
        }
      }
    }

    // default: download as .txt with the visible result content
    const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'base64-result.txt';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(()=>URL.revokeObjectURL(a.href), 1000);
  });

  processBtn.addEventListener('click', async () => {
    const mode = getMode();
    const inputType = getInputType();
    const variant = variantEl.value;

    clearPreview();

    if (mode === 'encode') {
      if (inputType === 'file') {
        const file = fileInput.files[0];
        if (!file) { alert('請先選擇檔案'); return; }
        const arrayBuffer = await file.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        let b64 = bytesToBase64(bytes);

        if (variant === 'apple') {
          b64 = insertLineBreaks(b64, 76);
        }

        if (includeDataUrl.checked) {
          b64 = `data:${file.type || 'application/octet-stream'};base64,` + (variant === 'apple' ? b64 : b64);
        }

        setResult(b64);

        // Preview if image/audio/video
        if (includeDataUrl.checked) {
          // Create blob and preview using the mime from the file
          const blob = new Blob([bytes], { type: file.type || 'application/octet-stream' });
          tryShowPreview(file.type, blob);
        } else {
          tryShowPreview(file.type, new Blob([bytes], { type: file.type || 'application/octet-stream' }));
        }

      } else {
        // encode text
        const text = textInput.value || '';
        const encoder = new TextEncoder();
        const bytes = encoder.encode(text);
        let b64 = bytesToBase64(bytes);
        if (variant === 'apple') b64 = insertLineBreaks(b64, 76);
        setResult(b64);
      }
    } else {
      // decode
      let input = textInput.value.trim();
      if (inputType === 'file') {
        const file = fileInput.files[0];
        if (!file) { alert('請先選擇檔案'); return; }
        // read file as text (assume it contains base64 content)
        input = await file.text();
      }

      if (!input) { alert('沒有要解碼的內容'); return; }

      // If contains data URL, strip prefix and keep mime
      const dataUrlMatch = input.match(/^data:([^;]+);base64,(.*)$/s);
      let mime = null;
      let b64 = input;
      if (dataUrlMatch) {
        mime = dataUrlMatch[1];
        b64 = dataUrlMatch[2];
      }

      // For Apple variant, remove CRLF but keep variant semantics
      let clean = stripWhitespace(b64);

      try {
        const bytes = base64ToBytes(clean);
        // Try to decode as UTF-8 text
        let decodedText = null;
        try {
          decodedText = new TextDecoder().decode(bytes);
        } catch (e) {
          decodedText = null;
        }

        if (decodedText !== null && isMostlyText(decodedText)) {
          setResult(decodedText);
        } else {
          // binary: if we had mime or can detect preview, provide data URL in result and preview
          const blob = new Blob([bytes], { type: mime || 'application/octet-stream' });
          const dataUrl = `data:${mime || 'application/octet-stream'};base64,${clean}`;
          setResult(dataUrl);
          tryShowPreview(mime || 'application/octet-stream', blob);
        }
      } catch (e) {
        alert('解碼失敗：輸入可能不是合法的 Base64 或內容損壞。\n' + e);
      }
    }
  });

  function isMostlyText(s) {
    // quick heuristic: if has many control chars, treat as binary
    const len = s.length;
    let cnt = 0;
    for (let i = 0; i < len; i++) {
      const c = s.charCodeAt(i);
      if (c === 0) return false;
      if (c < 7 || (c > 13 && c < 32)) cnt++;
      if (cnt > len * 0.05) return false;
    }
    return true;
  }

  // Initialize small UX niceties
  textInput.addEventListener('input', () => {
    // quick approach: clear preview when editing text input
    clearPreview();
  });

})();