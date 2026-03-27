document.addEventListener('DOMContentLoaded', () => {
  const root = document.getElementById('resultContainer');
  if (!root) return;

  const rawSiz = window.SIZ;
  if (!rawSiz) {
    root.innerHTML = renderError('Не удалось загрузить нормативные данные. Проверьте файл siz.js.');
    return;
  }

  const prepared = transformJsonToInternal(rawSiz);

  const raw = localStorage.getItem('TEST_RESULT');
  if (!raw) {
    root.innerHTML = renderError('Нет данных теста. Вернитесь на страницу теста и пройдите его заново.');
    return;
  }

  let test;
  try {
    test = JSON.parse(raw);
  } catch (e) {
    root.innerHTML = renderError('Данные теста повреждены. Пройдите тест заново.');
    return;
  }

  const profCode = String(test?.profCode || localStorage.getItem('PROF_CODE') || '');
  if (!profCode) {
    root.innerHTML = renderError('Не удалось определить профессию.');
    return;
  }

  const profData = prepared.transformed[profCode];
  if (!profData) {
    root.innerHTML = renderError(`Нет нормативных данных СИЗ для профессии ${escapeHtml(profCode)}.`);
    return;
  }

  const required = flattenRequiredItems(profData);
  const givenMap = buildGivenMap(test);
  const evaluation = evaluate(required, givenMap);

  root.innerHTML = renderResult(profData, evaluation);
});

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (s) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }[s]));
}

function renderError(msg) {
  return `
    <div class="r-card r-card--error">
      <div class="r-title">Ошибка</div>
      <div class="r-muted">${escapeHtml(msg)}</div>
      <div class="r-actions">
        <a class="r-btn r-btn--ghost" href="page1.html">Вернуться к тесту</a>
      </div>
    </div>
  `;
}

function parseNorm(rawNorm) {
  const raw = String(rawNorm || '').trim();

  if (!raw) {
    return {
      raw: '',
      value: 0,
      unit: ''
    };
  }

  const match = raw.match(/^(\d+(?:[.,]\d+)?)\s*(.+)$/);

  if (!match) {
    return {
      raw,
      value: 0,
      unit: raw
    };
  }

  return {
    raw,
    value: Number(match[1].replace(',', '.')),
    unit: match[2].trim()
  };
}

function transformJsonToInternal(json) {
  const transformed = {};

  Object.entries(json || {}).forEach(([professionName, professionData], professionIndex) => {
    const code = String(professionData?.profession_no || professionIndex + 1);
    const rawTypes = professionData?.types || {};

    const types = Object.entries(rawTypes).map(([typeName, items], typeIndex) => ({
      typeId: `${code}_${typeIndex + 1}`,
      typeName,
      items: (items || []).map((item, itemIndex) => ({
        itemId: `${code}_${typeIndex + 1}_${itemIndex + 1}`,
        name: item?.name || '',
        norm: parseNorm(item?.norm || '')
      }))
    }));

    transformed[code] = {
      professionCode: code,
      professionName,
      types
    };
  });

  return { transformed };
}

function flattenRequiredItems(profData) {
  const out = [];
  const types = Array.isArray(profData.types) ? profData.types : [];

  types.forEach((t) => {
    const typeName = t.typeName || '';
    const items = Array.isArray(t.items) ? t.items : [];

    items.forEach((it) => {
      out.push({
        itemId: it.itemId || null,
        typeName,
        name: it.name || '',
        requiredQty: Number(it?.norm?.value || 0),
        unit: it?.norm?.unit || '',
        rawNorm: it?.norm?.raw || ''
      });
    });
  });

  return out;
}

function buildGivenMap(test) {
  const map = new Map();
  const items = test?.selected?.items || [];

  items.forEach((x) => {
    const qty = Number(x?.qty || 0);
    if (!isFinite(qty)) return;

    let itemId = x?.itemId;

    if (!itemId && x?.itemKey) {
      const m = String(x.itemKey).match(/__item__(.+)$/);
      if (m && m[1]) itemId = m[1];
    }

    if (!itemId) return;

    map.set(String(itemId), qty);
  });

  return map;
}

function evaluate(requiredItems, givenMap) {
  const rows = requiredItems.map((r) => {
    const key = String(r.itemId || '');
    const givenQty = givenMap.has(key) ? Number(givenMap.get(key)) : 0;

    const ok = givenQty >= r.requiredQty;
    const deficit = ok ? 0 : Math.max(0, r.requiredQty - givenQty);

    return {
      ...r,
      givenQty,
      ok,
      deficit,
      notSpecified: !givenMap.has(key)
    };
  });

  const total = rows.length;
  const okCount = rows.filter((x) => x.ok).length;
  const badCount = total - okCount;

  const deficits = rows
    .filter((x) => !x.ok)
    .map((x) => ({
      name: x.name,
      typeName: x.typeName,
      requiredQty: x.requiredQty,
      unit: x.unit,
      rawNorm: x.rawNorm,
      givenQty: x.givenQty,
      deficit: x.deficit,
      notSpecified: x.notSpecified
    }));

  return { total, okCount, badCount, rows, deficits };
}

function renderResult(profData, evaluation) {
  const title = `${escapeHtml(profData.professionCode || '')} — ${escapeHtml(profData.professionName || 'Профессия')}`;
  const statusText = evaluation.badCount === 0 ? 'Обеспечение достаточное' : 'Обеспечение недостаточное';

  return `
    <div class="r-card">
      <div class="r-title">${title}</div>

      <div class="r-status ${evaluation.badCount === 0 ? 'is-ok' : 'is-bad'}">
        <div class="r-status__main">${escapeHtml(statusText)}</div>
        <div class="r-status__sub">
          Проверено позиций: ${evaluation.total}. Несоответствий: ${evaluation.badCount}.
        </div>
      </div>

      <div class="r-block">
        <div class="r-text">
          Для выбранной профессии предусмотрены следующие СИЗ:
        </div>

        ${renderRequiredTable(evaluation.rows)}
      </div>

      <div class="r-block">
        <div class="r-subtitle">Недостаточное обеспечение по вашим ответам</div>

        ${evaluation.deficits.length === 0
          ? `<div class="r-okline">По вашим ответам недостатков не выявлено.</div>`
          : renderDeficitList(evaluation.deficits)
        }
      </div>

      <div class="r-actions">
        <a class="r-btn r-btn--ghost" href="page1.html">Пройти заново</a>
      </div>
    </div>
  `;
}

function renderRequiredTable(rows) {
  return `
    <div class="r-table">
      <div class="r-table__head">
        <div>Тип</div>
        <div>Наименование СИЗ</div>
        <div class="r-right">Норма</div>
        <div class="r-right">Указано вами</div>
      </div>

      ${rows.map((r) => `
        <div class="r-table__row">
          <div class="r-muted">${escapeHtml(r.typeName)}</div>
          <div>${escapeHtml(r.name)}</div>
          <div class="r-right">
            <span class="r-chip">${escapeHtml(r.rawNorm || `${r.requiredQty} ${r.unit}`)}</span>
          </div>
          <div class="r-right">
            <span class="r-chip ${r.ok ? '' : 'r-chip--bad'}">${r.givenQty} ${escapeHtml(r.unit || '')}</span>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function renderDeficitList(items) {
  return `
    <div class="r-deficits">
      ${items.map((x) => `
        <div class="r-deficit">
          <div class="r-deficit__title">${escapeHtml(x.name)}</div>
          <div class="r-deficit__meta">
            <span class="r-muted">${escapeHtml(x.typeName)}</span>
          </div>

          ${
            x.notSpecified
              ? `<div class="r-deficit__line">
                   <span class="r-badge r-badge--bad">Не указано</span>
                   Требуется: <b>${escapeHtml(x.rawNorm || `${x.requiredQty} ${x.unit}`)}</b>.
                 </div>`
              : `<div class="r-deficit__line">
                   Указано: <b>${x.givenQty} ${escapeHtml(x.unit || '')}</b>.
                   Требуется: <b>${escapeHtml(x.rawNorm || `${x.requiredQty} ${x.unit}`)}</b>.
                   <span class="r-badge r-badge--bad">Не хватает: ${x.deficit} ${escapeHtml(x.unit || '')}</span>
                 </div>`
          }
        </div>
      `).join('')}
    </div>
  `;
}

const burger = document.getElementById('burger');
const menu = document.getElementById('sideMenu');
const page = document.querySelector('.page');

if (burger && menu && page) {
  burger.addEventListener('click', () => {
    menu.classList.toggle('open');
    page.classList.toggle('shift');
    burger.classList.toggle('active');
  });
}