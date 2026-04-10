// script.js
// 元件
const inputEl = document.getElementById('input');
const outputEl = document.getElementById('output');
const encodeBtn = document.getElementById('encodeBtn');
const decodeBtn = document.getElementById('decodeBtn');
const clearBtn = document.getElementById('clearBtn');
const copyBtn = document.getElementById('copyBtn');
const statusEl = document.getElementById('status');

function setStatus(text, isError = false) {
  statusEl.textContent = text || '';
  statusEl.style.color = isError ? '#b00020' : '';
  if (text) {
    // 自動清除提示（非錯誤）
    if (!isError) {
      setTimeout(() => {
        if (statusEl.textContent === text) statusEl.textContent = '';
      }, 2500);
    }
  }
}

function encodeText() {
  const val = inputEl.value || '';
  try {
    // 使用 encodeURIComponent 來編碼字串（對字元做完整編碼）
    const encoded = encodeURIComponent(val);
    outputEl.value = encoded;
    setStatus('編碼完成');
  } catch (err) {
    outputEl.value = '';
    setStatus('編碼發生錯誤', true);
  }
}

function decodeText() {
  const val = inputEl.value || '';
  // 將 + 視為空格（常見於 application/x-www-form-urlencoded）
  const prepared = val.replace(/\+/g, ' ');
  try {
    // 先嘗試 decodeURIComponent，若失敗再嘗試 decodeURI；兩者 catch 後顯示錯誤
    let decoded;
    try {
      decoded = decodeURIComponent(prepared);
    } catch (e1) {
      // 若包含完整 URL 的編碼，也可能適合 decodeURI
      try {
        decoded = decodeURI(prepared);
      } catch (e2) {
        throw new Error('無效的編碼字串');
      }
    }
    outputEl.value = decoded;
    setStatus('解碼完成');
  } catch (err) {
    outputEl.value = '';
    setStatus('解碼失敗：輸入可能包含無效的百分比編碼', true);
  }
}

function clearAll() {
  inputEl.value = '';
  outputEl.value = '';
  setStatus('');
  inputEl.focus();
}

async function copyOutput() {
  const text = outputEl.value || '';
  if (!text) {
    setStatus('沒有可複製的內容', true);
    return;
  }
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      // 備援：臨時選取並執行複製
      outputEl.select();
      document.execCommand('copy');
      // 取消選取
      window.getSelection().removeAllRanges();
    }
    setStatus('已複製到剪貼簿');
  } catch (err) {
    setStatus('複製失敗', true);
  }
}

// 事件綁定
encodeBtn.addEventListener('click', encodeText);
decodeBtn.addEventListener('click', decodeText);
clearBtn.addEventListener('click', clearAll);
copyBtn.addEventListener('click', copyOutput);

// 快捷鍵：Ctrl+E 編碼，Ctrl+D 解碼，Ctrl+L 清除，Ctrl+Shift+C 複製
window.addEventListener('keydown', (e) => {
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const metaKey = isMac ? e.metaKey : e.ctrlKey;
  if (!metaKey) return;

  // Ctrl+E 或 Cmd+E
  if (!e.shiftKey && !e.altKey && e.key.toLowerCase() === 'e') {
    e.preventDefault();
    encodeText();
    return;
  }
  // Ctrl+D 或 Cmd+D
  if (!e.shiftKey && !e.altKey && e.key.toLowerCase() === 'd') {
    e.preventDefault();
    decodeText();
    return;
  }
  // Ctrl+L 清除
  if (!e.shiftKey && !e.altKey && e.key.toLowerCase() === 'l') {
    e.preventDefault();
    clearAll();
    return;
  }
  // Ctrl+Shift+C 複製輸出
  if (e.shiftKey && e.key.toLowerCase() === 'c') {
    e.preventDefault();
    copyOutput();
    return;
  }
});

// 方便：按下 Enter 並且同時按 Ctrl/Cmd 將編碼
inputEl.addEventListener('keydown', (e) => {
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const metaKey = isMac ? e.metaKey : e.ctrlKey;
  if (metaKey && e.key === 'Enter') {
    e.preventDefault();
    encodeText();
  }
});

// 初始焦點
inputEl.focus();