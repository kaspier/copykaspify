const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const BOT_TOKEN = process.argv[2] || process.env.TELEGRAM_BOT_TOKEN || '8745809636:AAHG-CU-SIlM1otpXPv5b21Lu11YUacabuY';
const ADMIN_ID = 8283038522; // ID администратора

let otpStore = {}; // Memory store for OTP sessions

// Файл локальной базы данных пользователей для персистентности и синхронизации с сайтом
const DB_FILE = path.join(__dirname, 'users_db.json');

// Хранилище временного состояния пользователей
let userStates = {};

function loadDB() {
  try {
    if (fs.existsSync(DB_FILE)) {
      return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    }
  } catch (e) { }
  return { users: [], online: {} };
}

function saveDB(db) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
  } catch (e) { }
}

let lastUpdateId = 0;

function sendTelegramRequest(method, payload) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload);
    const options = {
      hostname: 'api.telegram.org',
      port: 443,
      path: `/bot${BOT_TOKEN}/${method}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          resolve(body);
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function isAdmin(fromId) {
  return String(fromId) === String(ADMIN_ID);
}

// Главное меню для пользователя
function getUserMainMenuKeyboard(username = '') {
  const cleanU = (username || '').replace('@', '');
  return {
    inline_keyboard: [
      [
        { text: '⭐ Пополнить Stars (Оплата в TG)', callback_data: cleanU ? `menu_topup_${cleanU}` : 'action_prompt_topup' }
      ],
      [
        { text: '✅ Запросить синюю галочку (Верификация)', callback_data: cleanU ? `req_verify_${cleanU}` : 'action_prompt_verify' }
      ],
      [
        { text: '🌐 Открыть Kaspify App', url: 'https://kaspify.netlify.app' }
      ]
    ]
  };
}

async function handleMessage(message) {
  const chatId = message.chat.id;
  const fromId = message.from ? message.from.id : chatId;
  const text = (message.text || '').trim();
  const userTgUsername = message.from && message.from.username ? message.from.username : '';

  // 1. Обработка УСПЕШНОЙ ОПЛАТЫ НАСТОЯЩИМИ ЗВЕЗДАМИ TELEGRAM (successful_payment)
  if (message.successful_payment) {
    const sp = message.successful_payment;
    // payload: kaspi_stars_{targetUsername}_{amountStars}
    const payload = sp.invoice_payload || '';
    const parts = payload.split('_');
    const targetUsername = (parts[2] || userTgUsername || 'user').toLowerCase().replace(/^@/, '');
    const amountStars = parseInt(parts[3]) || 100;
    const paidTgStars = sp.total_amount; // количество звезд в Telegram

    const db = loadDB();
    let u = db.users.find(x => x.username && x.username.toLowerCase() === targetUsername.toLowerCase());
    if (!u) {
      u = { username: targetUsername, fullname: targetUsername, stars: amountStars, balance: 10000, verified: false };
      db.users.push(u);
    } else {
      u.stars = (u.stars || 0) + amountStars;
    }
    saveDB(db);

    await sendTelegramRequest('sendMessage', {
      chat_id: chatId,
      text: `🎉 <b>Оплата Telegram Stars прошла успешно!</b>\n\n` +
        `⭐️ Вы оплатили <b>${paidTgStars} ⭐</b> в Telegram.\n` +
        `✨ На ваш аккаунт <b>@${targetUsername}</b> зачислено: <b>+${amountStars} Stars</b>!\n\n` +
        `Баланс в приложении мгновенно пополнен. Приятных покупок!`,
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [{ text: '⭐ Пополнить еще', callback_data: `menu_topup_${targetUsername}` }],
          [{ text: '« В главное меню', callback_data: `menu_main_${targetUsername}` }]
        ]
      }
    });

    // Уведомление админу о реальном платеже
    await sendTelegramRequest('sendMessage', {
      chat_id: ADMIN_ID,
      text: `💰 <b>РЕАЛЬНАЯ ОПЛАТА ЗВЕЗДАМИ TELEGRAM!</b>\n\n` +
        `👤 Пользователь: @${targetUsername} (ID: <code>${fromId}</code>)\n` +
        `⭐️ Оплачено: <b>${paidTgStars} Telegram Stars</b>\n` +
        `💎 Зачислено: <b>+${amountStars} Stars</b>\n` +
        `🆔 Telegram Charge ID: <code>${sp.telegram_payment_charge_id}</code>`,
      parse_mode: 'HTML'
    });
    return;
  }

  // 2. Проверка текстового ввода (если пользователь вводит никнейм вручную)
  if (userStates[fromId] && !text.startsWith('/')) {
    const state = userStates[fromId];
    const targetUsername = text.replace(/^@/, '').trim().toLowerCase();
    delete userStates[fromId];

    if (state.action === 'topup') {
      await sendTopupPackages(chatId, fromId, targetUsername);
      return;
    } else if (state.action === 'verify') {
      await processVerificationRequest(chatId, fromId, targetUsername, message.from);
      return;
    }
  }

  // 3. Команда /start
  if (text.startsWith('/start')) {
    const parts = text.split(' ');
    const param = parts[1] || '';

    // АВТОРИЗАЦИЯ: выдача 6-значного кода
    if (param.startsWith('auth_')) {
      const sid = param.replace('auth_', '');
      if (otpStore[sid]) {
        await sendTelegramRequest('sendMessage', {
          chat_id: chatId,
          text: `🔐 <b>Ваш одноразовый код для входа в Kaspify ID:</b>\n\n` +
            `<pre style="font-size: 26px;"><b>${otpStore[sid].code}</b></pre>\n\n` +
            `Скопируйте этот 6-значный код и введите его в окне входа на сайте.`,
          parse_mode: 'HTML'
        });
      } else {
        await sendTelegramRequest('sendMessage', {
          chat_id: chatId,
          text: `❌ Ошибка: Код устарел или сессия не найдена. Попробуйте запросить код заново на сайте.`
        });
      }
      return;
    }

    // ПОПОЛНЕНИЕ STARS: переход с сайта по кнопке
    if (param.startsWith('stars_')) {
      const targetUsername = param.replace('stars_', '').toLowerCase().replace(/^@/, '');
      await sendTopupPackages(chatId, fromId, targetUsername);
      return;
    }

    // Главное меню /start
    if (isAdmin(fromId)) {
      const db = loadDB();
      const onlineCount = Object.keys(db.online || {}).filter(k => Date.now() - db.online[k] < 3 * 60 * 1000).length;

      await sendTelegramRequest('sendMessage', {
        chat_id: chatId,
        text: `👑 <b>Панель Администратора Kaspify</b>\n\n` +
          `🟢 Сейчас онлайн: <b>${Math.max(1, onlineCount)}</b> чел.\n` +
          `👥 Всего пользователей в базе: <b>${db.users.length}</b>\n\n` +
          `<b>Команды управления:</b>\n` +
          `• <code>/online</code> — список кто сейчас на сайте онлайн\n` +
          `• <code>/users</code> — список всех пользователей и их статусы\n` +
          `• <code>/verify @username</code> — выдать синюю галочку верификации ✅\n` +
          `• <code>/unverify @username</code> — снять галочку\n` +
          `• <code>/stars @username 500</code> — бесплатно начислить Stars ⭐`,
        parse_mode: 'HTML'
      });
    } else {
      const defaultUser = userTgUsername || '';
      await sendTelegramRequest('sendMessage', {
        chat_id: chatId,
        text: `🌟 <b>Добро пожаловать в Kaspify ID Bot!</b>\n\n` +
          `Здесь вы можете:\n` +
          `• Пополнить <b>Stars официальными звездами Telegram ⭐</b>\n` +
          `• Отправить <b>запрос на синюю галочку верификации</b> ✅\n` +
          `• Получить код для безопасного входа на сайт\n\n` +
          `Выберите действие ниже:`,
        parse_mode: 'HTML',
        reply_markup: getUserMainMenuKeyboard(defaultUser)
      });
    }
    return;
  }

  // 4. Команды только для АДМИНИСТРАТОРА
  if (!isAdmin(fromId)) {
    await sendTelegramRequest('sendMessage', {
      chat_id: chatId,
      text: `👋 Выберите действие в меню:`,
      reply_markup: getUserMainMenuKeyboard(userTgUsername)
    });
    return;
  }

  if (text === '/online') {
    const db = loadDB();
    const active = Object.keys(db.online || {}).filter(k => Date.now() - db.online[k] < 3 * 60 * 1000);
    if (active.length === 0) {
      await sendTelegramRequest('sendMessage', { chat_id: chatId, text: `🟢 Сейчас на сайте онлайн: 1 чел. (вы)` });
    } else {
      const list = active.map(u => `• @${u}`).join('\n');
      await sendTelegramRequest('sendMessage', {
        chat_id: chatId,
        text: `🟢 <b>Пользователи онлайн прямо сейчас (${active.length}):</b>\n\n${list}`,
        parse_mode: 'HTML'
      });
    }
  } else if (text === '/users') {
    const db = loadDB();
    if (!db.users || db.users.length === 0) {
      await sendTelegramRequest('sendMessage', { chat_id: chatId, text: `📭 В базе пока нет пользователей.` });
    } else {
      const list = db.users.map(u =>
        `• <b>${u.fullname || u.username}</b> (@${u.username}) ${u.verified ? '✅' : ''}\n` +
        `  ⭐ Stars: <b>${u.stars || 0}</b> | Баланс: ${u.balance || 0} ₸\n` +
        `  Быстро: <code>/verify ${u.username}</code> | <code>/stars ${u.username} 500</code>`
      ).join('\n\n');

      await sendTelegramRequest('sendMessage', {
        chat_id: chatId,
        text: `👥 <b>Все зарегистрированные пользователи (${db.users.length}):</b>\n\n${list}`,
        parse_mode: 'HTML'
      });
    }
  } else if (text.startsWith('/verify')) {
    const target = text.split(' ')[1]?.replace('@', '').toLowerCase();
    if (!target) {
      await sendTelegramRequest('sendMessage', { chat_id: chatId, text: `Укажите юзернейм: /verify username` });
      return;
    }
    const db = loadDB();
    let u = db.users.find(x => x.username && x.username.toLowerCase() === target);
    if (!u) {
      u = { username: target, fullname: target, stars: 0, balance: 10000, verified: true };
      db.users.push(u);
    } else {
      u.verified = true;
    }
    saveDB(db);
    await sendTelegramRequest('sendMessage', {
      chat_id: chatId,
      text: `✅ <b>Синяя галочка успешно выдана пользователю @${target}!</b>\nНа сайте теперь отображается галочка верификации.`,
      parse_mode: 'HTML'
    });
  } else if (text.startsWith('/unverify')) {
    const target = text.split(' ')[1]?.replace('@', '').toLowerCase();
    if (!target) return;
    const db = loadDB();
    let u = db.users.find(x => x.username && x.username.toLowerCase() === target);
    if (u) {
      u.verified = false;
      saveDB(db);
    }
    await sendTelegramRequest('sendMessage', {
      chat_id: chatId,
      text: `❌ Галочка верификации снята с @${target}.`
    });
  } else if (text.startsWith('/stars')) {
    const parts = text.split(' ');
    const target = parts[1]?.replace('@', '').toLowerCase();
    const amount = parseInt(parts[2]) || 500;
    if (!target) {
      await sendTelegramRequest('sendMessage', { chat_id: chatId, text: `Использование: /stars username 500` });
      return;
    }
    const db = loadDB();
    let u = db.users.find(x => x.username && x.username.toLowerCase() === target);
    if (!u) {
      u = { username: target, fullname: target, stars: amount, balance: 10000, verified: false };
      db.users.push(u);
    } else {
      u.stars = (u.stars || 0) + amount;
    }
    saveDB(db);
    await sendTelegramRequest('sendMessage', {
      chat_id: chatId,
      text: `⭐ <b>Успешно начислено +${amount} Stars для @${target}!</b>\nНовый баланс пользователя: <b>${u.stars} ⭐</b>`,
      parse_mode: 'HTML'
    });
  }
}

// 5. Обработка Telegram Stars pre_checkout_query (ОБЯЗАТЕЛЬНО для работы оплаты)
async function handlePreCheckoutQuery(preCheckoutQuery) {
  // Всегда подтверждаем оплату звездами Telegram
  await sendTelegramRequest('answerPreCheckoutQuery', {
    pre_checkout_query_id: preCheckoutQuery.id,
    ok: true
  });
}

// Хелпер: отправка официального инвойса на оплату НАСТОЯЩИМИ ЗВЕЗДАМИ TELEGRAM (XTR)
async function sendTelegramStarsInvoice(chatId, targetUsername, amountStars, tgStarsCost) {
  await sendTelegramRequest('sendInvoice', {
    chat_id: chatId,
    title: `Пополнение +${amountStars} Stars`,
    description: `Официальное пополнение баланса Kaspify на +${amountStars} Stars для пользователя @${targetUsername}.`,
    payload: `kaspi_stars_${targetUsername}_${amountStars}`,
    currency: 'XTR', // Официальная валюта Telegram Stars
    prices: [
      { label: `+${amountStars} Stars для @${targetUsername}`, amount: tgStarsCost }
    ]
  });
}

// Меню пакетов пополнения Stars
async function sendTopupPackages(chatId, fromId, targetUsername) {
  const userIsAdmin = isAdmin(fromId);

  if (userIsAdmin) {
    await sendTelegramRequest('sendMessage', {
      chat_id: chatId,
      text: `👑 <b>Панель Администратора</b>\n\nВы пополняете Stars для <b>@${targetUsername}</b>.\nДля вас все начисления <b>БЕСПЛАТНЫ</b>! Выберите сумму:`,
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [
            { text: '⭐ +100 Stars (Бесплатно)', callback_data: `admin_stars_${targetUsername}_100` },
            { text: '⭐ +500 Stars (Бесплатно)', callback_data: `admin_stars_${targetUsername}_500` }
          ],
          [
            { text: '⭐ +1 000 Stars (Бесплатно)', callback_data: `admin_stars_${targetUsername}_1000` },
            { text: '⭐ +5 000 Stars (Бесплатно)', callback_data: `admin_stars_${targetUsername}_5000` }
          ],
          [
            { text: '✅ Выдать синюю галочку', callback_data: `verify_${targetUsername}_1` },
            { text: '❌ Снять галочку', callback_data: `verify_${targetUsername}_0` }
          ]
        ]
      }
    });
  } else {
    // ДЛЯ ОБЫЧНЫХ ПОЛЬЗОВАТЕЛЕЙ — ОФИЦИАЛЬНЫЙ TELEGRAM STARS СЧЕТ
    await sendTelegramRequest('sendMessage', {
      chat_id: chatId,
      text: `🌟 <b>Пополнение Telegram Stars для @${targetUsername}</b>\n\n` +
        `Выберите пакет ниже. Бот выставит официальный счет на оплату <b>Telegram Stars ⭐</b>:\n\n` +
        `• <b>100 Stars</b> — 19 ⭐ Telegram\n` +
        `• <b>500 Stars</b> — 120 ⭐ Telegram\n` +
        `• <b>1 000 Stars</b> — 200 ⭐ Telegram\n` +
        `• <b>5 000 Stars</b> — 900 ⭐ Telegram\n`,
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [
            { text: '⭐️ +100 Stars (19 TG Stars)', callback_data: `invoice_${targetUsername}_100_19` },
            { text: '⭐️ +500 Stars (120 TG Stars)', callback_data: `invoice_${targetUsername}_500_120` }
          ],
          [
            { text: '⭐️ +1 000 Stars (200 TG Stars)', callback_data: `invoice_${targetUsername}_1000_200` },
            { text: '⭐️ +5 000 Stars (900 TG Stars)', callback_data: `invoice_${targetUsername}_5000_1000` }
          ],
          [
            { text: '« Назад в главное меню', callback_data: `menu_main_${targetUsername}` }
          ]
        ]
      }
    });
  }
}

// Хелпер: обработка запроса на верификацию
async function processVerificationRequest(chatId, fromId, targetUsername, userObj) {
  await sendTelegramRequest('sendMessage', {
    chat_id: chatId,
    text: `📨 <b>Запрос на верификацию отправлен!</b>\n\n` +
      `Ваш аккаунт <b>@${targetUsername}</b> передан на проверку администратору.\n` +
      `Как только заявка будет одобрена, у вас в профиле появится синяя галочка ✅.`,
    parse_mode: 'HTML'
  });

  const userFullName = userObj ? `${userObj.first_name || ''} ${userObj.last_name || ''}`.trim() : targetUsername;
  await sendTelegramRequest('sendMessage', {
    chat_id: ADMIN_ID,
    text: `🔔 <b>Новая заявка на верификацию!</b>\n\n` +
      `👤 Пользователь: <b>${userFullName}</b>\n` +
      `🏷️ Никнейм: <b>@${targetUsername}</b>\n` +
      `🆔 Telegram ID: <code>${fromId}</code>\n\n` +
      `Нажмите кнопку ниже для решения:`,
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [
        [
          { text: '✅ Одобрить и выдать галочку', callback_data: `verify_${targetUsername}_1` },
          { text: '❌ Отклонить', callback_data: `verify_${targetUsername}_0` }
        ]
      ]
    }
  });
}

// 6. Обработка нажатий на инлайн-кнопки
async function handleCallbackQuery(query) {
  const data = query.data || '';
  const chatId = query.message.chat.id;
  const fromId = query.from ? query.from.id : chatId;
  const tgUser = query.from && query.from.username ? query.from.username : '';

  if (data === 'action_prompt_topup') {
    userStates[fromId] = { action: 'topup' };
    await sendTelegramRequest('answerCallbackQuery', { callback_query_id: query.id });
    await sendTelegramRequest('sendMessage', {
      chat_id: chatId,
      text: `✏️ Введите ваш юзернейм на сайте (например: <code>${tgUser || 'username'}</code>):`,
      parse_mode: 'HTML'
    });
    return;
  }

  if (data === 'action_prompt_verify') {
    userStates[fromId] = { action: 'verify' };
    await sendTelegramRequest('answerCallbackQuery', { callback_query_id: query.id });
    await sendTelegramRequest('sendMessage', {
      chat_id: chatId,
      text: `✏️ Введите ваш юзернейм на сайте, для которого нужна синяя галочка:`,
      parse_mode: 'HTML'
    });
    return;
  }

  if (data.startsWith('menu_main_')) {
    const u = data.replace('menu_main_', '');
    await sendTelegramRequest('answerCallbackQuery', { callback_query_id: query.id });
    await sendTelegramRequest('sendMessage', {
      chat_id: chatId,
      text: `🌟 <b>Главное меню Kaspify:</b>`,
      parse_mode: 'HTML',
      reply_markup: getUserMainMenuKeyboard(u)
    });
    return;
  }

  if (data.startsWith('menu_topup_')) {
    const u = data.replace('menu_topup_', '');
    await sendTelegramRequest('answerCallbackQuery', { callback_query_id: query.id });
    await sendTopupPackages(chatId, fromId, u);
    return;
  }

  if (data.startsWith('req_verify_')) {
    const u = data.replace('req_verify_', '');
    await sendTelegramRequest('answerCallbackQuery', { callback_query_id: query.id });
    await processVerificationRequest(chatId, fromId, u, query.from);
    return;
  }

  // КНОПКА ВЫСТАВЛЕНИЯ СЧЕТА TELEGRAM STARS (Официальная оплата XTR)
  if (data.startsWith('invoice_')) {
    const parts = data.split('_');
    const target = parts[1];
    const amountStars = parseInt(parts[2]) || 100;
    const tgStarsCost = parseInt(parts[3]) || 19;

    await sendTelegramRequest('answerCallbackQuery', { callback_query_id: query.id });
    await sendTelegramStarsInvoice(chatId, target, amountStars, tgStarsCost);
    return;
  }

  // БЕСПЛАТНОЕ ПОПОЛНЕНИЕ ДЛЯ АДМИНИСТРАТОРА
  if (data.startsWith('admin_stars_')) {
    const parts = data.split('_');
    const target = parts[2];
    const amount = parseInt(parts[3]) || 500;

    const db = loadDB();
    let u = db.users.find(x => x.username && x.username.toLowerCase() === target.toLowerCase());
    if (!u) {
      u = { username: target, fullname: target, stars: amount, balance: 10000, verified: false };
      db.users.push(u);
    } else {
      u.stars = (u.stars || 0) + amount;
    }
    saveDB(db);

    await sendTelegramRequest('answerCallbackQuery', {
      callback_query_id: query.id,
      text: `⭐ +${amount} Stars начислено администратором!`
    });

    await sendTelegramRequest('sendMessage', {
      chat_id: chatId,
      text: `👑 <b>Администраторское начисление:</b>\n` +
        `⭐ На аккаунт <b>@${target}</b> успешно зачислено <b>+${amount} Stars</b> (Бесплатно).`,
      parse_mode: 'HTML'
    });
    return;
  }

  // Одобрение/снятие верификации
  if (data.startsWith('verify_')) {
    const parts = data.split('_');
    const target = parts[1];
    const status = parts[2] === '1';

    const db = loadDB();
    let u = db.users.find(x => x.username && x.username.toLowerCase() === target.toLowerCase());
    if (!u) {
      u = { username: target, fullname: target, stars: 0, balance: 10000, verified: status };
      db.users.push(u);
    } else {
      u.verified = status;
    }
    saveDB(db);

    await sendTelegramRequest('answerCallbackQuery', {
      callback_query_id: query.id,
      text: status ? `✅ Галочка выдана @${target}` : `❌ Галочка снята`
    });

    await sendTelegramRequest('sendMessage', {
      chat_id: chatId,
      text: status
        ? `✅ <b>Синяя галочка успешно выдана пользователю @${target}!</b>`
        : `ℹ️ Галочка снята с @${target}.`,
      parse_mode: 'HTML'
    });
  }
}

async function pollTelegram() {
  try {
    const res = await sendTelegramRequest('getUpdates', { offset: lastUpdateId + 1, timeout: 30 });
    if (res && res.ok && res.result && res.result.length > 0) {
      for (const update of res.result) {
        lastUpdateId = update.update_id;
        if (update.message) await handleMessage(update.message);
        if (update.callback_query) await handleCallbackQuery(update.callback_query);
        if (update.pre_checkout_query) await handlePreCheckoutQuery(update.pre_checkout_query);
      }
    }
  } catch (err) {
    console.error('Ошибка поллинга Telegram:', err.message);
  }
  setTimeout(pollTelegram, 1000);
}

// === LOCAL HTTP SERVER ДЛЯ САЙТА ===
const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  let bodyData = '';
  req.on('data', chunk => bodyData += chunk);
  req.on('end', () => {
    let body = {};
    if (bodyData) {
      try { body = JSON.parse(bodyData); } catch (e) { }
    }

    res.setHeader('Content-Type', 'application/json');

    if (req.url === '/api/send-otp' && req.method === 'POST') {
      const identifier = (body.identifier || body.email || '').trim().toLowerCase().replace(/^@/, '');
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const sessionId = Math.random().toString(36).substring(2, 12);

      otpStore[sessionId] = { identifier, code, expires: Date.now() + 5 * 60 * 1000 };
      console.log(`[API] Запрос кода для @${identifier} -> sessionId: ${sessionId}, code: ${code}`);

      res.writeHead(200);
      return res.end(JSON.stringify({
        success: true,
        sessionId,
        botDeepLink: `https://t.me/kaspify_bot?start=auth_${sessionId}`
      }));
    }

    if (req.url === '/api/verify-otp' && req.method === 'POST') {
      const identifier = (body.identifier || body.email || '').trim().toLowerCase().replace(/^@/, '');
      const code = (body.code || '').trim();

      let matchedSessionId = null;
      for (const [sid, data] of Object.entries(otpStore)) {
        if (data.identifier === identifier && data.code === code) {
          matchedSessionId = sid;
          break;
        }
      }

      if (!matchedSessionId) {
        res.writeHead(400);
        return res.end(JSON.stringify({ error: 'Неверный код' }));
      }

      delete otpStore[matchedSessionId];
      console.log(`[API] Успешный вход для @${identifier}`);

      const db = loadDB();
      let user = db.users.find(u => u.username && u.username.toLowerCase() === identifier);
      if (!user) {
        user = {
          id: 'u_' + Math.random().toString(36).substring(2, 9),
          username: identifier,
          fullname: identifier,
          balance: 241997.57,
          stars: 0,
          verified: false,
          avatar: 'checklogo.png',
          bio: 'Kaspify ID аккаунт ✨'
        };
        db.users.push(user);
      }
      db.online[identifier] = Date.now();
      saveDB(db);

      res.writeHead(200);
      return res.end(JSON.stringify({ success: true, user }));
    }

    if (req.url === '/api/heartbeat' && req.method === 'POST') {
      const username = (body.username || '').toLowerCase().replace(/^@/, '');
      if (username) {
        const db = loadDB();
        if (!db.online) db.online = {};
        db.online[username] = Date.now();
        saveDB(db);
      }
      res.writeHead(200);
      return res.end(JSON.stringify({ ok: true }));
    }

    if (req.url?.startsWith('/api/user/') && req.method === 'GET') {
      const username = req.url.replace('/api/user/', '').toLowerCase().replace(/^@/, '');
      const db = loadDB();
      const user = db.users.find(u => u.username && u.username.toLowerCase() === username);
      if (user) {
        res.writeHead(200);
        return res.end(JSON.stringify({ success: true, user }));
      }
      res.writeHead(404);
      return res.end(JSON.stringify({ error: 'Пользователь не найден' }));
    }

    if (req.url === '/api/user/update' && req.method === 'POST') {
      const { username, ...updates } = body;
      if (username) {
        const cleanU = username.toLowerCase().replace(/^@/, '');
        const db = loadDB();
        let user = db.users.find(u => u.username && u.username.toLowerCase() === cleanU);
        if (user) {
          Object.assign(user, updates);
        } else {
          user = { username: cleanU, ...updates };
          db.users.push(user);
        }
        saveDB(db);
      }
      res.writeHead(200);
      return res.end(JSON.stringify({ success: true }));
    }

    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Route not found' }));
  });
});

server.listen(8888, () => {
  console.log('🚀 Локальный API сервер Kaspify запущен на http://localhost:8888');
  console.log(`🤖 Kaspify Telegram Bot активен с НАСТОЯЩИМИ Telegram Stars (Админ ID: ${ADMIN_ID})`);
  pollTelegram();
});
