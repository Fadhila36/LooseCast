/**
 * StreamKit i18n + Sidebar + Hub Module
 * Include this script in every page: <script src="/stream-kit-ui.js"></script>
 * Then call: StreamKitUI.init('dashboard') or StreamKit.init('deck')
 */

const StreamKitUI = (() => {
  // SVG Icons
  const ICONS = {
    dashboard: `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>`,
    customdeck: `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.375 2.625a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4Z"/></svg>`,
    deck: `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>`,
    phone: `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect width="14" height="20" x="5" y="2" rx="2"/><path d="M12 18h.01"/></svg>`,
    obs: `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polygon points="23 7 16 12 23 17 23 7"/><rect width="15" height="14" x="1" y="5" rx="2" ry="2"/></svg>`,
    kd: `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>`,
    patreon: `<svg width="15" height="15" fill="currentColor" viewBox="0 0 24 24"><path d="M14.82 2.41c3.96 0 7.18 3.24 7.18 7.21 0 3.96-3.22 7.18-7.18 7.18-3.97 0-7.2-3.22-7.2-7.18 0-3.97 3.23-7.21 7.2-7.21M2 21.6h3.5V2.4H2V21.6z"/></svg>`,
    saweria: `<svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>`,
    topup: `<svg width="15" height="15" viewBox="0 0 530 530" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M327.337 199.224C339.692 182.592 348.102 160.936 348.102 138.877C348.102 92.5591 311.023 62 278.214 62C245.406 62 211.82 99.548 211.82 145.866C211.82 172.562 222.978 196.345 238.712 211.704C202.048 192.521 180.712 182.625 141.933 166.834C116.163 213.784 109.89 243.438 110.483 303.115C154.603 300.908 176.087 294.322 211.821 278.655C175.711 333.078 150.501 361.026 100 407.947C117.277 415.627 141.133 415.074 164.933 414.521C185.533 414.044 206.091 413.567 222.304 418.431C257.248 428.914 274.697 440.008 295.687 467.352C323.301 390.021 330.921 344.234 327.136 257.688C357.189 271.088 374.053 276.88 404.013 278.655C438.768 222.109 433.512 147.383 417.991 156.35C417.991 156.35 365.272 173.638 327.337 199.224Z" fill="currentColor"/></svg>`,
    trash: `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M9 6V4h6v2"/></svg>`,
    lang: `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1 4-10z"/></svg>`,
    facebook: `<svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>`,
    discord: `<svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.043.032.054a19.9 19.9 0 0 0 5.993 3.03.077.077 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/></svg>`,
    tiktok: `<svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.16 8.16 0 0 0 4.78 1.52V6.76a4.85 4.85 0 0 1-1.01-.07z"/></svg>`,
    instagram: `<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>`,
    youtube: `<svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 0 0-1.95 1.96A29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58A2.78 2.78 0 0 0 3.41 19.6C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.95A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z"/><polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" fill="white"/></svg>`,
    twitter: `<svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.747l7.73-8.835L1.254 2.25H8.08l4.259 5.631 5.905-5.631zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>`,
    contact: `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`,
    docs: `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><path d="M8 7h8M8 11h6"/></svg>`,
    settings: `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>`,
    profile: `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
    about: `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`,
    github: `<svg width="15" height="15" fill="currentColor" viewBox="0 0 24 24"><path fill-rule="evenodd" clip-rule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/></svg>`,
    globe: `<svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1 4-10z"/></svg>`,
    book: `<svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>`,
    refresh: `<svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>`,
    external: `<svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>`,
    chevronRight: `<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>`,
    arrowRight: `<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7"/></svg>`,
    code: `<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>`,
    gamepad: `<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="6" y1="12" x2="10" y2="12"/><line x1="8" y1="10" x2="8" y2="14"/><line x1="15" y1="13" x2="15.01" y2="13"/><line x1="18" y1="11" x2="18.01" y2="11"/><rect width="20" height="12" x="2" y="6" rx="6"/></svg>`,
    bolt: `<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
    video: `<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polygon points="23 7 16 12 23 17 23 7"/><rect width="15" height="14" x="1" y="5" rx="2" ry="2"/></svg>`,
    shield: `<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
  };

  // State
  let _lang = {};
  let _langCode = 'id';
  let _activePage = 'dashboard';
  const _listeners = [];
  const LANG_KEY = 'streamkit_lang';
  const LEGACY_LANG_KEY = 'ksk_lang';

  // Language loader
  async function loadLang(code) {
    try {
      const r = await fetch(`/lang/${code}.json?v=` + Date.now());
      if (!r.ok) throw new Error('not found');
      _lang = await r.json();
      _langCode = code;
      localStorage.setItem(LANG_KEY, code);
      localStorage.setItem(LEGACY_LANG_KEY, code);
    } catch {
      // fallback to id
      try {
        const r = await fetch('/lang/id.json?v=' + Date.now());
        _lang = await r.json();
        _langCode = 'id';
      } catch { }
    }
  }

  function t(key, fallback) {
    if (_lang && _lang[key] !== undefined) return _lang[key];
    return fallback !== undefined ? fallback : key;
  }

  function getLang() { return _langCode; }

  // Sidebar navigation
  function sidebarHTML() {
    const pages = [
      { key: 'dashboard', href: '/', label: t('nav_dashboard', 'Dashboard'), icon: ICONS.dashboard },
      { key: 'customdeck', href: '/customdeck.html', label: t('nav_custom_deck', 'Custom Deck'), icon: ICONS.customdeck },
      { key: 'deck', href: '/deck.html', label: t('nav_deck_view', 'Deck View'), icon: ICONS.deck },
    ];
    // Connect to phone — only on dashboard (calls JS function)
    const connectItem = _activePage === 'dashboard'
      ? `<a href="#" class="nav-item" onclick="closeSidebar();openConnect();return false;">${ICONS.phone}${t('nav_connect_phone', 'Hubungkan ke HP')}</a>`
      : '';
    const obsItem = `<a href="/obs.html" target="_blank" class="nav-item">${ICONS.obs}${t('nav_obs_overlay', 'OBS Overlay')}</a>`;

    const kdItem = _activePage === 'dashboard'
      ? `<a class="nav-item" onclick="closeSidebar();openKDSetup();return false;" style="cursor:pointer;">${ICONS.kd}${t('nav_kd_counter', 'K/D · W/L Counter')}</a>`
      : `<a href="/" class="nav-item">${ICONS.kd}${t('nav_kd_counter', 'K/D · W/L Counter')}</a>`;

    const docsItem = `<a href="#" class="nav-item" onclick="closeSidebar();StreamKitUI.openDocs();return false;" style="cursor:pointer;">${ICONS.docs}${t('nav_docs_guide', 'Panduan Penggunaan')}</a>`;

    const settingsItem = `<a href="#" class="nav-item" onclick="closeSidebar();StreamKitUI.openHub('settings');return false;" style="cursor:pointer;">${ICONS.settings}${t('hub_tab_settings', 'Pengaturan')}</a>`;
    const profileItem = `<a href="#" class="nav-item" onclick="closeSidebar();StreamKitUI.openHub('profile');return false;" style="cursor:pointer;">${ICONS.profile}${t('hub_tab_profile', 'Profil & Sistem')}</a>`;
    const aboutItem = `<a href="#" class="nav-item" onclick="closeSidebar();StreamKitUI.openHub('about');return false;" style="cursor:pointer;">${ICONS.about}${t('hub_tab_about', 'Tentang')}</a>`;

    const navLinks = pages.map(p =>
      `<a href="${p.href}" class="nav-item${_activePage === p.key ? ' active' : ''}">${p.icon}${p.label}</a>`
    ).join('');

    // Language switcher
    const langs = [
      { code: 'id', flag: '🇮🇩', name: 'Indonesia' },
      { code: 'en', flag: '🇬🇧', name: 'English' },
    ];
    const langBtns = langs.map(l =>
      `<button onclick="StreamKitUI.switchLang('${l.code}')"
        style="flex:1;padding:5px 4px;border-radius:5px;font-size:.58rem;font-weight:700;cursor:pointer;transition:all .15s;font-family:inherit;
          background:${_langCode === l.code ? 'var(--ac)' : 'var(--s3)'};
          color:${_langCode === l.code ? '#000' : 'var(--tx2)'};
          border:1px solid ${_langCode === l.code ? 'var(--ac)' : 'var(--bd2)'};
          ">${l.flag} ${l.name}</button>`
    ).join('');

    const langSection = `
      <div style="padding:10px 14px;border-top:1px solid var(--bd);">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">
          <span style="color:var(--tx3);display:flex;align-items:center;">${ICONS.lang.replace('16', '13').replace('height="16"', 'height="13"')}</span>
          <span style="font-size:.54rem;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--tx3);">${t('nav_language', 'Bahasa')}</span>
        </div>
        <div style="display:flex;gap:5px;">${langBtns}</div>
      </div>`;

    return `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:16px 16px 12px;border-bottom:1px solid var(--bd);">
        <div style="font-size:.72rem;font-weight:900;letter-spacing:1px;line-height:1.3;font-family:'Syne',sans-serif;">TOMATOSUKI<span style="color:var(--ac);display:block;">STREAM KIT AIO</span></div>
        <button onclick="closeSidebar()" style="background:none;border:1px solid var(--bd2);color:var(--tx2);width:26px;height:26px;border-radius:6px;cursor:pointer;font-size:.8rem;">✕</button>
      </div>
      <nav style="flex:1;padding:8px 0;overflow-y:auto;min-height:0;">
        ${navLinks}
        ${connectItem}
        ${obsItem}
        <div class="nav-sep"></div>
        <div style="padding:8px 18px 4px;font-size:.54rem;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--tx3);">${t('nav_more_tools', 'Alat Tambahan')}</div>
        ${kdItem}
        ${docsItem}
        <div class="nav-sep"></div>
        <div style="padding:8px 18px 4px;font-size:.54rem;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--tx3);">${t('hub_title', 'Stream Kit Hub')}</div>
        ${settingsItem}
        ${profileItem}
        ${aboutItem}
      </nav>
      <div style="flex-shrink:0;border-top:1px solid var(--bd);padding:14px 18px 10px;">
        <div style="font-size:.62rem;color:var(--tx3);display:flex;align-items:center;justify-content:space-between;">
          <span>© fadhila36</span>
          <a href="https://fadhilaabiyyu.my.id" target="_blank" style="color:var(--ac);text-decoration:none;font-weight:700;font-size:.62rem;">fadhilaabiyyu.my.id ↗</a>
        </div>
      </div>
      ${langSection}`;
  }

  // Sidebar injection
  function injectSidebar() {
    const aside = document.getElementById('sidebar');
    if (aside) aside.innerHTML = sidebarHTML();
    // Override active color for customdeck
    let styleEl = document.getElementById('streamkit-sidebar-accent') || document.getElementById('ksk-sidebar-accent');
    if (!styleEl) { 
      styleEl = document.createElement('style'); 
      styleEl.id = 'streamkit-sidebar-accent'; 
      document.head.appendChild(styleEl); 
    }
    const accentCSS = _activePage === 'customdeck'
      ? '.nav-item.active{color:#ef4444!important;}.nav-item.active::before{background:#ef4444!important;}'
      : '';
    // Scrollbar tipis untuk sidebar
    const scrollCSS = `
      #sidebar::-webkit-scrollbar{width:3px;}
      #sidebar::-webkit-scrollbar-track{background:transparent;}
      #sidebar::-webkit-scrollbar-thumb{background:var(--bd2);border-radius:3px;}
      #sidebar::-webkit-scrollbar-thumb:hover{background:var(--bd3);}
      #sidebar nav::-webkit-scrollbar{width:3px;}
      #sidebar nav::-webkit-scrollbar-track{background:transparent;}
      #sidebar nav::-webkit-scrollbar-thumb{background:var(--bd2);border-radius:3px;}
    `;
    styleEl.textContent = accentCSS + scrollCSS;
  }

  // Language switching
  async function switchLang(code, broadcast = true) {
    await loadLang(code);
    injectSidebar();
    applyPageStrings();

    // Trigger local listeners
    _listeners.forEach(fn => {
      try { fn(code, _lang); } catch (e) { console.error(e); }
    });

    window.dispatchEvent(new CustomEvent('streamkit-lang-changed', { detail: { lang: code, t } }));
    window.dispatchEvent(new CustomEvent('ksk-lang-changed', { detail: { lang: code, t } }));

    if (broadcast) {
      try {
        const bc = new BroadcastChannel('streamkit');
        bc.postMessage({ type: 'streamkit_lang_changed', lang: code });
      } catch { }
      try {
        const legacyBc = new BroadcastChannel('ksk');
        legacyBc.postMessage({ type: 'ksk_lang_changed', lang: code });
      } catch { }
    }
  }

  function onLangChange(fn) {
    if (typeof fn === 'function') _listeners.push(fn);
  }

  // DOM internationalization
  function applyPageStrings() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      const val = t(key);
      if ((el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') && el.placeholder !== undefined) {
        el.placeholder = val;
      } else {
        el.innerHTML = val;
      }
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      el.placeholder = t(el.getAttribute('data-i18n-placeholder'));
    });
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
      el.title = t(el.getAttribute('data-i18n-title'));
    });
  }

  // Cross-tab broadcast listener
  try {
    const bc = new BroadcastChannel('streamkit');
    bc.onmessage = (e) => {
      if (e.data && (e.data.type === 'streamkit_lang_changed' || e.data.type === 'ksk_lang_changed') && e.data.lang !== _langCode) {
        switchLang(e.data.lang, false);
      }
    };
    const legacyBc = new BroadcastChannel('ksk');
    legacyBc.onmessage = (e) => {
      if (e.data && e.data.type === 'ksk_lang_changed' && e.data.lang !== _langCode) {
        switchLang(e.data.lang, false);
      }
    };
  } catch { }

  // Documentation modal
  function injectDocsModal() {
    if (document.getElementById('streamkit-docs-overlay') || document.getElementById('ksk-docs-overlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'streamkit-docs-overlay';
    overlay.className = 'overlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.75);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);z-index:999;display:none;align-items:center;justify-content:center;padding:16px;';
    overlay.innerHTML = `
      <div class="panel" style="max-width:680px;width:100%;max-height:85vh;background:var(--bg2,#121420);border:1px solid var(--bd2,rgba(255,255,255,.12));border-radius:12px;display:flex;flex-direction:column;box-shadow:0 12px 40px rgba(0,0,0,.6);overflow:hidden;">
        <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 18px;border-bottom:1px solid var(--bd,rgba(255,255,255,.08));background:var(--panel,#161826);">
          <div style="display:flex;align-items:center;gap:8px;font-size:.85rem;font-weight:900;letter-spacing:.5px;">
            <span style="color:var(--ac,#38bdf8);display:flex;">${ICONS.docs}</span>
            <span data-i18n="docs_title">Buku Panduan & Dokumentasi Stream Kit</span>
          </div>
          <button onclick="StreamKitUI.closeDocs()" style="background:none;border:1px solid var(--bd2,rgba(255,255,255,.12));color:var(--tx2,#cbd5e1);width:26px;height:26px;border-radius:6px;cursor:pointer;font-size:.8rem;transition:all .15s;">✕</button>
        </div>
        <div style="display:flex;border-bottom:1px solid var(--bd,rgba(255,255,255,.08));background:var(--s3,rgba(255,255,255,.03));overflow-x:auto;scrollbar-width:none;gap:4px;padding:6px 12px;" id="streamkit-docs-tabs">
          <button class="doc-tab-btn active" onclick="StreamKitUI.switchDocTab('start', this)" style="padding:6px 12px;border-radius:6px;font-size:.65rem;font-weight:800;border:none;cursor:pointer;background:var(--ac,#38bdf8);color:#000;white-space:nowrap;">🚀 Quick Start</button>
          <button class="doc-tab-btn" onclick="StreamKitUI.switchDocTab('obs', this)" style="padding:6px 12px;border-radius:6px;font-size:.65rem;font-weight:800;border:none;cursor:pointer;background:transparent;color:var(--tx2,#94a3b8);white-space:nowrap;">🎬 OBS Studio</button>
          <button class="doc-tab-btn" onclick="StreamKitUI.switchDocTab('macro', this)" style="padding:6px 12px;border-radius:6px;font-size:.65rem;font-weight:800;border:none;cursor:pointer;background:transparent;color:var(--tx2,#94a3b8);white-space:nowrap;">⚡ Multi-Action Macros</button>
          <button class="doc-tab-btn" onclick="StreamKitUI.switchDocTab('pwa', this)" style="padding:6px 12px;border-radius:6px;font-size:.65rem;font-weight:800;border:none;cursor:pointer;background:transparent;color:var(--tx2,#94a3b8);white-space:nowrap;">📱 PWA Remote HP</button>
          <button class="doc-tab-btn" onclick="StreamKitUI.switchDocTab('counter', this)" style="padding:6px 12px;border-radius:6px;font-size:.65rem;font-weight:800;border:none;cursor:pointer;background:transparent;color:var(--tx2,#94a3b8);white-space:nowrap;">🔢 Stream Counters</button>
        </div>
        <div style="flex:1;overflow-y:auto;padding:18px;font-size:.74rem;line-height:1.6;color:var(--tx2,#cbd5e1);" id="streamkit-docs-body">
          ${getDocContent('start')}
        </div>
        <div style="padding:10px 18px;border-top:1px solid var(--bd,rgba(255,255,255,.08));background:var(--panel,#161826);display:flex;justify-content:space-between;align-items:center;">
          <span style="font-size:.58rem;color:var(--tx3,#64748b);">Tomatosuki Stream Kit AIO · 100% Offline Standalone</span>
          <button onclick="StreamKitUI.closeDocs()" style="background:var(--ac,#38bdf8);color:#000;border:none;padding:5px 14px;border-radius:6px;font-size:.68rem;font-weight:800;cursor:pointer;">Tutup</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
  }

  function getDocContent(tab) {
    const activePort = window.location.port || _hubState.port || 3000;
    const overlayUrl = `${window.location.protocol}//${window.location.hostname || 'localhost'}${activePort ? ':' + activePort : ''}/obs.html`;

    if (tab === 'start') {
      return `
        <h3 style="color:#fff;font-size:.9rem;margin-top:0;margin-bottom:8px;">🚀 Panduan Memulai Cepat (Quick Start)</h3>
        <p>Tomatosuki Stream Kit AIO bekerja dengan menghubungkan browser source transparan di OBS Studio ke controller Deck.</p>
        <div style="display:flex;flex-direction:column;gap:10px;margin-top:12px;">
          <div style="background:rgba(255,255,255,.03);border:1px solid var(--bd,rgba(255,255,255,.08));border-radius:8px;padding:10px 14px;">
            <b style="color:var(--ac,#38bdf8);">Langkah 1: Pasang Browser Source di OBS</b>
            <div style="margin-top:4px;font-size:.68rem;">Buka OBS Studio ➔ Tambah Source <b>Browser</b> ➔ Masukkan URL: <code style="background:#000;padding:2px 6px;border-radius:4px;color:#38bdf8;">${overlayUrl}</code> (Ukuran: 1920×1080).</div>
          </div>
          <div style="background:rgba(255,255,255,.03);border:1px solid var(--bd,rgba(255,255,255,.08));border-radius:8px;padding:10px 14px;">
            <b style="color:var(--ac,#38bdf8);">Langkah 2: Buka Deck Controller</b>
            <div style="margin-top:4px;font-size:.68rem;">Akses <a href="/deck.html" style="color:#38bdf8;font-weight:700;">Deck View</a> di PC Anda, atau scan QR Code dari menu <b>Hubungkan ke HP</b> untuk mengontrol live dari smartphone/tablet Anda.</div>
          </div>
          <div style="background:rgba(255,255,255,.03);border:1px solid var(--bd,rgba(255,255,255,.08));border-radius:8px;padding:10px 14px;">
            <b style="color:var(--ac,#38bdf8);">Langkah 3: Upload & Trigger Meme</b>
            <div style="margin-top:4px;font-size:.68rem;">Upload video/audio meme di <a href="/customdeck.html" style="color:#38bdf8;font-weight:700;">Custom Deck</a>, atur green screen / chroma key jika perlu, lalu tekan tombol di Deck untuk live playback seketika!</div>
          </div>
        </div>
      `;
    } else if (tab === 'obs') {
      return `
        <h3 style="color:#fff;font-size:.9rem;margin-top:0;margin-bottom:8px;">🎬 Integrasi OBS Studio WebSocket v5</h3>
        <p>Kontrol langsung OBS Studio tanpa perlu software pihak ketiga seperti Elgato atau Touch Portal.</p>
        <ul style="padding-left:18px;margin-top:8px;display:flex;flex-direction:column;gap:8px;font-size:.7rem;">
          <li><b>Cara Mengaktifkan Server OBS:</b> Di OBS Studio, buka menu <b>Tools > WebSocket Server Settings</b> ➔ Centang <i>"Enable WebSocket server"</i> ➔ Atur Port ke <code style="color:#38bdf8;">4455</code>.</li>
          <li><b>Scene Switcher Ribbon:</b> Pindah scene OBS (Starting Soon, Live Gameplay, BRB, Ending) hanya dengan satu kali klik di strip atas Deck.</li>
          <li><b>Source & Audio Toggles:</b> Klik tombol <b>SOURCES & AUDIO</b> di strip OBS untuk mematikan/menyalakan webcam, overlay visual, atau me-mute mikrofon seketika.</li>
        </ul>
      `;
    } else if (tab === 'macro') {
      return `
        <h3 style="color:#fff;font-size:.9rem;margin-top:0;margin-bottom:8px;">⚡ Multi-Action Macros</h3>
        <p>Jalankan beberapa aksi broadcast sekaligus hanya dengan satu tombol deck.</p>
        <div style="background:rgba(255,255,255,.03);border:1px solid var(--bd,rgba(255,255,255,.08));border-radius:8px;padding:12px;margin-top:10px;font-size:.7rem;">
          <b style="color:#38bdf8;">Contoh Alur Macro Kemenangan:</b>
          <ol style="padding-left:18px;margin-top:6px;display:flex;flex-direction:column;gap:4px;">
            <li>🎬 <b>Ganti Scene OBS:</b> Pindah ke scene kamera fullscreen.</li>
            <li>🎵 <b>Putar Media Meme:</b> Tampilkan meme victory animation lengkap dengan lagunya.</li>
            <li>✨ <b>Trigger Layar FX:</b> Ledakkan efek <i>Confetti</i> di layar stream.</li>
            <li>🏆 <b>Ubah Counter:</b> Tambahkan skor Win/Victory +1 ke text source OBS.</li>
          </ol>
        </div>
      `;
    } else if (tab === 'pwa') {
      return `
        <h3 style="color:#fff;font-size:.9rem;margin-top:0;margin-bottom:8px;">📱 Install PWA Standalone di Smartphone / Tablet</h3>
        <p>Ubah HP atau iPad lama Anda menjadi Touch Stream Deck fisik nirkabel tanpa instalasi aplikasi luar.</p>
        <div style="display:flex;flex-direction:column;gap:8px;margin-top:10px;font-size:.7rem;">
          <div style="background:rgba(255,255,255,.03);padding:10px;border-radius:6px;border:1px solid var(--bd,rgba(255,255,255,.08));">
            <b style="color:#22c55e;">Android (Chrome / Samsung Internet):</b> Buka link scan QR ➔ Tekan menu titik tiga (⋮) ➔ Pilih <b>"Install app"</b> atau <b>"Add to Home screen"</b>.
          </div>
          <div style="background:rgba(255,255,255,.03);padding:10px;border-radius:6px;border:1px solid var(--bd,rgba(255,255,255,.08));">
            <b style="color:#38bdf8;">iPhone / iPad (Safari):</b> Buka link scan QR ➔ Tekan tombol <b>Share (Ikon Kotak Panah Atas)</b> ➔ Pilih <b>"Add to Home Screen"</b>.
          </div>
        </div>
      `;
    } else if (tab === 'counter') {
      return `
        <h3 style="color:#fff;font-size:.9rem;margin-top:0;margin-bottom:8px;">🔢 K/D, W/L & Live Text Counters</h3>
        <p>Sistem counter otomatis menyimpan angka ke file teks murni di folder <code style="color:#38bdf8;">assets/text/*.txt</code>.</p>
        <ol style="padding-left:18px;margin-top:8px;font-size:.7rem;display:flex;flex-direction:column;gap:6px;">
          <li>Buka OBS Studio ➔ Tambah Source <b>Text (GDI+)</b>.</li>
          <li>Centang opsi <b>"Read from file"</b> ➔ Klik <i>Browse</i> ➔ Pilih file teks (misal: <code style="color:#38bdf8;">assets/text/Kill.txt</code>).</li>
          <li>Setiap kali tombol counter di Deck ditekan (+1 / -1 / Reset), angka di layar OBS akan langsung terupdate secara *real-time*!</li>
        </ol>
      `;
    }
    return '';
  }

  function openDocs() {
    injectDocsModal();
    const overlay = document.getElementById('streamkit-docs-overlay') || document.getElementById('ksk-docs-overlay');
    if (overlay) overlay.style.display = 'flex';
  }

  function closeDocs() {
    const overlay = document.getElementById('streamkit-docs-overlay') || document.getElementById('ksk-docs-overlay');
    if (overlay) overlay.style.display = 'none';
  }

  function switchDocTab(tab, btn) {
    const tabsContainer = document.getElementById('streamkit-docs-tabs') || document.getElementById('ksk-docs-tabs');
    if (tabsContainer) {
      tabsContainer.querySelectorAll('.doc-tab-btn').forEach(b => {
        b.style.background = 'transparent';
        b.style.color = 'var(--tx2,#94a3b8)';
      });
    }
    if (btn) {
      btn.style.background = 'var(--ac,#38bdf8)';
      btn.style.color = '#000';
    }
    const body = document.getElementById('streamkit-docs-body') || document.getElementById('ksk-docs-body');
    if (body) body.innerHTML = getDocContent(tab);
  }

  // Hub modal state
  let _hubState = {
    ip: '127.0.0.1',
    port: 3000,
    activeTab: 'settings',
    config: {},
    stats: { totalTriggers: 0 },
    mediaCount: 0,
    mediaSize: 0,
    obsStatus: { connected: false, currentScene: null, config: { ip: '127.0.0.1', port: 4455 } },
    shortcutsEnabled: false
  };

  const getElectronBridge = () => window.streamKitElectron || window.kskElectron;

  async function loadHubData() {
    try {
      const [ipRes, statsRes, mediaRes, obsRes] = await Promise.all([
        fetch('/api/local-ip').then(r => r.json()).catch(() => ({ ip: '127.0.0.1', port: 3000 })),
        fetch('/api/stats').then(r => r.json()).catch(() => ({ totalTriggers: 0 })),
        fetch('/api/media').then(r => r.json()).catch(() => []),
        fetch('/api/obs/status').then(r => r.json()).catch(() => ({ connected: false }))
      ]);

      _hubState.ip = ipRes.ip || '127.0.0.1';
      _hubState.port = ipRes.port || 3000;
      _hubState.stats = statsRes;
      _hubState.mediaCount = Array.isArray(mediaRes) ? mediaRes.length : 0;
      let totalBytes = 0;
      if (Array.isArray(mediaRes)) mediaRes.forEach(m => totalBytes += (m.size || 0));
      _hubState.mediaSize = totalBytes;
      _hubState.obsStatus = obsRes || { connected: false };

      const bridge = getElectronBridge();
      if (bridge && bridge.getConfig) {
        _hubState.config = await bridge.getConfig() || {};
      } else {
        const cfgRes = await fetch('/api/app-settings').then(r => r.json()).catch(() => ({}));
        _hubState.config = cfgRes;
      }
      _hubState.shortcutsEnabled = localStorage.getItem('shortcuts_enabled') === 'true';
    } catch (e) {
      console.warn('[StreamKit Hub] loadHubData warning:', e);
    }
  }

  function getHubContent(tab) {
    _hubState.activeTab = tab || 'settings';
    const isElectron = !!getElectronBridge();
    const mediaSizeFormatted = _hubState.mediaSize > 1048576 
      ? (_hubState.mediaSize / 1048576).toFixed(1) + ' MB' 
      : (_hubState.mediaSize / 1024).toFixed(0) + ' KB';
    const isObsConn = !!_hubState.obsStatus.connected;

    if (tab === 'settings') {
      return `
        <div class="hub-section-title">${t('settings_assets_title', 'Folder Assets & Penyimpanan')}</div>
        <div class="hub-card">
          <div style="font-size:0.72rem;color:var(--tx2);margin-bottom:8px;line-height:1.5;">${t('settings_assets_desc', 'Lokasi penyimpanan file meme & audio.')}</div>
          <div id="hub-assets-path" style="font-size:0.68rem;font-family:'JetBrains Mono',monospace;color:var(--tx1);background:rgba(0,0,0,0.4);border:1px solid var(--bd);border-radius:8px;padding:9px 12px;word-break:break-all;margin-bottom:10px;">
            ${_hubState.config.assetsDir || '(Default: User AppData)'}
          </div>
          <button onclick="StreamKitUI.chooseAssetsFolder()" style="background:rgba(255,255,255,0.06);border:1px solid var(--bd2);color:var(--tx1);padding:7px 13px;border-radius:7px;font-size:0.72rem;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:7px;transition:all 0.15s;">
            <span>${ICONS.customdeck}</span> <span>${t('settings_choose_folder_btn', 'Pilih Folder Baru')}</span>
          </button>
        </div>

        <div class="hub-section-title">${t('settings_backup_title', 'Backup & Restore Data')}</div>
        <div class="hub-card">
          <div style="font-size:0.72rem;color:var(--tx2);margin-bottom:12px;line-height:1.5;">${t('settings_backup_desc', 'Backup seluruh media, counter, macro, dan konfigurasi ke arsip .zip.')}</div>
          <div style="display:flex;gap:10px;flex-wrap:wrap;">
            <button onclick="StreamKitUI.doBackup()" id="hub-backup-btn" style="background:rgba(255,255,255,0.06);border:1px solid var(--bd2);color:var(--tx1);padding:7px 14px;border-radius:7px;font-size:0.72rem;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:7px;transition:all 0.15s;">
              <span>${ICONS.arrowRight}</span> <span>${t('settings_backup_btn', 'Backup Data')}</span>
            </button>
            <button onclick="document.getElementById('hub-restore-file').click()" id="hub-restore-btn" style="background:rgba(255,255,255,0.06);border:1px solid var(--bd2);color:var(--tx1);padding:7px 14px;border-radius:7px;font-size:0.72rem;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:7px;transition:all 0.15s;">
              <span>${ICONS.refresh}</span> <span>${t('settings_restore_btn', 'Restore Data')}</span>
            </button>
            <input type="file" id="hub-restore-file" accept=".zip" style="display:none" onchange="StreamKitUI.doRestore(this.files[0])">
          </div>
          <div id="hub-backup-status" style="font-size:0.68rem;color:var(--tx3);margin-top:10px;display:none;line-height:1.4;"></div>
        </div>

        <div class="hub-section-title">${t('settings_general_title', 'Pengaturan Umum')}</div>
        <div class="hub-card">
          <div style="display:flex;align-items:center;justify-content:space-between;padding-bottom:12px;border-bottom:1px solid var(--bd);margin-bottom:12px;">
            <div>
              <div style="font-size:0.78rem;font-weight:600;color:var(--tx1);">${t('settings_lang_label', 'Bahasa Antarmuka')}</div>
              <div style="font-size:0.64rem;color:var(--tx3);margin-top:2px;">Pilihan bahasa tampilan aplikasi</div>
            </div>
            <div style="display:flex;gap:5px;background:rgba(0,0,0,0.3);padding:3px;border-radius:8px;border:1px solid var(--bd);">
              <button onclick="StreamKitUI.switchLang('id')" style="padding:4px 10px;border-radius:6px;font-size:0.68rem;font-weight:700;cursor:pointer;background:${_langCode === 'id' ? 'rgba(255,255,255,0.12)' : 'transparent'};color:${_langCode === 'id' ? '#fff' : 'var(--tx3)'};border:none;transition:all 0.15s;">ID</button>
              <button onclick="StreamKitUI.switchLang('en')" style="padding:4px 10px;border-radius:6px;font-size:0.68rem;font-weight:700;cursor:pointer;background:${_langCode === 'en' ? 'rgba(255,255,255,0.12)' : 'transparent'};color:${_langCode === 'en' ? '#fff' : 'var(--tx3)'};border:none;transition:all 0.15s;">EN</button>
            </div>
          </div>
          <div style="display:flex;align-items:center;justify-content:space-between;">
            <div>
              <div style="font-size:0.78rem;font-weight:600;color:var(--tx1);">${t('settings_shortcuts_toggle', 'Mode Shortcut Global (Hotkey)')}</div>
              <div style="font-size:0.64rem;color:var(--tx3);margin-top:2px;">Picu soundboard & counter via tombol keyboard fisik</div>
            </div>
            <button onclick="StreamKitUI.toggleShortcutFromHub()" id="hub-sc-toggle-btn" style="padding:5px 12px;border-radius:6px;font-size:0.68rem;font-weight:700;cursor:pointer;background:${_hubState.shortcutsEnabled ? 'rgba(34,197,94,0.12)' : 'rgba(255,255,255,0.04)'};color:${_hubState.shortcutsEnabled ? '#22c55e' : 'var(--tx3)'};border:1px solid ${_hubState.shortcutsEnabled ? 'rgba(34,197,94,0.3)' : 'var(--bd)'};transition:all 0.15s;">
              ${_hubState.shortcutsEnabled ? 'AKTIF' : 'NONAKTIF'}
            </button>
          </div>
        </div>
      `;
    } else if (tab === 'profile') {
      return `
        <div class="hub-section-title">${t('profile_account_title', 'Identitas Streamer & Workspace')}</div>
        <div class="hub-card">
          <div style="display:flex;align-items:center;gap:14px;margin-bottom:14px;">
            <div style="width:40px;height:40px;border-radius:10px;background:rgba(255,255,255,0.06);border:1px solid var(--bd2);display:flex;align-items:center;justify-content:center;color:var(--tx1);font-size:0.9rem;font-weight:800;">
              TS
            </div>
            <div>
              <div style="font-size:0.9rem;font-weight:700;color:var(--tx1);">Tomatosuki Streamer</div>
              <div style="font-size:0.66rem;color:var(--tx3);margin-top:2px;">Broadcast Workspace</div>
            </div>
          </div>
          <div class="hub-info-grid">
            <div class="hub-info-item">
              <div class="hub-info-label">${t('profile_total_memes', 'Total Meme Terpasang')}</div>
              <div class="hub-info-value">${_hubState.mediaCount} Media</div>
            </div>
            <div class="hub-info-item">
              <div class="hub-info-label">${t('profile_storage_used', 'Kapasitas Media')}</div>
              <div class="hub-info-value">${mediaSizeFormatted}</div>
            </div>
            <div class="hub-info-item">
              <div class="hub-info-label">${t('profile_total_triggers', 'Total Live Triggers')}</div>
              <div class="hub-info-value mono">${(_hubState.stats.totalTriggers || 0).toLocaleString()}</div>
            </div>
          </div>
        </div>

        <div class="hub-section-title">${t('profile_device_title', 'Informasi Perangkat & Jaringan')}</div>
        <div class="hub-card">
          <div class="hub-info-grid">
            <div class="hub-info-item">
              <div class="hub-info-label">${t('profile_connection_ip', 'IP Interface Lokal')}</div>
              <div class="hub-info-value mono">${_hubState.ip}</div>
            </div>
            <div class="hub-info-item">
              <div class="hub-info-label">${t('profile_server_port', 'Port Server')}</div>
              <div class="hub-info-value mono">${_hubState.port}</div>
            </div>
            <div class="hub-info-item">
              <div class="hub-info-label">${t('profile_runtime_mode', 'Mode Runtime')}</div>
              <div class="hub-info-value">${isElectron ? 'Desktop App (Electron)' : 'Web Browser'}</div>
            </div>
            <div class="hub-info-item">
              <div class="hub-info-label">${t('profile_platform_os', 'Platform')}</div>
              <div class="hub-info-value">${navigator.platform || 'Windows / Web'}</div>
            </div>
          </div>
        </div>

        <div class="hub-section-title">${t('profile_obs_status_title', 'Status OBS WebSocket')}</div>
        <div class="hub-card">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
            <div style="display:flex;align-items:center;gap:8px;">
              <div style="width:8px;height:8px;border-radius:50%;background:${isObsConn ? '#22c55e' : '#64748b'};"></div>
              <span style="font-size:0.78rem;font-weight:600;color:var(--tx1);">${isObsConn ? 'OBS Terhubung' : 'OBS Offline'}</span>
            </div>
            <span style="font-size:0.68rem;color:var(--tx3);font-family:'JetBrains Mono',monospace;">ws://${_hubState.obsStatus.config?.ip || '127.0.0.1'}:${_hubState.obsStatus.config?.port || 4455}</span>
          </div>
          ${isObsConn ? `<div style="font-size:0.72rem;color:var(--tx2);">Scene Aktif: <b style="color:#fff;">${_hubState.obsStatus.currentScene || 'None'}</b></div>` : `<div style="font-size:0.68rem;color:var(--tx3);">Nyalakan WebSocket server di OBS Studio pada menu Tools > WebSocket Server Settings.</div>`}
        </div>
      `;
    } else if (tab === 'about') {
      return `
        <div class="hub-section-title">${t('about_title', 'Tentang Aplikasi')}</div>
        <div class="hub-card">
          <div class="hub-card-header">
            <div>
              <div style="font-size:0.92rem;font-weight:700;color:var(--tx1);">Tomatosuki Stream Kit AIO</div>
              <div style="font-size:0.68rem;color:var(--tx3);margin-top:3px;">Meme Overlay, Smart Deck & OBS Controller Suite</div>
            </div>
            <div style="display:flex;align-items:center;gap:8px;">
              <span class="mono" style="font-size:0.72rem;background:rgba(255,255,255,0.05);border:1px solid var(--bd2);padding:4px 8px;border-radius:6px;color:var(--tx2);">v0.0.1</span>
              <button onclick="StreamKitUI.checkForUpdates(this)" id="hub-check-update-btn" class="hub-action-btn">
                <span class="hub-btn-icon">${ICONS.refresh}</span> <span>${t('about_check_update_btn', 'Periksa Pembaruan')}</span>
              </button>
            </div>
          </div>
        </div>

        <div class="hub-section-title">${t('about_credits_title', 'Kredit & Tim Pengembang')}</div>
        <div class="hub-card" style="display:flex;flex-direction:column;gap:10px;">
          <div class="hub-person-row">
            <div style="display:flex;align-items:center;gap:12px;">
              <div class="hub-avatar">
                ${ICONS.code}
              </div>
              <div>
                <div style="font-size:0.82rem;font-weight:600;color:var(--tx1);">Muhammad Fadhila Abiyyu Faris</div>
                <div style="font-size:0.66rem;color:var(--tx3);margin-top:2px;">${t('about_dev_role', 'Lead Developer & Creator')}</div>
              </div>
            </div>
            <div style="display:flex;align-items:center;gap:6px;">
              <a href="https://www.instagram.com/fadhila36/" target="_blank" rel="noopener noreferrer" class="hub-social-pill">
                ${ICONS.instagram} <span>@fadhila36</span>
              </a>
            </div>
          </div>

          <div class="hub-person-row">
            <div style="display:flex;align-items:center;gap:12px;">
              <div class="hub-avatar">
                ${ICONS.gamepad}
              </div>
              <div>
                <div style="font-size:0.82rem;font-weight:600;color:var(--tx1);">Ians Wijaya</div>
                <div style="font-size:0.66rem;color:var(--tx3);margin-top:2px;">${t('about_tester_role', 'Beta Tester & Content Creator')}</div>
              </div>
            </div>
            <div style="display:flex;align-items:center;gap:6px;">
              <a href="https://www.instagram.com/iansssst/" target="_blank" rel="noopener noreferrer" class="hub-social-pill">
                ${ICONS.instagram} <span>@iansssst</span>
              </a>
              <a href="https://www.youtube.com/@yanssst" target="_blank" rel="noopener noreferrer" class="hub-social-pill">
                ${ICONS.youtube} <span>@yanssst</span>
              </a>
            </div>
          </div>
        </div>

        <div class="hub-section-title">Dokumentasi & Tautan Resmi</div>
        <div style="display:flex;flex-direction:column;gap:6px;margin-bottom:14px;">
          <a href="https://fadhilaabiyyu.my.id" target="_blank" rel="noopener noreferrer" class="hub-row-link">
            <div style="display:flex;align-items:center;gap:10px;">
              <span class="hub-link-icon">${ICONS.globe}</span>
              <span>${t('about_official_web', 'Situs Web Resmi (fadhilaabiyyu.my.id)')}</span>
            </div>
            <span class="hub-link-arrow">${ICONS.external}</span>
          </a>
          <a href="https://github.com/Fadhila36/Tomatosuki-Stream-kit-AIO" target="_blank" rel="noopener noreferrer" class="hub-row-link">
            <div style="display:flex;align-items:center;gap:10px;">
              <span class="hub-link-icon">${ICONS.github}</span>
              <span>${t('about_github_repo', 'Repository GitHub & Rilis')}</span>
            </div>
            <span class="hub-link-arrow">${ICONS.external}</span>
          </a>
          <a href="#" onclick="StreamKitUI.openDocs();return false;" class="hub-row-link">
            <div style="display:flex;align-items:center;gap:10px;">
              <span class="hub-link-icon">${ICONS.book}</span>
              <span>${t('nav_docs_guide', 'Panduan Penggunaan & Tutorial')}</span>
            </div>
            <span class="hub-link-arrow">${ICONS.chevronRight}</span>
          </a>
        </div>

        <div class="hub-section-title">Teknologi & Keunggulan Arsitektur</div>
        <div class="hub-card" style="display:flex;flex-direction:column;gap:10px;">
          <div style="display:flex;align-items:flex-start;gap:12px;">
            <div class="hub-feature-icon">${ICONS.bolt}</div>
            <div>
              <div style="font-size:0.76rem;font-weight:600;color:var(--tx1);">${t('about_feat1_title', 'Hardware-Accelerated Overlay')}</div>
              <div style="font-size:0.66rem;color:var(--tx3);margin-top:2px;">${t('about_feat1_desc', 'Rendering video meme, soundboard, dan visual FX dengan latensi ultra rendah.')}</div>
            </div>
          </div>
          <div style="display:flex;align-items:flex-start;gap:12px;">
            <div class="hub-feature-icon">${ICONS.video}</div>
            <div>
              <div style="font-size:0.76rem;font-weight:600;color:var(--tx1);">${t('about_feat2_title', 'OBS WebSocket v5 Direct Control')}</div>
              <div style="font-size:0.66rem;color:var(--tx3);margin-top:2px;">${t('about_feat2_desc', 'Kendali langsung scene switcher, visibilitas source, dan mute audio tanpa lag.')}</div>
            </div>
          </div>
          <div style="display:flex;align-items:flex-start;gap:12px;">
            <div class="hub-feature-icon">${ICONS.shield}</div>
            <div>
              <div style="font-size:0.76rem;font-weight:600;color:var(--tx1);">${t('about_feat3_title', 'Atomic Data Integrity')}</div>
              <div style="font-size:0.66rem;color:var(--tx3);margin-top:2px;">${t('about_feat3_desc', 'Penyimpanan data lokal yang aman dari korupsi file saat listrik padam atau crash.')}</div>
            </div>
          </div>
        </div>
      `;
    }
    return '';
  }

  function injectHubModal() {
    if (document.getElementById('streamkit-hub-overlay') || document.getElementById('ksk-hub-overlay')) return;
    const modalEl = document.createElement('div');
    modalEl.id = 'streamkit-hub-overlay';
    modalEl.className = 'hub-overlay';
    modalEl.onclick = (e) => { if (e.target === modalEl) closeHub(); };

    modalEl.innerHTML = `
      <div class="hub-modal" onclick="event.stopPropagation()">
        <div class="hub-header">
          <div style="display:flex;align-items:center;gap:10px;">
            <div style="width:30px;height:30px;border-radius:8px;background:var(--ac-dim);border:1px solid rgba(56,189,248,0.3);display:flex;align-items:center;justify-content:center;color:var(--ac);">
              ${ICONS.settings}
            </div>
            <div style="font-size:0.95rem;font-weight:800;font-family:'Syne',sans-serif;" id="hub-modal-title">Stream Kit Hub</div>
          </div>
          <button onclick="StreamKitUI.closeHub()" style="background:none;border:1px solid var(--bd2);color:var(--tx2);width:28px;height:28px;border-radius:8px;cursor:pointer;font-size:0.85rem;display:flex;align-items:center;justify-content:center;">✕</button>
        </div>
        <div class="hub-tabs" id="streamkit-hub-tabs">
          <button class="hub-tab-btn active" onclick="StreamKitUI.switchHubTab('settings', this)">
            ${ICONS.settings} <span>${t('hub_tab_settings', 'Settings')}</span>
          </button>
          <button class="hub-tab-btn" onclick="StreamKitUI.switchHubTab('profile', this)">
            ${ICONS.profile} <span>${t('hub_tab_profile', 'Profile')}</span>
          </button>
          <button class="hub-tab-btn" onclick="StreamKitUI.switchHubTab('about', this)">
            ${ICONS.about} <span>${t('hub_tab_about', 'About')}</span>
          </button>
        </div>
        <div class="hub-body" id="streamkit-hub-body">
          ${getHubContent('settings')}
        </div>
      </div>
    `;
    document.body.appendChild(modalEl);
  }

  async function openHub(tab = 'settings') {
    injectHubModal();
    await loadHubData();
    const overlay = document.getElementById('streamkit-hub-overlay') || document.getElementById('ksk-hub-overlay');
    if (overlay) overlay.classList.add('open');
    
    // Switch to target tab
    const tabsContainer = document.getElementById('streamkit-hub-tabs') || document.getElementById('ksk-hub-tabs');
    if (tabsContainer) {
      const tabs = tabsContainer.querySelectorAll('.hub-tab-btn');
      if (tab === 'settings' && tabs[0]) switchHubTab('settings', tabs[0]);
      else if (tab === 'profile' && tabs[1]) switchHubTab('profile', tabs[1]);
      else if (tab === 'about' && tabs[2]) switchHubTab('about', tabs[2]);
    }
  }

  function closeHub() {
    const overlay = document.getElementById('streamkit-hub-overlay') || document.getElementById('ksk-hub-overlay');
    if (overlay) overlay.classList.remove('open');
  }

  function switchHubTab(tab, btn) {
    const tabsContainer = document.getElementById('streamkit-hub-tabs') || document.getElementById('ksk-hub-tabs');
    if (tabsContainer) {
      tabsContainer.querySelectorAll('.hub-tab-btn').forEach(b => b.classList.remove('active'));
    }
    if (btn) btn.classList.add('active');
    const body = document.getElementById('streamkit-hub-body') || document.getElementById('ksk-hub-body');
    if (body) body.innerHTML = getHubContent(tab);
  }

  async function chooseAssetsFolder() {
    const bridge = getElectronBridge();
    if (!bridge) {
      alert('Pilihan folder aset kustom hanya tersedia di aplikasi Desktop Electron.');
      return;
    }
    try {
      const folder = await bridge.chooseFolder();
      if (!folder) return;
      const cfg = await bridge.getConfig() || {};
      cfg.assetsDir = folder;
      await bridge.saveConfig(cfg);
      _hubState.config.assetsDir = folder;
      const pEl = document.getElementById('hub-assets-path');
      if (pEl) pEl.textContent = folder;
      alert('Folder aset berhasil diubah! Silakan restart aplikasi untuk memuat folder baru.');
    } catch (e) {
      alert('Gagal memilih folder: ' + e.message);
    }
  }

  async function doBackup() {
    const btn = document.getElementById('hub-backup-btn');
    const st = document.getElementById('hub-backup-status');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Memproses...'; }
    if (st) { st.style.display = 'block'; st.style.color = 'var(--ac)'; st.textContent = 'Membuat file arsip backup .zip...'; }

    try {
      const r = await fetch('/api/backup');
      if (!r.ok) throw new Error('Backup failed');
      const blob = await r.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Tomatosuki-Backup-' + new Date().toISOString().slice(0, 10) + '.zip';
      document.body.appendChild(a);
      a.click();
      a.remove();
      if (st) { st.style.color = '#22c55e'; st.textContent = '✅ File backup berhasil diunduh!'; }
    } catch (e) {
      if (st) { st.style.color = '#ef4444'; st.textContent = '❌ Gagal membuat backup: ' + e.message; }
    } finally {
      if (btn) { btn.disabled = false; btn.innerHTML = '<span>⬇</span> <span>Backup Data</span>'; }
    }
  }

  async function doRestore(file) {
    if (!file) return;
    if (!confirm('Apakah Anda yakin ingin me-restore data ini? Semua file dan konfigurasi akan diperbarui.')) return;
    const st = document.getElementById('hub-backup-status');
    if (st) { st.style.display = 'block'; st.style.color = 'var(--ac)'; st.textContent = 'Mengunggah dan mengekstrak file restore...'; }

    const form = new FormData();
    form.append('backup', file);
    try {
      const r = await fetch('/api/restore', { method: 'POST', body: form });
      const d = await r.json();
      if (d.ok) {
        const count = Array.isArray(d.restoredFiles) ? d.restoredFiles.length : (typeof d.restoredCount === 'number' ? d.restoredCount : 0);
        if (st) { st.style.color = '#22c55e'; st.textContent = `✅ Berhasil me-restore ${count} file database!`; }
        setTimeout(() => location.reload(), 1500);
      } else {
        if (st) { st.style.color = '#ef4444'; st.textContent = '❌ Restore gagal: ' + (d.error || 'Unknown error'); }
      }
    } catch (e) {
      if (st) { st.style.color = '#ef4444'; st.textContent = '❌ Restore error: ' + e.message; }
    }
  }

  function toggleShortcutFromHub() {
    _hubState.shortcutsEnabled = !_hubState.shortcutsEnabled;
    localStorage.setItem('shortcuts_enabled', String(_hubState.shortcutsEnabled));
    const bridge = getElectronBridge();
    if (bridge && bridge.setShortcutEnabled) {
      bridge.setShortcutEnabled(_hubState.shortcutsEnabled);
    }
    const btn = document.getElementById('hub-sc-toggle-btn');
    if (btn) {
      btn.style.background = _hubState.shortcutsEnabled ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.06)';
      btn.style.color = _hubState.shortcutsEnabled ? '#22c55e' : 'var(--tx3)';
      btn.style.borderColor = _hubState.shortcutsEnabled ? 'rgba(34,197,94,0.4)' : 'var(--bd)';
      btn.textContent = _hubState.shortcutsEnabled ? '● AKTIF' : '○ NONAKTIF';
    }
  }

  function showToast(message, type = 'info') {
    const existing = document.querySelector('.hub-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'hub-toast';
    const icon = type === 'success' ? ICONS.shield : ICONS.globe;
    toast.innerHTML = `<span style="color:${type === 'success' ? '#22c55e' : 'var(--ac,#38bdf8)'};display:flex;">${icon}</span><span>${message}</span>`;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(8px)';
      setTimeout(() => toast.remove(), 250);
    }, 3500);
  }

  async function checkForUpdates(btn) {
    if (!btn) btn = document.getElementById('hub-check-update-btn');
    const icon = btn ? btn.querySelector('.hub-btn-icon') : null;
    const textSpan = btn ? btn.querySelector('span:last-child') : null;
    const originalText = textSpan ? textSpan.textContent : t('about_check_update_btn', 'Periksa Pembaruan');

    if (btn) {
      btn.disabled = true;
      if (icon) icon.classList.add('spin');
      if (textSpan) textSpan.textContent = t('about_checking_update', 'Memeriksa...');
    }

    try {
      const bridge = getElectronBridge();
      if (bridge && bridge.checkForUpdates) {
        bridge.checkForUpdates();
      }

      // Check against GitHub API
      const res = await fetch('https://api.github.com/repos/Fadhila36/Tomatosuki-Stream-kit-AIO/releases/latest', {
        headers: { 'Accept': 'application/vnd.github.v3+json' },
      }).catch(() => null);

      let isLatest = true;
      let latestTag = 'v0.0.1';

      if (res && res.ok) {
        const release = await res.json();
        latestTag = release.tag_name || release.name || 'v0.0.1';
        const currentVer = '0.0.1';
        if (latestTag.replace(/^v/, '') !== currentVer && !latestTag.includes(currentVer)) {
          isLatest = false;
        }
      }

      if (isLatest) {
        showToast(`${t('about_up_to_date', 'Tomatosuki Stream Kit AIO sudah menggunakan versi terbaru')} (${latestTag})`, 'success');
      } else {
        showToast(`${t('about_update_available', 'Versi baru')} ${latestTag} ${t('about_update_available_suffix', 'tersedia!')}`, 'info');
      }
    } catch {
      showToast(`${t('about_up_to_date', 'Tomatosuki Stream Kit AIO sudah menggunakan versi terbaru')} (v0.0.1)`, 'success');
    } finally {
      setTimeout(() => {
        if (btn) {
          btn.disabled = false;
          if (icon) icon.classList.remove('spin');
          if (textSpan) textSpan.textContent = originalText;
        }
      }, 600);
    }
  }

  // Module initialization
  async function init(activePage) {
    _activePage = activePage || 'dashboard';
    const saved = localStorage.getItem(LANG_KEY) || localStorage.getItem(LEGACY_LANG_KEY) || 'id';
    await loadLang(saved);
    injectSidebar();
    injectDocsModal();
    injectHubModal();
    applyPageStrings();
  }

  return {
    init,
    switchLang,
    t,
    getLang,
    applyPageStrings,
    onLangChange,
    openDocs,
    closeDocs,
    switchDocTab,
    openHub,
    closeHub,
    switchHubTab,
    openSettings: () => openHub('settings'),
    openProfile: () => openHub('profile'),
    openAbout: () => openHub('about'),
    chooseAssetsFolder,
    doBackup,
    doRestore,
    toggleShortcutFromHub,
    checkForUpdates,
    showToast
  };
})();

// Global Window Aliases for complete interoperability
window.StreamKitUI = StreamKitUI;
window.StreamKit = StreamKitUI;
window.KSK = StreamKitUI;

if (!window.openProfile) window.openProfile = () => StreamKitUI.openProfile();
if (!window.openAbout) window.openAbout = () => StreamKitUI.openAbout();
if (!window.openHub) window.openHub = (tab) => StreamKitUI.openHub(tab);
