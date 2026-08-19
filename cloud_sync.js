/**
 * Kaspify Cloud Sync — Глобальная синхронизация постов, пользователей и онлайна
 * Работает 24/7 через Telegram Bot API и GitHub CDN
 */
window.KaspifyCloud = (function() {
  const BOT_TOKEN = '8745809636:AAHG-CU-SIlM1otpXPv5b21Lu11YUacabuY';
  const ADMIN_ID = 8283038522;
  const RAW_DB_URL = 'https://raw.githubusercontent.com/kaspier/kaspify/main/users_db.json';

  let cachedDB = null;
  let lastFetch = 0;
  const CACHE_TTL = 3000;

  // === ЧТЕНИЕ ЕДИНОЙ ОБЛАЧНОЙ БАЗЫ ДАННЫХ ===
  async function fetchDB(force) {
    if (!force && cachedDB && (Date.now() - lastFetch < CACHE_TTL)) {
      return cachedDB;
    }
    try {
      const resp = await fetch(`${RAW_DB_URL}?t=${Date.now()}`, { cache: 'no-store' });
      if (resp.ok) {
        cachedDB = await resp.json();
        lastFetch = Date.now();
        return cachedDB;
      }
    } catch (e) {
      console.warn('[CloudSync] Fetch DB error:', e.message);
    }
    return cachedDB || { users: [], posts: [], online: {} };
  }

  // === ОТПРАВКА СИНХРОНИЗАЦИОННОГО СООБЩЕНИЯ В БОТ ===
  async function sendSyncMessage(payload) {
    try {
      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: ADMIN_ID,
          text: `[KASPIFY_SYNC]\n${JSON.stringify(payload)}`
        })
      });
    } catch (e) {}
  }

  // === ПОЛЬЗОВАТЕЛИ ===
  async function getUsers() {
    const db = await fetchDB();
    return db.users || [];
  }

  async function getUser(username) {
    const clean = (username || '').toLowerCase().replace(/^@/, '');
    const users = await getUsers();
    return users.find(u => u.username && u.username.toLowerCase() === clean) || null;
  }

  async function saveUser(user) {
    if (!user || !user.username) return;
    await sendSyncMessage({ type: 'REGISTER_USER', user });
  }

  // === ПОСТЫ ===
  async function getPosts() {
    const db = await fetchDB();
    return db.posts || [];
  }

  async function addPost(post) {
    if (!post) return;
    // Оптимистичное локальное обновление в памяти
    if (!cachedDB) cachedDB = { users: [], posts: [], online: {} };
    if (!cachedDB.posts) cachedDB.posts = [];
    if (!cachedDB.posts.some(p => p.id === post.id)) {
      cachedDB.posts.unshift(post);
    }
    await sendSyncMessage({ type: 'NEW_POST', post });
  }

  async function toggleLike(postId, username) {
    if (!postId || !username) return;
    await sendSyncMessage({ type: 'LIKE_POST', postId, username });
  }

  // === ОНЛАЙН СИНХРОНИЗАЦИЯ (HEARTBEAT) ===
  async function heartbeat(username) {
    const clean = (username || '').toLowerCase().replace(/^@/, '');
    if (!clean) return;
    const now = Date.now();
    if (window._lastHeartbeat && (now - window._lastHeartbeat < 15000)) return;
    window._lastHeartbeat = now;
    await sendSyncMessage({ type: 'HEARTBEAT', username: clean, timestamp: now });
  }

  async function getOnlineUsers() {
    const db = await fetchDB();
    const online = db.online || {};
    const now = Date.now();
    return Object.keys(online).filter(k => now - online[k] < 3 * 60 * 1000);
  }

  return {
    fetchDB,
    getUsers, getUser, saveUser,
    getPosts, addPost, toggleLike,
    heartbeat, getOnlineUsers
  };
})();
