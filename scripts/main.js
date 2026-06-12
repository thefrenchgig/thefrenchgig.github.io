(() => {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  // --- Footer year ---------------------------------------------------------
  const yearEl = $('#year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // --- Next Events ----------------------------------------------------------
  // Loads events.json (managed via /admin/) and renders upcoming .event-card
  // markup. Past events (date < today) are filtered out automatically. If
  // nothing is upcoming, shows the #events-empty message instead.
  const renderEvents = async () => {
    const list = $('#events-list');
    const empty = $('#events-empty');
    if (!list) return;
    try {
      const res = await fetch('/events.json', { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const events = await res.json();

      const todayStr = new Date().toISOString().slice(0, 10);
      const upcoming = events
        .filter((ev) => ev.date >= todayStr)
        .sort((a, b) => a.date.localeCompare(b.date));

      if (upcoming.length === 0) {
        if (empty) empty.hidden = false;
        return;
      }

      upcoming.forEach((ev) => {
        const d = new Date(`${ev.date}T00:00:00`);
        const day = String(d.getDate()).padStart(2, '0');
        const month = d.toLocaleString('en-US', { month: 'short' }).toUpperCase();
        const year = d.getFullYear();

        const a = document.createElement('a');
        a.className = 'event-card';
        a.href = ev.url;
        a.target = '_blank';
        a.rel = 'noopener';
        a.setAttribute('aria-label', `${ev.title} – The French Gig, ${day} ${month} ${year} at ${ev.venue} — click for details`);

        const dateBlock = document.createElement('div');
        dateBlock.className = 'event-date-block';
        const spanDay = document.createElement('span');
        spanDay.className = 'event-day';
        spanDay.textContent = day;
        const spanMonth = document.createElement('span');
        spanMonth.className = 'event-month';
        spanMonth.textContent = month;
        const spanYear = document.createElement('span');
        spanYear.className = 'event-year';
        spanYear.textContent = String(year);
        dateBlock.append(spanDay, spanMonth, spanYear);

        const info = document.createElement('div');
        info.className = 'event-info';
        const venue = document.createElement('p');
        venue.className = 'event-venue';
        venue.textContent = ev.venue;
        const title = document.createElement('h3');
        title.className = 'event-title';
        title.textContent = ev.title;
        const subtitle = document.createElement('p');
        subtitle.className = 'event-subtitle';
        subtitle.textContent = ev.time ? `${ev.subtitle} · ${ev.time}` : ev.subtitle;
        const desc = document.createElement('p');
        desc.className = 'event-desc';
        desc.textContent = ev.description;
        info.append(venue, title, subtitle, desc);

        const arrow = document.createElement('span');
        arrow.className = 'event-arrow';
        arrow.setAttribute('aria-hidden', 'true');
        arrow.textContent = '→';

        a.append(dateBlock, info, arrow);
        list.appendChild(a);
      });
    } catch (err) {
      console.warn('[events] failed to load events.json:', err);
    }
  };
  renderEvents();

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
