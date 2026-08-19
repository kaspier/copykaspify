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

manifest = {}
download_tasks = []

print('Fetching model listings for all 30 collections from GitHub API...')

def fetch_collection_models(coll):
    api_url = f'https://api.github.com/repos/ssamy2/TelegramGiftsAssests/contents/models/{coll}'
    req = urllib.request.Request(api_url, headers={'User-Agent': 'Mozilla/5.0'})
    try:
        with urllib.request.urlopen(req, timeout=12, context=ctx) as resp:
            items = json.loads(resp.read().decode('utf-8'))
            models = []
            for item in items:
                fname = item['name']
                if fname.endswith('.webp'):
                    model_name = fname[:-5]
                    raw_url = f'https://raw.githubusercontent.com/ssamy2/TelegramGiftsAssests/main/models/{coll}/{fname}'
                    models.append({'name': model_name, 'file': fname, 'url': raw_url})
            return coll, models
    except Exception as e:
        print(f'Err fetching listing for {coll}: {e}')
        return coll, []

with ThreadPoolExecutor(max_workers=8) as executor:
    results = executor.map(fetch_collection_models, targets)
    for coll, models in results:
        manifest[coll] = [m['name'] for m in models]
        for m in models:
            download_tasks.append((coll, m['file'], m['url']))

print(f'Total model variations found across 30 NFTs: {len(download_tasks)}')

def download_model(task):
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
        print(f'Failed {coll}/{fname}: {e}')
        return False

with ThreadPoolExecutor(max_workers=16) as executor:
    done = list(executor.map(download_model, download_tasks))

success_count = sum(1 for d in done if d)
print(f'\nDownload complete! Successfully saved {success_count}/{len(download_tasks)} model images.')

for root in dest_roots:
    with open(os.path.join(root, 'manifest.json'), 'w', encoding='utf-8') as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)
print('Manifest saved successfully!')
