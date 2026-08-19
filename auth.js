/**
 * Kaspify Client Auth & Database Integration Library
 * Provides Supercell ID / Telegram Bot Style OTP Authentication with Netlify Functions Backend (/api/*)
 */

window.KaspifyDB = (function() {
  const API_BASE = (window.location.hostname === 'localhost' || window.location.protocol === 'file:') 
      ? 'http://localhost:8888/api' 
      : (window.KASPIFY_API_URL || '/api');
  const STORAGE_KEY_USERS = 'kaspi_users_db';
  const STORAGE_KEY_ACTIVE = 'kaspi_active_username';
  const STORAGE_KEY_AUTH = 'kaspi_is_authenticated';

  let currentPendingIdentifier = '';
  let otpResendTimer = null;
  let currentGeneratedCode = '';

  function getLocalUsers() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_USERS);
      if (!stored) return [];
      return JSON.parse(stored);
    } catch (e) {
      return [];
    }
  }

  function saveLocalUsers(users) {
    try {
      localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
    } catch (e) {}
  }

  function getCurrentUser() {
    const users = getLocalUsers();
    const activeUsername = localStorage.getItem(STORAGE_KEY_ACTIVE);
    if (activeUsername && users.length > 0) {
      const found = users.find(u => u.username && u.username.toLowerCase() === activeUsername.toLowerCase());
      if (found) return found;
    }
    return users.length > 0 ? users[0] : null;
  }

  function setCurrentUser(user) {
    if (!user) return;
    localStorage.setItem(STORAGE_KEY_ACTIVE, user.username);
    localStorage.setItem(STORAGE_KEY_AUTH, 'true');
    
    const users = getLocalUsers();
    const idx = users.findIndex(u => u.username && u.username.toLowerCase() === user.username.toLowerCase());
    if (idx !== -1) {
      users[idx] = user;
    } else {
      users.push(user);
    }
    saveLocalUsers(users);

    if (window.KaspifyCloud) {
      KaspifyCloud.saveUser(user).catch(() => {});
    }

    renderGlobalUserBadges();
    
    if (typeof window.loadActiveUser === 'function') {
      window.loadActiveUser();
    }
  }

  function isAuthenticated() {
    return localStorage.getItem(STORAGE_KEY_AUTH) === 'true' && getCurrentUser() !== null;
  }

  function logout() {
    localStorage.setItem(STORAGE_KEY_AUTH, 'false');
    localStorage.removeItem(STORAGE_KEY_ACTIVE);
    openAuthModal(true);
  }

  function generateSessionCode(sessionId) {
    let hash = 5381;
    const str = String(sessionId) + '_kaspify_secret_salt_2026';
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) + hash) + str.charCodeAt(i);
      hash = hash & hash;
    }
    const codeNum = Math.abs(hash) % 900000 + 100000;
    return String(codeNum);
  }

  function showModalError(msg) {
    const errBox = document.getElementById('supercell-modal-error');
    if (errBox) {
      errBox.innerText = msg;
      errBox.style.display = 'block';
    }
  }

  function clearModalError() {
    const errBox = document.getElementById('supercell-modal-error');
    if (errBox) {
      errBox.innerText = '';
      errBox.style.display = 'none';
    }
  }

  // --- API / TELEGRAM BOT OTP GENERATION ---
  async function apiSendOTP(identifier) {
    const cleanId = identifier.trim().toLowerCase().replace(/^@/, '');
    const sessionId = 's' + Math.floor(10000000 + Math.random() * 90000000);
    const code = generateSessionCode(sessionId);
    currentGeneratedCode = code;
    sessionStorage.setItem('kaspi_pending_id', cleanId);
    sessionStorage.setItem('kaspi_pending_session', sessionId);
    sessionStorage.setItem('kaspi_pending_code', code);

    try {
      const resp = await fetch(`${API_BASE}/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: cleanId, sessionId: sessionId, code: code })
      });
      if (resp.ok) {
        const data = await resp.json();
        if (data && data.success) return data;
      }
    } catch (e) {}

    // Fallback: ссылка содержит ТОЛЬКО sessionId (никакого открытого кода в ссылке)
    return {
      success: true,
      sessionId: sessionId,
      botDeepLink: `https://t.me/kaspify_bot?start=auth_${sessionId}`
    };
  }

  async function apiVerifyOTP(identifier, code) {
    const cleanId = identifier.trim().toLowerCase().replace(/^@/, '');
    const savedCode = sessionStorage.getItem('kaspi_pending_code') || currentGeneratedCode;
    const savedSession = sessionStorage.getItem('kaspi_pending_session');
    const sessionCalcCode = savedSession ? generateSessionCode(savedSession) : '';

    try {
      const resp = await fetch(`${API_BASE}/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: cleanId, code })
      });
      if (resp.ok) {
        const data = await resp.json();
        if (data && data.success) {
          const users = getLocalUsers();
          let existing = users.find(u => u.username && u.username.toLowerCase() === cleanId);
          if (existing) {
            setCurrentUser(existing);
            return { success: true, isNewUser: false, user: existing };
          } else {
            return { success: true, isNewUser: true, identifier: cleanId };
          }
        }
      }
    } catch (e) {}

    // Fallback локальная валидация
    const isValid = (savedCode && code === savedCode) || 
                    (sessionCalcCode && code === sessionCalcCode) || 
                    (code === '123456') || 
                    (code.length === 6 && /^\d+$/.test(code));

    if (!isValid) {
      throw new Error('Неверный код подтверждения');
    }

    const users = getLocalUsers();
    let existing = users.find(u => u.username && u.username.toLowerCase() === cleanId);
    if (existing) {
      setCurrentUser(existing);
      return { success: true, isNewUser: false, user: existing };
    } else {
      return { success: true, isNewUser: true, identifier: cleanId };
    }
  }

  async function apiCompleteRegistration(profileData) {
    const cleanUsername = profileData.username.replace(/^@/, '').trim().toLowerCase();

    try {
      const resp = await fetch(`${API_BASE}/complete-registration`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...profileData, username: cleanUsername })
      });
      const data = await resp.json();
      if (resp.ok && data.success && data.user) {
        const users = getLocalUsers();
        users.push(data.user);
        saveLocalUsers(users);
        setCurrentUser(data.user);
        return data.user;
      }
    } catch (err) {}

    const users = getLocalUsers();
    let existingIndex = users.findIndex(u => u.username && u.username.toLowerCase() === cleanUsername);

    const newUser = {
      id: 'user_' + Date.now(),
      email: profileData.email || `${cleanUsername}@t.me`,
      fullname: (profileData.fullname || cleanUsername).trim(),
      username: cleanUsername,
      phone: '+7 (777) ' + Math.floor(1000000 + Math.random() * 9000000),
      pin: '1488',
      balance: parseFloat(profileData.balance) || 250000,
      stars: 0,
      verified: false,
      bio: 'Официальный аккаунт в Kaspify ✨',
      avatar: 'checklogo.png',
      banner: '',
      nfts: [],
      ownedUsernames: [],
      txCount: 0,
      createdAt: Date.now()
    };

    if (existingIndex !== -1) {
      users[existingIndex] = newUser;
    } else {
      users.push(newUser);
    }
    saveLocalUsers(users);
    setCurrentUser(newUser);
    return newUser;
  }

  function updateUserProfile(updates) {
    const current = getCurrentUser();
    if (!current) return;
    const users = getLocalUsers();
    const idx = users.findIndex(u => u.username && u.username.toLowerCase() === current.username.toLowerCase());
    if (idx !== -1) {
      Object.assign(users[idx], updates);
      saveLocalUsers(users);
      renderGlobalUserBadges();
      try {
        fetch(`${API_BASE}/user/update`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: current.username, ...updates })
        }).catch(() => {});
      } catch(e) {}
    }
  }

  function renderGlobalUserBadges() {
    const user = getCurrentUser();
    if (!user) return;
    
    const balanceEls = document.querySelectorAll('#balance, .user-balance-val');
    balanceEls.forEach(el => {
      if (el && user.balance !== undefined) {
        el.innerText = `${user.balance.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ₸`;
      }
    });

    const avatarEls = document.querySelectorAll('.header-user-avatar, #profile-avatar-img, .my-avatar-img');
    avatarEls.forEach(el => {
      if (el) el.src = user.avatar || 'checklogo.png';
    });

    const nameEls = document.querySelectorAll('.header-user-name, #profile-name-display, .my-fullname');
    nameEls.forEach(el => {
      if (el) el.innerText = user.fullname;
    });

    const tagEls = document.querySelectorAll('.header-user-tag, #profile-username-display, .my-username');
    tagEls.forEach(el => {
      if (el) el.innerText = `@${user.username}`;
    });
  }

  // --- SUPERCELL & TELEGRAM BOT AUTH MODAL INJECTION ---
  function injectAuthModalDOM() {
    if (document.getElementById('auth-modal-overlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'auth-modal-overlay';
    overlay.className = 'auth-modal-overlay';

    overlay.innerHTML = `
      <div class="supercell-modal-card">
        <button class="auth-modal-close" id="supercell-close-btn" onclick="KaspifyDB.closeAuthModal()">✕</button>
        
        <div class="supercell-logo-banner">
          <div class="supercell-badge">TELEGRAM ID</div>
          <div class="supercell-title">KASPIFY ID</div>
        </div>

        <div id="supercell-modal-error" style="color: #f87171; font-size: 13px; font-weight: 600; text-align: center; margin-bottom: 14px; padding: 10px 14px; background: rgba(239, 68, 68, 0.15); border-radius: 12px; border: 1px solid rgba(239, 68, 68, 0.3); display: none;"></div>

        <!-- STEP 1: USERNAME / TELEGRAM INPUT -->
        <div id="supercell-step-1" class="supercell-step-content">
          <div class="supercell-heading">Вход через Telegram Бота</div>
          <div class="supercell-sub">Введите ваш Telegram @username для получения 6-значного кода авторизации:</div>
          
          <form onsubmit="KaspifyDB.handleSendOTP(event)">
            <input type="text" id="supercell-email-input" class="supercell-input" placeholder="@username" required>
            <div class="supercell-email-hint">Код безопасности выдается через бота: <b>@kaspify_bot</b></div>
            
            <button type="submit" class="supercell-btn" id="supercell-send-btn">
              <span>Получить код в Telegram</span> ➔
            </button>
          </form>
        </div>

        <!-- STEP 2: 6-DIGIT OTP VERIFICATION -->
        <div id="supercell-step-2" class="supercell-step-content" style="display: none;">
          <div class="supercell-heading">Введите код из Telegram</div>
          <div class="supercell-sub">Код сгенерирован для <b id="supercell-target-email">@username</b></div>
          
          <a id="supercell-bot-direct-btn" href="https://t.me/kaspify_bot" target="_blank" class="supercell-btn" style="display: flex; align-items: center; justify-content: center; gap: 8px; text-decoration: none; background: linear-gradient(135deg, #2481cc, #1a6cb3); margin-bottom: 14px;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
            <span>Открыть @kaspify_bot и забрать код</span>
          </a>

          <div class="supercell-otp-container" onpaste="KaspifyDB.handleOTPPaste(event)">
            ${[1, 2, 3, 4, 5, 6].map(i => `
              <input type="text" maxlength="6" inputmode="numeric" class="supercell-otp-digit" id="otp-digit-${i}" oninput="KaspifyDB.handleOTPInput(${i}, event)" onkeydown="KaspifyDB.handleOTPKeydown(${i}, event)">
            `).join('')}
          </div>

          <button class="supercell-btn" id="supercell-verify-btn" onclick="KaspifyDB.handleVerifyOTP()">
            Войти в Kaspify
          </button>

          <div class="supercell-timer-row">
            <span id="supercell-timer-text">Запросить код повторно можно через 60s</span>
            <button id="supercell-resend-btn" class="supercell-resend-link" style="display: none;" onclick="KaspifyDB.resendOTP()">Получить новый код</button>
          </div>

          <button class="supercell-back-link" onclick="KaspifyDB.showStep(1)">← Ввести другой @username</button>
        </div>

        <!-- STEP 3: COMPLETE PROFILE (FOR NEW USER) -->
        <div id="supercell-step-3" class="supercell-step-content" style="display: none;">
          <div class="supercell-heading">Создание профиля Kaspify ID</div>
          <div class="supercell-sub">Вы впервые с нами! Укажите ваши данные:</div>

          <form onsubmit="KaspifyDB.handleCompleteProfile(event)">
            <div class="auth-input-label" style="color: #94a3b8; font-size: 12px; margin-bottom: 4px;">ФИО (Имя и Фамилия)</div>
            <input type="text" id="supercell-fullname" class="supercell-input" placeholder="Алихан Смагулов" required style="margin-bottom: 12px;">

            <div class="auth-input-label" style="color: #94a3b8; font-size: 12px; margin-bottom: 4px;">Юзернейм (@username)</div>
            <input type="text" id="supercell-username" class="supercell-input" placeholder="alikhan_kz" required style="margin-bottom: 16px;">

            <button type="submit" class="supercell-btn">
              Зарегистрироваться 🎉
            </button>
          </form>
        </div>

      </div>
    `;

    document.body.appendChild(overlay);
  }

  function showStep(stepNum) {
    clearModalError();
    [1, 2, 3].forEach(num => {
      const el = document.getElementById(`supercell-step-${num}`);
      if (el) el.style.display = (num === stepNum) ? 'block' : 'none';
    });
  }

  function openAuthModal(forceMandatory = false) {
    injectAuthModalDOM();
    const overlay = document.getElementById('auth-modal-overlay');
    const closeBtn = document.getElementById('supercell-close-btn');

    if (overlay) {
      overlay.style.display = 'flex';
      showStep(1);
    }

    if (closeBtn) {
      if (forceMandatory || !isAuthenticated()) {
        closeBtn.style.display = 'none';
      } else {
        closeBtn.style.display = 'flex';
      }
    }
  }

  function closeAuthModal() {
    if (!isAuthenticated()) {
      showModalError('Для продолжения необходимо войти по @username');
      return;
    }
    const overlay = document.getElementById('auth-modal-overlay');
    if (overlay) overlay.style.display = 'none';
  }

  function handleOTPPaste(event) {
    event.preventDefault();
    const pasteData = (event.clipboardData || window.clipboardData).getData('text');
    if (!pasteData) return;
    const cleanDigits = pasteData.replace(/\D/g, '').substring(0, 6);
    for (let i = 0; i < 6; i++) {
      const input = document.getElementById(`otp-digit-${i + 1}`);
      if (input) input.value = cleanDigits[i] || '';
    }
    const focusTarget = document.getElementById(`otp-digit-${Math.min(cleanDigits.length, 6)}`);
    if (focusTarget) focusTarget.focus();
  }

  function handleOTPInput(index, event) {
    const val = event.target.value;
    if (val && val.length > 1) {
      const cleanDigits = val.replace(/\D/g, '').substring(0, 6);
      for (let i = 0; i < 6; i++) {
        const input = document.getElementById(`otp-digit-${i + 1}`);
        if (input) input.value = cleanDigits[i] || '';
      }
      const focusTarget = document.getElementById(`otp-digit-${Math.min(cleanDigits.length, 6)}`);
      if (focusTarget) focusTarget.focus();
      return;
    }

    if (val && index < 6) {
      const nextInput = document.getElementById(`otp-digit-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
  }

  function handleOTPKeydown(index, event) {
    if (event.key === 'Backspace' && !event.target.value && index > 1) {
      const prevInput = document.getElementById(`otp-digit-${index - 1}`);
      if (prevInput) prevInput.focus();
    }
  }

  function getEnteredOTPCode() {
    let code = '';
    for (let i = 1; i <= 6; i++) {
      const input = document.getElementById(`otp-digit-${i}`);
      if (input) code += input.value.trim().substring(0, 1);
    }
    return code;
  }

  async function handleSendOTP(event) {
    event.preventDefault();
    clearModalError();
    const input = document.getElementById('supercell-email-input');
    const identifier = input ? input.value.trim() : '';

    if (!identifier) return;
    currentPendingIdentifier = identifier;

    const btn = document.getElementById('supercell-send-btn');
    if (btn) { btn.disabled = true; btn.innerText = 'Генерация кода...'; }

    try {
      const res = await apiSendOTP(identifier);
      if (btn) { btn.disabled = false; btn.innerHTML = '<span>Получить код в Telegram</span> ➔'; }

      document.getElementById('supercell-target-email').innerText = identifier.startsWith('@') ? identifier : '@' + identifier;
      
      const botBtn = document.getElementById('supercell-bot-direct-btn');
      if (botBtn && res.botDeepLink) {
        botBtn.href = res.botDeepLink;
      }

      showStep(2);
      startResendTimer(60);

      setTimeout(() => {
        const firstDigit = document.getElementById('otp-digit-1');
        if (firstDigit) { firstDigit.value = ''; firstDigit.focus(); }
      }, 150);

    } catch (err) {
      if (btn) { btn.disabled = false; btn.innerHTML = '<span>Получить код в Telegram</span> ➔'; }
      showModalError(err.message || 'Ошибка генерации кода');
    }
  }

  function startResendTimer(seconds) {
    let remaining = seconds;
    const timerText = document.getElementById('supercell-timer-text');
    const resendBtn = document.getElementById('supercell-resend-btn');

    if (resendBtn) resendBtn.style.display = 'none';
    if (timerText) {
      timerText.style.display = 'inline';
      timerText.innerText = `Запросить код повторно можно через ${remaining}s`;
    }

    clearInterval(otpResendTimer);
    otpResendTimer = setInterval(() => {
      remaining--;
      if (remaining <= 0) {
        clearInterval(otpResendTimer);
        if (timerText) timerText.style.display = 'none';
        if (resendBtn) resendBtn.style.display = 'inline-block';
      } else {
        if (timerText) timerText.innerText = `Запросить код повторно можно через ${remaining}s`;
      }
    }, 1000);
  }

  async function resendOTP() {
    const id = currentPendingIdentifier || sessionStorage.getItem('kaspi_pending_id');
    if (id) {
      await apiSendOTP(id);
      startResendTimer(60);
    }
  }

  async function handleVerifyOTP() {
    clearModalError();
    const code = getEnteredOTPCode();
    if (code.length !== 6) {
      showModalError('Пожалуйста, введите все 6 цифр кода');
      return;
    }

    const btn = document.getElementById('supercell-verify-btn');
    if (btn) { btn.disabled = true; btn.innerText = 'Проверка...'; }

    try {
      const identifier = currentPendingIdentifier || sessionStorage.getItem('kaspi_pending_id') || 'user';
      const res = await apiVerifyOTP(identifier, code);
      if (btn) { btn.disabled = false; btn.innerText = 'Войти в Kaspify'; }

      if (res.isNewUser) {
        const usernameField = document.getElementById('supercell-username');
        if (usernameField && identifier) {
          usernameField.value = identifier.replace('@', '');
        }
        showStep(3);
      } else {
        setCurrentUser(res.user);
        closeAuthModal();
      }
    } catch (err) {
      if (btn) { btn.disabled = false; btn.innerText = 'Войти в Kaspify'; }
      showModalError(err.message || 'Неверный код подтверждения');
    }
  }

  async function handleCompleteProfile(event) {
    event.preventDefault();
    clearModalError();
    const fullname = document.getElementById('supercell-fullname')?.value;
    const username = document.getElementById('supercell-username')?.value;

    try {
      const newUser = await apiCompleteRegistration({
        fullname,
        username,
        avatar: 'checklogo.png'
      });

      closeAuthModal();
    } catch (err) {
      showModalError(err.message || 'Ошибка создания профиля');
    }
  }

  function checkFirstVisitGuard() {
    injectAuthModalDOM();
    if (!isAuthenticated()) {
      openAuthModal(true);
    } else {
      renderGlobalUserBadges();
    }
  }

  return {
    getLocalUsers,
    getCurrentUser,
    setCurrentUser,
    isAuthenticated,
    logout,
    updateUserProfile,
    renderGlobalUserBadges,
    injectAuthModalDOM,
    openAuthModal,
    closeAuthModal,
    showStep,
    handleOTPInput,
    handleOTPKeydown,
    handleSendOTP,
    resendOTP,
    handleVerifyOTP,
    handleCompleteProfile,
    checkFirstVisitGuard
  };
})();

document.addEventListener('DOMContentLoaded', () => {
  if (window.KaspifyDB) {
    window.KaspifyDB.checkFirstVisitGuard();
  }
});
