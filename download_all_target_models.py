import urllib.request
import json
import os
import ssl
from concurrent.futures import ThreadPoolExecutor

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

targets = [
    'durovs_cap', 'plush_pepe', 'electric_skull', 'durovs_glasses',
    'heroic_helmet', 'mighty_arm', 'gem_signet', 'heart_locket',
    'genie_lamp', 'bonded_ring', 'mini_oscar', 'ion_gem',
    'neko_helmet', 'ionic_dryer', 'diamond_ring', 'magic_potion',
    'crystal_ball', 'evil_eye', 'eternal_rose', 'love_potion',
    'kissed_frog', 'sakura_flower', 'hanging_star', 'homemade_cake',
    'ice_cream', 'jelly_bunny', 'lol_pop', 'precious_peach',
    'snoop_dogg', 'chill_flame'
]

dest_roots = [
    r'c:\Users\пк\Desktop\ОСНОВААА\v1.3\assets\nfts\models',
    r'c:\Users\пк\Desktop\ОСНОВААА\assets\nfts\models'
]

for r in dest_roots:
    os.makedirs(r, exist_ok=True)

print("Fetching full repository tree...")
tree_url = 'https://api.github.com/repos/ssamy2/TelegramGiftsAssests/git/trees/main?recursive=1'
req = urllib.request.Request(tree_url, headers={'User-Agent': 'Mozilla/5.0'})

with urllib.request.urlopen(req, timeout=15, context=ctx) as resp:
    tree_data = json.loads(resp.read().decode('utf-8'))['tree']

download_list = []
manifest = {t: [] for t in targets}

for item in tree_data:
    path = item['path']
    if path.startswith('models/') and path.endswith('.webp'):
        parts = path.split('/')
        if len(parts) == 3:
            coll = parts[1]
            fname = parts[2]
            if coll in targets:
                model_name = fname[:-5]
                manifest[coll].append(model_name)
                raw_url = f'https://raw.githubusercontent.com/ssamy2/TelegramGiftsAssests/main/{path}'
                download_list.append((coll, fname, raw_url))

print(f"Total matching model variations to download: {len(download_list)}")

def download_one(task):
    coll, fname, url = task
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    try:
        with urllib.request.urlopen(req, timeout=15, context=ctx) as r:
            data = r.read()
            for root in dest_roots:
                cdir = os.path.join(root, coll)
                os.makedirs(cdir, exist_ok=True)
                with open(os.path.join(cdir, fname), 'wb') as f:
                    f.write(data)
            return True
    except Exception as e:
        return False

# Download concurrently with 32 workers for high speed
with ThreadPoolExecutor(max_workers=32) as executor:
    results = list(executor.map(download_one, download_list))

success_count = sum(1 for r in results if r)
print(f"Downloaded {success_count} / {len(download_list)} models successfully!")

for root in dest_roots:
    manifest_path = os.path.join(root, 'manifest.json')
    with open(manifest_path, 'w', encoding='utf-8') as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)

print("Saved models manifest to both directories!")
