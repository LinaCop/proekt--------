// result.js
document.addEventListener('DOMContentLoaded', () => {
  const root = document.getElementById('resultContainer');
  if (!root) return;

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

  const profCode = test?.profCode || localStorage.getItem('PROF_CODE');
  if (!profCode) {
    root.innerHTML = renderError('Не удалось определить профессию.');
    return;
  }

  const profData = window.SIZ_DATA?.[profCode];
  if (!profData) {
    root.innerHTML = renderError(`Нет нормативных данных СИЗ для профессии ${escapeHtml(profCode)}.`);
    return;
  }

  const required = flattenRequiredItems(profData);
  const givenMap = buildGivenMap(test);
  const evaluation = evaluate(required, givenMap);

  root.innerHTML = renderResult(profData, evaluation);
});

/* =========================
   Helpers
   ========================= */
function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (s) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  }[s]));
}

function renderError(msg) {
  return `
    <div class="r-card r-card--error">
      <div class="r-title">Ошибка</div>
      <div class="r-muted">${escapeHtml(msg)}</div>
    </div>
  `;
}

/* =========================
   Data normalization
   ========================= */
function flattenRequiredItems(profData) {
  const out = [];
  const types = Array.isArray(profData.types) ? profData.types : [];

  types.forEach((t) => {
    const typeName = t.typeName || '';
    const items = Array.isArray(t.items) ? t.items : [];

    items.forEach((it) => {
      const itemId = it.itemId || null;
      const name = it.name || '';
      const requiredQty = Number(it?.norm?.value || 0);
      const unit = it?.norm?.unit || '';
      const period = it?.norm?.period || '';

      out.push({
        itemId,
        typeName,
        name,
        requiredQty: isFinite(requiredQty) ? requiredQty : 0,
        unit,
        period
      });
    });
  });

  return out;
}

/**
 * Поддерживаем 2 случая:
 * 1) если page1.js сохраняет itemId -> используем itemId
 * 2) если itemId нет -> пытаемся вытащить из itemKey (после "__item__")
 */
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

/* =========================
   Evaluation
   ========================= */
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
      // нужно для текста "вообще не указал"
      notSpecified: !givenMap.has(key)
    };
  });

  const total = rows.length;
  const okCount = rows.filter(x => x.ok).length;
  const badCount = total - okCount;

  // список недостатков
  const недостатки = rows
    .filter(x => !x.ok)
    .map(x => ({
      name: x.name,
      typeName: x.typeName,
      requiredQty: x.requiredQty,
      unit: x.unit,
      givenQty: x.givenQty,
      deficit: x.deficit,
      notSpecified: x.notSpecified
    }));

  return { total, okCount, badCount, rows, недостатки };
}


/* =========================
   Rendering
   ========================= */
function renderResult(profData, evaluation) {
  const title = `${escapeHtml(profData.professionCode || '')} — ${escapeHtml(profData.professionName || 'Профессия')}`;

  const orderText = profData.orderText
    ? escapeHtml(profData.orderText)
    : 'действующими нормами обеспечения работников средствами индивидуальной защиты';

  const statusText = evaluation.badCount === 0 ? 'Обеспечение достаточное' : 'Обеспечение недостаточное';

  return `
    <div class="r-card">
      <div class="r-title">${title}</div>

      <div class="r-status ${evaluation.badCount === 0 ? 'is-ok' : 'is-bad'}">
        <div class="r-status__main">${escapeHtml(statusText)}</div>
        <div class="r-status__sub">Проверено позиций: ${evaluation.total}. Несоответствий: ${evaluation.badCount}.</div>
      </div>

      <div class="r-block">
        <div class="r-text">
          В связи с <b>${orderText}</b> работодатель должен обеспечить вас следующими СИЗ:
        </div>

        ${renderRequiredTable(evaluation.rows)}
      </div>

      <div class="r-block">
        <div class="r-subtitle">Недостаточное обеспечение по вашим ответам</div>

        ${evaluation.недостатки.length === 0
          ? `<div class="r-okline">По вашим ответам недостатков не выявлено.</div>`
          : renderDeficitList(evaluation.недостатки)
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
        <div class="r-right">Количество</div>
      </div>
      ${rows.map(r => `
        <div class="r-table__row">
          <div class="r-muted">${escapeHtml(r.typeName)}</div>
          <div>${escapeHtml(r.name)}</div>
          <div class="r-right"><span class="r-chip">${r.requiredQty} ${escapeHtml(r.unit || '')}</span></div>
        </div>
      `).join('')}
    </div>
  `;
}

function renderDeficitList(items) {
  return `
    <div class="r-deficits">
      ${items.map(x => `
        <div class="r-deficit">
          <div class="r-deficit__title">${escapeHtml(x.name)}</div>
          <div class="r-deficit__meta">
            <span class="r-muted">${escapeHtml(x.typeName)}</span>
          </div>

          ${
            x.notSpecified
              ? `<div class="r-deficit__line">
                   <span class="r-badge r-badge--bad">Не указано</span>
                   Требуется: <b>${x.requiredQty} ${escapeHtml(x.unit || '')}</b>.
                 </div>`
              : `<div class="r-deficit__line">
                   Указано: <b>${x.givenQty} ${escapeHtml(x.unit || '')}</b>.
                   Требуется: <b>${x.requiredQty} ${escapeHtml(x.unit || '')}</b>.
                   <span class="r-badge r-badge--bad">Не хватает: ${x.deficit} ${escapeHtml(x.unit || '')}</span>
                 </div>`
          }
        </div>
      `).join('')}
    </div>
  `;
}



