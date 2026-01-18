// page2.js — общий для всех PDF (просмотр/скачивание)

document.addEventListener('DOMContentLoaded', () => {
  function fileNameFromPath(path) {
    const clean = (path || '').split('?')[0].split('#')[0];
    const parts = clean.split('/');
    return parts[parts.length - 1] || 'document.pdf';
  }

  async function forceDownload(pdfPath, fileName) {
    // ВАЖНО: если страница открыта как file://, fetch может не работать нормально.
    // Запускай сайт через сервер (хостинг / локальный Live Server).
    const resp = await fetch(pdfPath, { cache: 'no-store' });
    if (!resp.ok) throw new Error(`Не удалось скачать файл: HTTP ${resp.status}`);

    const blob = await resp.blob();

    // Иногда полезно “замаскировать” под бинарник
    const downloadBlob = new Blob([blob], { type: 'application/octet-stream' });

    const url = URL.createObjectURL(downloadBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;

    document.body.appendChild(a);
    a.click();
    a.remove();

    URL.revokeObjectURL(url);
  }

  // --- Просмотр: просто ссылка ---
  document.querySelectorAll('.js-pdf-view[data-pdf]').forEach((btn) => {
    const pdfPath = btn.dataset.pdf;
    btn.setAttribute('href', pdfPath);
    btn.setAttribute('target', '_blank');
    btn.setAttribute('rel', 'noopener');
  });

  // --- Скачивание: ТОЛЬКО через Blob ---
  document.querySelectorAll('.js-pdf-download[data-pdf]').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();

      const pdfPath = btn.dataset.pdf;
      const fileName = btn.dataset.name || fileNameFromPath(pdfPath);

      console.log('[DOWNLOAD] start', { pdfPath, fileName });

      try {
        await forceDownload(pdfPath, fileName);
        console.log('[DOWNLOAD] success');
      } catch (err) {
        console.error('[DOWNLOAD] failed:', err);

        // Чтобы ты сразу увидела проблему (можешь убрать alert потом)
        alert(
          'Скачивание не получилось. Открой консоль (F12 → Console) — там причина.\n' +
          'Чаще всего это CORS или страница открыта как file://'
        );
      }
    });
  });
});


