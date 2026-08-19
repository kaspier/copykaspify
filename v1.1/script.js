// script.js

// --- HISTORY MANAGEMENT & SCREEN SWITCHING ---
// State management for seamless back gesture on iOS Safari, Android, and desktop browsers

let isNavigatingBack = false;

// Initialize history state and hash routing on load
window.addEventListener('load', () => {
    history.replaceState({ screen: 'main-view' }, '', window.location.pathname);
    initSwipeBack();
    handleHashRouting();
});

function handleHashRouting() {
    const hash = window.location.hash;
    if (hash === '#payment') {
        openPayment();
    } else if (hash === '#transfer') {
        openTransferScreen();
    } else if (hash === '#receipt') {
        showReceipt();
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
    const screens = ["payment-screen", "success-screen", "transfer-screen", "transfer-success-screen", "receipt-screen"];
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
    const vendorEl = document.getElementById("edit-vendor");
    const amountEl = document.getElementById("edit-amount");
    const vendor = vendorEl ? vendorEl.value : "ИП КУЗНЕЦОВА В.О.";
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

function closeConfirmModal() {
    if (history.state && history.state.screen === "confirm-modal") {
        history.back();
    } else {
        const modal = document.getElementById("confirm-modal");
        if (modal) modal.style.display = "none";
    }
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
    
    updateReceipt();
    history.replaceState({ screen: 'success-screen' }, '', '#success-screen');
    showToast("Платеж успешно проведен");
}

function goHome() {
    const screens = ["payment-screen", "success-screen", "transfer-screen", "transfer-success-screen", "receipt-screen"];
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

function openTransferScreen() {
    const tScreen = document.getElementById("transfer-screen");
    const mScreen = document.getElementById("main-view");
    const balanceEl = document.getElementById("balance");
    const senderBal = document.getElementById("transfer-sender-balance");

    if (tScreen) tScreen.style.display = "flex";
    if (mScreen) mScreen.style.display = "none";
    if (senderBal && balanceEl) senderBal.innerText = balanceEl.innerText;
    
    navigateToScreen("transfer-screen");
}

function closeTransferScreen() {
    if (history.state && history.state.screen === "transfer-screen") {
        history.back();
    } else {
        const tScreen = document.getElementById("transfer-screen");
        const mScreen = document.getElementById("main-view");
        if (tScreen) tScreen.style.display = "none";
        if (mScreen) mScreen.style.display = "block";
    }
}

// Format transfer amount input on typing
const transferAmountInput = document.getElementById('transfer-amount-input');
if (transferAmountInput) {
    transferAmountInput.addEventListener('input', function() {
        let val = this.value.replace(/[^0-9]/g, '');
        let num = parseInt(val) || 0;
        let formatted = num.toLocaleString('ru-RU');
        this.value = formatted + ' ₸';
        const btn = document.getElementById('btnTransfer');
        if (btn) btn.innerText = `Перевести ${this.value}`;
    });
}

function openTransferConfirmModal() {
    const recipientEl = document.getElementById("recipient-name");
    const amountEl = document.getElementById('transfer-amount-input');
    const recipient = recipientEl ? recipientEl.value : "Матвей К.";
    const amount = amountEl ? amountEl.value : "100 ₸";

    const modalRecip = document.getElementById("transfer-modal-recipient-name");
    const modalAmount = document.getElementById("transfer-modal-amount-val");
    const modalFinal = document.getElementById("transfer-modal-final-sum");
    const btnText = document.getElementById("transfer-final-btn-text");

    if (modalRecip) modalRecip.innerText = recipient;
    if (modalAmount) modalAmount.innerText = amount;
    if (modalFinal) modalFinal.innerText = amount;
    if (btnText) btnText.innerText = "Перевести " + amount;

    const modal = document.getElementById("transfer-confirm-modal");
    if (modal) modal.style.display = "flex";
    navigateToScreen("transfer-confirm-modal");
}

function closeTransferConfirmModal() {
    if (history.state && history.state.screen === "transfer-confirm-modal") {
        history.back();
    } else {
        const modal = document.getElementById("transfer-confirm-modal");
        if (modal) modal.style.display = "none";
    }
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

    history.replaceState({ screen: 'transfer-success-screen' }, '', '#transfer-success-screen');
    showToast("Перевод выполнен");
}

function goHomeFromTransfer() {
    goHome();
}

function showReceipt() {
    const sScreen = document.getElementById("success-screen");
    const tsScreen = document.getElementById("transfer-success-screen");
    const rScreen = document.getElementById("receipt-screen");

    if (sScreen) sScreen.style.display = "none";
    if (tsScreen) tsScreen.style.display = "none";
    
    updateReceipt();
    if (rScreen) rScreen.style.display = "block";
    history.replaceState({ screen: 'receipt-screen' }, '', '#receipt-screen');
}

function closeReceipt() {
    goHome();
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

    if (document.getElementById("receipt-vendor-name")) document.getElementById("receipt-vendor-name").innerText = schoolEl ? schoolEl.value : "Столовая Гимназия 45";
    if (document.getElementById("receipt-ip")) document.getElementById("receipt-ip").innerText = ipEl ? ipEl.value : "ИП Кузнецова В.О.";
    if (document.getElementById("receipt-amount")) document.getElementById("receipt-amount").innerText = amount;
    if (document.getElementById("receipt-item-name")) document.getElementById("receipt-item-name").innerText = itemEl ? itemEl.value : "Горячее питание";
    if (document.getElementById("receipt-item-quantity")) document.getElementById("receipt-item-quantity").innerText = `1 шт. x ${cleanAmount} ₸`;
    if (document.getElementById("receipt-item-price")) document.getElementById("receipt-item-price").innerText = `${cleanAmount} ₸`;
    if (document.getElementById("receipt-check-no")) document.getElementById("receipt-check-no").innerText = 'QR' + generateRandomNumber(10);
    if (document.getElementById("receipt-date")) document.getElementById("receipt-date").innerText = `${dateStr} ${timeStr}`;
    if (document.getElementById("receipt-address")) document.getElementById("receipt-address").innerText = addrEl ? addrEl.value : "г. Караганда, Бухар-Жырау, 72a";
    if (document.getElementById("receipt-iin")) document.getElementById("receipt-iin").innerText = iinEl ? iinEl.value : "930429450237";
    if (document.getElementById("receipt-fio")) document.getElementById("receipt-fio").innerText = fioEl ? fioEl.value : "Иван Д.";
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