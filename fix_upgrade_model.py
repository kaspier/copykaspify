import re

profile_path = r'c:\Users\пк\Desktop\ОСНОВААА\v1.3\profile.html'

with open(profile_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Bump DB_VERSION
content = content.replace('const DB_VERSION = "v5_upgrade_mechanic";', 'const DB_VERSION = "v6_fix_upgrade_model_name";')
content = content.replace('const DB_VERSION = "v4_dynamic_market";', 'const DB_VERSION = "v6_fix_upgrade_model_name";')

# 2. Add collection field to initial users nfts in initUsersDatabase
content = content.replace(
    'id: "TGF-0001",\n                            name: "Durov\'s Cap",',
    'id: "TGF-0001",\n                            collection: "durovs_cap",\n                            name: "Durov\'s Cap",'
)
content = content.replace(
    'id: "TGF-0022",\n                            name: "Sakura Flower",',
    'id: "TGF-0022",\n                            collection: "sakura_flower",\n                            name: "Sakura Flower",'
)

# 3. Replace upgradeGiftToNft function with robust collection detection & Title-Case model names
old_upgrade_func_pattern = r'function upgradeGiftToNft\(giftIndex\) \{[\s\S]*?showToast\([^\)]+\);\s*\}'

new_upgrade_func = """function upgradeGiftToNft(giftIndex) {
        const gifts = currentUser.nfts || [];
        const gift = gifts[giftIndex];
        if (!gift || gift.upgraded) return;

        // Determine collection reliably
        let collection = gift.collection;
        if (!collection) {
            const found = NFT_CATALOG.find(n => 
                (gift.name && n.name.toLowerCase() === gift.name.toLowerCase()) || 
                n.id === gift.id || 
                (gift.img && gift.img.includes(n.collection))
            );
            if (found) collection = found.collection;
        }

        // Fallback to first collection if still missing
        if (!collection && NFT_CATALOG.length > 0) {
            collection = NFT_CATALOG[0].collection;
        }

        const baseCatalog = NFT_CATALOG.find(n => n.collection === collection);
        const upgradeCost = baseCatalog ? Math.round(baseCatalog.priceStars * 0.2) : 50;

        if (currentUser.stars < upgradeCost) {
            showToast(`Недостаточно Stars для улучшения (нужно ${upgradeCost} ⭐). Купите Stars через бота.`);
            openBuyStarsModal();
            return;
        }

        currentUser.stars -= upgradeCost;

        // Assign random model variation from manifest
        const models = (typeof NFT_MODELS_MANIFEST !== 'undefined' && collection && NFT_MODELS_MANIFEST[collection]) || [];
        let modelImg = gift.img;
        let modelName = 'Special Edition';

        if (models.length > 0) {
            const randomModel = models[Math.floor(Math.random() * models.length)];
            modelImg = `assets/nfts/models/${collection}/${randomModel}.webp`;
            // Capitalize each word (e.g. 'apple_slice' -> 'Apple Slice')
            modelName = randomModel.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        } else if (baseCatalog && baseCatalog.variation) {
            modelName = baseCatalog.variation;
        }

        // Assign random premium backdrop
        const backdrop = PREMIUM_GRADIENTS[Math.floor(Math.random() * PREMIUM_GRADIENTS.length)];

        // Mark as upgraded NFT
        gift.upgraded = true;
        gift.collection = collection;
        gift.img = modelImg;
        gift.variation = modelName;
        gift.backdrop = backdrop;
        gift.nftCode = "NFT-" + String(Math.floor(100000 + Math.random() * 900000));

        currentUser.nfts[giftIndex] = gift;
        saveCurrentUser();
        updateUI();
        showToast(`✨ ${gift.name} успешно улучшен до NFT! Вариация: ${modelName}`);
    }"""

match = re.search(old_upgrade_func_pattern, content)
if match:
    content = content.replace(match.group(0), new_upgrade_func)
    print("upgradeGiftToNft replaced successfully!")
else:
    print("Warning: Could not match old upgradeGiftToNft regex, trying direct slice replacement...")
    start_tag = 'function upgradeGiftToNft(giftIndex) {'
    end_tag = 'function renderMyGiftsGrid() {'
    i1 = content.find(start_tag)
    i2 = content.find(end_tag)
    if i1 != -1 and i2 != -1:
        content = content[:i1] + new_upgrade_func + "\n\n    " + content[i2:]
        print("upgradeGiftToNft replaced via slice!")

with open(profile_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Saved updated v1.3/profile.html")
