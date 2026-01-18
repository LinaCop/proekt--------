const resultBox = document.getElementById('resultBox');

const code = localStorage.getItem('PROF_CODE');
const userSiz = JSON.parse(localStorage.getItem('USER_SIZ') || '[]');

// Если тест не проходили
if (!code) {
    resultBox.innerHTML = `<p>Данные отсутствуют. Пройдите тест ещё раз.</p>`;
} else {
    const all = SIZ_DATA[code] || [];
    const missing = all.filter(i => !userSiz.includes(i));
    const prof = PROFESSIONS.find(p => p.code === code);

    resultBox.innerHTML = `
        <p><strong>Профессия:</strong> ${code} — ${prof?.name}</p><br>
        <p><strong>Отсутствующие СИЗ:</strong></p>
        <ul>
            ${missing.length ? missing.map(i => `<li>${i}</li>`).join('') : '<li>Все СИЗ присутствуют ✔️</li>'}
        </ul>
        <br>
        <p>В соответствии с требованиями охраны труда рекомендуем обеспечить сотрудника отсутствующими СИЗ.</p>
    `;
}

