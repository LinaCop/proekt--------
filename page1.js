document.addEventListener('DOMContentLoaded', async function () {
  const professionSelect = document.getElementById('professionSelect');
  const profInfo = document.getElementById('profInfo');
  const testForm = document.getElementById('testForm');
  const sizList = document.getElementById('sizList');

  const pickerRoot = document.getElementById('professionPicker');
  const pselectControl = document.getElementById('pselectControl');
  const pselectPanel = document.getElementById('pselectPanel');
  const pselectList = document.getElementById('pselectList');
  const pselectValue = document.getElementById('pselectValue');
  const searchInput = document.getElementById('professionSearch');

  if (!professionSelect || !profInfo || !testForm || !sizList) {
    console.error('[page1.js] Не найдены обязательные элементы страницы');
    return;
  }

  let professions = [];
  let sizData = {};

  function esc(str) {
    return String(str).replace(/[&<>"']/g, (s) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    }[s]));
  }

  const cssEscape = (window.CSS && typeof window.CSS.escape === 'function')
    ? window.CSS.escape.bind(window.CSS)
    : (s) => String(s).replace(/[^a-zA-Z0-9_\-]/g, '\\$&');

  function normalize(s) {
    return String(s || '').toLowerCase().trim();
  }

  function parseNorm(rawNorm) {
    const raw = String(rawNorm || '').trim();

    if (!raw) {
      return {
        raw: '',
        value: null,
        unit: ''
      };
    }

    const match = raw.match(/^(\d+(?:[.,]\d+)?)\s*(.+)$/);

    if (!match) {
      return {
        raw,
        value: null,
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
    const professionsList = [];

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

      professionsList.push({
        code,
        name: professionName,
        label: `${code} — ${professionName}`
      });
    });

    professionsList.sort((a, b) => a.name.localeCompare(b.name, 'ru'));

    return {
      transformed,
      professionsList
    };
  }

  function loadData() {
    try {
      const json = window.SIZ;

      if (!json) {
        throw new Error('window.SIZ не найден');
      }

      const prepared = transformJsonToInternal(json);

      sizData = prepared.transformed;
      professions = prepared.professionsList;

      loadProfessions();
      initializeProfessionPicker();
    } catch (error) {
      console.error('[page1.js] Ошибка загрузки данных:', error);
      profInfo.innerHTML = `
        <p class="prof-text">
          Не удалось загрузить данные по профессиям. Проверьте файл siz.js.
        </p>
      `;
    }
  }

  function loadProfessions() {
    professionSelect.innerHTML = '<option value="">-- Выберите --</option>';

    professions.forEach((p) => {
      const option = document.createElement('option');
      option.value = p.code;
      option.textContent = p.label;
      professionSelect.appendChild(option);
    });
  }

  function openPanel() {
    if (!pselectPanel) return;
    pselectPanel.style.display = 'block';
    pselectControl?.setAttribute('aria-expanded', 'true');
    renderProfessionList(searchInput ? searchInput.value : '');

    if (searchInput) {
      searchInput.focus();
      searchInput.select();
    }
  }

  function closePanel() {
    if (!pselectPanel) return;
    pselectPanel.style.display = 'none';
    pselectControl?.setAttribute('aria-expanded', 'false');
  }

  function togglePanel() {
    if (!pselectPanel) return;
    const isOpen = pselectPanel.style.display !== 'none';
    if (isOpen) closePanel();
    else openPanel();
  }

  function renderProfessionList(query) {
    if (!pselectList) return;

    const q = normalize(query);

    const filtered = !q
      ? professions
      : professions.filter((p) =>
          normalize(p.code).includes(q) ||
          normalize(p.name).includes(q) ||
          normalize(p.label).includes(q)
        );

    if (filtered.length === 0) {
      pselectList.innerHTML = `<div class="pselect__empty">Ничего не найдено</div>`;
      return;
    }

    pselectList.innerHTML = filtered.map((p) => `
      <button
        type="button"
        class="pselect__option"
        data-code="${esc(p.code)}"
        role="option"
      >
        <span class="pselect__optionName">${esc(p.label)}</span>
      </button>
    `).join('');
  }

  function setSelectedProfession(code) {
    const p = professions.find((x) => x.code === String(code));
    if (!p) return;

    professionSelect.value = p.code;

    if (pselectValue) {
      pselectValue.textContent = p.label;
    }

    if (searchInput) {
      searchInput.value = '';
    }

    profInfo.style.display = 'none';
    testForm.style.display = 'block';
    renderSiz(p.code);

    closePanel();
  }

  function clearProfessionUI() {
    professionSelect.value = '';
    if (pselectValue) pselectValue.textContent = '-- Выберите профессию --';
    if (searchInput) searchInput.value = '';
    closePanel();

    profInfo.style.display = 'block';
    testForm.style.display = 'none';
    sizList.innerHTML = '';
  }

  function initializeProfessionPicker() {
    if (!pselectControl || !pselectPanel || !pselectList || !searchInput || !pickerRoot) {
      console.warn('[page1.js] Profession picker markup not found. Falling back to native select.');
      professionSelect.style.display = '';
      return;
    }

    pselectControl.addEventListener('click', togglePanel);

    searchInput.addEventListener('input', () => {
      renderProfessionList(searchInput.value);
    });

    searchInput.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      const first = pselectList.querySelector('.pselect__option');
      if (first) {
        e.preventDefault();
        setSelectedProfession(first.dataset.code);
      }
    });

    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closePanel();
      }
    });

    pselectList.addEventListener('click', (e) => {
      const btn = e.target.closest('.pselect__option');
      if (!btn) return;
      setSelectedProfession(btn.dataset.code);
    });

    document.addEventListener('click', (e) => {
      if (!pickerRoot.contains(e.target)) closePanel();
    });

    clearProfessionUI();
  }

  function renderSiz(code) {
    const data = sizData[code];
    sizList.innerHTML = '';

    if (!data || !Array.isArray(data.types) || data.types.length === 0) {
      sizList.innerHTML = `<div class="prof-text">Для этой профессии нет данных по СИЗ.</div>`;
      return;
    }

    data.types.forEach((t, idx) => {
      const typeKey = `${code}__type__${t.typeId || idx}`;

      const typeBlock = document.createElement('div');
      typeBlock.className = 'siz-type';

      typeBlock.innerHTML = `
        <label class="siz-type__label">
          <input type="checkbox"
                 class="js-type-check"
                 data-type-key="${esc(typeKey)}">
          <span class="siz-type__name">${esc(t.typeName || '')}</span>
        </label>

        <div class="siz-type__items" data-type-items="${esc(typeKey)}" style="display:none;">
          ${
            (t.items || []).map((it, j) => {
              const itemKey = `${code}__item__${it.itemId || (t.typeId || idx) + '_' + j}`;
              const unitText = it?.norm?.unit ? String(it.norm.unit) : 'шт';
              const recommendedText = it?.norm?.raw ? String(it.norm.raw) : '';

              return `
                <div class="siz-item">
                  <label class="siz-item__label">
                    <input type="checkbox"
                           class="js-item-check"
                           data-item-key="${esc(itemKey)}"
                           data-item-id="${esc(it.itemId || '')}"
                           data-type-key="${esc(typeKey)}">
                    <span class="siz-item__name">${esc(it.name || '')}</span>
                  </label>

                  ${
                    recommendedText
                      ? `<div class="siz-item__norm">Норма: ${esc(recommendedText)}</div>`
                      : ''
                  }

                  <div class="siz-item__qty" data-qty="${esc(itemKey)}" style="display:none;">
                    <label>
                      Количество выдано:
                      <input type="number"
                             min="0"
                             step="1"
                             class="js-qty-input"
                             data-item-key="${esc(itemKey)}"
                             placeholder="Например, 1">
                    </label>
                    <span class="qty-unit">${esc(unitText)}</span>
                  </div>
                </div>
              `;
            }).join('')
          }
        </div>
      `;

      sizList.appendChild(typeBlock);
    });
  }

  sizList.addEventListener('change', (e) => {
    const el = e.target;

    if (el.classList.contains('js-type-check')) {
      const typeKey = el.dataset.typeKey;
      const itemsBlock = sizList.querySelector(`[data-type-items="${cssEscape(typeKey)}"]`);
      if (itemsBlock) itemsBlock.style.display = el.checked ? 'block' : 'none';

      if (!el.checked && itemsBlock) {
        itemsBlock.querySelectorAll('.js-item-check').forEach((ch) => {
          ch.checked = false;

          const itemKey = ch.dataset.itemKey;
          const qtyBlock = sizList.querySelector(`[data-qty="${cssEscape(itemKey)}"]`);
          if (qtyBlock) qtyBlock.style.display = 'none';

          const qtyInput = sizList.querySelector(`.js-qty-input[data-item-key="${cssEscape(itemKey)}"]`);
          if (qtyInput) qtyInput.value = '';
        });
      }
      return;
    }

    if (el.classList.contains('js-item-check')) {
      const itemKey = el.dataset.itemKey;
      const qtyBlock = sizList.querySelector(`[data-qty="${cssEscape(itemKey)}"]`);
      if (qtyBlock) qtyBlock.style.display = el.checked ? 'block' : 'none';

      if (!el.checked) {
        const qtyInput = sizList.querySelector(`.js-qty-input[data-item-key="${cssEscape(itemKey)}"]`);
        if (qtyInput) qtyInput.value = '';
      }
    }
  });

  testForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const code = professionSelect.value;
    const data = sizData[code];

    const result = {
      profCode: code,
      profName: data?.professionName || null,
      selected: {
        types: [],
        items: []
      }
    };

    sizList.querySelectorAll('.js-type-check:checked').forEach((t) => {
      result.selected.types.push(t.dataset.typeKey);
    });

    sizList.querySelectorAll('.js-item-check:checked').forEach((ch) => {
      const itemKey = ch.dataset.itemKey;
      const typeKey = ch.dataset.typeKey;

      const qtyInput = sizList.querySelector(`.js-qty-input[data-item-key="${cssEscape(itemKey)}"]`);
      const qty = qtyInput ? Number(qtyInput.value || 0) : 0;

      const itemBlock = ch.closest('.siz-item');
      const nameEl = itemBlock?.querySelector('.siz-item__name');
      const normEl = itemBlock?.querySelector('.siz-item__norm');

      result.selected.items.push({
        itemKey,
        typeKey,
        name: nameEl ? nameEl.textContent.trim() : null,
        qty,
        recommended: normEl ? normEl.textContent.replace(/^Норма:\s*/, '').trim() : null
      });
    });

    localStorage.setItem('TEST_RESULT', JSON.stringify(result));
    localStorage.setItem('PROF_CODE', code);

    window.location.href = 'result.html';
  });

  loadData();
});

const burger = document.getElementById('burger');
const menu = document.getElementById('sideMenu');
const page = document.querySelector('.page');

if (burger && menu && page) {
  burger.addEventListener('click', () => {
    menu.classList.toggle('open');
    page.classList.toggle('shift');
    burger.classList.toggle('active');
  });
} else {
  console.warn('[page1.js] Burger/menu/page не найдены — меню не будет переключаться');
}