import urllib.request
import json
import sys

BOT_TOKEN = "8745809636:AAHG-CU-SIlM1otpXPv5b21Lu11YUacabuY"

def set_webhook(site_url):
    site_url = site_url.rstrip("/")
    webhook_url = f"{site_url}/.netlify/functions/bot"
    api_url = f"https://api.telegram.org/bot{BOT_TOKEN}/setWebhook?url={webhook_url}"
    
    print(f"🔗 Registering Telegram Webhook to: {webhook_url}...")
    req = urllib.request.Request(api_url)
    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            if data.get("ok"):
                print(f"✅ Webhook successfully connected! Result: {data.get('description', 'OK')}")
            else:
                print(f"❌ Error: {data}")
    except Exception as e:
        print("Error setting Webhook:", e)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python set_webhook.py https://YOUR-SITE.netlify.app")
    else:
        set_webhook(sys.argv[1])
