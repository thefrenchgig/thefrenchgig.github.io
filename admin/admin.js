(() => {
  const $ = (sel, root = document) => root.querySelector(sel);

  // Paste the Cloudflare Worker URL here after deploying it — see
  // cloudflare-worker/README.md for setup instructions.
  const WORKER_URL = 'https://tfg-admin.thefrenchgig.workers.dev';

  const PW_KEY = 'tfg_admin_pw';

  const loginSection = $('#login-section');
  const loginForm = $('#login-form');
  const loginPasswordInput = $('#login-password');
  const loginError = $('#login-error');
  const dashboardSection = $('#dashboard-section');
  const logoutBtn = $('#logout-btn');
  const eventsListEl = $('#events-list');
  const addEventBtn = $('#add-event-btn');
  const eventForm = $('#event-form');
  const eventFormTitle = $('#event-form-title');
  const cancelEventBtn = $('#cancel-event-btn');
  const saveStatus = $('#save-status');

  let events = [];
  let editIndex = null;

  // --- Auth ------------------------------------------------------------------
  const getPassword = () => sessionStorage.getItem(PW_KEY);
  const setPassword = (pw) => sessionStorage.setItem(PW_KEY, pw);
  const clearPassword = () => sessionStorage.removeItem(PW_KEY);

  const showLogin = (message) => {
    dashboardSection.hidden = true;
    loginSection.hidden = false;
    if (message) {
      loginError.textContent = message;
      loginError.hidden = false;
    }
  };

  const showDashboard = () => {
    loginSection.hidden = true;
    dashboardSection.hidden = false;
    loadEvents();
  };

  if (getPassword()) showDashboard();

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const pw = loginPasswordInput.value.trim();
    if (!pw) return;
    loginError.hidden = true;

    if (!WORKER_URL) {
      setPassword(pw);
      showDashboard();
      return;
    }

    const submitBtn = loginForm.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;
    try {
      const res = await fetch(WORKER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pw, action: 'verify' }),
      });
      if (res.status === 401) {
        loginError.textContent = 'Incorrect password.';
        loginError.hidden = false;
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setPassword(pw);
      showDashboard();
    } catch (err) {
      loginError.textContent = 'Could not verify password — check your connection and try again.';
      loginError.hidden = false;
      console.error('[admin] login verify failed:', err);
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  });

  logoutBtn.addEventListener('click', () => {
    clearPassword();
    loginPasswordInput.value = '';
    showLogin();
  });

  // --- Load events -------------------------------------------------------------
  const loadEvents = async () => {
    try {
      const res = await fetch('/events.json', { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      events = await res.json();
      renderEventsList();
    } catch (err) {
      eventsListEl.textContent = 'Could not load events.json.';
      console.error('[admin] failed to load events.json:', err);
    }
  };

  // --- Render admin list ---------------------------------------------------------
  const renderEventsList = () => {
    eventsListEl.innerHTML = '';
    const todayStr = new Date().toISOString().slice(0, 10);
    const sorted = events
      .map((ev, i) => ({ ev, i }))
      .sort((a, b) => a.ev.date.localeCompare(b.ev.date));

    if (sorted.length === 0) {
      const p = document.createElement('p');
      p.className = 'section-lede';
      p.textContent = 'No events yet — add one below.';
      eventsListEl.appendChild(p);
      return;
    }

    sorted.forEach(({ ev, i }) => {
      const item = document.createElement('div');
      item.className = 'admin-event-item';
      if (ev.date < todayStr) item.classList.add('is-past');

      const info = document.createElement('div');
      info.className = 'admin-event-item-info';

      const dateP = document.createElement('p');
      dateP.className = 'admin-event-item-date';
      const d = new Date(`${ev.date}T00:00:00`);
      const dateLabel = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      dateP.textContent = ev.time ? `${dateLabel} · ${ev.time}` : dateLabel;

      const titleP = document.createElement('p');
      titleP.className = 'admin-event-item-title';
      titleP.textContent = `${ev.title} — ${ev.venue}`;

      info.append(dateP, titleP);

      const actions = document.createElement('div');
      actions.className = 'admin-event-item-actions';

      const editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.className = 'btn btn-ghost';
      editBtn.textContent = 'Edit';
      editBtn.addEventListener('click', () => openForm(i));

      const delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'btn btn-ghost';
      delBtn.textContent = 'Delete';
      delBtn.addEventListener('click', () => deleteEvent(i));

      actions.append(editBtn, delBtn);
      item.append(info, actions);
      eventsListEl.appendChild(item);
    });
  };

  // --- Add/Edit form -----------------------------------------------------------
  const openForm = (index) => {
    editIndex = index;
    eventForm.reset();
    if (index === null) {
      eventFormTitle.textContent = 'Add new event';
    } else {
      const ev = events[index];
      eventFormTitle.textContent = 'Edit event';
      $('#event-date').value = ev.date || '';
      $('#event-time').value = ev.time || '';
      $('#event-title-input').value = ev.title || '';
      $('#event-venue').value = ev.venue || '';
      $('#event-subtitle').value = ev.subtitle || '';
      $('#event-description').value = ev.description || '';
      $('#event-url').value = ev.url || '';
    }
    eventForm.hidden = false;
    eventForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const closeForm = () => {
    eventForm.hidden = true;
    eventForm.reset();
    editIndex = null;
  };

  addEventBtn.addEventListener('click', () => openForm(null));
  cancelEventBtn.addEventListener('click', closeForm);

  eventForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const updated = {
      date: $('#event-date').value,
      time: $('#event-time').value,
      title: $('#event-title-input').value.trim(),
      venue: $('#event-venue').value.trim(),
      subtitle: $('#event-subtitle').value.trim(),
      description: $('#event-description').value.trim(),
      url: $('#event-url').value.trim(),
    };
    if (editIndex === null) {
      events.push(updated);
    } else {
      events[editIndex] = updated;
    }
    saveAll();
  });

  const deleteEvent = (index) => {
    const ev = events[index];
    if (!confirm(`Delete "${ev.title}"? This cannot be undone.`)) return;
    events.splice(index, 1);
    saveAll();
  };

  // --- Save to GitHub via Cloudflare Worker -----------------------------------------
  const showStatus = (message, type) => {
    saveStatus.textContent = message;
    saveStatus.className = `admin-message${type ? ` admin-message-${type}` : ''}`;
    saveStatus.hidden = false;
  };

  const saveAll = async () => {
    if (!WORKER_URL) {
      showStatus('Admin server not configured yet — see cloudflare-worker/README.md to finish setup.', 'error');
      return;
    }
    showStatus('Saving…');
    try {
      const res = await fetch(WORKER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: getPassword(), events }),
      });

      if (res.status === 401) {
        clearPassword();
        showLogin('Incorrect password. Please log in again.');
        return;
      }

      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || `HTTP ${res.status}`);

      showStatus('Saved! Changes will be live in about a minute.', 'success');
      closeForm();
      renderEventsList();
    } catch (err) {
      showStatus(`Could not save: ${err.message}`, 'error');
      console.error('[admin] save failed:', err);
    }
  };
})();
