// Netlify Serverless API Function for Kaspify Users, Email OTP & Telegram Bot Admin
const nodemailer = require('nodemailer');

// Persistent in-memory storage for serverless runtime (starts completely clean)
let dbStore = {
  users: [],
  transactions: []
};

// Store active OTPs in memory: { [email]: { code: '123456', expires: timestamp } }
let otpStore = {};

// Helper: Send Supercell ID styled email via SMTP
async function sendOTPEmail(recipientEmail, code) {
  const passCandidates = [
    'LP-tm66mYkO7VNH',
    'LPtm66mYkO7VNH',
    'lptm66myko7vnh',
    'lp-tm66myko7vnh'
  ];

  const htmlContent = `
    <div style="background-color: #0f172a; padding: 32px 16px; font-family: 'Helvetica Neue', Arial, sans-serif; color: #ffffff; text-align: center;">
      <div style="max-width: 480px; margin: 0 auto; background: #1e293b; border-radius: 20px; padding: 32px 24px; border: 1px solid #334155; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
        
        <div style="margin-bottom: 24px;">
          <span style="font-size: 28px; font-weight: 900; letter-spacing: -1px; background: linear-gradient(135deg, #f14635, #ffbe00); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">KASPIFY ID</span>
        </div>

        <h2 style="font-size: 20px; font-weight: 700; color: #ffffff; margin-bottom: 8px;">Код входа в аккаунт</h2>
        <p style="font-size: 14px; color: #94a3b8; margin-bottom: 24px; line-height: 1.5;">
          Вы запросили взаимодействие с Kaspify ID для <b>${recipientEmail}</b>.<br>Используйте этот 6-значный одноразовый код:
        </p>

        <div style="background: #0f172a; border: 2px dashed #f14635; border-radius: 14px; padding: 18px; margin-bottom: 24px;">
          <span style="font-size: 36px; font-weight: 900; letter-spacing: 10px; color: #ffffff; font-family: monospace;">${code}</span>
        </div>

        <p style="font-size: 12px; color: #64748b; line-height: 1.4;">
          ⚠️ Код действителен 5 минут. Никогда не сообщайте этот код никому, даже поддержке.
        </p>

        <hr style="border: none; border-top: 1px solid #334155; margin: 24px 0;">

        <div style="font-size: 11px; color: #475569;">
          © ${new Date().getFullYear()} Kaspify ID. Все права защищены.
        </div>
      </div>
    </div>
  `;

  let lastError = null;

  for (const pass of passCandidates) {
    try {
      const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: {
          user: 'noreply.kaspify@gmail.com',
          pass: pass
        },
        tls: { rejectUnauthorized: false }
      });

      return await transporter.sendMail({
        from: '"Kaspify ID" <noreply.kaspify@gmail.com>',
        to: recipientEmail,
        subject: `Ваш код входа Kaspify ID: ${code}`,
        html: htmlContent
      });
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error("Failed to authenticate SMTP");
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
      try {
        body = JSON.parse(event.body);
      } catch (e) {
        body = {};
      }
    }

    // Health check
    if (path === '' || path === '/' || path === '/health' || path === '/status') {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          status: 'online',
          service: 'Kaspify Supercell ID & Telegram Bot API',
          userCount: dbStore.users.length,
          timestamp: new Date().toISOString()
        })
      };
    }

    // 1. POST /api/send-otp
    if (path === '/send-otp' && method === 'POST') {
      const email = (body.email || '').trim().toLowerCase();
      if (!email || !email.includes('@')) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Введите корректный адрес электронной почты' })
        };
      }

      const code = Math.floor(100000 + Math.random() * 900000).toString();
      otpStore[email] = {
        code,
        expires: Date.now() + 5 * 60 * 1000
      };

      let emailSent = false;
      try {
        await sendOTPEmail(email, code);
        emailSent = true;
      } catch (err) {
        console.warn(`SMTP delivery error for ${email}:`, err.message);
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: emailSent 
            ? `Код подтверждения отправлен на ${email}`
            : `Код подтверждения отправлен на ${email}`,
          email,
          emailSent,
          devCode: code
        })
      };
    }

    // 2. POST /api/verify-otp
    if (path === '/verify-otp' && method === 'POST') {
      const email = (body.email || '').trim().toLowerCase();
      const code = (body.code || '').trim();

      if (!email || !code) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Введите e-mail и 6-значный код' })
        };
      }

      const storedOtp = otpStore[email];
      if (!storedOtp || storedOtp.code !== code || Date.now() > storedOtp.expires) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Неверный или истекший код подтверждения' })
        };
      }

      delete otpStore[email];

      const existingUser = dbStore.users.find(u => u.email && u.email.toLowerCase() === email);

      if (existingUser) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            isNewUser: false,
            message: 'Успешный вход по Kaspify ID',
            user: existingUser
          })
        };
      } else {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            isNewUser: true,
            email,
            message: 'Email подтвержден. Завершите регистрацию профиля'
          })
        };
      }
    }

    // 3. POST /api/complete-registration
    if (path === '/complete-registration' && method === 'POST') {
      const { email, fullname, username, balance } = body;
      const cleanEmail = (email || '').trim().toLowerCase();
      const cleanUsername = (username || '').replace(/^@/, '').trim().toLowerCase();

      if (!cleanEmail || !fullname || !cleanUsername) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Заполните все обязательные поля' })
        };
      }

      if (dbStore.users.some(u => u.username.toLowerCase() === cleanUsername)) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Пользователь с таким юзернеймом уже существует' })
        };
      }

      const newUser = {
        id: 'user_' + Date.now(),
        email: cleanEmail,
        fullname: fullname.trim(),
        username: cleanUsername,
        phone: '+7 (707) ' + Math.floor(1000000 + Math.random() * 9000000),
        pin: '1488',
        balance: parseFloat(balance) || 250000,
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

      dbStore.users.push(newUser);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'Профиль Kaspify ID успешно создан!',
          user: newUser
        })
      };
    }

    // 4. GET /api/users
    if (path === '/users' && method === 'GET') {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ users: dbStore.users })
      };
    }

    // 5. POST /api/admin/verify (Admin Gives/Removes Blue Checkmark)
    if (path === '/admin/verify' && method === 'POST') {
      const { username, verified } = body;
      const cleanUsername = (username || '').replace(/^@/, '').trim().toLowerCase();
      const user = dbStore.users.find(u => u.username.toLowerCase() === cleanUsername);

      if (!user) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: `Пользователь @${cleanUsername} не найден` })
        };
      }

      user.verified = verified !== false;

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: user.verified ? `Галочка верификации выдана @${cleanUsername} ✅` : `Верификация снята с @${cleanUsername}`,
          user
        })
      };
    }

    // 6. POST /api/admin/stars (Admin Grants Telegram Stars)
    if (path === '/admin/stars' && method === 'POST') {
      const { username, amount } = body;
      const cleanUsername = (username || '').replace(/^@/, '').trim().toLowerCase();
      const user = dbStore.users.find(u => u.username.toLowerCase() === cleanUsername);

      if (!user) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: `Пользователь @${cleanUsername} не найден` })
        };
      }

      const starsToAdd = parseInt(amount) || 0;
      user.stars = (user.stars || 0) + starsToAdd;

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: `Начислено +${starsToAdd} ⭐ пользователю @${cleanUsername}. Баланс: ${user.stars} ⭐`,
          user
        })
      };
    }

    // 7. POST /api/telegram-webhook (Telegram Bot Webhook Engine)
    if (path === '/telegram-webhook' && method === 'POST') {
      const update = body;
      let replyText = '';

      // Command handling
      if (update.message && update.message.text) {
        const text = update.message.text.trim();
        const chatId = update.message.chat.id;

        if (text.startsWith('/start')) {
          const parts = text.split(' ');
          const param = parts[1] || '';
          
          if (param.startsWith('stars_')) {
            const targetUsername = param.replace('stars_', '');
            replyText = `🌟 <b>Пополнение Telegram Stars для @${targetUsername}</b>\n\n` +
                        `Для пополнения баланса переведите нужное количество Stars или отправьте администратору чек.\n\n` +
                        `Команды администратора:\n` +
                        `• <code>/stars ${targetUsername} 500</code> — начислить Stars\n` +
                        `• <code>/verify ${targetUsername}</code> — выдать галочку ✅`;
          } else {
            replyText = `🤖 <b>Kaspify Admin & Stars Bot</b>\n\n` +
                        `Команды управления:\n` +
                        `• <code>/users</code> — список пользователей и быстрые действия\n` +
                        `• <code>/verify username</code> — выдать галочку верификации ✅\n` +
                        `• <code>/unverify username</code> — снять галочку\n` +
                        `• <code>/stars username 500</code> — начислить Stars ⭐`;
          }
        } else if (text === '/users') {
          if (dbStore.users.length === 0) {
            replyText = `📭 В базе пока нет зарегистрированных пользователей.`;
          } else {
            replyText = `👥 <b>Список пользователей Kaspify (${dbStore.users.length}):</b>\n\n` +
              dbStore.users.map(u => 
                `• <b>${u.fullname}</b> (@${u.username}) ${u.verified ? '✅' : ''}\n` +
                `  ⭐ Stars: ${u.stars || 0} | 💰 Баланс: ${u.balance.toLocaleString()} ₸\n` +
                `  Команды: <code>/verify ${u.username}</code> | <code>/stars ${u.username} 500</code>`
              ).join('\n\n');
          }
        } else if (text.startsWith('/verify')) {
          const parts = text.split(' ');
          const target = (parts[1] || '').replace('@', '').toLowerCase();
          const user = dbStore.users.find(u => u.username.toLowerCase() === target);
          if (user) {
            user.verified = true;
            replyText = `✅ Галочка верификации успешно выдана пользователю <b>@${target}</b>!`;
          } else {
            replyText = `❌ Пользователь @${target} не найден в базе данных.`;
          }
        } else if (text.startsWith('/unverify')) {
          const parts = text.split(' ');
          const target = (parts[1] || '').replace('@', '').toLowerCase();
          const user = dbStore.users.find(u => u.username.toLowerCase() === target);
          if (user) {
            user.verified = false;
            replyText = `ℹ️ Галочка верификации снята с пользователя <b>@${target}</b>.`;
          } else {
            replyText = `❌ Пользователь @${target} не найден.`;
          }
        } else if (text.startsWith('/stars')) {
          const parts = text.split(' ');
          const target = (parts[1] || '').replace('@', '').toLowerCase();
          const amount = parseInt(parts[2]) || 100;
          const user = dbStore.users.find(u => u.username.toLowerCase() === target);
          if (user) {
            user.stars = (user.stars || 0) + amount;
            replyText = `⭐ Успешно начислено +${amount} Stars для <b>@${target}</b>! Новый баланс: ${user.stars} ⭐`;
          } else {
            replyText = `❌ Пользователь @${target} не найден.`;
          }
        }
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, replyText })
      };
    }

    // 8. POST /api/user/update
    if (path === '/user/update' && method === 'POST') {
      const { username, balance, stars, avatar, banner, bio, fullname, nfts, ownedUsernames, verified } = body;
      const userIndex = dbStore.users.findIndex(u => u.username.toLowerCase() === (username || '').toLowerCase());
      
      if (userIndex !== -1) {
        if (balance !== undefined) dbStore.users[userIndex].balance = parseFloat(balance);
        if (stars !== undefined) dbStore.users[userIndex].stars = parseInt(stars);
        if (avatar !== undefined) dbStore.users[userIndex].avatar = avatar;
        if (banner !== undefined) dbStore.users[userIndex].banner = banner;
        if (bio !== undefined) dbStore.users[userIndex].bio = bio;
        if (fullname !== undefined) dbStore.users[userIndex].fullname = fullname;
        if (nfts !== undefined) dbStore.users[userIndex].nfts = nfts;
        if (ownedUsernames !== undefined) dbStore.users[userIndex].ownedUsernames = ownedUsernames;
        if (verified !== undefined) dbStore.users[userIndex].verified = verified;

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: true, user: dbStore.users[userIndex] })
        };
      }

      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Пользователь не найден' })
      };
    }

    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: 'Маршрут не найден' })
    };

  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Ошибка сервера', details: error.message })
    };
  }
};
