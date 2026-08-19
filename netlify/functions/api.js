const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8745809636:AAHG-CU-SIlM1otpXPv5b21Lu11YUacabuY';
const ADMIN_ID = 8283038522;

let dbStore = {
  users: [],
  online: {}
};
let otpStore = {};

const https = require('https');

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
        try { resolve(JSON.parse(body)); } catch (e) { resolve(body); }
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

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  const path = event.path.replace(/\/\.netlify\/functions\/api/, '').replace(/\/api/, '');
  const method = event.httpMethod;

  try {
    let body = {};
    if (event.body) {
      try { body = JSON.parse(event.body); } catch (e) { body = {}; }
    }

    // 1. Health check
    if (path === '' || path === '/' || path === '/health' || path === '/status') {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          status: 'online',
          service: 'Kaspify Telegram Stars API Engine',
          userCount: dbStore.users.length,
          timestamp: new Date().toISOString()
        })
      };
    }

    // 2. POST /send-otp
    if (path === '/send-otp' && method === 'POST') {
      const identifier = (body.identifier || body.email || '').trim().toLowerCase().replace(/^@/, '');
      if (!identifier) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Укажите юзернейм' }) };
      }

      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const sessionId = Math.random().toString(36).substring(2, 12);
      otpStore[sessionId] = { identifier, code, expires: Date.now() + 5 * 60 * 1000 };

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          sessionId,
          botDeepLink: `https://t.me/kaspify_bot?start=auth_${sessionId}`
        })
      };
    }

    // 3. POST /verify-otp
    if (path === '/verify-otp' && method === 'POST') {
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
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Неверный код' }) };
      }

      delete otpStore[matchedSessionId];

      let user = dbStore.users.find(u => u.username && u.username.toLowerCase() === identifier);
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
        dbStore.users.push(user);
      }
      if (!dbStore.online) dbStore.online = {};
      dbStore.online[identifier] = Date.now();

      return { statusCode: 200, headers, body: JSON.stringify({ success: true, user }) };
    }

    // 4. POST /heartbeat
    if (path === '/heartbeat' && method === 'POST') {
      const username = (body.username || '').toLowerCase().replace(/^@/, '');
      if (username) {
        if (!dbStore.online) dbStore.online = {};
        dbStore.online[username] = Date.now();
      }
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
    }

    // 5. GET /user/:username
    if (path.startsWith('/user/') && method === 'GET') {
      const username = path.replace('/user/', '').toLowerCase().replace(/^@/, '');
      const user = dbStore.users.find(u => u.username && u.username.toLowerCase() === username);
      if (user) {
        return { statusCode: 200, headers, body: JSON.stringify({ success: true, user }) };
      }
      return { statusCode: 404, headers, body: JSON.stringify({ error: 'Пользователь не найден' }) };
    }

    // 6. POST /user/update
    if (path === '/user/update' && method === 'POST') {
      const { username, ...updates } = body;
      if (username) {
        const cleanU = username.toLowerCase().replace(/^@/, '');
        let user = dbStore.users.find(u => u.username && u.username.toLowerCase() === cleanU);
        if (user) {
          Object.assign(user, updates);
        } else {
          user = { username: cleanU, ...updates };
          dbStore.users.push(user);
        }
      }
      return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
    }

    // 7. TELEGRAM BOT WEBHOOK (Для круглосуточной работы на Netlify 24/7)
    if (path === '/telegram-webhook' && method === 'POST') {
      const update = body;

      // Оплата pre_checkout_query (Обязательно для Telegram Stars)
      if (update.pre_checkout_query) {
        await sendTelegramRequest('answerPreCheckoutQuery', {
          pre_checkout_query_id: update.pre_checkout_query.id,
          ok: true
        });
        return { statusCode: 200, headers, body: 'OK' };
      }

      // Сообщения
      if (update.message) {
        const msg = update.message;
        const chatId = msg.chat.id;
        const fromId = msg.from ? msg.from.id : chatId;
        const text = (msg.text || '').trim();
        const userTgUsername = msg.from && msg.from.username ? msg.from.username : '';

        // Успешная оплата звездами
        if (msg.successful_payment) {
          const sp = msg.successful_payment;
          const parts = (sp.invoice_payload || '').split('_');
          const targetUsername = (parts[2] || userTgUsername || 'user').toLowerCase().replace(/^@/, '');
          const amountStars = parseInt(parts[3]) || 100;
          const paidTgStars = sp.total_amount;

          let u = dbStore.users.find(x => x.username && x.username.toLowerCase() === targetUsername.toLowerCase());
          if (!u) {
            u = { username: targetUsername, fullname: targetUsername, stars: amountStars, balance: 10000, verified: false };
            dbStore.users.push(u);
          } else {
            u.stars = (u.stars || 0) + amountStars;
          }

          await sendTelegramRequest('sendMessage', {
            chat_id: chatId,
            text: `🎉 <b>Оплата Telegram Stars прошла успешно!</b>\n\n⭐️ Вы оплатили <b>${paidTgStars} ⭐</b> в Telegram.\n✨ На ваш аккаунт <b>@${targetUsername}</b> зачислено: <b>+${amountStars} Stars</b>!`,
            parse_mode: 'HTML'
          });

          await sendTelegramRequest('sendMessage', {
            chat_id: ADMIN_ID,
            text: `💰 <b>РЕАЛЬНАЯ ОПЛАТА ЗВЕЗДАМИ TELEGRAM!</b>\n\n👤 Пользователь: @${targetUsername}\n⭐️ Оплачено: <b>${paidTgStars} Stars</b>`,
            parse_mode: 'HTML'
          });

          return { statusCode: 200, headers, body: 'OK' };
        }

        // Команда /start
        if (text.startsWith('/start')) {
          const param = text.split(' ')[1] || '';

          if (param.startsWith('auth_')) {
            const sid = param.replace('auth_', '');
            if (otpStore[sid]) {
              await sendTelegramRequest('sendMessage', {
                chat_id: chatId,
                text: `🔐 <b>Ваш одноразовый код для входа в Kaspify ID:</b>\n\n<pre style="font-size: 26px;"><b>${otpStore[sid].code}</b></pre>\n\nСкопируйте этот 6-значный код и введите его в окне входа на сайте.`,
                parse_mode: 'HTML'
              });
            } else {
              await sendTelegramRequest('sendMessage', {
                chat_id: chatId,
                text: `❌ Ошибка: Код устарел или сессия не найдена. Запросите код заново на сайте.`
              });
            }
            return { statusCode: 200, headers, body: 'OK' };
          }

          if (param.startsWith('stars_')) {
            const targetUsername = param.replace('stars_', '').toLowerCase().replace(/^@/, '');
            await sendTelegramRequest('sendMessage', {
              chat_id: chatId,
              text: `🌟 <b>Пополнение Telegram Stars для @${targetUsername}</b>\n\nВыберите пакет ниже:`,
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
                  ]
                ]
              }
            });
            return { statusCode: 200, headers, body: 'OK' };
          }

          // Главное меню
          if (isAdmin(fromId)) {
            await sendTelegramRequest('sendMessage', {
              chat_id: chatId,
              text: `👑 <b>Панель Администратора Kaspify</b>\n\nКоманды:\n• <code>/online</code> — кто онлайн\n• <code>/users</code> — список пользователей\n• <code>/verify @username</code> — выдать галочку ✅\n• <code>/stars @username 500</code> — начислить Stars`,
              parse_mode: 'HTML'
            });
          } else {
            await sendTelegramRequest('sendMessage', {
              chat_id: chatId,
              text: `🌟 <b>Добро пожаловать в Kaspify ID Bot!</b>`,
              parse_mode: 'HTML',
              reply_markup: getUserMainMenuKeyboard(userTgUsername)
            });
          }
          return { statusCode: 200, headers, body: 'OK' };
        }

        // Админ-команды
        if (isAdmin(fromId)) {
          if (text.startsWith('/verify')) {
            const target = text.split(' ')[1]?.replace('@', '').toLowerCase();
            if (target) {
              let u = dbStore.users.find(x => x.username && x.username.toLowerCase() === target);
              if (!u) {
                u = { username: target, fullname: target, stars: 0, balance: 10000, verified: true };
                dbStore.users.push(u);
              } else {
                u.verified = true;
              }
              await sendTelegramRequest('sendMessage', {
                chat_id: chatId,
                text: `✅ <b>Синяя галочка успешно выдана @${target}!</b>`,
                parse_mode: 'HTML'
              });
            }
          } else if (text.startsWith('/stars')) {
            const parts = text.split(' ');
            const target = parts[1]?.replace('@', '').toLowerCase();
            const amount = parseInt(parts[2]) || 500;
            if (target) {
              let u = dbStore.users.find(x => x.username && x.username.toLowerCase() === target);
              if (!u) {
                u = { username: target, fullname: target, stars: amount, balance: 10000, verified: false };
                dbStore.users.push(u);
              } else {
                u.stars = (u.stars || 0) + amount;
              }
              await sendTelegramRequest('sendMessage', {
                chat_id: chatId,
                text: `⭐ <b>Начислено +${amount} Stars для @${target}!</b>`,
                parse_mode: 'HTML'
              });
            }
          }
        }
      }

      // Callback query
      if (update.callback_query) {
        const q = update.callback_query;
        const data = q.data || '';
        const chatId = q.message.chat.id;

        if (data.startsWith('invoice_')) {
          const parts = data.split('_');
          const target = parts[1];
          const amountStars = parseInt(parts[2]) || 100;
          const tgStarsCost = parseInt(parts[3]) || 19;

          await sendTelegramRequest('answerCallbackQuery', { callback_query_id: q.id });
          await sendTelegramRequest('sendInvoice', {
            chat_id: chatId,
            title: `Пополнение +${amountStars} Stars`,
            description: `Официальное пополнение Kaspify на +${amountStars} Stars для @${target}.`,
            payload: `kaspi_stars_${target}_${amountStars}`,
            currency: 'XTR',
            prices: [{ label: `+${amountStars} Stars`, amount: tgStarsCost }]
          });
        }
      }

      return { statusCode: 200, headers, body: 'OK' };
    }

    return { statusCode: 404, headers, body: JSON.stringify({ error: 'Route not found' }) };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
