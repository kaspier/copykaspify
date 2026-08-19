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

print("Fetching full tree from GitHub with chunk reading...")
tree_url = 'https://api.github.com/repos/ssamy2/TelegramGiftsAssests/git/trees/main?recursive=1'
req = urllib.request.Request(tree_url, headers={'User-Agent': 'Mozilla/5.0'})

raw_bytes = bytearray()
with urllib.request.urlopen(req, timeout=30, context=ctx) as resp:
    while True:
        chunk = resp.read(65536)
        if not chunk:
            break
        raw_bytes.extend(chunk)

tree_data = json.loads(raw_bytes.decode('utf-8'))['tree']

missing_tasks = []
manifest = {t: [] for t in targets}

for item in tree_data:
    p = item['path']
    if p.startswith('models/') and p.endswith('.webp'):
        parts = p.split('/')
        if len(parts) == 3:
            coll = parts[1]
            fname = parts[2]
            if coll in targets:
                model_name = fname[:-5]
                manifest[coll].append(model_name)
                fpath1 = os.path.join(dest_roots[0], coll, fname)
                fpath2 = os.path.join(dest_roots[1], coll, fname)
                if not os.path.isfile(fpath1) or not os.path.isfile(fpath2) or os.path.getsize(fpath1) == 0:
                    raw_url = f'https://raw.githubusercontent.com/ssamy2/TelegramGiftsAssests/main/{p}'
                    missing_tasks.append((coll, fname, raw_url))

print(f"Total target models in manifest: {sum(len(v) for v in manifest.values())}")
print(f"Missing models to download: {len(missing_tasks)}")

def download_one(task):
    coll, fname, url = task
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    for _ in range(3):
        try:
            with urllib.request.urlopen(req, timeout=15, context=ctx) as r:
                data = r.read()
                for root in dest_roots:
                    cdir = os.path.join(root, coll)
                    os.makedirs(cdir, exist_ok=True)
                    with open(os.path.join(cdir, fname), 'wb') as f:
                        f.write(data)
                return True
        except Exception:
            pass
    return False

if missing_tasks:
    with ThreadPoolExecutor(max_workers=32) as executor:
        results = list(executor.map(download_one, missing_tasks))
    print(f"Successfully downloaded {sum(1 for r in results if r)} missing models.")

for root in dest_roots:
    with open(os.path.join(root, 'manifest.json'), 'w', encoding='utf-8') as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)

print("Saved complete manifest.json successfully!")
