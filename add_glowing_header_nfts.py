profile_path = r'c:\Users\пк\Desktop\ОСНОВААА\v1.3\profile.html'

with open(profile_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add CSS for Glowing Header NFT Showcase
css_injection = """
        /* Glowing Header NFT Showcase */
        .profile-header-nft-showcase {
            position: absolute;
            bottom: 10px;
            right: 12px;
            display: flex;
            gap: 8px;
            z-index: 5;
            max-width: 75%;
            overflow-x: auto;
            padding: 4px 6px;
            scrollbar-width: none;
        }

        .profile-header-nft-showcase::-webkit-scrollbar {
            display: none;
        }

        .glowing-header-nft {
            width: 44px;
            height: 44px;
            border-radius: 12px;
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            flex-shrink: 0;
            border: 1.5px solid rgba(255, 255, 255, 0.4);
            box-shadow: 0 0 14px rgba(56, 189, 248, 0.7), inset 0 0 8px rgba(255, 255, 255, 0.3);
            animation: nftHeaderPulse 3s infinite alternate ease-in-out;
            transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s ease;
        }

        .glowing-header-nft:hover {
            transform: scale(1.15) translateY(-2px);
            box-shadow: 0 0 22px rgba(56, 189, 248, 0.95), inset 0 0 12px rgba(255, 255, 255, 0.6);
            z-index: 10;
        }

        .glowing-header-nft img {
            width: 34px;
            height: 34px;
            object-fit: contain;
            filter: drop-shadow(0 0 6px rgba(255, 255, 255, 0.9));
        }

        .glowing-header-nft .nft-badge-tag {
            position: absolute;
            bottom: -5px;
            font-size: 8px;
            font-weight: 900;
            letter-spacing: 0.3px;
            background: linear-gradient(135deg, #38bdf8, #0284c7);
            color: #fff;
            padding: 1px 5px;
            border-radius: 6px;
            box-shadow: 0 2px 6px rgba(0,0,0,0.5);
        }

        @keyframes nftHeaderPulse {
            0% {
                box-shadow: 0 0 8px rgba(56, 189, 248, 0.5), inset 0 0 6px rgba(255, 255, 255, 0.2);
            }
            50% {
                box-shadow: 0 0 18px rgba(168, 85, 247, 0.85), 0 0 26px rgba(56, 189, 248, 0.7), inset 0 0 10px rgba(255, 255, 255, 0.4);
            }
            100% {
                box-shadow: 0 0 14px rgba(245, 158, 11, 0.8), 0 0 22px rgba(236, 72, 153, 0.6), inset 0 0 8px rgba(255, 255, 255, 0.3);
            }
        }
"""

if '.profile-header-nft-showcase' not in content:
    # Insert right before </style>
    style_end = content.find('</style>')
    if style_end != -1:
        content = content[:style_end] + css_injection + "\n    " + content[style_end:]
        print("CSS for glowing NFTs added!")

# 2. Add #profileHeaderGiftsRow inside #profileCoverBanner
old_cover_banner_html = '<div id="profileCoverBanner" class="profile-cover-banner">'
new_cover_banner_html = '<div id="profileCoverBanner" class="profile-cover-banner">\n                <div id="profileHeaderGiftsRow" class="profile-header-nft-showcase"></div>'

if 'id="profileHeaderGiftsRow"' not in content:
    content = content.replace(old_cover_banner_html, new_cover_banner_html)
    print("HTML for profileHeaderGiftsRow added!")

# 3. Add JS function renderHeaderGiftsShowcase() and call in updateUI()
js_showcase_func = """
    function renderHeaderGiftsShowcase() {
        const container = document.getElementById('profileHeaderGiftsRow');
        if (!container) return;
        
        const gifts = currentUser.nfts || [];
        // Prioritize upgraded NFTs, take up to 4
        const displayGifts = [...gifts].sort((a, b) => (b.upgraded ? 1 : 0) - (a.upgraded ? 1 : 0)).slice(0, 4);

        if (displayGifts.length === 0) {
            container.innerHTML = `
                <div class="glowing-header-nft" style="opacity: 0.85; width: auto; padding: 0 10px; height: 32px; border-style: dashed; background: rgba(0,0,0,0.3);" onclick="switchScreen('market')">
                    <span style="font-size: 11px; font-weight: 700; color: #38bdf8;">+ NFT в шапку</span>
                </div>
            `;
            return;
        }

        container.innerHTML = displayGifts.map(gift => `
            <div class="glowing-header-nft" style="background: ${gift.backdrop || 'radial-gradient(circle, #1e293b, #0f172a)'};" onclick="openBuyNftModal('${gift.id}')" title="${gift.name} ${gift.variation || ''}">
                <img src="${gift.img}" alt="${gift.name}" onerror="this.style.opacity='0.4'">
                ${gift.upgraded ? '<span class="nft-badge-tag">NFT</span>' : ''}
            </div>
        `).join('');
    }
"""

if 'function renderHeaderGiftsShowcase' not in content:
    # Insert before renderMyGiftsGrid
    render_gifts_idx = content.find('function renderMyGiftsGrid')
    if render_gifts_idx != -1:
        content = content[:render_gifts_idx] + js_showcase_func + "\n\n    " + content[render_gifts_idx:]
        print("JS function renderHeaderGiftsShowcase added!")

# 4. Call renderHeaderGiftsShowcase() inside updateUI()
old_update_ui_line = 'renderMyGiftsGrid();'
new_update_ui_line = 'renderHeaderGiftsShowcase();\n        renderMyGiftsGrid();'

if 'renderHeaderGiftsShowcase();' not in content:
    content = content.replace(old_update_ui_line, new_update_ui_line, 1)
    print("Call to renderHeaderGiftsShowcase added to updateUI!")

with open(profile_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Saved updated profile.html")
