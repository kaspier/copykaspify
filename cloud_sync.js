/**
 * Kaspify Cloud Sync — Глобальная синхронизация постов, пользователей, P2P маркета и юзернеймов
 * Работает 24/7 через Telegram Bot API и GitHub CDN
 */
window.KaspifyCloud = (function() {
  const BOT_TOKEN = '8745809636:AAHG-CU-SIlM1otpXPv5b21Lu11YUacabuY';
  const ADMIN_ID = 8283038522;
  const RAW_DB_URL = 'https://raw.githubusercontent.com/kaspier/kaspify/main/users_db.json';
  const API_BASE = (window.location.hostname === 'localhost' || window.location.protocol === 'file:') 
      ? 'http://localhost:8888/api' 
      : (window.location.hostname.includes('onrender.com') ? '/api' : 'https://copykaspify.onrender.com/api');

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
      console.warn('[CloudSync] Network offline / error:', e.message);
    }
    if (!cachedDB) {
      try {
        cachedDB = {
          users: JSON.parse(localStorage.getItem('kaspi_users_db') || '[]'),
          posts: JSON.parse(localStorage.getItem('kaspi_kaspify_posts') || '[]'),
          p2p: JSON.parse(localStorage.getItem('kaspi_p2p_market') || '[]'),
          usernames: JSON.parse(localStorage.getItem('kaspi_usernames_market') || '[]'),
          online: {}
        };
      } catch(err) {
        cachedDB = { users: [], posts: [], p2p: [], usernames: [], online: {} };
      }
    }
    return cachedDB;
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
    try {
      const resp = await fetch(`${API_BASE}/users`);
      if (resp.ok) {
        const data = await resp.json();
        if (data && data.users && Array.isArray(data.users) && data.users.length > 0) {
          return data.users;
        }
      }
    } catch(e) {}
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
    try {
      await fetch(`${API_BASE}/user/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user)
      });
    } catch(e) {}
    await sendSyncMessage({ type: 'REGISTER_USER', user });
  }

  // === ПОСТЫ ===
  async function getPosts() {
    try {
      const resp = await fetch(`${API_BASE}/posts`);
      if (resp.ok) {
        const data = await resp.json();
        if (data && data.posts && Array.isArray(data.posts) && data.posts.length > 0) {
          return data.posts;
        }
      }
    } catch(e) {}
    const db = await fetchDB();
    return db.posts || [];
  }

  async function addPost(post) {
    if (!post) return;
    try {
      await fetch(`${API_BASE}/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(post)
      });
    } catch(e) {}
    if (!cachedDB) cachedDB = { users: [], posts: [], p2p: [], usernames: [], online: {} };
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

  // === P2P МАРКЕТ NFT ===
  async function getP2P() {
    const db = await fetchDB();
    return db.p2p || [];
  }

  async function listP2pItem(item) {
    if (!item) return;
    if (!cachedDB) cachedDB = { users: [], posts: [], p2p: [], usernames: [], online: {} };
    if (!cachedDB.p2p) cachedDB.p2p = [];
    cachedDB.p2p = cachedDB.p2p.filter(x => x.id !== item.id);
    cachedDB.p2p.unshift(item);
    await sendSyncMessage({ type: 'P2P_LIST', item });
  }

  async function delistP2pItem(id) {
    if (!id) return;
    if (cachedDB && cachedDB.p2p) {
      cachedDB.p2p = cachedDB.p2p.filter(x => x.id !== id);
    }
    await sendSyncMessage({ type: 'P2P_DELIST', id });
  }

  async function buyP2pItem(id, buyer) {
    if (!id || !buyer) return;
    if (cachedDB && cachedDB.p2p) {
      cachedDB.p2p = cachedDB.p2p.filter(x => x.id !== id);
    }
    await sendSyncMessage({ type: 'P2P_BUY', id, buyer });
  }

  // === МАРКЕТ ЮЗЕРНЕЙМОВ ===
  async function getUsernames() {
    const db = await fetchDB();
    return db.usernames || [];
  }

  async function buyUsername(handle, buyer) {
    if (!handle || !buyer) return;
    const clean = handle.toLowerCase().replace(/^@/, '');
    if (cachedDB && cachedDB.usernames) {
      cachedDB.usernames = cachedDB.usernames.filter(x => x.handle !== clean);
    }
    await sendSyncMessage({ type: 'USERNAME_BUY', handle: clean, buyer });
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
    getP2P, listP2pItem, delistP2pItem, buyP2pItem,
    getUsernames, buyUsername,
    heartbeat, getOnlineUsers
  };
})();
