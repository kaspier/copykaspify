profile_path = r'c:\Users\пк\Desktop\ОСНОВААА\v1.3\profile.html'

with open(profile_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update CSS for glowing-header-nft to use --glow-color
new_css = """
        /* Glowing Header NFT Showcase (Matched to Backdrop Color) */
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
            border: 1.8px solid var(--glow-color, #38bdf8);
            box-shadow: 0 0 14px var(--glow-color, #38bdf8), inset 0 0 8px var(--glow-color, #38bdf8);
            animation: nftColorGlowPulse 2.5s infinite alternate ease-in-out;
            transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s ease;
        }

        .glowing-header-nft:hover {
            transform: scale(1.18) translateY(-2px);
            box-shadow: 0 0 26px var(--glow-color, #38bdf8), inset 0 0 14px var(--glow-color, #38bdf8);
            z-index: 10;
        }

        .glowing-header-nft img {
            width: 34px;
            height: 34px;
            object-fit: contain;
            filter: drop-shadow(0 0 8px var(--glow-color, #38bdf8));
        }

        .glowing-header-nft .nft-badge-tag {
            position: absolute;
            bottom: -5px;
            font-size: 8px;
            font-weight: 900;
            letter-spacing: 0.3px;
            background: var(--glow-color, #38bdf8);
            color: #fff;
            padding: 1px 5px;
            border-radius: 6px;
            box-shadow: 0 2px 6px rgba(0,0,0,0.6);
            text-shadow: 0 1px 2px rgba(0,0,0,0.8);
        }

        @keyframes nftColorGlowPulse {
            0% {
                box-shadow: 0 0 10px var(--glow-color, #38bdf8), inset 0 0 5px var(--glow-color, #38bdf8);
                filter: brightness(0.95);
            }
            100% {
                box-shadow: 0 0 24px var(--glow-color, #38bdf8), 0 0 36px var(--glow-color, #38bdf8), inset 0 0 12px var(--glow-color, #38bdf8);
                filter: brightness(1.2);
            }
        }
"""

import re
old_css_match = re.search(r'/\* Glowing Header NFT Showcase \*[\s\S]*?@keyframes nftHeaderPulse[\s\S]*?\}', content)
if old_css_match:
    content = content.replace(old_css_match.group(0), new_css.strip())
    print("CSS updated to matched color glow!")

# 2. Update renderHeaderGiftsShowcase JS function to extract backdrop color
new_js_showcase = """
    function extractGlowColor(backdrop) {
        if (!backdrop) return '#38bdf8';
        const hexMatches = backdrop.match(/#[0-9a-fA-F]{6}/g);
        if (hexMatches && hexMatches.length > 0) {
            return hexMatches[0];
        }
        return '#38bdf8';
    }

    function renderHeaderGiftsShowcase() {
        const container = document.getElementById('profileHeaderGiftsRow');
        if (!container) return;
        
        const gifts = currentUser.nfts || [];
        // Prioritize upgraded NFTs, take up to 5
        const displayGifts = [...gifts].sort((a, b) => (b.upgraded ? 1 : 0) - (a.upgraded ? 1 : 0)).slice(0, 5);

        if (displayGifts.length === 0) {
            container.innerHTML = `
                <div class="glowing-header-nft" style="opacity: 0.85; width: auto; padding: 0 10px; height: 32px; border-style: dashed; background: rgba(0,0,0,0.3); --glow-color: #38bdf8;" onclick="switchScreen('market')">
                    <span style="font-size: 11px; font-weight: 700; color: #38bdf8;">+ NFT в шапку</span>
                </div>
            `;
            return;
        }

        container.innerHTML = displayGifts.map(gift => {
            const glowColor = extractGlowColor(gift.backdrop);
            return `
                <div class="glowing-header-nft" style="background: ${gift.backdrop || 'radial-gradient(circle, #1e293b, #0f172a)'}; --glow-color: ${glowColor}; border-color: ${glowColor};" onclick="openBuyNftModal('${gift.id}')" title="${gift.name} ${gift.variation || ''}">
                    <img src="${gift.img}" alt="${gift.name}" onerror="this.style.opacity='0.4'">
                    ${gift.upgraded ? `<span class="nft-badge-tag" style="background: ${glowColor};">NFT</span>` : ''}
                </div>
            `;
        }).join('');
    }
"""

old_js_match = re.search(r'function renderHeaderGiftsShowcase[\s\S]*?\}\s*\}', content)
if old_js_match:
    content = content.replace(old_js_match.group(0), new_js_showcase.strip())
    print("JS renderHeaderGiftsShowcase updated with color extraction!")
else:
    # Try alternative matching
    i1 = content.find('function renderHeaderGiftsShowcase() {')
    i2 = content.find('function renderMyGiftsGrid() {')
    if i1 != -1 and i2 != -1:
        content = content[:i1] + new_js_showcase.strip() + "\n\n    " + content[i2:]
        print("JS function updated via slice fallback!")

with open(profile_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Saved updated v1.3/profile.html")
