// script.js
function changeBalance() {
    let current = document.getElementById("balance").innerText.replace(" ₸", "").replace(/\s/g, '');
    let newSum = prompt("Введите сумму баланса:", current);
    if (newSum) {
        document.getElementById("balance").innerText = parseFloat(newSum).toLocaleString('ru-RU', { minimumFractionDigits: 2 }) + " ₸";
    }
}

function openPayment() {
    document.getElementById("payment-screen").style.display = "flex";
    document.getElementById("main-view").style.display = "none";
}

function closePayment() {
    document.getElementById("payment-screen").style.display = "none";
    document.getElementById("main-view").style.display = "block";
    closeConfirmModal();
}


function changePaymentSum() {
    let current = document.getElementById("edit-amount").innerText.replace(" Т", "").replace(/\s/g, '');
    let newSum = prompt("Введите сумму платежа:", current);
    if (newSum) {
        let formatted = parseFloat(newSum).toLocaleString('ru-RU');
        document.getElementById("edit-amount").innerText = formatted + " ₸";
    }
}

// Логика нового меню подтверждения
function openConfirmModal() {
    const vendor = document.getElementById("edit-vendor").value;
    const amount = document.getElementById("edit-amount").innerText;

    document.getElementById("modal-vendor-name").innerText = vendor;
    document.getElementById("modal-amount-val").innerText = amount;
    document.getElementById("modal-final-sum").innerText = amount;
    document.getElementById("final-btn-text").innerText = "Оплатить " + amount;

    document.getElementById("confirm-modal").style.display = "flex";
}

function closeConfirmModal() {
    document.getElementById("confirm-modal").style.display = "none";
}
function completePayment() {

    const vendor = document.getElementById("modal-vendor-name").innerText;
    const amount = document.getElementById("modal-final-sum").innerText;

    document.getElementById("success-vendor").innerText = vendor;
    document.getElementById("success-amount").innerText = amount;

    const now = new Date();
    const formattedDate = now.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' }) 
    + ", " + now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

    document.getElementById("success-date").innerText = formattedDate;

    document.getElementById("confirm-modal").style.display = "none";
    document.getElementById("payment-screen").style.display = "none";
    document.getElementById("success-screen").style.display = "block";
    updateReceipt();
}

function goHome() {
    document.getElementById("success-screen").style.display = "none";
    document.getElementById("main-view").style.display = "block";
}

// Логика для экрана переводов
function openTransferScreen() {
    document.getElementById("transfer-screen").style.display = "flex";
    document.getElementById("main-view").style.display = "none";
    document.getElementById("transfer-sender-balance").innerText = document.getElementById("balance").innerText;
}

function closeTransferScreen() {
    document.getElementById("transfer-screen").style.display = "none";
    document.getElementById("main-view").style.display = "block";
}

// Обновление кнопки перевода при изменении суммы
const transferAmountInput = document.getElementById('transfer-amount-input');
if (transferAmountInput) {
    transferAmountInput.addEventListener('input', function() {
        let val = this.value.replace(/[^0-9]/g, '');
        let num = parseInt(val) || 0;
        let formatted = num.toLocaleString('ru-RU');
        this.value = formatted + ' ₸';
        document.getElementById('btnTransfer').innerText = `Перевести ${this.value}`;
    });
}

// Логика подтверждения перевода
function openTransferConfirmModal() {
    const recipient = document.getElementById("recipient-name").value;
    const amount = document.getElementById('transfer-amount-input').value;

    document.getElementById("transfer-modal-recipient-name").innerText = recipient;
    document.getElementById("transfer-modal-amount-val").innerText = amount;
    document.getElementById("transfer-modal-final-sum").innerText = amount;
    document.getElementById("transfer-final-btn-text").innerText = "Перевести " + amount;

    document.getElementById("transfer-confirm-modal").style.display = "flex";
}

function closeTransferConfirmModal() {
    document.getElementById("transfer-confirm-modal").style.display = "none";
}

function completeTransfer() {
    const recipient = document.getElementById("transfer-modal-recipient-name").innerText;
    const amount = document.getElementById("transfer-modal-final-sum").innerText;

    document.getElementById("transfer-success-recipient-save").innerText = recipient;
    document.getElementById("transfer-success-amount").innerText = amount;

    document.getElementById("transfer-confirm-modal").style.display = "none";
    document.getElementById("transfer-screen").style.display = "none";
    document.getElementById("transfer-success-screen").style.display = "block";
}

function goHomeFromTransfer() {
    document.getElementById("transfer-success-screen").style.display = "none";
    document.getElementById("transfer-screen").style.display = "flex";
}

function showReceipt() {
    document.getElementById("success-screen").style.display = "none";
    document.getElementById("transfer-success-screen").style.display = "none";
    updateReceipt();
    document.getElementById("receipt-screen").style.display = "block";
}

function closeReceipt() {
    document.getElementById("receipt-screen").style.display = "none";
    // Return to success screen or home, depending on context
    document.getElementById("success-screen").style.display = "block"; // or transfer
}

function generateRandomNumber(length) {
    let result = '';
    for (let i = 0; i < length; i++) {
        result += Math.floor(Math.random() * 10);
    }
    return result;
}

function updateReceipt() {
    const amount = document.getElementById("success-amount").innerText;
    const now = new Date();
    const dateStr = now.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '.');
    const timeStr = now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

    document.getElementById("receipt-vendor-name").innerText = document.getElementById("edit-school-name").value;
    document.getElementById("receipt-ip").innerText = document.getElementById("edit-ip").value;
    document.getElementById("receipt-amount").innerText = amount;
    document.getElementById("receipt-item-name").innerText = document.getElementById("edit-item-name").value;
    document.getElementById("receipt-item-quantity").innerText = `1 шт. x ${amount.replace(' ₸', '')} ₸`;
    document.getElementById("receipt-item-price").innerText = `${amount.replace(' ₸', '')} ₸`;
    document.getElementById("receipt-check-no").innerText = 'QR' + generateRandomNumber(10);
    document.getElementById("receipt-date").innerText = `${dateStr} ${timeStr}`;
    document.getElementById("receipt-address").innerText = document.getElementById("edit-address").value;
    document.getElementById("receipt-iin").innerText = document.getElementById("edit-iin").value;
    document.getElementById("receipt-fio").innerText = document.getElementById("edit-fio").value;
    document.getElementById("receipt-rnm").innerText = '01' + generateRandomNumber(11);
    document.getElementById("receipt-znm").innerText = 'KK' + generateRandomNumber(9);
    document.getElementById("receipt-fp").innerText = generateRandomNumber(12);
    document.getElementById("receipt-ofd").innerText = document.getElementById("edit-ofd").value;
}

// Tab switching logic
const tabs = document.querySelectorAll('.tab');
const tabContents = document.querySelectorAll('.tab-content');

tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        tabContents.forEach(content => content.style.display = 'none');
        document.getElementById(tab.id.replace('-btn', '')).style.display = 'block';
    });
});