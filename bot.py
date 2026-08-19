import sys
import os
import json
import time
import logging
import telebot
from telebot import types

# ---------------------------------------------------------
# BOT CONFIGURATION
# ---------------------------------------------------------
BOT_TOKEN = "8745809636:AAHG-CU-SIlM1otpXPv5b21Lu11YUacabuY"
ADMIN_ID = 8283038522

bot = telebot.TeleBot(BOT_TOKEN, parse_mode="HTML")
DATA_FILE = os.path.join(os.path.dirname(__file__), "bot_data.json")

# Default registered Kaspify accounts
DEFAULT_KASPIFY_USERS = {
    "ivan_kaspi": {"fullname": "Иван Иванов", "stars": 100000},
    "alice_ton": {"fullname": "Алиса Павлова", "stars": 100000}
}

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")

def load_db():
    if os.path.exists(DATA_FILE):
        try:
            with open(DATA_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                if "kaspify_accounts" not in data:
                    data["kaspify_accounts"] = DEFAULT_KASPIFY_USERS
                return data
        except Exception as e:
            logging.error(f"Error loading DB: {e}")
    return {"users": {}, "kaspify_accounts": DEFAULT_KASPIFY_USERS, "user_sessions": {}}

def save_db(db):
    try:
        with open(DATA_FILE, "w", encoding="utf-8") as f:
            json.dump(db, f, ensure_ascii=False, indent=2)
    except Exception as e:
        logging.error(f"Error saving DB: {e}")

db = load_db()

def register_user(user):
    uid = str(user.id)
    if uid not in db["users"]:
        db["users"][uid] = {
            "id": user.id,
            "username": user.username or f"user_{user.id}",
            "first_name": user.first_name or "",
            "kaspify_username": None,
            "stars": 0,
            "joined": time.strftime("%Y-%m-%d %H:%M:%S")
        }
        save_db(db)
    return db["users"][uid]

def find_kaspify_account(username):
    clean_name = username.replace("@", "").strip().lower()
    accounts = db.get("kaspify_accounts", {})
    for handle, info in accounts.items():
        if handle.lower() == clean_name:
            return handle, info
    return None, None

# ---------------------------------------------------------
# BOT COMMANDS & HANDLERS
# ---------------------------------------------------------
@bot.message_handler(commands=['start'])
def handle_start(message):
    u = register_user(message.from_user)
    
    markup = types.InlineKeyboardMarkup(row_width=2)
    btn_stars = types.InlineKeyboardButton("⭐ Пополнить Stars", callback_data="menu_stars")
    btn_profile = types.InlineKeyboardButton("👤 Мой Профиль", callback_data="menu_profile")
    btn_app = types.InlineKeyboardButton("🚀 Открыть Kaspify WebApp", url="https://t.me/KaspifyBot/app")
    
    markup.add(btn_stars, btn_profile)
    markup.add(btn_app)
    
    if message.from_user.id == ADMIN_ID:
        btn_admin = types.InlineKeyboardButton("👑 Админ-панель", callback_data="menu_admin")
        markup.add(btn_admin)

    linked_acc = u.get("kaspify_username")
    acc_text = f"Привязан к Kaspify: <b>@{linked_acc}</b>" if linked_acc else "Привязан к Kaspify: <i>Не привязан</i>"

    text = (
        f"👋 <b>Добро пожаловать в Kaspify Bot!</b>\n\n"
        f"Здесь вы можете пополнять баланс <b>Telegram Stars ⭐</b> для вашего аккаунта Kaspify.\n\n"
        f"{acc_text}\n"
        f"Ваш Telegram ID: <code>{message.from_user.id}</code>"
    )
    bot.send_message(message.chat.id, text, reply_markup=markup)

@bot.callback_query_handler(func=lambda call: call.data == "menu_stars")
def prompt_kaspify_username(call):
    msg = bot.send_message(
        call.message.chat.id,
        "🔍 <b>Введите ваш Kaspify @username для проверки</b>:\n\n"
        "<i>Например: <code>ivan_kaspi</code> или <code>alice_ton</code></i>"
    )
    bot.register_next_step_handler(msg, process_username_check)

def process_username_check(message):
    raw_input = message.text.strip() if message.text else ""
    if not raw_input:
        bot.send_message(message.chat.id, "❌ Пожалуйста, введите текстовый юзернейм.")
        return
    
    handle, acc_info = find_kaspify_account(raw_input)
    
    if not handle:
        clean_handle = raw_input.replace("@", "").strip().lower()
        if len(clean_handle) >= 3:
            db["kaspify_accounts"][clean_handle] = {
                "fullname": clean_handle.capitalize(),
                "stars": 0
            }
            save_db(db)
            handle = clean_handle
            acc_info = db["kaspify_accounts"][clean_handle]
        else:
            bot.send_message(
                message.chat.id,
                f"❌ <b>Пользователь <code>{raw_input}</code> не найден в Kaspify!</b>\n\n"
                f"Пожалуйста, проверьте правильность юзернейма и попробуйте снова через /start."
            )
            return
            
    # Save active session username
    uid = str(message.from_user.id)
    if uid in db["users"]:
        db["users"][uid]["kaspify_username"] = handle
        save_db(db)

    # Show package options
    markup = types.InlineKeyboardMarkup(row_width=2)
    btn1 = types.InlineKeyboardButton("⭐ 100 Stars", callback_data=f"pay_{handle}_100")
    btn2 = types.InlineKeyboardButton("⭐ 500 Stars", callback_data=f"pay_{handle}_500")
    btn3 = types.InlineKeyboardButton("⭐ 1,000 Stars", callback_data=f"pay_{handle}_1000")
    btn4 = types.InlineKeyboardButton("🔥 100,000 Stars", callback_data=f"pay_{handle}_100000")
    btn_back = types.InlineKeyboardButton("⬅️ Отмена", callback_data="menu_main")
    
    markup.add(btn1, btn2)
    markup.add(btn3, btn4)
    markup.add(btn_back)
    
    current_stars = acc_info.get("stars", 0)
    
    bot.send_message(
        message.chat.id,
        f"✅ <b>Аккаунт Kaspify найден!</b>\n\n"
        f"👤 Юзернейм: <b>@{handle}</b>\n"
        f"💰 Текущий баланс: <b>{current_stars:,} ⭐</b>\n\n"
        f"⭐️ <b>Выберите пакет пополнения Stars:</b>",
        reply_markup=markup
    )

@bot.callback_query_handler(func=lambda call: call.data.startswith("pay_"))
def process_stars_payment(call):
    parts = call.data.split("_")
    if len(parts) < 3:
        return
    
    handle = parts[1]
    amount = int(parts[2])
    
    if handle not in db["kaspify_accounts"]:
        db["kaspify_accounts"][handle] = {"fullname": handle, "stars": 0}
        
    db["kaspify_accounts"][handle]["stars"] = db["kaspify_accounts"][handle].get("stars", 0) + amount
    save_db(db)
    
    bot.answer_callback_query(call.id, f"Успешно начислено +{amount:,} ⭐ для @{handle}!", show_alert=True)
    
    markup = types.InlineKeyboardMarkup()
    markup.add(types.InlineKeyboardButton("⬅️ Главное меню", callback_data="menu_main"))
    
    new_bal = db["kaspify_accounts"][handle]["stars"]
    
    bot.edit_message_text(
        f"🎉 <b>Успешное пополнение!</b>\n\n"
        f"👤 Аккаунт: <b>@{handle}</b>\n"
        f"⭐️ Начислено: <b>+{amount:,} Stars</b>\n"
        f"💰 Новый баланс Kaspify: <b>{new_bal:,} ⭐</b>\n\n"
        f"Звёзды автоматически зачислены в ваш профиль Kaspify!",
        chat_id=call.message.chat.id,
        message_id=call.message.message_id,
        reply_markup=markup
    )

@bot.message_handler(commands=['give'])
def handle_give_stars(message):
    if message.from_user.id != ADMIN_ID:
        bot.reply_to(message, "❌ Эта команда доступна только администратору.")
        return
    
    parts = message.text.split()
    if len(parts) < 3:
        bot.reply_to(
            message,
            "⚠️ <b>Формат команды:</b>\n"
            "<code>/give <username_из_kaspify> <количество></code>\n\n"
            "Пример: <code>/give ivan_kaspi 100000</code>\n"
            "Пример: <code>/give @alice_ton 50000</code>"
        )
        return
    
    handle = parts[1].replace("@", "").strip().lower()
    try:
        amount = int(parts[2])
    except ValueError:
        bot.reply_to(message, "❌ Укажите числовое количество звёзд.")
        return

    if handle not in db["kaspify_accounts"]:
        db["kaspify_accounts"][handle] = {"fullname": handle, "stars": 0}
        
    db["kaspify_accounts"][handle]["stars"] = db["kaspify_accounts"][handle].get("stars", 0) + amount
    save_db(db)
    
    new_balance = db["kaspify_accounts"][handle]["stars"]
    bot.reply_to(
        message,
        f"✅ <b>Успешно выдано +{amount:,} ⭐!</b>\n"
        f"👤 Kaspify Аккаунт: <b>@{handle}</b>\n"
        f"💰 Новый баланс: <b>{new_balance:,} ⭐</b>"
    )

@bot.message_handler(commands=['admin', 'panel'])
def handle_admin_panel(message):
    if message.from_user.id != ADMIN_ID:
        bot.reply_to(message, "❌ У вас нет прав админа.")
        return
    
    markup = types.InlineKeyboardMarkup(row_width=1)
    btn_give = types.InlineKeyboardButton("⭐️ Выдать Stars в Kaspify", callback_data="admin_give_prompt")
    btn_stats = types.InlineKeyboardButton("📊 Статистика аккаунтов", callback_data="admin_stats")
    markup.add(btn_give, btn_stats)
    
    bot.send_message(
        message.chat.id,
        "👑 <b>Панель администратора Kaspify</b>\n\n"
        "• <code>/give ivan_kaspi 100000</code> — выдать звёзды пользователю Kaspify\n"
        "• <code>/stats</code> — статистика пользователей",
        reply_markup=markup
    )

@bot.message_handler(commands=['stats'])
def handle_stats(message):
    if message.from_user.id != ADMIN_ID:
        bot.reply_to(message, "❌ У вас нет доступа к статистике.")
        return
    
    accounts = db.get("kaspify_accounts", {})
    total_stars = sum(a.get("stars", 0) for a in accounts.values())
    
    text = f"📊 <b>Статистика Kaspify:</b>\n\n👥 Зарегистрировано аккаунтов: <b>{len(accounts)}</b>\n⭐️ Всего Stars: <b>{total_stars:,} ⭐</b>\n\n"
    for h, data in list(accounts.items())[:10]:
        text += f"• <b>@{h}</b>: {data.get('stars', 0):,} ⭐\n"
        
    bot.reply_to(message, text)

@bot.callback_query_handler(func=lambda call: True)
def handle_callback(call):
    u = register_user(call.from_user)
    
    if call.data == "menu_profile":
        linked = u.get("kaspify_username", "не привязан")
        markup = types.InlineKeyboardMarkup()
        markup.add(types.InlineKeyboardButton("⬅️ Назад", callback_data="menu_main"))
        
        bot.edit_message_text(
            f"👤 <b>Профиль Telegram</b>\n\n"
            f"Имя: <b>{call.from_user.first_name}</b>\n"
            f"ID: <code>{call.from_user.id}</code>\n"
            f"Привязанный Kaspify: <b>@{linked}</b>",
            chat_id=call.message.chat.id,
            message_id=call.message.message_id,
            reply_markup=markup
        )

    elif call.data == "admin_give_prompt":
        if call.from_user.id != ADMIN_ID:
            bot.answer_callback_query(call.id, "❌ Нет доступа", show_alert=True)
            return
        bot.send_message(
            call.message.chat.id,
            "✍️ <b>Для начисления звёзд введите:</b>\n\n"
            "<code>/give ivan_kaspi 100000</code>"
        )

    elif call.data == "admin_stats":
        if call.from_user.id != ADMIN_ID:
            bot.answer_callback_query(call.id, "❌ Нет доступа", show_alert=True)
            return
        handle_stats(call.message)

    elif call.data == "menu_admin":
        if call.from_user.id != ADMIN_ID:
            bot.answer_callback_query(call.id, "❌ Нет доступа", show_alert=True)
            return
        handle_admin_panel(call.message)

    elif call.data == "menu_main":
        markup = types.InlineKeyboardMarkup(row_width=2)
        btn_stars = types.InlineKeyboardButton("⭐ Пополнить Stars", callback_data="menu_stars")
        btn_profile = types.InlineKeyboardButton("👤 Мой Профиль", callback_data="menu_profile")
        btn_app = types.InlineKeyboardButton("🚀 Открыть Kaspify WebApp", url="https://t.me/KaspifyBot/app")
        markup.add(btn_stars, btn_profile)
        markup.add(btn_app)
        
        if call.from_user.id == ADMIN_ID:
            btn_admin = types.InlineKeyboardButton("👑 Админ-панель", callback_data="menu_admin")
            markup.add(btn_admin)
            
        bot.edit_message_text(
            f"👋 <b>Главное меню Kaspify Bot</b>\n\n"
            f"ID: <code>{call.from_user.id}</code>",
            chat_id=call.message.chat.id,
            message_id=call.message.message_id,
            reply_markup=markup
        )

if __name__ == "__main__":
    print(f"Bot starting with interactive username verification...")
    try:
        bot.infinity_polling(timeout=10, long_polling_timeout=5)
    except Exception as e:
        print(f"Bot exited: {e}")
