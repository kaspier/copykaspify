import re

profile_path = r'c:\Users\пк\Desktop\ОСНОВААА\v1.3\profile.html'

with open(profile_path, 'r', encoding='utf-8') as f:
    content = f.read()

# ============================================================
# 1. RENAME Unixgram -> Kaspify
# ============================================================
replacements = [
    ('Unixgram — Telegram Social Network & NFT Market', 'Kaspify — Telegram Social Network & NFT Market'),
    ('https://t.me/UnixgramBot', 'https://t.me/KaspifyBot'),
    ('@UnixgramBot', '@KaspifyBot'),
    ('UnixgramBot', 'KaspifyBot'),
    ('Аккаунты Unixgram', 'Аккаунты Kaspify'),
    ('сети Unixgram', 'сети Kaspify'),
    ('пост в Unixgram', 'пост в Kaspify'),
    ('участник Unixgram', 'участник Kaspify'),
    ('аккаунт в Unixgram', 'аккаунт в Kaspify'),
    ('<span>Unixgram</span>', '<span>Kaspify</span>'),
    ('kaspi_unixgram_posts', 'kaspi_kaspify_posts'),
    ('Unixgram', 'Kaspify'),
]

for old_str, new_str in replacements:
    content = content.replace(old_str, new_str)

print("[1] Replaced all Unixgram references with Kaspify")

# ============================================================
# 2. ADD USERNAMES MARKET UI & JS LOGIC
# ============================================================

# A. Update Market Header & Add Sub-Tabs (Gifts vs Usernames)
old_market_header = """        <div class="market-filters">
            <button class="filter-chip active" onclick="filterMarket('all', this)">Все подарки</button>
            <button class="filter-chip" onclick="filterMarket('mythic', this)">Mythic</button>
            <button class="filter-chip" onclick="filterMarket('legendary', this)">Legendary</button>
            <button class="filter-chip" onclick="filterMarket('epic', this)">Epic</button>
            <button class="filter-chip" onclick="filterMarket('rare', this)">Rare</button>
        </div>

        <div id="marketGrid" class="market-grid">
            <!-- Rendered by JavaScript -->
        </div>"""

new_market_header = """        <!-- Market Category Tabs (Gifts vs Usernames) -->
        <div style="display: flex; gap: 8px; margin-bottom: 12px; border-bottom: 1.5px solid var(--tg-border); padding-bottom: 8px;">
            <button id="tabMarketGifts" class="profile-tab-btn active" style="flex: 1; border-radius: 10px;" onclick="switchMarketSection('gifts', this)">
                <span>🎁 Подарки (Gifts)</span>
            </button>
            <button id="tabMarketUsernames" class="profile-tab-btn" style="flex: 1; border-radius: 10px;" onclick="switchMarketSection('usernames', this)">
                <span>🏷️ Юзернеймы (Fragment)</span>
            </button>
        </div>

        <!-- Section: Gifts -->
        <div id="marketGiftsSection">
            <div class="market-filters">
                <button class="filter-chip active" onclick="filterMarket('all', this)">Все подарки</button>
                <button class="filter-chip" onclick="filterMarket('mythic', this)">Mythic</button>
                <button class="filter-chip" onclick="filterMarket('legendary', this)">Legendary</button>
                <button class="filter-chip" onclick="filterMarket('epic', this)">Epic</button>
                <button class="filter-chip" onclick="filterMarket('rare', this)">Rare</button>
            </div>

            <div id="marketGrid" class="market-grid">
                <!-- Rendered by JavaScript -->
            </div>
        </div>

        <!-- Section: Collectible Usernames (Fragment Market) -->
        <div id="marketUsernamesSection" style="display: none;">
            <div style="padding: 10px 14px; background: rgba(56, 189, 248, 0.08); border: 1px solid rgba(56, 189, 248, 0.2); border-radius: 12px; margin-bottom: 14px; display: flex; align-items: center; gap: 10px;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="#38bdf8"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
                <p style="font-size: 12px; color: var(--tg-text-secondary); margin: 0;">Покупайте эксклюзивные коллекционные юзернеймы Fragment и устанавливайте их на свой профиль!</p>
            </div>

            <div id="usernamesGrid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 12px;">
                <!-- Rendered by JS -->
            </div>
        </div>"""

content = content.replace(old_market_header, new_market_header)
print("[2] Market category tabs (Gifts vs Usernames) added to HTML")

# B. Add Modal for Buying Usernames
old_modals_end = '<!-- Edit Profile Modal -->'
new_username_modal = """<!-- Buy Username Modal -->
<div id="buyUsernameModal" class="modal-overlay">
    <div class="modal-sheet">
        <div class="modal-header">
            <div class="modal-title">Покупка юзернейма Fragment</div>
            <button class="modal-close-btn" onclick="closeModal('buyUsernameModal')">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
        </div>
        <div class="modal-body" style="text-align: center;">
            <div style="font-size: 32px; font-weight: 900; color: #38bdf8; margin: 10px 0 4px; font-family: monospace;" id="modalTargetUsername">@crypto</div>
            <span style="font-size: 11px; color: #10b981; background: rgba(16, 185, 129, 0.15); padding: 3px 10px; border-radius: 12px; font-weight: 700;">Коллекционный никнейм</span>

            <p style="color: var(--tg-text-secondary); font-size: 13px; margin: 14px 0 18px;">Этот юзернейм станет вашей собственностью. Вы сможете сразу привязать его к профилю Kaspify!</p>

            <button id="btnConfirmBuyUsername" class="btn-modal-primary" style="background: linear-gradient(135deg, #f59e0b, #d97706); width: 100%; font-weight: 800;" onclick="confirmBuyUsername()">
                Купить за Stars
            </button>
        </div>
    </div>
</div>

<!-- Edit Profile Modal -->"""

content = content.replace(old_modals_end, new_username_modal)
print("[3] Username Buy Modal added to HTML")

# C. Add JS functions for Usernames Market
usernames_js = """
    /* ======================================================== */
    /* FRAGMENT COLLECTIBLE USERNAMES MARKET                    */
    /* ======================================================== */
    const DEFAULT_COLLECTIBLE_USERNAMES = [
        { handle: "crypto", priceStars: 1500, owner: null },
        { handle: "king", priceStars: 2000, owner: null },
        { handle: "vip", priceStars: 1200, owner: null },
        { handle: "boss", priceStars: 1800, owner: null },
        { handle: "kaspi", priceStars: 3000, owner: null },
        { handle: "rich", priceStars: 2500, owner: null },
        { handle: "alex", priceStars: 950, owner: null },
        { handle: "ghost", priceStars: 1300, owner: null },
        { handle: "lunar", priceStars: 800, owner: null },
        { handle: "cyber", priceStars: 900, owner: null },
        { handle: "shadow", priceStars: 1100, owner: null },
        { handle: "meta", priceStars: 2200, owner: null },
        { handle: "gold", priceStars: 1400, owner: null },
        { handle: "alpha", priceStars: 1600, owner: null },
        { handle: "prime", priceStars: 1050, owner: null },
        { handle: "zero", priceStars: 750, owner: null }
    ];

    function initUsernamesMarket() {
        const stored = localStorage.getItem('kaspi_usernames_market');
        if (!stored) {
            localStorage.setItem('kaspi_usernames_market', JSON.stringify(DEFAULT_COLLECTIBLE_USERNAMES));
        }
    }

    function getUsernamesMarket() {
        initUsernamesMarket();
        return JSON.parse(localStorage.getItem('kaspi_usernames_market') || '[]');
    }

    function saveUsernamesMarket(market) {
        localStorage.setItem('kaspi_usernames_market', JSON.stringify(market));
    }

    function switchMarketSection(section, btn) {
        document.getElementById('tabMarketGifts').classList.remove('active');
        document.getElementById('tabMarketUsernames').classList.remove('active');
        btn.classList.add('active');

        if (section === 'gifts') {
            document.getElementById('marketGiftsSection').style.display = 'block';
            document.getElementById('marketUsernamesSection').style.display = 'none';
        } else if (section === 'usernames') {
            document.getElementById('marketGiftsSection').style.display = 'none';
            document.getElementById('marketUsernamesSection').style.display = 'block';
            renderUsernamesMarket();
        }
    }

    function renderUsernamesMarket() {
        const container = document.getElementById('usernamesGrid');
        if (!container) return;
        const items = getUsernamesMarket();

        container.innerHTML = items.map(u => {
            const isOwnedByMe = currentUser.ownedUsernames && currentUser.ownedUsernames.includes(u.handle);
            const isAssigned = currentUser.username === u.handle;
            const isSold = u.owner && !isOwnedByMe;

            let actionBtnHTML = '';
            if (isAssigned) {
                actionBtnHTML = `<span style="font-size: 11px; font-weight: 700; color: #10b981; background: rgba(16, 185, 129, 0.15); padding: 4px 10px; border-radius: 8px;">Используется</span>`;
            } else if (isOwnedByMe) {
                actionBtnHTML = `
                    <button class="btn-buy-nft" style="background: linear-gradient(135deg, #10b981, #059669); padding: 6px 10px;" onclick="setProfileUsername('${u.handle}')">
                        <span>Установить в профиль</span>
                    </button>
                `;
            } else if (isSold) {
                actionBtnHTML = `<span style="font-size: 11px; color: var(--tg-text-secondary);">Куплен @${u.owner}</span>`;
            } else {
                actionBtnHTML = `
                    <button class="btn-buy-nft" style="padding: 6px 12px;" onclick="openBuyUsernameModal('${u.handle}')">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/></svg>
                        <span>${u.priceStars} Stars</span>
                    </button>
                `;
            }

            return `
                <div style="background: var(--tg-surface); border: 1px solid var(--tg-border); border-radius: 12px; padding: 12px 14px; display: flex; align-items: center; justify-content: space-between; gap: 10px; transition: border-color 0.2s ease;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <div style="width: 36px; height: 36px; border-radius: 50%; background: linear-gradient(135deg, #0284c7, #0369a1); display: flex; align-items: center; justify-content: center; font-weight: 900; color: #fff; font-size: 15px;">
                            @
                        </div>
                        <div>
                            <div style="font-weight: 800; font-size: 15px; color: #fff; display: flex; align-items: center; gap: 4px;">
                                @${u.handle}
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="#38bdf8"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
                            </div>
                            <div style="font-size: 11px; color: var(--tg-text-secondary);">${u.priceStars} ⭐ • Fragment NFT</div>
                        </div>
                    </div>
                    <div>
                        ${actionBtnHTML}
                    </div>
                </div>
            `;
        }).join('');
    }

    let selectedUsernameForBuy = null;

    function openBuyUsernameModal(handle) {
        const market = getUsernamesMarket();
        const item = market.find(u => u.handle === handle);
        if (!item) return;

        selectedUsernameForBuy = item;
        document.getElementById('modalTargetUsername').textContent = `@${item.handle}`;
        document.getElementById('btnConfirmBuyUsername').textContent = `Купить @${item.handle} за ${item.priceStars} Stars`;
        openModal('buyUsernameModal');
    }

    function confirmBuyUsername() {
        if (!selectedUsernameForBuy) return;

        if (currentUser.stars < selectedUsernameForBuy.priceStars) {
            showToast(`Недостаточно Stars! (нужно ${selectedUsernameForBuy.priceStars} ⭐). Купите Stars через бота.`);
            closeModal('buyUsernameModal');
            openBuyStarsModal();
            return;
        }

        currentUser.stars -= selectedUsernameForBuy.priceStars;

        if (!currentUser.ownedUsernames) currentUser.ownedUsernames = [];
        if (!currentUser.ownedUsernames.includes(selectedUsernameForBuy.handle)) {
            currentUser.ownedUsernames.push(selectedUsernameForBuy.handle);
        }

        // Mark as owned on market
        const market = getUsernamesMarket();
        const idx = market.findIndex(u => u.handle === selectedUsernameForBuy.handle);
        if (idx !== -1) {
            market[idx].owner = currentUser.username;
            saveUsernamesMarket(market);
        }

        // Set as main profile handle immediately
        currentUser.username = selectedUsernameForBuy.handle;
        localStorage.setItem('kaspi_active_username', selectedUsernameForBuy.handle);

        saveCurrentUser();
        closeModal('buyUsernameModal');
        updateUI();
        renderUsernamesMarket();
        showToast(`🎉 Поздравляем! Вы приобрели @${selectedUsernameForBuy.handle} и установили его в профиль!`);
    }

    function setProfileUsername(handle) {
        if (!currentUser.ownedUsernames || !currentUser.ownedUsernames.includes(handle)) return;
        currentUser.username = handle;
        localStorage.setItem('kaspi_active_username', handle);
        saveCurrentUser();
        updateUI();
        renderUsernamesMarket();
        showToast(`Юзернейм профиля изменён на @${handle}`);
    }
"""

# Insert JS before handleAvatarUpload
idx_avatar = content.find('function handleAvatarUpload')
if idx_avatar != -1:
    content = content[:idx_avatar] + usernames_js + "\n\n    " + content[idx_avatar:]
    print("[4] JS for Usernames Market added")

with open(profile_path, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"Saved updated {profile_path}")
