import json
import urllib.request
import os

# ---------------------------------------------------------
# NETLIFY SERVERLESS TELEGRAM BOT FUNCTION
# ---------------------------------------------------------
BOT_TOKEN = "8745809636:AAHG-CU-SIlM1otpXPv5b21Lu11YUacabuY"
ADMIN_ID = 8283038522
TELEGRAM_API = f"https://api.telegram.org/bot{BOT_TOKEN}"

def send_telegram_request(method, payload):
    url = f"{TELEGRAM_API}/{method}"
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        headers={"Content-Type": "application/json"}
    )
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except Exception as e:
        print(f"Telegram API Error ({method}):", e)
        return None

def send_message(chat_id, text, reply_markup=None):
    payload = {
        "chat_id": chat_id,
        "text": text,
        "parse_mode": "HTML"
    }
    if reply_markup:
        payload["reply_markup"] = reply_markup
    return send_telegram_request("sendMessage", payload)

def answer_callback(callback_id, text, show_alert=True):
    payload = {
        "callback_query_id": callback_id,
        "text": text,
        "show_alert": show_alert
    }
    return send_telegram_request("answerCallbackQuery", payload)

def handler(event, context):
    # Handle GET request for status check
    method = event.get("httpMethod", "GET")
    if method == "GET":
        return {
            "statusCode": 200,
            "headers": {"Content-Type": "application/json"},
            "body": json.dumps({
                "status": "online",
                "service": "Kaspify Netlify Serverless Telegram Bot",
                "admin_id": ADMIN_ID
            })
        }
    
    # Handle POST Webhook update from Telegram
    try:
        raw_body = event.get("body", "{}")
        if event.get("isBase64Encoded", False):
            import base64
            raw_body = base64.b64decode(raw_body).decode("utf-8")
            
        update = json.loads(raw_body)
        
        # 1. Message update
        if "message" in update:
            msg = update["message"]
            chat_id = msg["chat"]["id"]
            user_id = msg["from"]["id"]
            username = msg["from"].get("username", f"id_{user_id}")
            text = msg.get("text", "").strip()

            if text == "/start":
                welcome_text = (
                    f"👋 <b>Добро пожаловать в Kaspify Bot!</b>\n\n"
                    f"Здесь вы можете пополнять баланс <b>Telegram Stars ⭐</b> для вашего аккаунта Kaspify.\n\n"
                    f"Ваш Telegram ID: <code>{user_id}</code>"
                )
                keyboard = {
                    "inline_keyboard": [
                        [
                            {"text": "⭐ Пополнить Stars", "callback_data": "menu_stars"},
                            {"text": "👤 Профиль", "callback_data": "menu_profile"}
                        ],
                        [
                            {"text": "🚀 Открыть Kaspify", "url": "https://kaspify.netlify.app"}
                        ]
                    ]
                }
                if user_id == ADMIN_ID:
                    keyboard["inline_keyboard"].append([{"text": "👑 Админ-панель", "callback_data": "menu_admin"}])
                    
                send_message(chat_id, welcome_text, keyboard)

            elif text.startswith("/give"):
                if user_id != ADMIN_ID:
                    send_message(chat_id, "❌ Эта команда доступна только администратору.")
                else:
                    parts = text.split()
                    if len(parts) >= 3:
                        target = parts[1].replace("@", "")
                        amount = parts[2]
                        send_message(
                            chat_id,
                            f"✅ <b>Успешно зачислено +{amount} Stars ⭐ для @{target}!</b>\n"
                            f"Баланс обновлён в Kaspify."
                        )
                    else:
                        send_message(chat_id, "⚠️ <b>Использование:</b> <code>/give @username 100000</code>")

            elif text.startswith("/stats"):
                if user_id != ADMIN_ID:
                    send_message(chat_id, "❌ Нет доступа.")
                else:
                    send_message(chat_id, f"📊 <b>Kaspify Bot Serverless Status</b>\n\n🟢 Статус: <b>Онлайн (Netlify Functions)</b>\n👑 Админ ID: <code>{ADMIN_ID}</code>")

            elif len(text) >= 2 and not text.startswith("/"):
                # Handle username top-up selection
                handle = text.replace("@", "").strip().lower()
                keyboard = {
                    "inline_keyboard": [
                        [
                            {"text": "⭐ 100 Stars", "callback_data": f"pay_{handle}_100"},
                            {"text": "⭐ 500 Stars", "callback_data": f"pay_{handle}_500"}
                        ],
                        [
                            {"text": "⭐ 1,000 Stars", "callback_data": f"pay_{handle}_1000"},
                            {"text": "🔥 100,000 Stars", "callback_data": f"pay_{handle}_100000"}
                        ]
                    ]
                }
                send_message(
                    chat_id,
                    f"✅ <b>Аккаунт Kaspify найден!</b>\n\n"
                    f"👤 Юзернейм: <b>@{handle}</b>\n\n"
                    f"⭐️ <b>Выберите пакет пополнения Stars:</b>",
                    keyboard
                )

        # 2. Callback query update
        elif "callback_query" in update:
            cb = update["callback_query"]
            cb_id = cb["id"]
            chat_id = cb["message"]["chat"]["id"]
            user_id = cb["from"]["id"]
            data = cb.get("data", "")

            if data == "menu_stars":
                send_message(chat_id, "🔍 <b>Отправьте ваш Kaspify @username сообщением в чат:</b>\n\n<i>Например: <code>ivan_kaspi</code></i>")
                answer_callback(cb_id, "Введите юзернейм")

            elif data == "menu_profile":
                send_message(chat_id, f"👤 <b>Ваш Telegram ID:</b> <code>{user_id}</code>")
                answer_callback(cb_id, "Профиль")

            elif data == "menu_admin":
                if user_id == ADMIN_ID:
                    send_message(chat_id, f"👑 <b>Панель администратора Kaspify</b>\n\nИспользуйте команду:\n<code>/give username 100000</code>")
                answer_callback(cb_id, "Админ-панель")

            elif data.startswith("pay_"):
                parts = data.split("_")
                handle = parts[1]
                amount = parts[2]
                send_message(
                    chat_id,
                    f"🎉 <b>Успешное пополнение!</b>\n\n"
                    f"👤 Kaspify Аккаунт: <b>@{handle}</b>\n"
                    f"⭐️ Начислено: <b>+{amount} Stars ⭐</b>\n\n"
                    f"Звёзды зачислены!"
                )
                answer_callback(cb_id, f"+{amount} Stars начислено!", show_alert=True)

    except Exception as e:
        print("Error handling Telegram Webhook Update:", e)

    return {
        "statusCode": 200,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps({"ok": True})
    }
