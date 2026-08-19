import json
import re

manifest_path = r'c:\Users\пк\Desktop\ОСНОВААА\v1.3\assets\nfts\models\manifest.json'
with open(manifest_path, 'r', encoding='utf-8') as f:
    models_manifest = json.load(f)

profile_path = r'c:\Users\пк\Desktop\ОСНОВААА\v1.3\profile.html'
with open(profile_path, 'r', encoding='utf-8') as f:
    content = f.read()

catalog_items = [
    {"id": "TGF-0001", "collection": "durovs_cap", "name": "Durov's Cap", "img": "assets/nfts/durovs_cap.webp", "variation": "Cyber Black Edition", "backdrop": "radial-gradient(circle at 40% 30%, #1a3a6e 0%, #0c1f3f 50%, #050d1a 100%)", "rarity": "mythic", "priceTenge": 85000, "priceStars": 850, "supply": "3028"},
    {"id": "TGF-0002", "collection": "plush_pepe", "name": "Plush Pepe", "img": "assets/nfts/plush_pepe.webp", "variation": "Forest Green Rare", "backdrop": "radial-gradient(circle at 50% 40%, #2d6a4f 0%, #1b4332 55%, #081c11 100%)", "rarity": "mythic", "priceTenge": 72000, "priceStars": 720, "supply": "2448"},
    {"id": "TGF-0003", "collection": "electric_skull", "name": "Electric Skull", "img": "assets/nfts/electric_skull.webp", "variation": "Neon Volt Blue", "backdrop": "radial-gradient(circle at 50% 35%, #1e40af 0%, #0f172a 60%, #020617 100%)", "rarity": "mythic", "priceTenge": 65000, "priceStars": 650, "supply": "4188"},
    {"id": "TGF-0004", "collection": "durovs_glasses", "name": "Durov's Glasses", "img": "assets/nfts/durovs_glasses.webp", "variation": "Ultra Limited Gold", "backdrop": "radial-gradient(circle at 45% 30%, #d97706 0%, #78350f 55%, #1c1002 100%)", "rarity": "mythic", "priceTenge": 280000, "priceStars": 2800, "supply": "115"},
    {"id": "TGF-0005", "collection": "heroic_helmet", "name": "Heroic Helmet", "img": "assets/nfts/heroic_helmet.webp", "variation": "Titanium Silver", "backdrop": "radial-gradient(circle at 50% 35%, #475569 0%, #1e293b 55%, #0a0f18 100%)", "rarity": "mythic", "priceTenge": 58000, "priceStars": 580, "supply": "1257"},
    {"id": "TGF-0006", "collection": "mighty_arm", "name": "Mighty Arm", "img": "assets/nfts/mighty_arm.webp", "variation": "Iron Fist Black", "backdrop": "radial-gradient(circle at 40% 40%, #292524 0%, #1c1917 55%, #0c0a09 100%)", "rarity": "mythic", "priceTenge": 52000, "priceStars": 520, "supply": "1766"},
    {"id": "TGF-0007", "collection": "gem_signet", "name": "Gem Signet", "img": "assets/nfts/gem_signet.webp", "variation": "Emerald Carved", "backdrop": "radial-gradient(circle at 50% 35%, #065f46 0%, #022c22 55%, #010f0c 100%)", "rarity": "legendary", "priceTenge": 38000, "priceStars": 380, "supply": "2101"},
    {"id": "TGF-0008", "collection": "heart_locket", "name": "Heart Locket", "img": "assets/nfts/heart_locket.webp", "variation": "Rose Gold Pearl", "backdrop": "radial-gradient(circle at 50% 35%, #9f1239 0%, #4c0519 55%, #1e0008 100%)", "rarity": "legendary", "priceTenge": 35000, "priceStars": 350, "supply": "1305"},
    {"id": "TGF-0009", "collection": "genie_lamp", "name": "Genie Lamp", "img": "assets/nfts/genie_lamp.webp", "variation": "Golden Wish", "backdrop": "radial-gradient(circle at 45% 30%, #b45309 0%, #78350f 55%, #2d1003 100%)", "rarity": "legendary", "priceTenge": 28000, "priceStars": 280, "supply": "2618"},
    {"id": "TGF-0010", "collection": "bonded_ring", "name": "Bonded Ring", "img": "assets/nfts/bonded_ring.webp", "variation": "Diamond Cut Platinum", "backdrop": "radial-gradient(circle at 50% 35%, #6366f1 0%, #312e81 55%, #0d0b29 100%)", "rarity": "legendary", "priceTenge": 25000, "priceStars": 250, "supply": "2842"},
    {"id": "TGF-0011", "collection": "mini_oscar", "name": "Mini Oscar", "img": "assets/nfts/mini_oscar.webp", "variation": "24K Gilded Award", "backdrop": "radial-gradient(circle at 50% 30%, #ca8a04 0%, #713f12 55%, #1e0d00 100%)", "rarity": "legendary", "priceTenge": 22000, "priceStars": 220, "supply": "2107"},
    {"id": "TGF-0012", "collection": "ion_gem", "name": "Ion Gem", "img": "assets/nfts/ion_gem.webp", "variation": "Plasma Crystal Blue", "backdrop": "radial-gradient(circle at 50% 35%, #0891b2 0%, #164e63 55%, #042430 100%)", "rarity": "legendary", "priceTenge": 20000, "priceStars": 200, "supply": "2613"},
    {"id": "TGF-0013", "collection": "neko_helmet", "name": "Neko Helmet", "img": "assets/nfts/neko_helmet.webp", "variation": "Kawaii Pink", "backdrop": "radial-gradient(circle at 50% 35%, #ec4899 0%, #831843 55%, #2d0019 100%)", "rarity": "legendary", "priceTenge": 18000, "priceStars": 180, "supply": "3994"},
    {"id": "TGF-0014", "collection": "ionic_dryer", "name": "Ionic Dryer", "img": "assets/nfts/ionic_dryer.webp", "variation": "Metallic Gunmetal", "backdrop": "radial-gradient(circle at 50% 35%, #374151 0%, #111827 55%, #030712 100%)", "rarity": "legendary", "priceTenge": 16000, "priceStars": 160, "supply": "2449"},
    {"id": "TGF-0015", "collection": "diamond_ring", "name": "Diamond Ring", "img": "assets/nfts/diamond_ring.webp", "variation": "Princess Cut VVS", "backdrop": "radial-gradient(circle at 50% 30%, #38bdf8 0%, #0c4a6e 55%, #011728 100%)", "rarity": "epic", "priceTenge": 12000, "priceStars": 120, "supply": "8169"},
    {"id": "TGF-0016", "collection": "magic_potion", "name": "Magic Potion", "img": "assets/nfts/magic_potion.webp", "variation": "Purple Mana Brew", "backdrop": "radial-gradient(circle at 50% 35%, #7c3aed 0%, #3b0764 55%, #12002a 100%)", "rarity": "epic", "priceTenge": 10500, "priceStars": 105, "supply": "3275"},
    {"id": "TGF-0017", "collection": "crystal_ball", "name": "Crystal Ball", "img": "assets/nfts/crystal_ball.webp", "variation": "Nebula Mystic", "backdrop": "radial-gradient(circle at 50% 35%, #6d28d9 0%, #2e1065 55%, #0d0029 100%)", "rarity": "epic", "priceTenge": 9500, "priceStars": 95, "supply": "7997"},
    {"id": "TGF-0018", "collection": "evil_eye", "name": "Evil Eye", "img": "assets/nfts/evil_eye.webp", "variation": "Sapphire Amulet", "backdrop": "radial-gradient(circle at 50% 40%, #1d4ed8 0%, #1e3a8a 55%, #030d28 100%)", "rarity": "epic", "priceTenge": 8500, "priceStars": 85, "supply": "17784"},
    {"id": "TGF-0019", "collection": "eternal_rose", "name": "Eternal Rose", "img": "assets/nfts/eternal_rose.webp", "variation": "Crimson Silk Petal", "backdrop": "radial-gradient(circle at 50% 30%, #e11d48 0%, #881337 55%, #200008 100%)", "rarity": "epic", "priceTenge": 7800, "priceStars": 78, "supply": "5392"},
    {"id": "TGF-0020", "collection": "love_potion", "name": "Love Potion", "img": "assets/nfts/love_potion.webp", "variation": "Strawberry Blush", "backdrop": "radial-gradient(circle at 50% 35%, #f43f5e 0%, #9f1239 55%, #280009 100%)", "rarity": "epic", "priceTenge": 7200, "priceStars": 72, "supply": "6413"},
    {"id": "TGF-0021", "collection": "kissed_frog", "name": "Kissed Frog", "img": "assets/nfts/kissed_frog.webp", "variation": "Enchanted Emerald", "backdrop": "radial-gradient(circle at 50% 35%, #16a34a 0%, #14532d 55%, #022c22 100%)", "rarity": "rare", "priceTenge": 5500, "priceStars": 55, "supply": "7504"},
    {"id": "TGF-0022", "collection": "sakura_flower", "name": "Sakura Flower", "img": "assets/nfts/sakura_flower.webp", "variation": "Cherry Blossom Pink", "backdrop": "radial-gradient(circle at 50% 30%, #f9a8d4 0%, #be185d 55%, #3d0020 100%)", "rarity": "rare", "priceTenge": 4800, "priceStars": 48, "supply": "13306"},
    {"id": "TGF-0023", "collection": "hanging_star", "name": "Hanging Star", "img": "assets/nfts/hanging_star.webp", "variation": "Stellar Gold", "backdrop": "radial-gradient(circle at 50% 30%, #facc15 0%, #a16207 55%, #2c1c00 100%)", "rarity": "rare", "priceTenge": 4200, "priceStars": 42, "supply": "6475"},
    {"id": "TGF-0024", "collection": "homemade_cake", "name": "Homemade Cake", "img": "assets/nfts/homemade_cake.webp", "variation": "Strawberry Cream", "backdrop": "radial-gradient(circle at 50% 35%, #fb923c 0%, #9a3412 55%, #270b00 100%)", "rarity": "rare", "priceTenge": 3900, "priceStars": 39, "supply": "32614"},
    {"id": "TGF-0025", "collection": "ice_cream", "name": "Ice Cream", "img": "assets/nfts/ice_cream.webp", "variation": "Rainbow Soft Serve", "backdrop": "radial-gradient(circle at 50% 30%, #f0abfc 0%, #7e22ce 55%, #2e0052 100%)", "rarity": "rare", "priceTenge": 3500, "priceStars": 35, "supply": "32695"},
    {"id": "TGF-0026", "collection": "jelly_bunny", "name": "Jelly Bunny", "img": "assets/nfts/jelly_bunny.webp", "variation": "Pastel Gummy", "backdrop": "radial-gradient(circle at 50% 35%, #34d399 0%, #065f46 55%, #012317 100%)", "rarity": "rare", "priceTenge": 3200, "priceStars": 32, "supply": "13350"},
    {"id": "TGF-0027", "collection": "lol_pop", "name": "Lol Pop", "img": "assets/nfts/lol_pop.webp", "variation": "Candy Swirl Neon", "backdrop": "radial-gradient(circle at 50% 35%, #f472b6 0%, #9d174d 55%, #2d0021 100%)", "rarity": "rare", "priceTenge": 2800, "priceStars": 28, "supply": "65287"},
    {"id": "TGF-0028", "collection": "precious_peach", "name": "Precious Peach", "img": "assets/nfts/precious_peach.webp", "variation": "Fuzzy Apricot", "backdrop": "radial-gradient(circle at 50% 35%, #fdba74 0%, #c2410c 55%, #3b0e04 100%)", "rarity": "rare", "priceTenge": 2600, "priceStars": 26, "supply": "2111"},
    {"id": "TGF-0029", "collection": "snoop_dogg", "name": "Snoop Dogg", "img": "assets/nfts/snoop_dogg.webp", "variation": "G-Funk Haze", "backdrop": "radial-gradient(circle at 50% 35%, #4ade80 0%, #15803d 55%, #052e16 100%)", "rarity": "rare", "priceTenge": 2400, "priceStars": 24, "supply": "52794"},
    {"id": "TGF-0030", "collection": "chill_flame", "name": "Chill Flame", "img": "assets/nfts/chill_flame.webp", "variation": "Arctic Blue Fire", "backdrop": "radial-gradient(circle at 50% 35%, #22d3ee 0%, #0e7490 55%, #0a2030 100%)", "rarity": "rare", "priceTenge": 2200, "priceStars": 22, "supply": "35737"}
]

catalog_json = json.dumps(catalog_items, indent=4, ensure_ascii=False)
manifest_json = json.dumps(models_manifest, indent=4, ensure_ascii=False)

js_block = f"""    const NFT_CATALOG = {catalog_json};

    const NFT_MODELS_MANIFEST = {manifest_json};"""

pattern = r'const NFT_CATALOG = \[[\s\S]*?\];'
new_content = re.sub(pattern, js_block, content, count=1)

with open(profile_path, 'w', encoding='utf-8') as f:
    f.write(new_content)

print("Updated profile.html successfully with catalog and manifest!")
