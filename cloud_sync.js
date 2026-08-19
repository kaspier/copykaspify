/**
 * Kaspify Cloud Sync — Синхронизация данных через GitHub Contents API
 * Работает 24/7, не зависит от запущенного сервера!
 * Все пользователи читают/пишут один файл cloud_db.json в репозитории.
 */
window.KaspifyCloud = (function() {
  const GH_TOKEN = atob('Z2hwX2JpOHJCa09JeUpaZDRCNk1JcElTcW5tTzJQZXJHQTBYMU4xOQ==');
  const GH_REPO = 'kaspier/kaspify';
  const DB_FILE = 'cloud_db.json';
  const API_URL = `https://api.github.com/repos/${GH_REPO}/contents/${DB_FILE}`;

  let cachedDB = null;
  let cachedSHA = null;
  let lastFetch = 0;
  const CACHE_TTL = 3000; // 3 секунды кэш

  // === ЧТЕНИЕ БАЗЫ ===
  async function fetchDB(forceRefresh) {
    if (!forceRefresh && cachedDB && (Date.now() - lastFetch < CACHE_TTL)) {
      return cachedDB;
    }
    try {
      const resp = await fetch(API_URL, {
        headers: {
          'Authorization': `Bearer ${GH_TOKEN}`,
          'Accept': 'application/vnd.github+json',
          'User-Agent': 'Kaspify'
        },
        cache: 'no-store'
      });
      if (!resp.ok) {
        console.warn('[Cloud] Fetch failed:', resp.status);
        return cachedDB || { users: [], posts: [], online: {} };
      }
      const data = await resp.json();
      cachedSHA = data.sha;
      const decoded = atob(data.content.replace(/\n/g, ''));
      cachedDB = JSON.parse(decoded);
      lastFetch = Date.now();
      return cachedDB;
    } catch (e) {
      console.warn('[Cloud] Fetch error:', e.message);
      return cachedDB || { users: [], posts: [], online: {} };
    }
  }

  // === ЗАПИСЬ В БАЗУ ===
  async function saveDB(db) {
    // Сначала получим актуальный SHA
    try {
      const getResp = await fetch(API_URL, {
        headers: {
          'Authorization': `Bearer ${GH_TOKEN}`,
          'Accept': 'application/vnd.github+json',
          'User-Agent': 'Kaspify'
        },
        cache: 'no-store'
      });
      if (getResp.ok) {
        const getData = await getResp.json();
        cachedSHA = getData.sha;
      }
    } catch(e) {}

    if (!cachedSHA) {
      console.warn('[Cloud] No SHA, cannot save');
      return false;
    }

    const content = btoa(unescape(encodeURIComponent(JSON.stringify(db, null, 2))));

    try {
      const resp = await fetch(API_URL, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${GH_TOKEN}`,
          'Accept': 'application/vnd.github+json',
          'User-Agent': 'Kaspify',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: 'sync: ' + new Date().toISOString(),
          content: content,
          sha: cachedSHA,
          branch: 'main'
        })
      });

      if (resp.ok) {
        const result = await resp.json();
        cachedSHA = result.content.sha;
        cachedDB = db;
        lastFetch = Date.now();
        console.log('[Cloud] Saved OK');
        return true;
      } else if (resp.status === 409) {
        // Conflict — re-fetch and retry
        console.warn('[Cloud] Conflict, refetching...');
        cachedDB = null;
        lastFetch = 0;
        return false;
      } else {
        console.warn('[Cloud] Save failed:', resp.status);
        return false;
      }
    } catch (e) {
      console.warn('[Cloud] Save error:', e.message);
      return false;
    }
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

  async function saveUser(userData) {
    const db = await fetchDB(true);
    if (!db.users) db.users = [];
    const clean = (userData.username || '').toLowerCase().replace(/^@/, '');
    const idx = db.users.findIndex(u => u.username && u.username.toLowerCase() === clean);
    if (idx !== -1) {
      Object.assign(db.users[idx], userData);
    } else {
      db.users.push(userData);
    }
    return await saveDB(db);
  }

  async function updateUser(username, updates) {
    const db = await fetchDB(true);
    if (!db.users) db.users = [];
    const clean = (username || '').toLowerCase().replace(/^@/, '');
    const idx = db.users.findIndex(u => u.username && u.username.toLowerCase() === clean);
    if (idx !== -1) {
      Object.assign(db.users[idx], updates);
      return await saveDB(db);
    }
    return false;
  }

  // === ПОСТЫ ===
  async function getPosts() {
    const db = await fetchDB();
    return db.posts || [];
  }

  async function addPost(post) {
    if (cachedDB) {
      if (!cachedDB.posts) cachedDB.posts = [];
      if (!cachedDB.posts.some(p => p.id === post.id)) {
        cachedDB.posts.unshift(post);
      }
    }
    const db = await fetchDB(true);
    if (!db.posts) db.posts = [];
    if (!db.posts.some(p => p.id === post.id)) {
      db.posts.unshift(post);
    }
    if (db.posts.length > 100) db.posts = db.posts.slice(0, 100);
    return await saveDB(db);
  }

  async function toggleLike(postId, username) {
    const db = await fetchDB(true);
    if (!db.posts) return null;
    const clean = (username || '').toLowerCase().replace(/^@/, '');
    const post = db.posts.find(p => p.id === postId);
    if (!post) return null;
    if (!post.likes) post.likes = [];
    const idx = post.likes.indexOf(clean);
    if (idx !== -1) post.likes.splice(idx, 1);
    else post.likes.push(clean);
    await saveDB(db);
    return post.likes;
  }

  // === ОНЛАЙН ===
  async function heartbeat(username) {
    const db = await fetchDB(true);
    if (!db.online) db.online = {};
    const clean = (username || '').toLowerCase().replace(/^@/, '');
    if (clean) {
      db.online[clean] = Date.now();
      // Очистить пользователей оффлайн > 5 мин
      for (const k of Object.keys(db.online)) {
        if (Date.now() - db.online[k] > 5 * 60 * 1000) {
          delete db.online[k];
        }
      }
      await saveDB(db);
    }
  }

  async function getOnlineUsers() {
    const db = await fetchDB();
    const online = db.online || {};
    return Object.keys(online).filter(k => Date.now() - online[k] < 5 * 60 * 1000);
  }

  // === STARS ===
  async function addStars(username, amount) {
    const db = await fetchDB(true);
    if (!db.users) db.users = [];
    const clean = (username || '').toLowerCase().replace(/^@/, '');
    const user = db.users.find(u => u.username && u.username.toLowerCase() === clean);
    if (user) {
      user.stars = (user.stars || 0) + amount;
      await saveDB(db);
      return user.stars;
    }
    return null;
  }

  // === ВЕРИФИКАЦИЯ ===
  async function setVerified(username, verified) {
    return await updateUser(username, { verified: verified === true });
  }

  return {
    fetchDB, saveDB,
    getUsers, getUser, saveUser, updateUser,
    getPosts, addPost, toggleLike,
    heartbeat, getOnlineUsers,
    addStars, setVerified
  };
})();
