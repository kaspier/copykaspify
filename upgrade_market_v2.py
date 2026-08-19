import re

profile_path = r'c:\Users\пк\Desktop\ОСНОВААА\v1.3\profile.html'

with open(profile_path, 'r', encoding='utf-8') as f:
    content = f.read()

changes = 0

# ============================================================
# 1. BUMP DB_VERSION to force localStorage reset
# ============================================================
old_ver = 'const DB_VERSION = "v4_dynamic_market";'
new_ver = 'const DB_VERSION = "v5_upgrade_mechanic";'
if old_ver in content:
    content = content.replace(old_ver, new_ver)
    changes += 1
    print("[1] DB_VERSION bumped to v5_upgrade_mechanic")

# ============================================================
# 2. Update Market Header: remove tenge mentions
# ============================================================
old_subtitle = 'Оригинальные Telegram NFT подарки с уникальными фонами и номерами за ₸ и Stars ⭐'
new_subtitle = 'Telegram подарки — купите за Stars и улучшите до уникальных NFT'
content = content.replace(old_subtitle, new_subtitle)
print("[2] Market subtitle updated")

# ============================================================
# 3. Update Buy NFT Modal -> "Покупка подарка"
#    Remove tenge button, change modal title & layout
# ============================================================
old_modal_title = '<div class="modal-title">Покупка Telegram Gift NFT</div>'
new_modal_title = '<div class="modal-title">Покупка подарка</div>'
content = content.replace(old_modal_title, new_modal_title)
print("[3] Modal title updated")

# Replace the two buy buttons with a single Stars-only button
old_buy_buttons = """            <div style="display: flex; gap: 10px; padding-top: 4px;">
                <button id="btnBuyTenge" class="btn-modal-primary" style="flex: 1; background: #10b981;" onclick="confirmBuyNft('tenge')">
                    Купить за ₸
                </button>
                <button id="btnBuyStars" class="btn-modal-primary" style="flex: 1; background: #f59e0b;" onclick="confirmBuyNft('stars')">
                    Купить за ⭐
                </button>
            </div>"""

new_buy_buttons = """            <div style="display: flex; flex-direction: column; gap: 8px; padding-top: 4px;">
                <button id="btnBuyStars" class="btn-modal-primary" style="width: 100%; background: linear-gradient(135deg, #f59e0b, #d97706); font-weight: 700;" onclick="confirmBuyNft('stars')">
                    Купить за Stars
                </button>
                <p style="text-align: center; color: var(--tg-text-secondary); font-size: 11px; margin-top: 2px;">Подарок можно улучшить до NFT после покупки</p>
            </div>"""

content = content.replace(old_buy_buttons, new_buy_buttons)
print("[4] Buy buttons replaced (stars only)")

# ============================================================
# 4. Hide the "Вариации 3D модели" selector in buy modal
#    (variations are random on upgrade, not on purchase)
# ============================================================
old_variations_block = """            <!-- Model Variations Selector -->
            <div class="form-group" style="gap: 6px;">
                <div style="display: flex; align-items: center; justify-content: space-between;">
                    <label class="form-label" style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Вариации 3D модели:</label>
                    <span id="selectedModelNameBadge" style="font-size: 11px; font-weight: 700; color: #38bdf8; background: rgba(56, 189, 248, 0.15); padding: 2px 8px; border-radius: 10px;">Default</span>
                </div>
                <div id="nftModelVariationsRow" style="display: flex; gap: 8px; overflow-x: auto; padding: 6px 2px 10px; scrollbar-width: none;">
                    <!-- Model variation mini-cards rendered by JS -->
                </div>
            </div>"""

new_variations_block = """            <!-- Model selection hidden - random on upgrade -->
            <div id="nftModelVariationsRow" style="display:none;"></div>
            <span id="selectedModelNameBadge" style="display:none;"></span>"""

content = content.replace(old_variations_block, new_variations_block)
print("[5] Variation selector hidden (random on upgrade)")

# ============================================================
# 5. Update Buy Stars Modal — redirect to TG bot
# ============================================================
old_stars_modal_body = """        <div class="modal-body">
            <p style="color: var(--tg-text-secondary); font-size: 13px;">Выберите пакет звёзд для покупки через Kaspi Pay или Telegram Bot:</p>
            
            <div class="stars-package-grid">
                <div class="star-pack-card" onclick="purchaseStars(50, 450)">
                    <div class="star-pack-count">50 ⭐</div>
                    <div class="star-pack-price">450 ₸</div>
                </div>
                <div class="star-pack-card" onclick="purchaseStars(150, 1250)">
                    <div class="star-pack-count">150 ⭐</div>
                    <div class="star-pack-price">1 250 ₸</div>
                </div>
                <div class="star-pack-card" onclick="purchaseStars(500, 3900)">
                    <div class="star-pack-count">500 ⭐</div>
                    <div class="star-pack-price">3 900 ₸</div>
                </div>
                <div class="star-pack-card" onclick="purchaseStars(1000, 7500)">
                    <div class="star-pack-count">1 000 ⭐</div>
                    <div class="star-pack-price">7 500 ₸</div>
                </div>
            </div>
        </div>"""

new_stars_modal_body = """        <div class="modal-body">
            <p style="color: var(--tg-text-secondary); font-size: 13px; margin-bottom: 12px;">Stars можно купить только через нашего Telegram бота. Нажмите кнопку ниже, чтобы перейти к покупке:</p>
            
            <a href="https://t.me/UnixgramBot" target="_blank" class="btn-modal-primary" style="display: flex; align-items: center; justify-content: center; gap: 8px; background: linear-gradient(135deg, #2481cc, #1a6cb3); text-decoration: none; font-weight: 700; font-size: 15px; padding: 14px;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
                Купить Stars через бота
            </a>

            <div style="margin-top: 16px; padding: 12px; background: var(--tg-surface-elevated); border-radius: 10px;">
                <p style="color: var(--tg-text-secondary); font-size: 12px; text-align: center;">После покупки Stars автоматически зачислятся на ваш баланс при следующем входе</p>
            </div>

            <div class="stars-package-grid" style="margin-top: 12px; opacity: 0.6; pointer-events: none;">
                <div class="star-pack-card">
                    <div class="star-pack-count">50 Stars</div>
                    <div class="star-pack-price" style="font-size: 11px;">через бота</div>
                </div>
                <div class="star-pack-card">
                    <div class="star-pack-count">150 Stars</div>
                    <div class="star-pack-price" style="font-size: 11px;">через бота</div>
                </div>
                <div class="star-pack-card">
                    <div class="star-pack-count">500 Stars</div>
                    <div class="star-pack-price" style="font-size: 11px;">через бота</div>
                </div>
                <div class="star-pack-card">
                    <div class="star-pack-count">1 000 Stars</div>
                    <div class="star-pack-price" style="font-size: 11px;">через бота</div>
                </div>
            </div>
        </div>"""

content = content.replace(old_stars_modal_body, new_stars_modal_body)
print("[6] Stars modal updated to TG bot redirect")

# ============================================================
# 6. Profile tab: rename "NFT Подарки" to just "Подарки"
# ============================================================
content = content.replace('<span>NFT Подарки</span>', '<span>Подарки</span>')
print("[7] Profile tab renamed to 'Подарки'")

# ============================================================
# 7. REPLACE the entire marketplace JS block
#    (from PREMIUM_GRADIENTS through confirmBuyNft end, 
#     plus renderMyGiftsGrid)
# ============================================================

# Find the old JS block boundaries
marker_start = '    /* NFT MARKETPLACE & GIFTS INVENTORY                        */\n    /* ======================================================== */\n    const PREMIUM_GRADIENTS'
# Find the beginning
idx_start = content.find('    /* NFT MARKETPLACE & GIFTS INVENTORY                        */')
idx_end_marker = '    /* ======================================================== */\n    /* PROFILE EDIT'
idx_end = content.find('    /* ======================================================== */\n    /* PROFILE EDIT')

if idx_start == -1 or idx_end == -1:
    print("ERROR: Could not locate JS block boundaries!")
    print(f"  idx_start={idx_start}, idx_end={idx_end}")
else:
    new_marketplace_js = """    /* ======================================================== */
    /* GIFT MARKETPLACE & UPGRADE SYSTEM                        */
    /* ======================================================== */
    const PREMIUM_GRADIENTS = [
        "radial-gradient(circle at 50% 30%, #1e1b4b 0%, #0f172a 70%, #020617 100%)",
        "radial-gradient(circle at 50% 30%, #311042 0%, #150524 70%, #090112 100%)",
        "radial-gradient(circle at 50% 30%, #1b4332 0%, #081c15 70%, #020b07 100%)",
        "radial-gradient(circle at 50% 30%, #450a0a 0%, #1c0505 70%, #0a0101 100%)",
        "radial-gradient(circle at 50% 30%, #0f3c4c 0%, #061e27 70%, #010a0d 100%)",
        "radial-gradient(circle at 50% 30%, #451a03 0%, #1c0b02 70%, #0a0300 100%)",
        "radial-gradient(circle at 50% 30%, #162a45 0%, #0a1424 70%, #03060d 100%)",
        "radial-gradient(circle at 50% 30%, #3a0d18 0%, #1d050a 70%, #0a0103 100%)",
        "radial-gradient(circle at 50% 30%, #064e3b 0%, #022c22 70%, #010f0c 100%)",
        "radial-gradient(circle at 50% 30%, #1e3a8a 0%, #172554 70%, #0c1033 100%)",
        "radial-gradient(circle at 40% 40%, #4c1d95 0%, #1e1065 60%, #0a0530 100%)",
        "radial-gradient(circle at 60% 30%, #78350f 0%, #451a03 60%, #1a0800 100%)",
        "radial-gradient(circle at 50% 50%, #0c4a6e 0%, #082f49 60%, #021726 100%)",
        "radial-gradient(circle at 35% 35%, #831843 0%, #500724 60%, #1f0210 100%)",
        "radial-gradient(circle at 50% 30%, #365314 0%, #1a2e05 60%, #0a1302 100%)"
    ];

    /* --- Market sells UNIMPROVED base gifts (no random model/bg) --- */
    function generateBaseListing(nftBase) {
        const id = "TGF-" + String(Math.floor(10000 + Math.random() * 90000));
        const serial = "#" + String(Math.floor(10000 + Math.random() * 89999));
        return {
            id: id,
            collection: nftBase.collection,
            name: nftBase.name,
            img: nftBase.img,
            rarity: nftBase.rarity,
            priceStars: nftBase.priceStars,
            serial: serial,
            upgraded: false
        };
    }

    function initMarketListings() {
        const stored = localStorage.getItem('kaspi_market_listings');
        if (!stored || JSON.parse(stored).length === 0) {
            const initialListings = [];
            NFT_CATALOG.forEach(nftBase => {
                initialListings.push(generateBaseListing(nftBase));
            });
            localStorage.setItem('kaspi_market_listings', JSON.stringify(initialListings));
        }
    }

    function getMarketListings() {
        initMarketListings();
        return JSON.parse(localStorage.getItem('kaspi_market_listings') || '[]');
    }

    function saveMarketListings(listings) {
        localStorage.setItem('kaspi_market_listings', JSON.stringify(listings));
    }

    function filterMarket(rarity, chip) {
        document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        renderMarketGrid(rarity);
    }

    /* Render market grid - shows base gifts (NOT upgraded NFTs) */
    function renderMarketGrid(rarityFilter) {
        const container = document.getElementById('marketGrid');
        const listings = getMarketListings();
        const items = rarityFilter === 'all' 
            ? listings 
            : listings.filter(item => item.rarity === rarityFilter);

        container.innerHTML = items.map(gift => `
            <div class="nft-card" onclick="openBuyNftModal('${gift.id}')">
                <div class="nft-backdrop" style="background: radial-gradient(circle at 50% 35%, var(--tg-surface-elevated) 0%, var(--tg-surface) 60%, var(--tg-bg) 100%);">
                    <span class="nft-rarity-pill rarity-${gift.rarity}">${rarityRu(gift.rarity)}</span>
                    <img src="${gift.img}" alt="${gift.name}" class="nft-model-img" onerror="this.style.opacity='0.4'">
                </div>
                <div class="nft-card-body">
                    <div class="nft-title">${gift.name}</div>
                    <div class="nft-variation-tag" style="color: var(--tg-text-secondary);">Подарок</div>
                    <div class="nft-price-row">
                        <span class="nft-price-stars" style="font-size: 14px; font-weight: 700; color: #f59e0b;">${gift.priceStars} Stars</span>
                    </div>
                    <button class="btn-buy-nft">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/></svg>
                        <span>Купить</span>
                    </button>
                </div>
            </div>
        `).join('');
    }

    function rarityRu(r) {
        return { mythic: 'Mythic', legendary: 'Legendary', epic: 'Epic', rare: 'Rare' }[r] || r;
    }

    let currentSelectedModelImg = null;
    let currentSelectedModelName = null;

    function openBuyNftModal(giftId) {
        const listings = getMarketListings();
        const gift = listings.find(n => n.id === giftId);
        if (!gift) return;
        selectedNftForBuy = gift;

        document.getElementById('nftModalImg').src = gift.img;
        const preview = document.getElementById('nftModalPreview');
        preview.style.background = 'radial-gradient(circle at 50% 35%, var(--tg-surface-elevated) 0%, var(--tg-surface) 60%, var(--tg-bg) 100%)';
        preview.style.borderRadius = '12px';
        document.getElementById('nftModalName').textContent = gift.name;
        document.getElementById('nftModalVariation').textContent = `Подарок ${gift.serial} — улучшите после покупки для получения уникального NFT`;

        const rarityEl = document.getElementById('nftModalRarity');
        rarityEl.textContent = rarityRu(gift.rarity);
        rarityEl.className = `nft-rarity-pill rarity-${gift.rarity}`;

        document.getElementById('btnBuyStars').textContent = `Купить за ${gift.priceStars} Stars`;

        openModal('buyNftModal');
    }

    function selectNftModelVariant(imgSrc, modelLabel, el) {
        // Not used in buy flow anymore — kept for compatibility
    }

    /* Buy = add as UNIMPROVED gift to inventory */
    function confirmBuyNft(paymentMethod) {
        if (!selectedNftForBuy) return;

        if (currentUser.stars < selectedNftForBuy.priceStars) {
            showToast("Недостаточно Stars! Купите Stars через Telegram бота.");
            closeModal('buyNftModal');
            openBuyStarsModal();
            return;
        }
        currentUser.stars -= selectedNftForBuy.priceStars;

        if (!currentUser.nfts) currentUser.nfts = [];
        
        // Save as UNIMPROVED gift — no backdrop, no model variation
        currentUser.nfts.push({
            id: selectedNftForBuy.id,
            name: selectedNftForBuy.name,
            img: selectedNftForBuy.img,
            collection: selectedNftForBuy.collection,
            rarity: selectedNftForBuy.rarity,
            serial: selectedNftForBuy.serial,
            upgraded: false
        });

        // Remove from marketplace
        let listings = getMarketListings();
        listings = listings.filter(l => l.id !== selectedNftForBuy.id);

        // Replace with a new base listing
        const baseNft = NFT_CATALOG[Math.floor(Math.random() * NFT_CATALOG.length)];
        listings.push(generateBaseListing(baseNft));
        saveMarketListings(listings);

        saveCurrentUser();
        closeModal('buyNftModal');
        updateUI();
        renderMarketGrid('all');
        showToast(`${selectedNftForBuy.name} добавлен в подарки! Улучшите его до NFT в профиле.`);
    }

    /* ======================================================== */
    /* UPGRADE GIFT -> NFT (random model + random backdrop)     */
    /* ======================================================== */
    function upgradeGiftToNft(giftIndex) {
        const gifts = currentUser.nfts || [];
        const gift = gifts[giftIndex];
        if (!gift || gift.upgraded) return;

        // Upgrade cost: 20% of original price
        const baseCatalog = NFT_CATALOG.find(n => n.collection === gift.collection);
        const upgradeCost = baseCatalog ? Math.round(baseCatalog.priceStars * 0.2) : 50;

        if (currentUser.stars < upgradeCost) {
            showToast(`Недостаточно Stars для улучшения (нужно ${upgradeCost}). Купите Stars через Telegram бота.`);
            openBuyStarsModal();
            return;
        }

        currentUser.stars -= upgradeCost;

        // Assign random model variation
        const models = NFT_MODELS_MANIFEST[gift.collection] || [];
        let modelImg = gift.img;
        let modelName = 'Classic';
        if (models.length > 0) {
            const randomModel = models[Math.floor(Math.random() * models.length)];
            modelImg = `assets/nfts/models/${gift.collection}/${randomModel}.webp`;
            modelName = randomModel.replace(/_/g, ' ');
        }

        // Assign random premium backdrop
        const backdrop = PREMIUM_GRADIENTS[Math.floor(Math.random() * PREMIUM_GRADIENTS.length)];

        // Mark as upgraded NFT
        gift.upgraded = true;
        gift.img = modelImg;
        gift.variation = modelName;
        gift.backdrop = backdrop;
        gift.nftCode = "NFT-" + String(Math.floor(100000 + Math.random() * 900000));

        currentUser.nfts[giftIndex] = gift;
        saveCurrentUser();
        updateUI();
        showToast(`${gift.name} улучшен до NFT! Модель: ${modelName}`);
    }

    /* ======================================================== */
    /* MY GIFTS / NFT GRID in Profile                           */
    /* ======================================================== */
    function renderMyGiftsGrid() {
        const container = document.getElementById('myGiftsGrid');
        const gifts = currentUser.nfts || [];

        if (gifts.length === 0) {
            container.innerHTML = `
                <div class="empty-feed-placeholder" style="grid-column: span 2;">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/></svg>
                    <p style="font-weight: 600; font-size: 14px;">У вас пока нет подарков</p>
                    <p style="font-size: 12px;">Купите первый подарок в маркете!</p>
                </div>
            `;
            return;
        }

        container.innerHTML = gifts.map((gift, idx) => {
            if (gift.upgraded) {
                // ---- UPGRADED NFT ----
                return `
                    <div class="nft-card">
                        <div class="nft-backdrop" style="background: ${gift.backdrop || 'radial-gradient(circle, #1e293b, #0f172a)'};">
                            <span class="nft-rarity-pill rarity-${gift.rarity}">${rarityRu(gift.rarity)}</span>
                            <span class="nft-serial-badge" style="background: rgba(56,189,248,0.2); color: #38bdf8; font-size: 9px; padding: 2px 6px; border-radius: 6px; position: absolute; top: 6px; right: 6px;">NFT</span>
                            <img src="${gift.img}" alt="${gift.name}" class="nft-model-img" onerror="this.style.opacity='0.4'">
                        </div>
                        <div class="nft-card-body">
                            <div class="nft-title">${gift.name}</div>
                            <div class="nft-variation-tag" style="color: #38bdf8; font-size: 11px;">${gift.variation || 'NFT'}</div>
                            <div style="display: flex; gap: 4px; margin-top: 4px;">
                                <span style="font-size: 9px; color: var(--tg-text-secondary); background: var(--tg-surface-elevated); padding: 2px 6px; border-radius: 4px;">${gift.nftCode || gift.id}</span>
                                <span style="font-size: 9px; color: var(--tg-text-secondary); background: var(--tg-surface-elevated); padding: 2px 6px; border-radius: 4px;">${gift.serial}</span>
                            </div>
                        </div>
                    </div>
                `;
            } else {
                // ---- UNIMPROVED GIFT ----
                const baseCatalog = NFT_CATALOG.find(n => n.collection === gift.collection);
                const upgradeCost = baseCatalog ? Math.round(baseCatalog.priceStars * 0.2) : 50;
                return `
                    <div class="nft-card">
                        <div class="nft-backdrop" style="background: radial-gradient(circle at 50% 35%, var(--tg-surface-elevated) 0%, var(--tg-surface) 60%, var(--tg-bg) 100%);">
                            <span class="nft-rarity-pill rarity-${gift.rarity}" style="opacity: 0.5;">${rarityRu(gift.rarity)}</span>
                            <img src="${gift.img}" alt="${gift.name}" class="nft-model-img" style="filter: saturate(0.4) brightness(0.8);" onerror="this.style.opacity='0.4'">
                        </div>
                        <div class="nft-card-body">
                            <div class="nft-title" style="opacity: 0.7;">${gift.name}</div>
                            <div class="nft-variation-tag" style="color: var(--tg-text-secondary); font-size: 11px;">Подарок (не улучшен)</div>
                            <button class="btn-buy-nft" style="background: linear-gradient(135deg, #8b5cf6, #6d28d9); margin-top: 6px;" onclick="upgradeGiftToNft(${idx})">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
                                <span>Улучшить (${upgradeCost} Stars)</span>
                            </button>
                        </div>
                    </div>
                `;
            }
        }).join('');
    }

"""

    content = content[:idx_start] + new_marketplace_js + content[idx_end:]
    print("[8] Full marketplace JS block replaced")

# ============================================================
# 8. Verify & Save
# ============================================================
# Quick validation
assert '<script>' in content, "Missing <script> tag!"
assert '</script>' in content, "Missing </script> tag!"
assert 'upgradeGiftToNft' in content, "Missing upgrade function!"
assert 'generateBaseListing' in content, "Missing base listing function!"
assert 'renderMyGiftsGrid' in content, "Missing renderMyGiftsGrid!"

with open(profile_path, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"\nAll changes applied successfully! File size: {len(content)} bytes")
print(f"Total lines: {content.count(chr(10))}")
