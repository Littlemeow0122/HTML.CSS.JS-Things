// script.js
const inputEl = document.getElementById('input');
const outputEl = document.getElementById('output');
const errorBox = document.getElementById('errorBox');
const inMeta = document.getElementById('inMeta');
const outMeta = document.getElementById('outMeta');
const ratioEl = document.getElementById('ratio');

const formatBtn = document.getElementById('formatBtn');
const minifyBtn = document.getElementById('minifyBtn');
const copyBtn = document.getElementById('copyBtn');
const clearBtn = document.getElementById('clearBtn');

const copyAfter = document.getElementById('copyAfter');
const autoValidate = document.getElementById('autoValidate');

function setError(msg) {
  if (!msg) {
    errorBox.hidden = true;
    errorBox.textContent = '';
    return;
  }
  errorBox.hidden = false;
  errorBox.textContent = msg;
}

function getInputText() {
  return inputEl.value.trim();
}

function tryParseJson(text) {
  if (!text) return { value: null, error: null, raw: '' };
  try {
    const parsed = JSON.parse(text);
    return { value: parsed, error: null, raw: text };
  } catch (err) {
    return { value: null, error: err, raw: text };
  }
}

function updateMeta(inText, outText) {
  inMeta.textContent = `長度：${inText ? inText.length : 0}`;
  outMeta.textContent = `長度：${outText ? outText.length : 0}`;

  if (inText && outText) {
    const ratio = (outText.length / inText.length) * 100;
    ratioEl.textContent = `${ratio.toFixed(2)}%`;
  } else {
    ratioEl.textContent = '-';
  }
}

async function copyOutput() {
  const text = outputEl.value;
  if (!text) return;

  try {
    await navigator.clipboard.writeText(text);
    copyBtn.textContent = '已複製';
    setTimeout(() => (copyBtn.textContent = '複製'), 900);
  } catch {
    // Fallback
    outputEl.focus();
    outputEl.select();
    const ok = document.execCommand('copy');
    copyBtn.textContent = ok ? '已複製' : '複製失敗';
    setTimeout(() => (copyBtn.textContent = '複製'), 900);
  }
}

function formatJson() {
  const inText = getInputText();
  const { value, error } = tryParseJson(inText);
  if (error) {
    setError(`JSON 解析失敗：${error.message}`);
    return;
  }
  setError(null);

  if (value === null) {
    outputEl.value = '';
    updateMeta(inText, '');
    return;
  }

  // 進行格式化：縮排 2
  const outText = JSON.stringify(value, null, 2);
  outputEl.value = outText;
  updateMeta(inText, outText);

  if (copyAfter.checked) copyOutput();
}

function minifyJson() {
  const inText = getInputText();
  const { value, error } = tryParseJson(inText);
  if (error) {
    setError(`JSON 解析失敗：${error.message}`);
    return;
  }
  setError(null);

  if (value === null) {
    outputEl.value = '';
    updateMeta(inText, '');
    return;
  }

  // 壓縮：不帶縮排
  const outText = JSON.stringify(value);
  outputEl.value = outText;
  updateMeta(inText, outText);

  if (copyAfter.checked) copyOutput();
}

function validateLive() {
  const inText = getInputText();
  if (!inText) {
    setError(null);
    updateMeta('', outputEl.value.trim());
    return;
  }

  const { error } = tryParseJson(inText);
  if (error) {
    setError(`JSON 解析失敗：${error.message}`);
  } else {
    setError(null);
  }
  updateMeta(inText, outputEl.value.trim());
}

formatBtn.addEventListener('click', formatJson);
minifyBtn.addEventListener('click', minifyJson);

copyBtn.addEventListener('click', copyOutput);

clearBtn.addEventListener('click', () => {
  inputEl.value = '';
  outputEl.value = '';
  setError(null);
  updateMeta('', '');
  inputEl.focus();
});

inputEl.addEventListener('input', () => {
  if (autoValidate.checked) validateLive();
  else {
    // 只更新長度資訊
    const inText = getInputText();
    updateMeta(inText, outputEl.value.trim());
  }
});

// 初始
updateMeta('', '');
setError(null);