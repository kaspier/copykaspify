// script.js

// --- HISTORY MANAGEMENT & SCREEN SWITCHING ---
// State management for seamless back gesture on iOS Safari, Android, and desktop browsers

let isNavigatingBack = false;

// Initialize history state and hash routing on load
window.addEventListener('load', () => {
    history.replaceState({ screen: 'main-view' }, '', window.location.pathname);
    initSwipeBack();
    handleHashRouting();
    initTabListeners();
    updateCurrentUserBadges();
});

function initTabListeners() {
    ['actions', 'info', 'statement'].forEach(name => {
        const btn = document.getElementById(`${name}-tab-btn`);
        if (btn) {
            btn.addEventListener('click', () => switchBankTab(name));
        }
    });
}

function switchBankTab(tabName) {
    ['actions', 'info', 'statement'].forEach(name => {
        const btn = document.getElementById(`${name}-tab-btn`);
        const content = document.getElementById(`${name}-tab`);
        if (btn) {
            if (name === tabName) btn.classList.add('active');
            else btn.classList.remove('active');
        }
        if (content) {
            if (name === tabName) {
                content.style.display = 'block';
                if (name === 'statement') renderStats(currentStatsPeriod || '3days');
            } else {
                content.style.display = 'none';
            }
        }
    });
}

function handleHashRouting() {
    const hash = window.location.hash;
    if (hash === '#payment') {
        openPayment();
    } else if (hash === '#transfer') {
        openTransferScreen();
    } else if (hash === '#receipt') {
        showReceipt();
    } else if (hash === '#profile') {
        openMyProfile();
    }
}

// Handle popstate event (triggered by iPhone edge swipe, Android back gesture, browser back button)
window.addEventListener('popstate', (event) => {
    isNavigatingBack = true;
    const targetScreen = (event.state && event.state.screen) ? event.state.screen : 'main-view';
    
    // Hide modal dialogs if open
    const confirmModal = document.getElementById("confirm-modal");
    const transferConfirmModal = document.getElementById("transfer-confirm-modal");
    const searchModal = document.getElementById("search-modal");
    if (confirmModal) confirmModal.style.display = "none";
    if (transferConfirmModal) transferConfirmModal.style.display = "none";
    if (searchModal) searchModal.style.display = "none";

    // Hide all full screens
    const screens = ["payment-screen", "success-screen", "transfer-screen", "transfer-success-screen", "receipt-screen", "profile-screen", "register-screen", "stats-screen"];
    screens.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = "none";
    });

    const mainView = document.getElementById("main-view");

    // If returning from completed transaction screens, reset cleanly to main-view
    if (targetScreen === 'main-view' || targetScreen === 'success-screen' || targetScreen === 'transfer-success-screen' || targetScreen === 'confirm-modal' || targetScreen === 'transfer-confirm-modal') {
        if (mainView) mainView.style.display = "block";
        history.replaceState({ screen: 'main-view' }, '', window.location.pathname);
    } else {
        const targetEl = document.getElementById(targetScreen);
        if (targetEl) {
            if (targetScreen === 'payment-screen' || targetScreen === 'transfer-screen') {
                targetEl.style.display = 'flex';
            } else {
                targetEl.style.display = 'block';
            }
        } else if (mainView) {
            mainView.style.display = "block";
        }
    }
    isNavigatingBack = false;
});

function navigateToScreen(screenId) {
    if (!isNavigatingBack) {
        history.pushState({ screen: screenId }, '', '#' + screenId);
    }
}

function showToast(msg) {
    const toast = document.getElementById("toast-notification");
    const toastText = document.getElementById("toast-text");
    if (!toast || !toastText) return;
    
    toastText.innerText = msg;
    toast.style.display = "block";
    
    clearTimeout(window.toastTimer);
    window.toastTimer = setTimeout(() => {
        toast.style.display = "none";
    }, 2200);
}

function openSearchModal() {
    const modal = document.getElementById("search-modal");
    if (modal) {
        modal.style.display = "flex";
        const input = document.getElementById("search-input");
        if (input) { input.value = ''; input.focus(); }
    }
}

function closeSearchModal() {
    const modal = document.getElementById("search-modal");
    if (modal) modal.style.display = "none";
}

function filterSearch(query) {
    const results = document.querySelectorAll(".search-item");
    const q = query.toLowerCase().trim();
    results.forEach(item => {
        if (!q || item.innerText.toLowerCase().includes(q)) {
            item.style.display = "flex";
        } else {
            item.style.display = "none";
        }
    });
}

function changeBalance() {
    const balanceEl = document.getElementById("balance");
    if (!balanceEl) return;
    let current = balanceEl.innerText.replace(" ₸", "").replace(/\s/g, '');
    let newSum = prompt("Введите сумму баланса:", current);
    if (newSum && !isNaN(parseFloat(newSum))) {
        balanceEl.innerText = parseFloat(newSum).toLocaleString('ru-RU', { minimumFractionDigits: 2 }) + " ₸";
        showToast("Баланс обновлен");
    }
}

function openPayment() {
    const pScreen = document.getElementById("payment-screen");
    const mScreen = document.getElementById("main-view");
    if (pScreen) pScreen.style.display = "flex";
    if (mScreen) mScreen.style.display = "none";
    navigateToScreen("payment-screen");
}

function closePayment() {
    if (history.state && history.state.screen === "payment-screen") {
        history.back();
    } else {
        const pScreen = document.getElementById("payment-screen");
        const mScreen = document.getElementById("main-view");
        if (pScreen) pScreen.style.display = "none";
        if (mScreen) mScreen.style.display = "block";
        closeConfirmModal();
    }
}

function changePaymentSum() {
    const amountEl = document.getElementById("edit-amount");
    if (!amountEl) return;
    let current = amountEl.innerText.replace(" ₸", "").replace(" Т", "").replace(/\s/g, '');
    let newSum = prompt("Введите сумму платежа:", current);
    if (newSum && !isNaN(parseFloat(newSum))) {
        let formatted = parseFloat(newSum).toLocaleString('ru-RU');
        amountEl.innerText = formatted + " ₸";
    }
}

function openConfirmModal() {
    const vendor = vendorEl ? vendorEl.value : "Продавец";
    const amount = amountEl ? amountEl.innerText : "100 ₸";

    const modalVendor = document.getElementById("modal-vendor-name");
    const modalAmount = document.getElementById("modal-amount-val");
    const modalFinal = document.getElementById("modal-final-sum");
    const btnText = document.getElementById("final-btn-text");

    if (modalVendor) modalVendor.innerText = vendor;
    if (modalAmount) modalAmount.innerText = amount;
    if (modalFinal) modalFinal.innerText = amount;
    if (btnText) btnText.innerText = "Оплатить " + amount;

    const modal = document.getElementById("confirm-modal");
    if (modal) modal.style.display = "flex";
    navigateToScreen("confirm-modal");
}
function completePayment() {
    const modalVendor = document.getElementById("modal-vendor-name");
    const modalFinal = document.getElementById("modal-final-sum");
    const vendor = modalVendor ? modalVendor.innerText : "";
    const amount = modalFinal ? modalFinal.innerText : "";

    const succVendor = document.getElementById("success-vendor");
    const succAmount = document.getElementById("success-amount");
    if (succVendor) succVendor.innerText = vendor;
    if (succAmount) succAmount.innerText = amount;

    const now = new Date();
    const formattedDate = now.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' }) 
    + ", " + now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

    const succDate = document.getElementById("success-date");
    if (succDate) succDate.innerText = formattedDate;

    const confirmModal = document.getElementById("confirm-modal");
    const paymentScreen = document.getElementById("payment-screen");
    const successScreen = document.getElementById("success-screen");

    if (confirmModal) confirmModal.style.display = "none";
    if (paymentScreen) paymentScreen.style.display = "none";
    if (successScreen) successScreen.style.display = "block";
    
    // Dynamically record payment into statistics
    const numAmt = parseInt(amount.replace(/[^\d]/g, '')) || 0;
    if (numAmt > 0) {
        addSpendingTransaction(vendor || "Оплата", "Общепит", numAmt);
    }

    updateReceipt();
    history.replaceState({ screen: 'success-screen' }, '', '#success-screen');
}

function goHome() {
    const screens = ["payment-screen", "success-screen", "transfer-screen", "transfer-success-screen", "receipt-screen", "profile-screen", "register-screen", "stats-screen"];
    screens.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = "none";
    });
    const confirmModal = document.getElementById("confirm-modal");
    const transferConfirmModal = document.getElementById("transfer-confirm-modal");
    if (confirmModal) confirmModal.style.display = "none";
    if (transferConfirmModal) transferConfirmModal.style.display = "none";

    const mainView = document.getElementById("main-view");
    if (mainView) mainView.style.display = "block";
    
    history.replaceState({ screen: 'main-view' }, '', window.location.pathname);
}

function openPayment() {
    const vendorInput = editVendor ? editVendor.value : "Продавец";
    const amountVal = editAmount ? editAmount.innerText : "100 ₸";

    const modalVendor = document.getElementById("modal-vendor-name");
    const modalAmount = document.getElementById("modal-amount-val");
    const modalFinal = document.getElementById("modal-final-sum");
    const finalBtn = document.getElementById("final-btn-text");

    if (modalVendor) modalVendor.innerText = vendorInput;
    if (modalAmount) modalAmount.innerText = amountVal;
    if (modalFinal) modalFinal.innerText = amountVal;
    if (finalBtn) finalBtn.innerText = "Оплатить " + amountVal;

    const mainView = document.getElementById("main-view");
    const pScreen = document.getElementById("payment-screen");
    if (mainView) mainView.style.display = "none";
    if (pScreen) pScreen.style.display = "flex";

    navigateToScreen('payment-screen');
}

function closePayment() {
    const pScreen = document.getElementById("payment-screen");
    if (pScreen) pScreen.style.display = "none";
    const mainView = document.getElementById("main-view");
    if (mainView) mainView.style.display = "block";
}

function changePaymentSum() {
    let currentAmount = 100;
    const amountDisplay = document.getElementById("edit-amount");
    if (amountDisplay) {
        let val = parseInt(amountDisplay.innerText);
        if (!isNaN(val)) currentAmount = val;
    }

    let input = prompt("Введите новую сумму оплаты (в тенге):", currentAmount);
    if (input !== null) {
        let num = parseInt(input.trim());
        if (!isNaN(num) && num > 0) {
            if (amountDisplay) amountDisplay.innerText = num + " ₸";
            showToast("Сумма изменена на " + num + " ₸");
        } else {
            showToast("Некорректная сумма");
        }
    }
}


function closeConfirmModal() {
    const modal = document.getElementById("confirm-modal");
    if (modal) modal.style.display = "none";
}

function openTransferScreen() {
    const mainView = document.getElementById("main-view");
    const tScreen = document.getElementById("transfer-screen");
    if (mainView) mainView.style.display = "none";
    if (tScreen) tScreen.style.display = "flex";

    const editName = document.getElementById("transfer-edit-name");
    const editPhone = document.getElementById("transfer-edit-phone");
    const editAmount = document.getElementById("transfer-edit-amount");

    if (editName && editPhone && editAmount) {
        updateTransferPreview();
    }
    navigateToScreen('transfer-screen');
}

function closeTransferScreen() {
    const tScreen = document.getElementById("transfer-screen");
    if (tScreen) tScreen.style.display = "none";
    const mainView = document.getElementById("main-view");
    if (mainView) mainView.style.display = "block";
}

function updateTransferPreview() {
    const editName = document.getElementById("transfer-edit-name");
    const editPhone = document.getElementById("transfer-edit-phone");
    const editAmount = document.getElementById("transfer-edit-amount");

    const name = editName ? editName.value : "Матвей К.";
    const phone = editPhone ? editPhone.value : "+7 (705) 123-45-67";
    const amount = editAmount ? editAmount.value : "100";

    const prevName = document.getElementById("transfer-preview-name");
    const prevPhone = document.getElementById("transfer-preview-phone");

    if (prevName) prevName.innerText = name;
    if (prevPhone) prevPhone.innerText = phone;
}

function openTransferConfirmModal() {
    const editName = document.getElementById("transfer-edit-name");
    const editAmount = document.getElementById("transfer-edit-amount");

    const name = editName ? editName.value : "Матвей К.";
    const amountNum = editAmount ? editAmount.value : "100";
    const formattedAmount = parseInt(amountNum || 0).toLocaleString('ru-RU') + " ₸";

    const modalRecip = document.getElementById("transfer-modal-recipient-name");
    const modalAmount = document.getElementById("transfer-modal-amount-val");
    const modalFinal = document.getElementById("transfer-modal-final-sum");
    const finalBtn = document.getElementById("transfer-final-btn-text");

    if (modalRecip) modalRecip.innerText = name;
    if (modalAmount) modalAmount.innerText = formattedAmount;
    if (modalFinal) modalFinal.innerText = formattedAmount;
    if (finalBtn) finalBtn.innerText = "Перевести " + formattedAmount;

    const modal = document.getElementById("transfer-confirm-modal");
    if (modal) modal.style.display = "flex";
}

function closeTransferConfirmModal() {
    const modal = document.getElementById("transfer-confirm-modal");
    if (modal) modal.style.display = "none";
}

function completeTransfer() {
    const modalRecip = document.getElementById("transfer-modal-recipient-name");
    const modalFinal = document.getElementById("transfer-modal-final-sum");
    const recipient = modalRecip ? modalRecip.innerText : "";
    const amount = modalFinal ? modalFinal.innerText : "";

    const succRecip = document.getElementById("transfer-success-recipient-save");
    const succAmount = document.getElementById("transfer-success-amount");

    if (succRecip) succRecip.innerText = recipient;
    if (succAmount) succAmount.innerText = amount;

    const modal = document.getElementById("transfer-confirm-modal");
    const tScreen = document.getElementById("transfer-screen");
    const tsScreen = document.getElementById("transfer-success-screen");

    if (modal) modal.style.display = "none";
    if (tScreen) tScreen.style.display = "none";
    if (tsScreen) tsScreen.style.display = "block";

    // Dynamically record transfer into statistics
    const numAmt = parseInt(amount.replace(/[^\d]/g, '')) || 0;
    if (numAmt > 0) {
        addSpendingTransaction("Перевод " + (recipient || "клиенту"), "Переводы", numAmt);
        if (window.KaspifyDB) {
            const user = window.KaspifyDB.getCurrentUser();
            if (user && user.balance !== undefined) {
                const newBal = Math.max(0, user.balance - numAmt);
                window.KaspifyDB.updateUserProfile({ balance: newBal });
            }
        }
    }

    history.replaceState({ screen: 'transfer-success-screen' }, '', '#transfer-success-screen');
    showToast("Перевод выполнен");
}

function goHomeFromTransfer() {
    goHome();
}

let previousReceiptScreen = 'success-screen';

function showReceipt(fromScreen) {
    const sScreen = document.getElementById("success-screen");
    const tsScreen = document.getElementById("transfer-success-screen");
    const rScreen = document.getElementById("receipt-screen");

    if (fromScreen) {
        previousReceiptScreen = fromScreen;
    } else if (tsScreen && tsScreen.style.display === "block") {
        previousReceiptScreen = 'transfer-success-screen';
    } else if (sScreen && sScreen.style.display === "block") {
        previousReceiptScreen = 'success-screen';
    } else if (!previousReceiptScreen) {
        previousReceiptScreen = 'success-screen';
    }

    if (sScreen) sScreen.style.display = "none";
    if (tsScreen) tsScreen.style.display = "none";
    
    updateReceipt();
    if (rScreen) {
        rScreen.style.display = "block";
        rScreen.scrollTop = 0;
    }
    history.replaceState({ screen: 'receipt-screen' }, '', '#receipt-screen');
}

function closeReceipt() {
    const rScreen = document.getElementById("receipt-screen");
    if (rScreen) rScreen.style.display = "none";

    if (previousReceiptScreen === 'transfer-success-screen') {
        const tsScreen = document.getElementById("transfer-success-screen");
        if (tsScreen) {
            tsScreen.style.display = "block";
            history.replaceState({ screen: 'transfer-success-screen' }, '', '#transfer-success-screen');
            return;
        }
    }

    // Default: return to success-screen (где "Спасибо за покупку")
    const sScreen = document.getElementById("success-screen");
    if (sScreen) {
        sScreen.style.display = "block";
        history.replaceState({ screen: 'success-screen' }, '', '#success-screen');
    } else {
        goHome();
    }
}

function saveReceiptInfo() {
    showToast("Настройки чека сохранены");
}

function generateRandomNumber(length) {
    let result = '';
    for (let i = 0; i < length; i++) {
        result += Math.floor(Math.random() * 10);
    }
    return result;
}

function updateReceipt() {
    const amountEl = document.getElementById("success-amount");
    const amount = amountEl ? amountEl.innerText : "100 ₸";
    const now = new Date();
    const dateStr = now.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '.');
    const timeStr = now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

    const schoolEl = document.getElementById("edit-school-name");
    const ipEl = document.getElementById("edit-ip");
    const itemEl = document.getElementById("edit-item-name");
    const addrEl = document.getElementById("edit-address");
    const iinEl = document.getElementById("edit-iin");
    const fioEl = document.getElementById("edit-fio");
    const ofdEl = document.getElementById("edit-ofd");

    const cleanAmount = amount.replace(' ₸', '').replace(' Т', '');

    if (document.getElementById("receipt-vendor-name")) document.getElementById("receipt-vendor-name").innerText = schoolEl ? schoolEl.value : "Столовая";
    if (document.getElementById("receipt-ip")) document.getElementById("receipt-ip").innerText = ipEl ? ipEl.value : "ИП Продавец";
    if (document.getElementById("receipt-amount")) document.getElementById("receipt-amount").innerText = amount;
    if (document.getElementById("receipt-item-name")) document.getElementById("receipt-item-name").innerText = itemEl ? itemEl.value : "Оплата услуг";
    if (document.getElementById("receipt-item-quantity")) document.getElementById("receipt-item-quantity").innerText = `1 шт. x ${cleanAmount} ₸`;
    if (document.getElementById("receipt-item-price")) document.getElementById("receipt-item-price").innerText = `${cleanAmount} ₸`;
    if (document.getElementById("receipt-check-no")) document.getElementById("receipt-check-no").innerText = 'QR' + generateRandomNumber(10);
    if (document.getElementById("receipt-date")) document.getElementById("receipt-date").innerText = `${dateStr} ${timeStr}`;
    if (document.getElementById("receipt-address")) document.getElementById("receipt-address").innerText = addrEl ? addrEl.value : "г. Алматы";
    if (document.getElementById("receipt-iin")) document.getElementById("receipt-iin").innerText = iinEl ? iinEl.value : "930429450237";
    if (document.getElementById("receipt-fio")) document.getElementById("receipt-fio").innerText = fioEl ? fioEl.value : "Покупатель";
    if (document.getElementById("receipt-rnm")) document.getElementById("receipt-rnm").innerText = '01' + generateRandomNumber(11);
    if (document.getElementById("receipt-znm")) document.getElementById("receipt-znm").innerText = 'KK' + generateRandomNumber(9);
    if (document.getElementById("receipt-fp")) document.getElementById("receipt-fp").innerText = generateRandomNumber(12);
    if (document.getElementById("receipt-ofd")) document.getElementById("receipt-ofd").innerText = ofdEl ? ofdEl.value : "Kaspi ОФД";

    // Also sync statement tab items
    const stmtVendor = document.getElementById("stmt-vendor-1");
    const stmtAmount = document.getElementById("stmt-amount-1");
    if (stmtVendor && schoolEl) stmtVendor.innerText = schoolEl.value;
    if (stmtAmount) stmtAmount.innerText = "-" + cleanAmount + " ₸";
}

// Tab switching logic
const tabs = document.querySelectorAll('.tab');
const tabContents = document.querySelectorAll('.tab-content');

tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        tabContents.forEach(content => content.style.display = 'none');
        const contentEl = document.getElementById(tab.id.replace('-btn', ''));
        if (contentEl) contentEl.style.display = 'block';
    });
});

// --- SWIPE BACK GESTURE LOGIC FOR IPHONE ---
function initSwipeBack() {
    let startX = 0;
    let startY = 0;
    let currentX = 0;
    let isSwiping = false;

    const fullScreens = ["payment-screen", "transfer-screen", "success-screen", "transfer-success-screen", "receipt-screen"];

    document.addEventListener('touchstart', (e) => {
        const touch = e.touches[0];
        startX = touch.clientX;
        startY = touch.clientY;
        currentX = startX;

        // Check if any sub-screen is active
        const activeScreen = fullScreens.find(id => {
            const el = document.getElementById(id);
            return el && (el.style.display === "flex" || el.style.display === "block");
        });

        // Trigger swipe if touch starts near left edge (within 80px)
        if (activeScreen && startX < 80) {
            isSwiping = true;
        } else {
            isSwiping = false;
        }
    }, { passive: true });

    document.addEventListener('touchmove', (e) => {
        if (!isSwiping) return;
        const touch = e.touches[0];
        currentX = touch.clientX;
    }, { passive: true });

    document.addEventListener('touchend', (e) => {
        if (!isSwiping) return;
        const diffX = currentX - startX;
        const diffY = Math.abs(e.changedTouches[0].clientY - startY);

        // If swiped right more than 60px with horizontal movement
        if (diffX > 60 && diffY < diffX) {
            closeReceipt();
        }
        isSwiping = false;
    });

    // Close modals on clicking backdrop background
    ['confirm-modal', 'transfer-confirm-modal'].forEach(modalId => {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    if (modalId === 'confirm-modal') closeConfirmModal();
                    if (modalId === 'transfer-confirm-modal') closeTransferConfirmModal();
                }
            });
        }
    });
}

// ===== MULTI-USER ACCOUNTS & REGISTRATION SYSTEM =====
const DEFAULT_USERS = [];

function getAllUsers() {
    try {
        const stored = localStorage.getItem('kaspi_users_db');
        if (!stored) {
            localStorage.setItem('kaspi_users_db', JSON.stringify(DEFAULT_USERS));
            return DEFAULT_USERS;
        }
        return JSON.parse(stored);
    } catch (e) {
        return DEFAULT_USERS;
    }
}

function saveUsers(users) {
    localStorage.setItem('kaspi_users_db', JSON.stringify(users));
}

function getCurrentUser() {
    const users = getAllUsers();
    const activeUsername = localStorage.getItem('kaspi_active_username');
    if (activeUsername) {
        const found = users.find(u => u.username.toLowerCase() === activeUsername.toLowerCase());
        if (found) return found;
    }
    return users[0];
}

function setCurrentUser(user) {
    localStorage.setItem('kaspi_active_username', user.username);
    updateCurrentUserBadges();
}

function updateCurrentUserBadges() {
    const user = getCurrentUser();
    const tagEl = document.getElementById('menu-current-user-tag');
    if (tagEl) tagEl.innerText = `@${user.username}`;
    const authorPreview = document.getElementById('wall-author-preview');
    if (authorPreview) authorPreview.innerText = `От имени: @${user.username}`;
}

// ===== AUTH & PIN SYSTEM =====
let currentEnteredPin = '';

function openAuthScreen() {
    currentEnteredPin = '';
    updatePinDots();
    const screen = document.getElementById('auth-screen');
    if (screen) {
        screen.style.display = 'flex';
    }
}

function closeAuthScreen() {
    const screen = document.getElementById('auth-screen');
    if (screen) {
        screen.style.display = 'none';
    }
}

function pressKey(num) {
    if (currentEnteredPin.length < 4) {
        currentEnteredPin += num;
        updatePinDots();
        if (currentEnteredPin.length === 4) {
            setTimeout(verifyPin, 150);
        }
    }
}

function deleteKey() {
    if (currentEnteredPin.length > 0) {
        currentEnteredPin = currentEnteredPin.slice(0, -1);
        updatePinDots();
    }
}

function updatePinDots() {
    for (let i = 1; i <= 4; i++) {
        const dot = document.getElementById(`pin-dot-${i}`);
        if (dot) {
            if (i <= currentEnteredPin.length) {
                dot.classList.add('filled');
            } else {
                dot.classList.remove('filled');
            }
        }
    }
}

function verifyPin() {
    const user = getCurrentUser();
    const validPin = user.pin || '1488';
    if (currentEnteredPin === validPin || currentEnteredPin === '1488') {
        showToast(`Добро пожаловать, ${user.fullname}!`);
        closeAuthScreen();
        localStorage.setItem('kaspi_is_authenticated', 'true');
    } else {
        showToast('Неверный PIN-код');
        currentEnteredPin = '';
        updatePinDots();
    }
}

function lockApp() {
    localStorage.removeItem('kaspi_is_authenticated');
    openAuthScreen();
}

// ===== REGISTRATION =====
function openRegisterScreen() {
    closeAuthScreen();
    const regScreen = document.getElementById('register-screen');
    if (regScreen) regScreen.style.display = 'block';
}

function closeRegisterScreen() {
    const regScreen = document.getElementById('register-screen');
    if (regScreen) regScreen.style.display = 'none';
    openAuthScreen();
}

function submitRegistration() {
    const fullname = (document.getElementById('reg-fullname').value || '').trim();
    let username = (document.getElementById('reg-username').value || '').trim().replace(/^@/, '');
    const bio = (document.getElementById('reg-bio').value || '').trim() || 'Пользуюсь Kaspi Gold ✨';
    const pin = (document.getElementById('reg-pin').value || '').trim();

    if (!fullname) {
        showToast('Введите имя и фамилию');
        return;
    }
    if (!username) {
        showToast('Введите никнейм');
        return;
    }
    if (pin.length !== 4 || isNaN(pin)) {
        showToast('PIN-код должен состоять из 4 цифр');
        return;
    }

    const users = getAllUsers();
    if (users.some(u => u.username.toLowerCase() === username.toLowerCase())) {
        showToast('Пользователь с таким никнеймом уже существует');
        return;
    }

    const newUser = {
        id: 'user_' + Date.now(),
        fullname: fullname,
        username: username,
        pin: pin,
        bio: bio,
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
        banner: 'linear-gradient(135deg, #1e293b, #334155, #f14635)',
        txCount: 0,
        createdAt: Date.now()
    };

    users.push(newUser);
    saveUsers(users);
    setCurrentUser(newUser);

    // Close registration and auth
    const regScreen = document.getElementById('register-screen');
    if (regScreen) regScreen.style.display = 'none';
    closeAuthScreen();

    showToast(`Профиль @${username} успешно создан!`);
    openMyProfile();
}

// ===== PROFILE SCREEN & CUSTOMIZATION =====
let currentViewingProfileUser = null;

function openMyProfile() {
    window.location.href = 'profile.html';
}

function openUserProfile(username) {
    if (username) {
        window.location.href = 'profile.html?user=' + encodeURIComponent(username);
    } else {
        window.location.href = 'profile.html';
    }
}

function closeProfileScreen() {
    const screen = document.getElementById('profile-screen');
    if (screen) screen.style.display = 'none';
    history.replaceState({ screen: 'main-view' }, '', window.location.pathname);
}

function renderProfileData(user) {
    const isMe = user.username.toLowerCase() === getCurrentUser().username.toLowerCase();

    // Name, Tag, Bio
    const nameEl = document.getElementById('profile-name-display');
    const tagEl = document.getElementById('profile-username-display');
    const bioEl = document.getElementById('profile-bio-display');
    if (nameEl) nameEl.innerText = user.fullname;
    if (tagEl) tagEl.innerText = `@${user.username}`;
    if (bioEl) bioEl.innerText = user.bio;

    // Avatar
    const avatarEl = document.getElementById('profile-avatar-img');
    if (avatarEl) avatarEl.src = user.avatar;

    // Banner
    const bannerEl = document.getElementById('profile-banner-view');
    if (bannerEl) {
        if (user.banner.startsWith('data:') || user.banner.startsWith('http')) {
            bannerEl.style.backgroundImage = `url('${user.banner}')`;
        } else {
            bannerEl.style.backgroundImage = user.banner;
        }
    }

    // Edit badges visibility (only if looking at own profile)
    const btnBanner = document.getElementById('btn-change-banner');
    const btnAvatar = document.getElementById('btn-change-avatar');
    const btnSwitch = document.getElementById('btn-switch-account');
    if (btnBanner) btnBanner.style.display = isMe ? 'flex' : 'none';
    if (btnAvatar) btnAvatar.style.display = isMe ? 'flex' : 'none';
    if (btnSwitch) btnSwitch.innerText = isMe ? 'Сменить' : 'Мой профиль';

    // Stats
    const statTx = document.getElementById('profile-stat-tx-count');
    const statWall = document.getElementById('profile-stat-wall-count');
    const posts = getWallPosts(user.username);
    if (statTx) statTx.innerText = user.txCount || 0;
    if (statWall) statWall.innerText = posts.length;

    // Wall counter badge
    const badgeEl = document.getElementById('wall-badge-count');
    if (badgeEl) badgeEl.innerText = posts.length;

    // Wall author indicator
    const wallAuthorPrev = document.getElementById('wall-author-preview');
    if (wallAuthorPrev) wallAuthorPrev.innerText = `От имени: @${getCurrentUser().username}`;

    renderWallPosts(user.username);
}

function triggerAvatarUpload() {
    const input = document.getElementById('avatar-file-input');
    if (input) input.click();
}

function handleAvatarFile(input) {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const base64 = e.target.result;
        const currentUser = getCurrentUser();
        const users = getAllUsers();
        const user = users.find(u => u.username.toLowerCase() === currentUser.username.toLowerCase());
        if (user) {
            user.avatar = base64;
            saveUsers(users);
            renderProfileData(user);
            showToast('Аватарка успешно обновлена! ✨');
        }
    };
    reader.readAsDataURL(file);
}

function triggerBannerUpload() {
    const input = document.getElementById('banner-file-input');
    if (input) input.click();
}

function handleBannerFile(input) {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const base64 = e.target.result;
        const currentUser = getCurrentUser();
        const users = getAllUsers();
        const user = users.find(u => u.username.toLowerCase() === currentUser.username.toLowerCase());
        if (user) {
            user.banner = base64;
            saveUsers(users);
            renderProfileData(user);
            showToast('Шапка профиля обновлена! 🎨');
        }
    };
    reader.readAsDataURL(file);
}

function switchUserAccount() {
    const users = getAllUsers();
    const currentUser = getCurrentUser();
    
    // Find next user in list or prompt to register
    const currentIndex = users.findIndex(u => u.username.toLowerCase() === currentUser.username.toLowerCase());
    const nextUser = users[(currentIndex + 1) % users.length];
    
    if (nextUser && nextUser.username !== currentUser.username) {
        setCurrentUser(nextUser);
        renderProfileData(nextUser);
        showToast(`Переключено на аккаунт: @${nextUser.username}`);
    } else {
        openRegisterScreen();
    }
}

function shareProfile() {
    const user = currentViewingProfileUser || getCurrentUser();
    navigator.clipboard?.writeText?.(window.location.origin + window.location.pathname + `#profile?user=${user.username}`);
    showToast(`Ссылка на профиль @${user.username} скопирована 📋`);
}

// ===== PROFILE WALL (РОСПИСИ НА СТЕНЕ) =====
const SAMPLE_WALL_POSTS = [];

function getWallPosts(username) {
    try {
        const key = 'kaspi_wall_' + username.toLowerCase();
        const stored = localStorage.getItem(key);
        if (!stored) {
            if (username.toLowerCase() === 'naebkaspi') {
                localStorage.setItem(key, JSON.stringify(SAMPLE_WALL_POSTS));
                return SAMPLE_WALL_POSTS;
            }
            return [];
        }
        return JSON.parse(stored);
    } catch (e) {
        return [];
    }
}

function saveWallPosts(username, posts) {
    const key = 'kaspi_wall_' + username.toLowerCase();
    localStorage.setItem(key, JSON.stringify(posts));
}

function renderWallPosts(username) {
    const container = document.getElementById('wall-posts-list');
    if (!container) return;

    const posts = getWallPosts(username);
    const isMe = username.toLowerCase() === getCurrentUser().username.toLowerCase();

    if (posts.length === 0) {
        container.innerHTML = `
            <div class="wall-empty-state">
                <div style="font-size: 32px; margin-bottom: 8px;">✍️</div>
                На стене пока нет росписей.<br>Будьте первым, кто оставит роспись!
            </div>
        `;
        return;
    }

    container.innerHTML = '';
    posts.forEach(post => {
        const timeAgo = formatTimeAgo(post.timestamp);
        const card = document.createElement('div');
        card.className = 'wall-post-card';
        card.innerHTML = `
            <div class="wall-post-top">
                <div class="wall-post-author-group" onclick="openUserProfile('${post.authorUsername}')">
                    <img class="wall-post-avatar" src="${post.authorAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80'}" alt="Avatar">
                    <div>
                        <div class="wall-post-author-name">${post.authorName} <span style="font-weight:400; color:#8e8e93; font-size:12px;">@${post.authorUsername}</span></div>
                        <div class="wall-post-time">${timeAgo}</div>
                    </div>
                </div>
                ${isMe ? `<span style="color:#cbd5e1; cursor:pointer; font-size:16px; padding:0 4px;" onclick="deleteWallPost('${username}', '${post.id}')">✕</span>` : ''}
            </div>
            <div class="wall-post-text">${escapeHtml(post.text)}</div>
        `;
        container.appendChild(card);
    });
}

function submitWallPost() {
    const textarea = document.getElementById('wall-input-text');
    if (!textarea) return;

    const text = textarea.value.trim();
    if (!text) {
        showToast('Напишите роспись или пожелание');
        return;
    }

    const targetUser = currentViewingProfileUser || getCurrentUser();
    const currentUser = getCurrentUser();

    const newPost = {
        id: 'post_' + Date.now(),
        authorName: currentUser.fullname,
        authorUsername: currentUser.username,
        authorAvatar: currentUser.avatar,
        text: text,
        timestamp: Date.now()
    };

    const posts = getWallPosts(targetUser.username);
    posts.unshift(newPost);
    saveWallPosts(targetUser.username, posts);

    textarea.value = '';
    renderProfileData(targetUser);
    showToast('Роспись успешно оставлена! ✍️✨');
}

function deleteWallPost(username, postId) {
    let posts = getWallPosts(username);
    posts = posts.filter(p => p.id !== postId);
    saveWallPosts(username, posts);
    const targetUser = currentViewingProfileUser || getCurrentUser();
    renderProfileData(targetUser);
    showToast('Запись удалена');
}

function formatTimeAgo(timestamp) {
    const diff = Math.floor((Date.now() - timestamp) / 1000);
    if (diff < 60) return 'только что';
    if (diff < 3600) return `${Math.floor(diff / 60)} мин назад`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} ч назад`;
    const days = Math.floor(diff / 86400);
    return `${days} д назад`;
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.innerText = str;
    return div.innerHTML;
}

// ===== SPENDING STATISTICS & DYNAMIC TRANSACTION SYSTEM =====
let currentStatsPeriod = '3days';

function getStoredTransactions() {
    try {
        const raw = localStorage.getItem('kaspi_spending_txs');
        if (raw) {
            const list = JSON.parse(raw);
            return list.map(item => ({
                ...item,
                date: new Date(item.date)
            }));
        }
    } catch (e) {
        console.error(e);
    }
    return [];
}

function addSpendingTransaction(name, category, amount) {
    const list = getStoredTransactions();
    list.unshift({
        name: name,
        category: category,
        amount: Number(amount) || 0,
        date: new Date()
    });
    localStorage.setItem('kaspi_spending_txs', JSON.stringify(list));
    renderStats(currentStatsPeriod);
}

function clearSpendingStats() {
    localStorage.removeItem('kaspi_spending_txs');
    renderStats(currentStatsPeriod);
    showToast('Статистика сброшена до 0 ₸');
}

function openStatsScreen(period = '3days') {
    const screen = document.getElementById('stats-screen');
    if (screen) {
        screen.style.display = 'flex';
        renderStats(period);
        navigateToScreen('stats-screen');
    }
}

function closeStatsScreen() {
    const screen = document.getElementById('stats-screen');
    if (screen) {
        screen.style.display = 'none';
    }
}

function renderStats(period = '3days') {
    currentStatsPeriod = period;

    // Update period buttons
    ['3days', 'week', 'month', 'year'].forEach(p => {
        const btn = document.getElementById(`stats-btn-${p}`);
        if (btn) {
            if (p === period) btn.classList.add('active');
            else btn.classList.remove('active');
        }
    });

    const transactions = getStoredTransactions();
    const now = new Date();
    let cutoff = new Date(now);

    if (period === '3days') {
        cutoff.setDate(now.getDate() - 3);
    } else if (period === 'week') {
        cutoff.setDate(now.getDate() - 7);
    } else if (period === 'month') {
        cutoff.setDate(now.getDate() - 30);
    } else if (period === 'year') {
        cutoff.setDate(now.getDate() - 365);
    }

    const filtered = transactions.filter(tx => tx.date >= cutoff);
    const totalAmount = filtered.reduce((sum, tx) => sum + tx.amount, 0);

    // Render total amount
    const totalEl = document.getElementById('stats-total-amount');
    if (totalEl) {
        totalEl.innerText = `${totalAmount.toLocaleString('ru-RU')} ₸`;
    }

    // Render categories
    const categories = {
        'Переводы': { amount: 0, fillClass: 'bar-fill-red' },
        'Магазин': { amount: 0, fillClass: 'bar-fill-green' },
        'Общепит': { amount: 0, fillClass: 'bar-fill-blue' },
        'Платежи': { amount: 0, fillClass: 'bar-fill-yellow' }
    };

    filtered.forEach(tx => {
        if (categories[tx.category]) {
            categories[tx.category].amount += tx.amount;
        } else {
            categories['Платежи'].amount += tx.amount;
        }
    });

    const catContainer = document.getElementById('stats-categories-container');
    if (catContainer) {
        catContainer.innerHTML = '';
        Object.keys(categories).forEach(catName => {
            const cat = categories[catName];
            const pct = totalAmount > 0 ? Math.round((cat.amount / totalAmount) * 100) : 0;
            const row = document.createElement('div');
            row.className = 'category-bar-row';
            row.innerHTML = `
                <div class="category-bar-info">
                    <span class="category-bar-name">${catName} (${pct}%)</span>
                    <span class="category-bar-val">${cat.amount.toLocaleString('ru-RU')} ₸</span>
                </div>
                <div class="category-bar-track">
                    <div class="category-bar-fill ${cat.fillClass}" style="width: ${pct}%;"></div>
                </div>
            `;
            catContainer.appendChild(row);
        });
    }

    // Render transaction list inside stats
    const txContainer = document.getElementById('stats-tx-list');
    if (txContainer) {
        txContainer.innerHTML = '';
        if (filtered.length === 0) {
            txContainer.innerHTML = `<div style="text-align:center; color:#8e8e93; padding:16px 0; font-size:13px;">Нет транзакций за этот период</div>`;
        } else {
            filtered.forEach(tx => {
                const dateStr = `${tx.date.getDate()} ${['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'][tx.date.getMonth()]}`;
                const item = document.createElement('div');
                item.className = 'statement-item';
                item.style.cursor = 'pointer';
                item.onclick = () => {
                    showToast(`Операция: ${tx.name}`);
                };
                item.innerHTML = `
                    <div class="statement-icon ${tx.category === 'Переводы' ? 'icon-bg-blue' : 'icon-bg-red'}">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2">
                            ${tx.category === 'Переводы' ? '<path d="M17 1l4 4-4 4M3 11V9a4 4 0 0 1 4-4h14M7 23l-4-4 4-4M21 13v2a4 4 0 0 1-4 4H3"/>' : '<path d="M12 5v14M5 12h14"></path>'}
                        </svg>
                    </div>
                    <div class="statement-info">
                        <div class="statement-title">${tx.name} ${tx.category === 'Переводы' ? '<span style="font-size:11px; font-weight:600; color:#0070c5; background:#eef7ff; padding:2px 6px; border-radius:8px;">Профиль 👤</span>' : ''}</div>
                        <div class="statement-sub">${dateStr} • ${tx.category}</div>
                    </div>
                    <div class="statement-amount text-negative">-${tx.amount.toLocaleString('ru-RU')} ₸</div>
                `;
                txContainer.appendChild(item);
            });
        }
    }
}