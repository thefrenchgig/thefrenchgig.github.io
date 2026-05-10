(() => {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  // --- Footer year ---------------------------------------------------------
  const yearEl = $('#year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // --- Live YouTube videos -------------------------------------------------
  // Fetch the latest 3 uploads from the channel's RSS feed and swap the
  // hardcoded iframes. If the fetch fails (proxy down, offline, etc.), the
  // hardcoded videos in index.html remain visible.
  const YT_CHANNEL_ID = 'UClujL7aiLx2FU22J4fGZQ5w';
  const RSS = `https://www.youtube.com/feeds/videos.xml?channel_id=${YT_CHANNEL_ID}`;
  const PROXY = 'https://corsproxy.io/?url=';

  const refreshVideos = async () => {
    const figures = $$('.video-embed');
    if (figures.length === 0) return;
    try {
      const res = await fetch(PROXY + encodeURIComponent(RSS), { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const xml = new DOMParser().parseFromString(await res.text(), 'application/xml');
      if (xml.querySelector('parsererror')) throw new Error('XML parse error');

      const entries = Array.from(xml.getElementsByTagName('entry')).slice(0, figures.length);
      entries.forEach((entry, i) => {
        const idEl = entry.getElementsByTagName('yt:videoId')[0];
        const titleEl = entry.getElementsByTagName('title')[0];
        if (!idEl || !titleEl) return;
        const id = idEl.textContent.trim();
        const title = titleEl.textContent.trim();
        if (!/^[A-Za-z0-9_-]{11}$/.test(id)) return;

        const fig = figures[i];
        const iframe = fig.querySelector('iframe');
        const caption = fig.querySelector('figcaption');
        const newSrc = `https://www.youtube-nocookie.com/embed/${id}`;
        if (iframe && iframe.src !== newSrc) iframe.src = newSrc;
        if (iframe) iframe.title = title;
        if (caption) caption.textContent = title;
      });
    } catch (err) {
      console.warn('[videos] live fetch failed, using fallback embeds:', err);
    }
  };
  refreshVideos();

  // --- Mobile nav toggle ---------------------------------------------------
  const toggle = $('.nav-toggle');
  const nav = $('#primary-nav');
  if (toggle && nav) {
    const setOpen = (open) => {
      toggle.setAttribute('aria-expanded', String(open));
      nav.dataset.open = String(open);
    };
    toggle.addEventListener('click', () => {
      setOpen(toggle.getAttribute('aria-expanded') !== 'true');
    });
    nav.addEventListener('click', (e) => {
      if (e.target.tagName === 'A') setOpen(false);
    });
  }

  // --- Lightbox ------------------------------------------------------------
  const lightbox = $('#lightbox');
  if (lightbox) {
    const imgEl  = $('.lightbox-img', lightbox);
    const btnX   = $('.lightbox-close', lightbox);
    const btnPrev = $('.lightbox-prev', lightbox);
    const btnNext = $('.lightbox-next', lightbox);

    const items = $$('.gallery-item').map((btn) => {
      const img = btn.querySelector('img');
      return { src: img.src, alt: img.alt };
    });
    let current = 0;
    let lastFocus = null;

    const show = (i) => {
      current = (i + items.length) % items.length;
      imgEl.src = items[current].src;
      imgEl.alt = items[current].alt;
    };
    const open = (i) => {
      lastFocus = document.activeElement;
      show(i);
      lightbox.hidden = false;
      document.body.style.overflow = 'hidden';
      btnX.focus();
    };
    const close = () => {
      lightbox.hidden = true;
      document.body.style.overflow = '';
      if (lastFocus) lastFocus.focus();
    };

    $$('.gallery-item').forEach((btn) => {
      btn.addEventListener('click', () => open(parseInt(btn.dataset.index, 10) || 0));
    });
    btnX.addEventListener('click', close);
    btnPrev.addEventListener('click', () => show(current - 1));
    btnNext.addEventListener('click', () => show(current + 1));
    lightbox.addEventListener('click', (e) => {
      if (e.target === lightbox) close();
    });
    document.addEventListener('keydown', (e) => {
      if (lightbox.hidden) return;
      if (e.key === 'Escape')      close();
      else if (e.key === 'ArrowLeft')  show(current - 1);
      else if (e.key === 'ArrowRight') show(current + 1);
    });
  }
})();
