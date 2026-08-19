profile_path = r'c:\Users\пк\Desktop\ОСНОВААА\v1.3\profile.html'

with open(profile_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace DB_VERSION
old_version = 'const DB_VERSION = "v3_local_nfts";'
new_version = 'const DB_VERSION = "v4_dynamic_market";'

if old_version in content:
    content = content.replace(old_version, new_version)
    print("Version bumped!")
else:
    print("Warning: old version string not found exactly.")

# Define new JS block to insert
new_js_logic = """    /* ======================================================== */
    /* NFT MARKETPLACE & GIFTS INVENTORY                        */
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
        "radial-gradient(circle at 50% 30%, #1e3a8a 0%, #172554 70%, #0c1033 100%)"
    ];

    function generateSingleListing(nftBase, forcedId = null) {
        const id = forcedId || "TGF-" + String(Math.floor(1000 + Math.random() * 9000));
        const models = NFT_MODELS_MANIFEST[nftBase.collection] || [];
        const randomModel = models.length > 0 ? models[Math.floor(Math.random() * models.length)] : null;
        const variationLabel = randomModel ? randomModel.replace(/_/g, ' ') : nftBase.variation;
        const imgPath = randomModel 
            ? `assets/nfts/models/${nftBase.collection}/${randomModel}.webp` 
            : nftBase.img;
        
        const backdrop = PREMIUM_GRADIENTS[Math.floor(Math.random() * PREMIUM_GRADIENTS.length)];
        const multiplier = 0.85 + (Math.random() * 0.3);
        const priceTenge = Math.round((nftBase.priceTenge * multiplier) / 100) * 100;
        const priceStars = Math.round(nftBase.priceStars * multiplier);
        const serial = "#" + String(Math.floor(1000 + Math.random() * 8999));

        return {
            id: id,
            collection: nftBase.collection,
            name: nftBase.name,
            img: imgPath,
            variation: variationLabel,
            backdrop: backdrop,
            rarity: nftBase.rarity,
            priceTenge: priceTenge,
            priceStars: priceStars,
            serial: serial
        };
    }

    function initMarketListings() {
        if (!localStorage.getItem('kaspi_market_listings') || JSON.parse(localStorage.getItem('kaspi_market_listings')).length === 0) {
            const initialListings = [];
            // Generate 30 unique items, one for each base category
            NFT_CATALOG.forEach(nftBase => {
                initialListings.push(generateSingleListing(nftBase));
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

    function renderMarketGrid(rarityFilter) {
        const container = document.getElementById('marketGrid');
        const listings = getMarketListings();
        const items = rarityFilter === 'all' 
            ? listings 
            : listings.filter(item => item.rarity === rarityFilter);

        container.innerHTML = items.map(nft => `
            <div class="nft-card" onclick="openBuyNftModal('${nft.id}')">
                <div class="nft-backdrop" style="background: ${nft.backdrop};">
                    <span class="nft-rarity-pill rarity-${nft.rarity}">${rarityRu(nft.rarity)}</span>
                    <span class="nft-serial-badge">${nft.serial}</span>
                    <img src="${nft.img}" alt="${nft.name}" class="nft-model-img" onerror="this.style.opacity='0.4'">
                </div>
                <div class="nft-card-body">
                    <div class="nft-title">${nft.name}</div>
                    <div class="nft-variation-tag">${nft.variation}</div>
                    <div class="nft-price-row">
                        <span class="nft-price-tenge">${nft.priceTenge.toLocaleString()} ₸</span>
                        <span class="nft-price-stars">${nft.priceStars} ⭐</span>
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

    function openBuyNftModal(nftId) {
        const listings = getMarketListings();
        const nft = listings.find(n => n.id === nftId);
        if (!nft) return;
        selectedNftForBuy = nft;
        currentSelectedModelImg = nft.img;
        currentSelectedModelName = nft.variation;

        document.getElementById('nftModalImg').src = nft.img;
        const preview = document.getElementById('nftModalPreview');
        preview.style.background = nft.backdrop;
        preview.style.borderRadius = '12px';
        preview.className = '';
        document.getElementById('nftModalName').textContent = nft.name;
        document.getElementById('nftModalVariation').textContent = `${nft.variation} • Код: ${nft.id} • Серия: ${nft.serial}`;
        document.getElementById('selectedModelNameBadge').textContent = nft.variation;

        const rarityEl = document.getElementById('nftModalRarity');
        rarityEl.textContent = rarityRu(nft.rarity);
        rarityEl.className = `nft-rarity-pill rarity-${nft.rarity}`;

        document.getElementById('btnBuyTenge').textContent = `Купить за ${nft.priceTenge.toLocaleString()} ₸`;
        document.getElementById('btnBuyStars').textContent = `Купить за ${nft.priceStars} Stars`;

        // Render model variations
        const variationsRow = document.getElementById('nftModelVariationsRow');
        const modelsList = (typeof NFT_MODELS_MANIFEST !== 'undefined' && NFT_MODELS_MANIFEST[nft.collection]) || [];
        
        let variantsHTML = '';

        modelsList.forEach(mName => {
            const mImg = `assets/nfts/models/${nft.collection}/${mName}.webp`;
            const label = mName.replace(/_/g, ' ');
            const isActive = label.toLowerCase() === nft.variation.toLowerCase();
            variantsHTML += `
                <div class="model-var-thumb ${isActive ? 'active' : ''}" onclick="selectNftModelVariant('${mImg}', '${label}', this)" title="${label}" style="flex-shrink:0; width:52px; height:52px; border-radius:10px; background:rgba(255,255,255,0.06); border:${isActive ? '2px solid #38bdf8' : '1.5px solid var(--tg-border)'}; display:flex; align-items:center; justify-content:center; cursor:pointer; overflow:hidden; transition:all 0.15s ease;">
                    <img src="${mImg}" style="width:42px; height:42px; object-fit:contain;" onerror="this.parentElement.style.display='none'">
                </div>
            `;
        });

        variationsRow.innerHTML = variantsHTML;
        openModal('buyNftModal');
    }

    function selectNftModelVariant(imgSrc, modelLabel, el) {
        currentSelectedModelImg = imgSrc;
        currentSelectedModelName = modelLabel;
        document.getElementById('nftModalImg').src = imgSrc;
        document.getElementById('selectedModelNameBadge').textContent = modelLabel;
        document.querySelectorAll('.model-var-thumb').forEach(t => {
            t.style.borderColor = 'var(--tg-border)';
            t.classList.remove('active');
        });
        el.style.borderColor = '#38bdf8';
        el.classList.add('active');
    }

    function confirmBuyNft(paymentMethod) {
        if (!selectedNftForBuy) return;

        if (paymentMethod === 'stars') {
            if (currentUser.stars < selectedNftForBuy.priceStars) {
                showToast("Недостаточно Stars на балансе!");
                closeModal('buyNftModal');
                openBuyStarsModal();
                return;
            }
            currentUser.stars -= selectedNftForBuy.priceStars;
        }

        if (!currentUser.nfts) currentUser.nfts = [];
        
        // Save the chosen variation, premium backdrop, and serial number
        currentUser.nfts.push({
            id: selectedNftForBuy.id,
            name: selectedNftForBuy.name,
            img: currentSelectedModelImg || selectedNftForBuy.img,
            variation: currentSelectedModelName || selectedNftForBuy.variation,
            backdrop: selectedNftForBuy.backdrop,
            rarity: selectedNftForBuy.rarity,
            serial: selectedNftForBuy.serial
        });

        // Remove from marketplace (no duplicates/repeats!)
        let listings = getMarketListings();
        listings = listings.filter(l => l.id !== selectedNftForBuy.id);

        // Replace with a new randomly generated listing to keep market alive
        const baseNft = NFT_CATALOG[Math.floor(Math.random() * NFT_CATALOG.length)];
        listings.push(generateSingleListing(baseNft));
        saveMarketListings(listings);

        const users = getAllUsers();
        const idx = users.findIndex(u => u.username === currentUser.username);
        if (idx !== -1) { users[idx] = currentUser; saveAllUsers(users); }

        closeModal('buyNftModal');
        updateUI();
        renderMarketGrid('all');
        showToast(`${selectedNftForBuy.name} (${currentSelectedModelName || selectedNftForBuy.variation}) добавлен в коллекцию!`);
    }"""

import re
pattern = r'/\* =+ \*/\s*/\* NFT MARKETPLACE & GIFTS INVENTORY \*/[\s\S]*?function confirmBuyNft\(paymentMethod\) \{[\s\S]*?\}'
match = re.search(pattern, content)
if match:
    content = content.replace(match.group(0), new_js_logic)
    print("Marketplace logic updated successfully!")
else:
    # Try alternative matching
    start_tag = 'function filterMarket'
    end_tag = 'function renderMyGiftsGrid'
    idx_start = content.find(start_tag)
    idx_end = content.find(end_tag)
    if idx_start != -1 and idx_end != -1:
        prefix = content[:idx_start].rstrip()
        suffix = content[idx_end:]
        content = prefix + "\n\n" + new_js_logic + "\n\n    " + suffix
        print("Marketplace logic updated via slice fallback!")
    else:
        print("Error: Could not find marketplace functions to replace.")

with open(profile_path, 'w', encoding='utf-8') as f:
    f.write(content)
