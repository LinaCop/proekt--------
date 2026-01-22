// page1.js
document.addEventListener('DOMContentLoaded', function () {
  // --- DOM ---
  const professionSelect = document.getElementById('professionSelect');
  const profInfo = document.getElementById('profInfo');
  const testForm = document.getElementById('testForm');
  const sizList = document.getElementById('sizList');

  // PrimeVue-like dropdown elements
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

  // --- Helpers ---
  function esc(str) {
    return String(str).replace(/[&<>"']/g, (s) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    }[s]));
  }

  // Безопасный CSS.escape (на старых браузерах может отсутствовать)
  const cssEscape = (window.CSS && typeof window.CSS.escape === 'function')
    ? window.CSS.escape.bind(window.CSS)
    : (s) => String(s).replace(/[^a-zA-Z0-9_\-]/g, '\\$&');

  function normalize(s) {
    return String(s || '').toLowerCase().trim();
  }

  // --- Professions: dropdown with full list + search inside (PrimeVue-like) ---
  const sizByName = new Map(
    Object.entries(window.SIZ_DATA || {}).map(([key, value]) => ([
      normalize(value?.professionName),
      String(key)
    ]))
  );

  const professions = (window.PROFESSIONS || []).map((p, index) => {
    const name = String(p.name || '');
    const matched = sizByName.get(normalize(name));
    const fallbackCode = String(index + 1);
    const code = matched || fallbackCode;

    return {
      code,
      name,
      label: name
    };
  });

  function loadProfessions() {
    // Заполняем скрытый select, чтобы значение всегда было в одном месте
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

    // показываем весь список при открытии
    renderProfessionList(searchInput ? searchInput.value : '');

    // фокус в поиск
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
      : professions.filter(p =>
          // normalize(p.code).includes(q) ||
          normalize(p.name).includes(q) ||
          normalize(p.label).includes(q)
        );

    if (filtered.length === 0) {
      pselectList.innerHTML = `<div class="pselect__empty">Ничего не найдено</div>`;
      return;
    }

    pselectList.innerHTML = filtered.map(p => `
      <button type="button"
              class="pselect__option"
              data-code="${esc(p.code)}"
              role="option">
        <span class="pselect__optionName">${esc(p.name)}</span>

      </button>
    `).join('');
  }

  function setSelectedProfession(code) {
    const p = professions.find(x => x.code === String(code));
    if (!p) return;

    professionSelect.value = p.code;

    // показываем выбранное в контроле
    if (pselectValue) pselectValue.textContent = p.label;

    // очищать поиск или оставлять? как PrimeVue обычно — оставляет, но для ясности очистим
    if (searchInput) searchInput.value = '';

    // показываем тест
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
    // Если в HTML нет кастомного селекта — просто покажем обычный select и выйдем
    if (!pselectControl || !pselectPanel || !pselectList || !searchInput || !pickerRoot) {
      console.warn('[page1.js] Profession picker markup not found. Falling back to native select.');
      professionSelect.style.display = '';
      return;
    }

    // Открытие/закрытие
    pselectControl.addEventListener('click', togglePanel);

    // Поиск внутри панели
    searchInput.addEventListener('input', () => {
      renderProfessionList(searchInput.value);
    });

    // Enter -> выбрать первый вариант
    searchInput.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      const first = pselectList.querySelector('.pselect__option');
      if (first) {
        e.preventDefault();
        setSelectedProfession(first.dataset.code);
      }
    });

    // Escape -> закрыть
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closePanel();
      }
    });

    // Выбор из списка
    pselectList.addEventListener('click', (e) => {
      const btn = e.target.closest('.pselect__option');
      if (!btn) return;
      setSelectedProfession(btn.dataset.code);
    });

    // Клик вне — закрыть
    document.addEventListener('click', (e) => {
      if (!pickerRoot.contains(e.target)) closePanel();
    });

    // Стартовое состояние
    clearProfessionUI();
  }

  // --- SIZ render (NEW STRUCTURE: types -> items -> qty) ---
  function renderSiz(code) {
    const data = window.SIZ_DATA && window.SIZ_DATA[code];
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

  // --- Delegated handlers for SIZ UI ---
  sizList.addEventListener('change', (e) => {
    const el = e.target;

    // 1) Тип: показать/скрыть список видов
    if (el.classList.contains('js-type-check')) {
      const typeKey = el.dataset.typeKey;
      const itemsBlock = sizList.querySelector(`[data-type-items="${cssEscape(typeKey)}"]`);
      if (itemsBlock) itemsBlock.style.display = el.checked ? 'block' : 'none';

      // Если сняли тип — снять все виды и спрятать их qty
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

    // 2) Вид: показать/скрыть поле количества
    if (el.classList.contains('js-item-check')) {
      const itemKey = el.dataset.itemKey;
      const qtyBlock = sizList.querySelector(`[data-qty="${cssEscape(itemKey)}"]`);
      if (qtyBlock) qtyBlock.style.display = el.checked ? 'block' : 'none';

      // Если сняли вид — очистить qty
      if (!el.checked) {
        const qtyInput = sizList.querySelector(`.js-qty-input[data-item-key="${cssEscape(itemKey)}"]`);
        if (qtyInput) qtyInput.value = '';
      }
      return;
    }
  });

  // --- Submit: save structured result ---
  testForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const code = professionSelect.value;
    const data = window.SIZ_DATA && window.SIZ_DATA[code];

    const result = {
      profCode: code,
      profName: data?.professionName || null,
      selected: {
        types: [],
        items: [] // { itemKey, name, qty, typeKey }
      }
    };

    // выбранные типы
    sizList.querySelectorAll('.js-type-check:checked').forEach((t) => {
      result.selected.types.push(t.dataset.typeKey);
    });

    // выбранные виды + qty
    sizList.querySelectorAll('.js-item-check:checked').forEach((ch) => {
      const itemKey = ch.dataset.itemKey;
      const typeKey = ch.dataset.typeKey;

      const qtyInput = sizList.querySelector(`.js-qty-input[data-item-key="${cssEscape(itemKey)}"]`);
      const qty = qtyInput ? Number(qtyInput.value || 0) : 0;

      const nameEl = ch.closest('.siz-item')?.querySelector('.siz-item__name');
      const name = nameEl ? nameEl.textContent.trim() : null;

      result.selected.items.push({ itemKey, typeKey, name, qty });
    });

    localStorage.setItem('TEST_RESULT', JSON.stringify(result));
    localStorage.setItem('PROF_CODE', code);

    window.location.href = 'result.html';
  });

  // --- Init ---
  loadProfessions();
  initializeProfessionPicker();
});

// =========================
// Burger menu (вне DOMContentLoaded, как у вас было)
// =========================
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
