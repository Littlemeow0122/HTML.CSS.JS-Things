// script.js
(function () {
  const inputEl = document.getElementById('inputUrl');
  const parseBtn = document.getElementById('parseBtn');
  const clearBtn = document.getElementById('clearBtn');
  const copyBtn = document.getElementById('copyBtn');

  const tableBody = document.getElementById('tableBody');
  const summaryEl = document.getElementById('summary');
  const rawQueryEl = document.getElementById('rawQuery');
  const jsonOutEl = document.getElementById('jsonOut');
  const statusEl = document.getElementById('status');

  let lastResult = null;

  function setStatus(msg, type = 'info') {
    if (!msg) {
      statusEl.textContent = '';
      return;
    }
    statusEl.textContent = msg;
    statusEl.style.color = type === 'error' ? 'var(--danger)' : 'var(--muted)';
  }

  function extractQueryString(text) {
    if (!text) return '';
    const s = String(text).trim();

    // 若包含 '#...' 先移除 fragment
    const withoutHash = s.split('#')[0];

    // 嘗試找第一個 '?'
    const qIndex = withoutHash.indexOf('?');
    if (qIndex >= 0) {
      // 只取 '? 之後'
      return withoutHash.slice(qIndex + 1);
    }

    // 若使用者只輸入 '?a=b&c=d' 或 'a=b&c=d' 都能處理
    if (withoutHash.startsWith('?')) return withoutHash.slice(1);
    return withoutHash;
  }

  function decodeSafe(str) {
    // URLSearchParams 的 get 解碼行為接近 decodeURIComponent，但這裡保險處理錯誤
    try {
      return decodeURIComponent(str.replace(/\+/g, '%20'));
    } catch {
      return str;
    }
  }

  function parseParams(rawQuery) {
    // rawQuery: 不含前導 ? 的部分（例如 'a=1&b=2&b=3'）
    // 需求：支援重複 key，顯示原始與解碼值
    const trimmed = (rawQuery ?? '').toString().trim();
    if (!trimmed) return [];

    // 為了保留「原始值」，我們自己用 '&' 拆，再處理每段
    const parts = trimmed.split('&').filter(p => p.length > 0);

    const result = parts.map(part => {
      const eq = part.indexOf('=');
      let rawKey, rawVal;

      if (eq === -1) {
        rawKey = part;
        rawVal = ''; // 沒有 '=' 視為空字串
      } else {
        rawKey = part.slice(0, eq);
        rawVal = part.slice(eq + 1);
      }

      const key = decodeSafe(rawKey.replace(/\+/g, '%20'));
      const value = decodeSafe(rawVal.replace(/\+/g, '%20'));

      return {
        key,
        value,
        rawKey,
        rawValue: rawVal
      };
    });

    return result;
  }

  function render(result, rawQuery) {
    lastResult = result;

    // Summary
    const count = result.length;
    if (count === 0) {
      summaryEl.textContent = '尚未解析到參數。';
      tableBody.innerHTML = `
        <tr><td colspan="3" class="empty">尚未解析</td></tr>
      `;
      jsonOutEl.textContent = JSON.stringify({ query: rawQuery, params: [] }, null, 2);
      rawQueryEl.textContent = rawQuery ? rawQuery : '(空)';
      setStatus('');
      return;
    }

    summaryEl.textContent = `共 ${count} 筆參數。`;

    // Table
    tableBody.innerHTML = result.map(item => {
      const keyHtml = escapeHtml(String(item.key));
      const valHtml = escapeHtml(String(item.value));
      const rawValHtml = escapeHtml(String(item.rawValue));
      return `
        <tr>
          <td class="mono">${keyHtml}</td>
          <td class="mono">${valHtml}</td>
          <td class="mono">${rawValHtml}</td>
        </tr>
      `;
    }).join('');

    rawQueryEl.textContent = rawQuery ? rawQuery : '(空)';

    // JSON output
    const jsonObj = {
      query: rawQuery,
      params: result.map(({ key, value, rawKey, rawValue }) => ({
        key,
        value,
        rawKey,
        rawValue
      }))
    };
    jsonOutEl.textContent = JSON.stringify(jsonObj, null, 2);

    setStatus('解析完成。');
  }

  function escapeHtml(str) {
    return str
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  async function copyJson() {
    if (!lastResult) {
      setStatus('尚未有結果可複製。', 'error');
      return;
    }
    const rawQuery = rawQueryEl.textContent || '';
    const count = lastResult.length;

    const payload = JSON.stringify(
      { query: rawQuery === '(空)' ? '' : rawQuery, params: lastResult.map(({ key, value, rawKey, rawValue }) => ({ key, value, rawKey, rawValue })) },
      null,
      2
    );

    try {
      await navigator.clipboard.writeText(payload);
      setStatus(`已複製結果（${count} 筆）到剪貼簿。`);
    } catch {
      // fallback
      try {
        const ta = document.createElement('textarea');
        ta.value = payload;
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        setStatus(`已複製結果（${count} 筆）到剪貼簿。`);
      } catch {
        setStatus('複製失敗：瀏覽器可能不允許剪貼簿操作。', 'error');
      }
    }
  }

  function doParse() {
    const text = inputEl.value;
    const rawQuery = extractQueryString(text);
    setStatus('正在解析...', 'info');

    const result = parseParams(rawQuery);
    render(result, rawQuery);
  }

  // Events
  parseBtn.addEventListener('click', doParse);
  clearBtn.addEventListener('click', () => {
    inputEl.value = '';
    lastResult = null;
    setStatus('');
    summaryEl.textContent = '';
    rawQueryEl.textContent = '(空)';
    tableBody.innerHTML = `<tr><td colspan="3" class="empty">尚未解析</td></tr>`;
    jsonOutEl.textContent = '';
  });
  copyBtn.addEventListener('click', copyJson);

  inputEl.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') doParse();
  });

  // Initial: try parse current page's search (optional)
  // If you want, uncomment below:
  // const qs = new URLSearchParams(window.location.search);
})();