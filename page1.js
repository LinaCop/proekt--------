// page1.js
document.addEventListener('DOMContentLoaded', function() {
    // Получаем элементы DOM
    const professionSelect = document.getElementById('professionSelect');
    const profInfo = document.getElementById('profInfo');
    const testForm = document.getElementById('testForm');
    const sizList = document.getElementById('sizList');
    const searchInput = document.getElementById('professionSearch');

    /** Заполняем select */
    function loadProfessions() {
        PROFESSIONS.forEach(p => {
            const option = document.createElement('option');
            option.value = p.code;
            option.textContent = `${p.code} — ${p.name}`;
            professionSelect.appendChild(option);
        });
    }

    /** Загружаем СИЗ по профессии */
    function renderSiz(code) {
        const arr = SIZ_DATA[code] || [];
        sizList.innerHTML = '';
        arr.forEach(siz => {
            const id = 'siz_' + siz.replace(/\s+/g, '_');
            const div = document.createElement('div');
            div.className = 'siz-item';
            div.innerHTML = `<label><input type="checkbox" value="${siz}"> ${siz}</label>`;
            sizList.appendChild(div);
        });
    }

    /** Фильтрация профессий по поисковому запросу */
    function filterProfessions(searchText) {
        const options = professionSelect.options;
        searchText = searchText.toLowerCase();
        
        for (let i = 0; i < options.length; i++) {
            const option = options[i];
            const text = option.textContent.toLowerCase();
            
            if (option.value === "") {
                option.style.display = ""; // Всегда показывать опцию "-- Выберите --"
                continue;
            }
            
            if (text.includes(searchText)) {
                option.style.display = "";
            } else {
                option.style.display = "none";
            }
        }
    }

    /** Инициализация поиска */
    function initializeSearch() {
        if (searchInput) {
            searchInput.addEventListener('input', function() {
                filterProfessions(this.value);
            });
        }
    }

    /** При выборе профессии */
    professionSelect.addEventListener('change', () => {
        const code = professionSelect.value;
        if (!code) {
            profInfo.style.display = 'block';
            testForm.style.display = 'none';
            return;
        }
        profInfo.style.display = 'none';
        testForm.style.display = 'block';
        renderSiz(code);
    });

    /** Отправка формы */
    testForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const code = professionSelect.value;
        const checked = [...document.querySelectorAll("input[type='checkbox']:checked")]
            .map(i => i.value);

        localStorage.setItem('PROF_CODE', code);
        localStorage.setItem('USER_SIZ', JSON.stringify(checked));

        window.location.href = 'result.html';
    });

    // Инициализация приложения
    loadProfessions();
    initializeSearch();
});

// связь для менюшки
const burger = document.getElementById('burger');
const menu = document.getElementById('sideMenu');
const page = document.querySelector('.page');

burger.addEventListener('click', () => {
    menu.classList.toggle('open');
    page.classList.toggle('shift');
    burger.classList.toggle('active');
});