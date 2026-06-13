let TODAY = currentDateKey();
const STORAGE_KEY = "daily-pos-state-v2";
const GITHUB_SYNC_KEY = "daily-pos-github-sync-v1";
const AUTH_SESSION_KEY = "daily-pos-authenticated";
const GITHUB_DATA_FILE = "dashboard-pos-data.json";
const LEGACY_STORAGE_KEYS = ["daily-pos-state-v1"];
const fmt = new Intl.NumberFormat("ar", { maximumFractionDigits: 0 });
const money = (value) => `${fmt.format(value)} ${settings?.currency || "أوقية"}`;
const memoryStore = new Map();

function currentDateKey() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function refreshToday() {
  TODAY = currentDateKey();
}

function storageGet(key, area = "local") {
  try {
    const store = area === "session" ? sessionStorage : localStorage;
    return store.getItem(key);
  } catch {
    return memoryStore.get(`${area}:${key}`) || null;
  }
}

function storageSet(key, value, area = "local") {
  try {
    const store = area === "session" ? sessionStorage : localStorage;
    store.setItem(key, value);
  } catch {
    memoryStore.set(`${area}:${key}`, value);
  }
}

function storageRemove(key, area = "local") {
  try {
    const store = area === "session" ? sessionStorage : localStorage;
    store.removeItem(key);
  } catch {
    memoryStore.delete(`${area}:${key}`);
  }
}

function persistentStorageAvailable() {
  const key = "hamma-storage-test";
  try {
    localStorage.setItem(key, "1");
    localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

const initialProducts = [];

const initialSuppliers = [];

const initialSalesHistory = [];

const initialSalesLog = [];
const initialCustomers = [];
const initialCustomerPayments = [];
const initialCapitalMovements = [];
const initialPartners = [];
const defaultSettings = {
  storeName: "Hamma Busness",
  currency: "أوقية",
  taxRate: 0,
  defaultReorder: 10,
  storePhone: "",
  storeAddress: "",
  loginUsername: "admin",
  loginPassword: "1234"
};

const savedState = loadState();
const savedGithubSync = loadGithubSync();
let products = savedState?.products || initialProducts;
let suppliers = savedState?.suppliers || initialSuppliers;
let salesHistory = savedState?.salesHistory || initialSalesHistory;
let salesLog = savedState?.salesLog || initialSalesLog;
let customers = savedState?.customers || initialCustomers;
let customerPayments = savedState?.customerPayments || initialCustomerPayments;
let capitalMovements = savedState?.capitalMovements || initialCapitalMovements;
let partners = savedState?.partners || initialPartners;
let settings = { ...defaultSettings, ...(savedState?.settings || {}) };
if (!savedState?.settings?.storeName || savedState.settings.storeName === "ميزان البيع") {
  settings.storeName = defaultSettings.storeName;
}
let githubSync = {
  token: savedGithubSync?.token || "",
  gistId: savedGithubSync?.gistId || "",
  lastSyncAt: savedGithubSync?.lastSyncAt || "",
  autoSync: savedGithubSync?.autoSync ?? true
};
let invoice = [];
document.body.classList.toggle("locked", storageGet(AUTH_SESSION_KEY, "session") !== "true");
let cloudSyncTimer = null;
let suppressCloudSync = false;
let lastPointerActionAt = 0;

const icons = {
  layout: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg>',
  "plus-box": '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M12 8v8M8 12h8"/></svg>',
  boxes: '<svg viewBox="0 0 24 24"><path d="M21 8l-9-5-9 5 9 5 9-5Z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/></svg>',
  scan: '<svg viewBox="0 0 24 24"><path d="M4 7V5a1 1 0 0 1 1-1h2M17 4h2a1 1 0 0 1 1 1v2M20 17v2a1 1 0 0 1-1 1h-2M7 20H5a1 1 0 0 1-1-1v-2M7 12h10"/></svg>',
  truck: '<svg viewBox="0 0 24 24"><path d="M10 17h4V5H2v12h3"/><path d="M14 8h4l4 4v5h-3"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg>',
  chart: '<svg viewBox="0 0 24 24"><path d="M4 19V5"/><path d="M4 19h16"/><path d="M8 16v-5M12 16V8M16 16v-9"/></svg>',
  bell: '<svg viewBox="0 0 24 24"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></svg>',
  search: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>',
  wallet: '<svg viewBox="0 0 24 24"><path d="M3 7h18v13H3z"/><path d="M16 12h5v4h-5z"/><path d="M3 7l13-4v4"/></svg>',
  clock: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
  save: '<svg viewBox="0 0 24 24"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z"/><path d="M17 21v-8H7v8M7 3v5h8"/></svg>',
  receipt: '<svg viewBox="0 0 24 24"><path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z"/><path d="M9 8h6M9 12h6M9 16h4"/></svg>'
  ,users: '<svg viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  coins: '<svg viewBox="0 0 24 24"><ellipse cx="8" cy="6" rx="5" ry="3"/><path d="M3 6v6c0 1.66 2.24 3 5 3s5-1.34 5-3V6"/><path d="M16 9c2.76 0 5 1.34 5 3s-2.24 3-5 3c-1.1 0-2.11-.21-2.94-.58"/><path d="M11 17c.9.62 2.32 1 4 1 2.76 0 5-1.34 5-3v-3"/></svg>',
  settings: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06-2.12 2.12-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V20h-3v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06-2.12-2.12.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3v-3h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06L6.33 6l.06.06a1.65 1.65 0 0 0 1.82.33H8.3a1.65 1.65 0 0 0 1-1.51V4h3v.09a1.65 1.65 0 0 0 1 1.51h.09a1.65 1.65 0 0 0 1.82-.33l.06-.06 2.12 2.12-.06.06a1.65 1.65 0 0 0-.33 1.82v.09a1.65 1.65 0 0 0 1.51 1H21v3h-.09a1.65 1.65 0 0 0-1.51 1Z"/></svg>',
  download: '<svg viewBox="0 0 24 24"><path d="M12 3v12"/><path d="M7 10l5 5 5-5"/><path d="M5 21h14"/></svg>',
  printer: '<svg viewBox="0 0 24 24"><path d="M6 9V3h12v6"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 14h12v8H6z"/></svg>'
};

function initIcons() {
  document.querySelectorAll("[data-icon]").forEach((node) => {
    node.innerHTML = icons[node.dataset.icon] || "";
  });
}

function loadState() {
  try {
    LEGACY_STORAGE_KEYS.forEach((key) => storageRemove(key));
    return JSON.parse(storageGet(STORAGE_KEY));
  } catch {
    return null;
  }
}

function loadGithubSync() {
  try {
    return JSON.parse(storageGet(GITHUB_SYNC_KEY));
  } catch {
    return null;
  }
}

function persistState() {
  storageSet(STORAGE_KEY, JSON.stringify({ products, suppliers, salesHistory, salesLog, customers, customerPayments, capitalMovements, partners, settings }));
  if (!suppressCloudSync) scheduleCloudSync();
}

function persistGithubSync() {
  storageSet(GITHUB_SYNC_KEY, JSON.stringify(githubSync));
}

function canCloudSync() {
  return Boolean(githubSync.autoSync && githubSync.token);
}

function updateGithubStatus(message) {
  const status = document.getElementById("githubSyncStatus");
  if (status) status.textContent = message;
}

function scheduleCloudSync() {
  if (!canCloudSync()) return;
  window.clearTimeout(cloudSyncTimer);
  cloudSyncTimer = window.setTimeout(async () => {
    try {
      updateGithubStatus("جاري حفظ التغييرات تلقائياً في GitHub...");
      await pushToGithub({ silent: true });
      updateGithubStatus(`تم الحفظ تلقائياً في GitHub | آخر مزامنة: ${githubSync.lastSyncAt}`);
    } catch (error) {
      updateGithubStatus(`تعذر الحفظ السحابي: ${error.message}`);
    }
  }, 1200);
}

function getAppState() {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    products,
    suppliers,
    salesHistory,
    salesLog,
    customers,
    customerPayments,
    capitalMovements,
    partners,
    settings
  };
}

function applyAppState(state) {
  suppressCloudSync = true;
  products = Array.isArray(state.products) ? state.products : [];
  suppliers = Array.isArray(state.suppliers) ? state.suppliers : [];
  salesHistory = Array.isArray(state.salesHistory) ? state.salesHistory : [];
  salesLog = Array.isArray(state.salesLog) ? state.salesLog : [];
  customers = Array.isArray(state.customers) ? state.customers : [];
  customerPayments = Array.isArray(state.customerPayments) ? state.customerPayments : [];
  capitalMovements = Array.isArray(state.capitalMovements) ? state.capitalMovements : [];
  partners = Array.isArray(state.partners) ? state.partners : [];
  settings = { ...defaultSettings, ...(state.settings || {}) };
  invoice = [];
  persistState();
  suppressCloudSync = false;
  renderAll();
}

function daysBetween(date) {
  return Math.floor((new Date(TODAY) - new Date(date)) / 86400000);
}

function isWithinPeriod(date, period) {
  const age = daysBetween(date);
  return (period === "day" && age === 0) || (period === "week" && age <= 7) || (period === "month" && age <= 30);
}

function soldQtyInPeriod(productId, period) {
  return salesLog
    .filter((sale) => isWithinPeriod(sale.date, period))
    .flatMap((sale) => sale.items)
    .filter((item) => item.productId === productId)
    .reduce((sum, item) => sum + item.qty, 0);
}

function customerDebt(customerId) {
  const debtSales = salesLog
    .filter((sale) => sale.paymentType === "debt" && Number(sale.customerId) === Number(customerId))
    .reduce((sum, sale) => sum + sale.total, 0);
  const payments = customerPayments
    .filter((payment) => Number(payment.customerId) === Number(customerId))
    .reduce((sum, payment) => sum + payment.amount, 0);
  return Math.max(0, debtSales - payments);
}

function normalizePartner(partner) {
  return {
    productShares: [],
    share: 0,
    ...partner,
    productShares: Array.isArray(partner.productShares) ? partner.productShares : []
  };
}

function partnerShareForProduct(partner, productId) {
  const specific = (partner.productShares || []).find((entry) => Number(entry.productId) === Number(productId));
  return Number(specific?.share ?? partner.share ?? 0);
}

function totalDefaultPartnerShare(nextPartnerId = null, nextShare = null) {
  return partners.reduce((sum, partner) => {
    const share = Number(nextPartnerId !== null && Number(partner.id) === Number(nextPartnerId) ? nextShare : partner.share || 0);
    return sum + share;
  }, 0);
}

function totalProductPartnerShare(productId, override = null) {
  return partners.reduce((sum, partner) => {
    const share = override && Number(override.partnerId) === Number(partner.id)
      ? Number(override.share || 0)
      : partnerShareForProduct(partner, productId);
    return sum + share;
  }, 0);
}

function totalProductShareWithDefault(productId, partnerId, share) {
  return partners.reduce((sum, partner) => {
    const hasSpecific = (partner.productShares || []).some((entry) => Number(entry.productId) === Number(productId));
    if (Number(partner.id) === Number(partnerId) && !hasSpecific) return sum + Number(share || 0);
    return sum + partnerShareForProduct(partner, productId);
  }, 0);
}

function productName(productId) {
  return products.find((product) => Number(product.id) === Number(productId))?.name || "صنف محذوف";
}

function partnerShareRows(period = "month") {
  return salesLog
    .filter((sale) => isWithinPeriod(sale.date, period))
    .flatMap((sale) => (sale.partnerShares || []).map((share) => ({ sale, share })));
}

function partnerTotals(period = "month") {
  return partnerShareRows(period).reduce((totals, row) => {
    const key = row.share.partnerId || row.share.partnerName;
    if (!totals[key]) totals[key] = { name: row.share.partnerName || "شريك محذوف", total: 0 };
    totals[key].total += Number(row.share.amount || 0);
    return totals;
  }, {});
}

function calculatePartnerSharesForInvoice(lines) {
  return lines.flatMap((line) => {
    const itemProfit = Math.max(0, (Number(line.product.price || 0) - Number(line.product.cost || 0)) * line.qty);
    return partners
      .map((partner) => {
        const sharePercent = partnerShareForProduct(partner, line.product.id);
        if (!sharePercent) return null;
        const amount = itemProfit * (sharePercent / 100);
        return {
          partnerId: partner.id,
          partnerName: partner.name,
          productId: line.product.id,
          productName: line.product.name,
          basisProfit: itemProfit,
          sharePercent,
          amount,
          formula: `${itemProfit} * ${sharePercent}%`
        };
      })
      .filter(Boolean);
  });
}

function renderCustomerOptions() {
  const saleCustomer = document.getElementById("saleCustomer");
  const paymentCustomer = document.getElementById("paymentCustomer");
  const selectedSaleCustomer = saleCustomer?.value || "";
  const selectedPaymentCustomer = paymentCustomer?.value || "";
  const options = customers
    .map((customer) => `<option value="${customer.id}">${customer.name} - ${customer.phone}</option>`)
    .join("");

  if (saleCustomer) {
    saleCustomer.innerHTML = '<option value="">عميل نقدي</option>' + options;
    saleCustomer.value = selectedSaleCustomer;
  }

  if (paymentCustomer) {
    paymentCustomer.innerHTML = '<option value="">اختر العميل</option>' + options;
    paymentCustomer.value = selectedPaymentCustomer;
  }
}

function renderPartnerShareOptions() {
  const partnerSelect = document.getElementById("sharePartnerSelect");
  const productSelect = document.getElementById("shareProductSelect");
  if (!partnerSelect || !productSelect) return;
  const selectedPartner = partnerSelect.value;
  const selectedProduct = productSelect.value;
  partnerSelect.innerHTML = '<option value="">اختر الشريك</option>' + partners
    .map((partner) => `<option value="${partner.id}">${partner.name} - ${fmt.format(Number(partner.share || 0))}%</option>`)
    .join("");
  productSelect.innerHTML = '<option value="">اختر الصنف</option>' + products
    .map((product) => `<option value="${product.id}">${product.name}</option>`)
    .join("");
  partnerSelect.value = selectedPartner;
  productSelect.value = selectedProduct;
}

function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 2200);
}

function activeViewId() {
  return document.querySelector(".view.active")?.id || "dashboard";
}

function currentViewTitle() {
  return document.getElementById("pageTitle")?.textContent.trim() || "تقرير";
}

function csvEscape(value) {
  const text = String(value ?? "").replace(/\r?\n/g, " ");
  return `"${text.replace(/"/g, '""')}"`;
}

function htmlEscape(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function downloadExcel(filename, title, headers, rows) {
  const generatedAt = new Date().toLocaleString("ar");
  const table = `
    <!doctype html>
    <html lang="ar" dir="rtl">
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Tahoma, Arial, sans-serif; direction: rtl; color: #17211c; }
          h1 { background: #1f7a63; color: #ffffff; padding: 14px; margin: 0 0 8px; font-size: 20px; }
          .meta { color: #6b7770; margin: 0 0 14px; }
          table { border-collapse: collapse; width: 100%; direction: rtl; }
          th { background: #13231d; color: #ffffff; font-weight: 700; border: 1px solid #13231d; padding: 10px; text-align: right; }
          td { border: 1px solid #dfe7e1; padding: 9px; text-align: right; }
          tr:nth-child(even) td { background: #eef4ef; }
          tr:nth-child(odd) td { background: #ffffff; }
          .num { mso-number-format: "0"; }
        </style>
      </head>
      <body>
        <h1>${htmlEscape(settings.storeName)} - ${htmlEscape(title)}</h1>
        <p class="meta">تاريخ التصدير: ${htmlEscape(generatedAt)}</p>
        <table>
          <thead><tr>${headers.map((header) => `<th>${htmlEscape(header)}</th>`).join("")}</tr></thead>
          <tbody>
            ${rows.map((row) => `<tr>${row.map((cell) => `<td>${htmlEscape(cell)}</td>`).join("")}</tr>`).join("")}
          </tbody>
        </table>
      </body>
    </html>
  `;
  const blob = new Blob(["\ufeff", table], { type: "application/vnd.ms-excel;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function sectionExportData(viewId) {
  const invoiceRows = invoice.map((line) => [
    line.product.barcode,
    line.product.name,
    line.qty,
    line.product.price,
    line.qty * line.product.price
  ]);
  const reportRows = salesLog.flatMap((sale) => {
    const itemText = sale.items.map((item) => `${item.productName || productName(item.productId)} (${item.qty})`).join("، ");
    const shares = sale.partnerShares || [];
    if (!shares.length) {
      return [[`#${sale.id}`, sale.date, sale.time, sale.customerName || "عميل نقدي", sale.paymentType === "debt" ? "دين" : "تسديد", itemText, sale.total, sale.grossProfit || "", "", "", "", "", "", ""]];
    }
    return shares.map((share) => [
      `#${sale.id}`,
      sale.date,
      sale.time,
      sale.customerName || "عميل نقدي",
      sale.paymentType === "debt" ? "دين" : "تسديد",
      itemText,
      sale.total,
      sale.grossProfit || 0,
      share.partnerName || "شريك محذوف",
      share.productName || productName(share.productId),
      share.basisProfit,
      `${share.sharePercent}%`,
      share.amount,
      share.formula
    ]);
  });

  const exports = {
    dashboard: {
      headers: ["البند", "القيمة"],
      rows: [
        ["مبيعات اليوم", salesHistory.filter((sale) => isWithinPeriod(sale.date, "day")).reduce((sum, sale) => sum + sale.total, 0)],
        ["قيمة المخزون", products.reduce((sum, product) => sum + product.stock * product.price, 0)],
        ["نقص المخزون", products.filter((product) => productStatus(product) === "low").length],
        ["عدد الأصناف", products.length]
      ]
    },
    "new-product": {
      headers: ["الباركود", "الصنف", "الشركة", "المورد", "النوع", "سعر الشراء", "سعر البيع", "الفارق", "المخزون", "حد الطلب"],
      rows: products.map((product) => [product.barcode, product.name, product.maker, supplierName(product.supplierId), product.type, product.cost, product.price, product.price - product.cost, product.stock, product.reorder])
    },
    inventory: {
      headers: ["الباركود", "الصنف", "الشركة", "المورد", "النوع", "سعر الشراء", "سعر البيع", "الفارق", "المخزون", "حد الطلب", "آخر تحديث"],
      rows: products.map((product) => [product.barcode, product.name, product.maker, supplierName(product.supplierId), product.type, product.cost, product.price, product.price - product.cost, product.stock, product.reorder, product.updated])
    },
    pos: {
      headers: ["الباركود", "الصنف", "الكمية", "السعر", "الإجمالي"],
      rows: invoiceRows
    },
    suppliers: {
      headers: ["المورد", "الهاتف", "المنتجات", "الأصناف المرتبطة", "سجل الطلبات"],
      rows: suppliers.map((supplier) => {
        const linked = products.filter((product) => Number(product.supplierId) === supplier.id).map((product) => product.name).join("، ");
        return [supplier.name, supplier.contact, supplier.product, linked, supplier.orders.join("، ")];
      })
    },
    customers: {
      headers: ["العميل", "الهاتف", "النوع", "الدين المتبقي", "ملاحظات"],
      rows: customers.map((customer) => [customer.name, customer.phone, customer.type, customerDebt(customer.id), customer.notes])
    },
    capital: {
      headers: ["النوع", "المبلغ", "البيان", "التاريخ", "الوقت"],
      rows: capitalMovements.map((entry) => [entry.type, entry.amount, entry.note, entry.date, entry.time])
    },
    partners: {
      headers: ["الشريك", "الهاتف", "نسبة المشاركة", "رأس المال المدفوع", "ملاحظات"],
      rows: partners.map((partner) => [partner.name, partner.phone, partner.share, partner.capital, partner.notes])
    },
    reports: {
      headers: ["رقم العملية", "التاريخ", "الوقت", "العميل", "الدفع", "الأصناف", "الإجمالي"],
      rows: salesLog.map((sale) => {
        const itemText = sale.items.map((item) => {
          const product = products.find((entry) => entry.id === item.productId);
          return `${product?.name || "صنف محذوف"} (${item.qty})`;
        }).join("، ");
        return [`#${sale.id}`, sale.date, sale.time, sale.customerName || "عميل نقدي", sale.paymentType === "debt" ? "دين" : "تسديد", itemText, sale.total];
      })
    },
    settings: {
      headers: ["الإعداد", "القيمة"],
      rows: [
        ["اسم المتجر", settings.storeName],
        ["العملة", settings.currency],
        ["نسبة الضريبة", settings.taxRate],
        ["حد تنبيه المخزون", settings.defaultReorder],
        ["الهاتف", settings.storePhone],
        ["العنوان", settings.storeAddress]
      ]
    }
  };

  exports.partners = {
    headers: ["الشريك", "الهاتف", "النسبة العامة", "رأس المال", "النسب الخاصة بالاصناف", "ملاحظات"],
    rows: partners.map((partner) => {
      const productShareText = (partner.productShares || []).map((entry) => `${productName(entry.productId)}: ${entry.share}%`).join("، ");
      return [partner.name, partner.phone, partner.share, partner.capital, productShareText, partner.notes];
    })
  };
  exports.reports = {
    headers: ["رقم العملية", "التاريخ", "الوقت", "العميل", "الدفع", "الأصناف", "إجمالي المبيعات", "إجمالي الربح", "الشريك", "الصنف", "أساس الاحتساب", "النسبة", "حصة الشريك", "المعادلة"],
    rows: reportRows
  };

  return exports[viewId] || exports.dashboard;
}

function exportActiveSection() {
  const viewId = activeViewId();
  const data = sectionExportData(viewId);
  if (!data.rows.length) {
    showToast("لا توجد بيانات لتصديرها في هذا القسم");
    return;
  }
  downloadExcel(`Hamma-Busness-${viewId}.xls`, currentViewTitle(), data.headers, data.rows);
  showToast("تم تجهيز ملف Excel");
}

function printActiveSection() {
  const view = document.querySelector(".view.active");
  if (!view) return;
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    showToast("اسمح بفتح النوافذ المنبثقة للطباعة");
    return;
  }
  printWindow.document.write(`
    <!doctype html>
    <html lang="ar" dir="rtl">
      <head>
        <meta charset="UTF-8">
        <title>${currentViewTitle()}</title>
        <style>
          body { font-family: Tahoma, Arial, sans-serif; color: #17211c; margin: 24px; direction: rtl; }
          h1 { font-size: 24px; margin: 0 0 16px; }
          table { width: 100%; border-collapse: collapse; margin-top: 12px; }
          th, td { border: 1px solid #dfe7e1; padding: 8px; text-align: right; }
          .primary-action, .ghost-action, .small-btn, input, select, .search-field, .form-actions, button { display: none !important; }
          .panel, .form-panel, .metric, .entity-row, .supplier-card, .capital-card { border: 1px solid #dfe7e1; padding: 12px; margin-bottom: 10px; }
          .metric-grid, .dashboard-grid, .reports-grid, .management-grid, .pos-layout, .supplier-grid { display: block; }
          .muted { color: #6b7770; }
        </style>
      </head>
      <body>
        <h1>${settings.storeName} - ${currentViewTitle()}</h1>
        ${view.innerHTML}
      </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  window.setTimeout(() => printWindow.print(), 250);
}

function githubHeaders() {
  if (!githubSync.token) throw new Error("أدخل GitHub Token أولاً من الإعدادات.");
  return {
    "Accept": "application/vnd.github+json",
    "Authorization": `Bearer ${githubSync.token}`,
    "X-GitHub-Api-Version": "2022-11-28"
  };
}

async function githubRequest(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...githubHeaders(),
      ...(options.headers || {})
    }
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GitHub رفض الطلب (${response.status}). ${text.slice(0, 160)}`);
  }

  return response.json();
}

async function pushToGithub(options = {}) {
  const content = JSON.stringify(getAppState(), null, 2);
  const payload = {
    description: "Dashboard POS cloud data",
    public: false,
    files: {
      [GITHUB_DATA_FILE]: { content }
    }
  };

  const gist = githubSync.gistId
    ? await githubRequest(`https://api.github.com/gists/${githubSync.gistId}`, {
        method: "PATCH",
        body: JSON.stringify(payload)
      })
    : await githubRequest("https://api.github.com/gists", {
        method: "POST",
        body: JSON.stringify(payload)
      });

  githubSync.gistId = gist.id;
  githubSync.lastSyncAt = new Date().toLocaleString("ar");
  persistGithubSync();
  renderSettings();
  if (!options.silent) showToast("تم رفع البيانات إلى GitHub");
}

async function pullFromGithub() {
  if (!githubSync.gistId) throw new Error("أدخل Gist ID أو قم برفع البيانات أولاً لإنشاء Gist.");
  const gist = await githubRequest(`https://api.github.com/gists/${githubSync.gistId}`);
  const file = gist.files?.[GITHUB_DATA_FILE];
  if (!file?.content) throw new Error(`لم يتم العثور على الملف ${GITHUB_DATA_FILE} داخل Gist.`);

  const state = JSON.parse(file.content);
  applyAppState(state);
  githubSync.lastSyncAt = new Date().toLocaleString("ar");
  persistGithubSync();
  renderSettings();
  showToast("تم استيراد البيانات من GitHub");
}

function productStatus(product) {
  return product.stock <= product.reorder ? "low" : "ok";
}

function supplierName(supplierId) {
  return suppliers.find((supplier) => supplier.id === Number(supplierId))?.name || "بدون مورد";
}

function renderSupplierOptions() {
  const select = document.getElementById("productSupplier");
  if (!select) return;
  const selected = select.value;
  select.innerHTML = '<option value="">بدون مورد</option>' + suppliers
    .map((supplier) => `<option value="${supplier.id}">${supplier.name}</option>`)
    .join("");
  select.value = selected;
}

function updatePriceMargin() {
  const purchase = Number(document.getElementById("purchasePrice")?.value || 0);
  const sale = Number(document.getElementById("salePrice")?.value || 0);
  const margin = sale - purchase;
  const field = document.getElementById("priceMargin");
  if (field) field.value = money(margin);
}

function renderDashboard() {
  const today = salesHistory.find((sale) => sale.date === TODAY)?.total || 0;
  const week = salesHistory.slice(0, 7).reduce((sum, sale) => sum + sale.total, 0);
  const inventoryValue = products.reduce((sum, product) => sum + product.stock * product.price, 0);
  const lowStock = products.filter((product) => productStatus(product) === "low");

  document.getElementById("todaySales").textContent = money(today);
  document.getElementById("weekSales").textContent = money(week);
  document.getElementById("inventoryValue").textContent = money(inventoryValue);
  document.getElementById("lowStockCount").textContent = fmt.format(lowStock.length);
  document.getElementById("sidebarLowStock").textContent = `${fmt.format(lowStock.length)} أصناف تحتاج متابعة`;

  document.getElementById("stockPreview").innerHTML = products.length ? products.slice(0, 6).map((product) => `
    <tr>
      <td>${product.name}</td>
      <td>${product.type}</td>
      <td>${fmt.format(product.stock)}</td>
      <td><span class="status ${productStatus(product)}">${productStatus(product) === "low" ? "إعادة طلب" : "متوفر"}</span></td>
    </tr>
  `).join("") : '<tr><td colspan="4" class="muted">لا توجد أصناف بعد. ابدأ بإضافة صنف جديد.</td></tr>';

  const maxSold = Math.max(...products.map((product) => product.sold), 1);
  document.getElementById("topProducts").innerHTML = products.length ? [...products]
    .sort((a, b) => b.sold - a.sold)
    .slice(0, 5)
    .map((product, index) => `
      <div class="rank-row">
        <div>
          <strong>${index + 1}. ${product.name}</strong>
          <div class="muted">${fmt.format(product.sold)} عملية بيع</div>
          <div class="bar"><span style="width:${Math.round((product.sold / maxSold) * 100)}%"></span></div>
        </div>
        <strong>${money(product.price)}</strong>
      </div>
    `).join("") : '<div class="muted">لا توجد مبيعات بعد.</div>';

  document.getElementById("lowStockAlerts").innerHTML = lowStock.map((product) => `
    <div class="alert-row">
      <div>
        <strong>${product.name}</strong>
        <div class="muted">المتوفر ${fmt.format(product.stock)} | حد الطلب ${fmt.format(product.reorder)} | ${product.maker}</div>
      </div>
      <span class="status low">اطلب الآن</span>
    </div>
  `).join("") || '<div class="muted">لا توجد أصناف ناقصة حالياً.</div>';
}

function renderInventory() {
  const makerFilter = document.getElementById("makerFilter");
  const selectedMaker = makerFilter.value;
  makerFilter.innerHTML = '<option value="">كل الشركات</option>' + [...new Set(products.map((product) => product.maker))]
    .map((maker) => `<option value="${maker}">${maker}</option>`).join("");
  makerFilter.value = selectedMaker;

  const term = document.getElementById("inventorySearch").value.trim();
  const type = document.getElementById("typeFilter").value;
  const date = document.getElementById("dateFilter").value;
  const maker = makerFilter.value;
  const filtered = products.filter((product) => {
    const matchesTerm = !term || product.name.includes(term) || product.barcode.includes(term);
    const matchesType = !type || product.type === type;
    const matchesMaker = !maker || product.maker === maker;
    const age = daysBetween(product.updated);
    const matchesDate = !date || (date === "today" && age === 0) || (date === "week" && age <= 7) || (date === "month" && age <= 30);
    return matchesTerm && matchesType && matchesMaker && matchesDate;
  });

  document.getElementById("inventoryTable").innerHTML = filtered.length ? filtered.map((product) => `
    <tr>
      <td>${product.barcode}</td>
      <td>${product.name}<div class="muted">تحديث ${product.updated}</div></td>
      <td>${product.maker}</td>
      <td>${supplierName(product.supplierId)}</td>
      <td>${product.type}</td>
      <td>${money(product.cost || 0)}</td>
      <td>${money(product.price)}</td>
      <td>${money(product.price - (product.cost || 0))}</td>
      <td><input class="edit-input" data-stock-id="${product.id}" type="number" min="0" value="${product.stock}" /></td>
      <td><button class="small-btn" data-save-stock="${product.id}" type="button">حفظ</button></td>
      <td><button class="small-btn" data-delete-product="${product.id}" type="button">حذف</button></td>
    </tr>
  `).join("") : '<tr><td colspan="11" class="muted">لا توجد أصناف مطابقة. أضف صنفاً جديداً للبدء.</td></tr>';
}

function renderPOS() {
  const term = document.getElementById("posSearch").value.trim();
  const visible = products.filter((product) => !term || product.name.includes(term) || product.barcode.includes(term));

  document.getElementById("productPicker").innerHTML = visible.length ? visible.map((product) => `
    <div class="picker-item">
      <div>
        <strong>${product.name}</strong>
        <div class="muted">${product.barcode} | ${product.maker} | المتوفر ${fmt.format(product.stock)}</div>
      </div>
      <button class="small-btn" data-add-product="${product.id}" type="button">إضافة</button>
    </div>
  `).join("") : '<div class="muted">لا توجد أصناف للبيع حالياً.</div>';

  const subtotal = invoice.reduce((sum, line) => sum + line.qty * line.product.price, 0);
  const tax = subtotal * ((settings.taxRate || 0) / 100);
  const total = subtotal + tax;
  const count = invoice.reduce((sum, line) => sum + line.qty, 0);
  document.getElementById("invoiceLines").innerHTML = invoice.map((line) => `
    <div class="invoice-line">
      <div>
        <strong>${line.product.name}</strong>
        <div class="muted">${money(line.product.price)} للقطعة</div>
      </div>
      <input data-qty="${line.product.id}" type="number" min="1" max="${line.product.stock}" value="${line.qty}" />
      <strong>${money(line.qty * line.product.price)}</strong>
      <button class="small-btn" data-remove-line="${line.product.id}" type="button">حذف</button>
    </div>
  `).join("") || '<div class="muted">لم تتم إضافة أصناف للفاتورة.</div>';
  document.getElementById("invoiceCount").textContent = fmt.format(count);
  document.getElementById("invoiceTax").textContent = money(tax);
  document.getElementById("invoiceTotal").textContent = money(total);
}

function renderSuppliers() {
  const term = document.getElementById("supplierSearch")?.value.trim() || "";
  const filtered = suppliers.filter((supplier) => {
    return !term || supplier.name.includes(term) || supplier.contact.includes(term) || supplier.product.includes(term);
  });

  document.getElementById("supplierCards").innerHTML = filtered.length ? filtered.map((supplier) => {
    const linkedProducts = products.filter((product) => Number(product.supplierId) === supplier.id);
    return `
    <article class="supplier-card">
      <h3>${supplier.name}</h3>
      <dl>
        <div><dt>الهاتف</dt><dd>${supplier.contact}</dd></div>
        <div><dt>المنتجات</dt><dd>${supplier.product}</dd></div>
        <div><dt>الأصناف المرتبطة</dt><dd>${linkedProducts.length ? linkedProducts.map((product) => product.name).join("، ") : "لا توجد أصناف مرتبطة"}</dd></div>
        <div><dt>سجل الطلبات</dt><dd>${supplier.orders.length ? supplier.orders.join("، ") : "لا يوجد سجل طلبات"}</dd></div>
      </dl>
      <button class="small-btn" data-delete-supplier="${supplier.id}" type="button">حذف المورد</button>
    </article>
  `;
  }).join("") : '<div class="muted">لا توجد بيانات موردين بعد.</div>';
}

function renderCustomers() {
  const term = document.getElementById("customerSearch")?.value.trim() || "";
  const filtered = customers.filter((customer) => {
    return !term || customer.name.includes(term) || customer.phone.includes(term) || customer.type.includes(term);
  });

  document.getElementById("customerList").innerHTML = filtered.length ? filtered.map((customer) => `
    <div class="entity-row">
      <div>
        <strong>${customer.name}</strong>
        <div class="muted">${customer.phone} | ${customer.type}</div>
        <div class="muted">الدين المتبقي: ${money(customerDebt(customer.id))}</div>
        <div class="muted">${customer.notes || "لا توجد ملاحظات"}</div>
      </div>
      <button class="small-btn" data-delete-customer="${customer.id}" type="button">حذف</button>
    </div>
  `).join("") : '<div class="muted">لا توجد بيانات عملاء بعد.</div>';

  document.getElementById("customerPaymentList").innerHTML = customerPayments.length ? customerPayments
    .map((payment) => {
      const customer = customers.find((entry) => entry.id === Number(payment.customerId));
      return `
        <div class="entity-row">
          <div>
            <strong>${customer?.name || "عميل محذوف"}</strong>
            <div class="muted">${payment.date} | ${payment.time} | ${payment.note || "تسديد"}</div>
          </div>
          <div>
            <strong>${money(payment.amount)}</strong>
            <button class="small-btn" data-delete-payment="${payment.id}" type="button">حذف</button>
          </div>
        </div>
      `;
    }).join("") : '<div class="muted">لا توجد تسديدات مسجلة بعد.</div>';
}

function renderCapital() {
  const deposits = capitalMovements
    .filter((entry) => entry.type === "إيداع رأس مال")
    .reduce((sum, entry) => sum + entry.amount, 0);
  const expenses = capitalMovements
    .filter((entry) => entry.type !== "إيداع رأس مال")
    .reduce((sum, entry) => sum + entry.amount, 0);
  const salesTotal = salesHistory.reduce((sum, sale) => sum + sale.total, 0);
  const net = deposits + salesTotal - expenses;

  document.getElementById("capitalSummary").innerHTML = `
    <div class="capital-card"><span class="muted">رأس المال</span><strong>${money(deposits)}</strong></div>
    <div class="capital-card"><span class="muted">مبيعات مسجلة</span><strong>${money(salesTotal)}</strong></div>
    <div class="capital-card"><span class="muted">الصافي</span><strong>${money(net)}</strong></div>
  `;

  document.getElementById("capitalList").innerHTML = capitalMovements.length ? [...capitalMovements]
    .sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`))
    .map((entry) => `
      <div class="entity-row">
        <div>
          <strong>${entry.type}</strong>
          <div class="muted">${entry.date} | ${entry.time} | ${entry.note}</div>
        </div>
        <div>
          <strong>${money(entry.amount)}</strong>
          <button class="small-btn" data-delete-capital="${entry.id}" type="button">حذف</button>
        </div>
      </div>
    `).join("") : '<div class="muted">لا توجد حركات رأس مال بعد.</div>';
}

function renderPartnersLegacy() {
  const term = document.getElementById("partnerSearch")?.value.trim() || "";
  const filtered = partners.filter((partner) => {
    return !term || partner.name.includes(term) || partner.phone.includes(term);
  });
  const totalCapital = partners.reduce((sum, partner) => sum + Number(partner.capital || 0), 0);
  const totalShare = partners.reduce((sum, partner) => sum + Number(partner.share || 0), 0);

  document.getElementById("partnerSummary").innerHTML = `
    <div class="capital-card"><span class="muted">عدد الشركاء</span><strong>${fmt.format(partners.length)}</strong></div>
    <div class="capital-card"><span class="muted">إجمالي رأس المال</span><strong>${money(totalCapital)}</strong></div>
    <div class="capital-card"><span class="muted">مجموع النسب</span><strong>${fmt.format(totalShare)}%</strong></div>
  `;

  document.getElementById("partnerList").innerHTML = filtered.length ? filtered.map((partner) => `
    <div class="entity-row">
      <div>
        <strong>${partner.name}</strong>
        <div class="muted">${partner.phone} | نسبة المشاركة ${partner.share}%</div>
        <div class="muted">رأس المال ${money(partner.capital)} | ${partner.notes || "لا توجد ملاحظات"}</div>
      </div>
      <button class="small-btn" data-delete-partner="${partner.id}" type="button">حذف</button>
    </div>
  `).join("") : '<div class="muted">لا توجد بيانات شركاء بعد.</div>';
}

function renderPartners() {
  const term = document.getElementById("partnerSearch")?.value.trim() || "";
  const filtered = partners.filter((partner) => {
    return !term || partner.name.includes(term) || partner.phone.includes(term);
  });
  const totalCapital = partners.reduce((sum, partner) => sum + Number(partner.capital || 0), 0);
  const totalShare = partners.reduce((sum, partner) => sum + Number(partner.share || 0), 0);
  const productShares = partners.flatMap((partner) => (partner.productShares || []).map((entry) => ({ partner, entry })));

  document.getElementById("partnerSummary").innerHTML = `
    <div class="capital-card"><span class="muted">عدد الشركاء</span><strong>${fmt.format(partners.length)}</strong></div>
    <div class="capital-card"><span class="muted">إجمالي رأس المال</span><strong>${money(totalCapital)}</strong></div>
    <div class="capital-card"><span class="muted">مجموع النسب العامة</span><strong class="${totalShare > 100 ? "danger-text" : ""}">${fmt.format(totalShare)}%</strong></div>
  `;

  document.getElementById("partnerList").innerHTML = filtered.length ? filtered.map((partner) => `
    <div class="entity-row">
      <div>
        <strong>${partner.name}</strong>
        <div class="muted">${partner.phone || "بدون هاتف"} | نسبة عامة ${fmt.format(Number(partner.share || 0))}%</div>
        <div class="muted">رأس المال ${money(partner.capital)} | ${partner.notes || "لا توجد ملاحظات"}</div>
      </div>
      <div class="inline-actions">
        <input class="mini-input" data-partner-share-input="${partner.id}" type="number" min="0" max="100" step="0.1" value="${Number(partner.share || 0)}" aria-label="نسبة ربح الشريك">
        <button class="small-btn" data-save-partner-share="${partner.id}" type="button">حفظ النسبة</button>
        <button class="small-btn danger-btn" data-delete-partner="${partner.id}" type="button">حذف</button>
      </div>
    </div>
  `).join("") : '<div class="muted">لا توجد بيانات شركاء بعد.</div>';

  renderPartnerShareOptions();
  const shareList = document.getElementById("partnerProductShareList");
  if (shareList) {
    shareList.innerHTML = productShares.length ? productShares.map(({ partner, entry }) => `
      <div class="entity-row">
        <div>
          <strong>${partner.name}</strong>
          <div class="muted">${productName(entry.productId)} | نسبة خاصة ${fmt.format(Number(entry.share || 0))}%</div>
          <div class="muted">مجموع نسب هذا الصنف: ${fmt.format(totalProductPartnerShare(entry.productId))}%</div>
        </div>
        <button class="small-btn danger-btn" data-delete-product-share="${partner.id}:${entry.productId}" type="button">حذف</button>
      </div>
    `).join("") : '<div class="muted">لا توجد نسب خاصة بالاصناف بعد. يتم استخدام نسبة الشريك العامة تلقائيا.</div>';
  }
}

function renderSettings() {
  const form = document.getElementById("settingsForm");
  if (!form) return;
  document.getElementById("brandName").textContent = settings.storeName || defaultSettings.storeName;
  document.title = `${settings.storeName || defaultSettings.storeName} - مبيعات ومخزون`;
  const reorderInput = document.getElementById("productReorder");
  if (reorderInput && !reorderInput.value) reorderInput.placeholder = String(settings.defaultReorder || 0);
  form.storeName.value = settings.storeName;
  form.currency.value = settings.currency;
  form.taxRate.value = settings.taxRate;
  form.defaultReorder.value = settings.defaultReorder;
  form.storePhone.value = settings.storePhone;
  form.storeAddress.value = settings.storeAddress;
  form.loginUsername.value = settings.loginUsername;
  form.loginPassword.value = settings.loginPassword;

  const githubForm = document.getElementById("githubSyncForm");
  githubForm.githubToken.value = githubSync.token;
  githubForm.githubGistId.value = githubSync.gistId;
  githubForm.githubAutoSync.checked = Boolean(githubSync.autoSync);
  document.getElementById("githubSyncStatus").textContent = githubSync.gistId
    ? `مرتبط بـ Gist: ${githubSync.gistId}${githubSync.autoSync ? " | الحفظ التلقائي مفعل" : " | الحفظ التلقائي متوقف"}${githubSync.lastSyncAt ? ` | آخر مزامنة: ${githubSync.lastSyncAt}` : ""}`
    : "البيانات تحفظ محلياً فقط. احفظ Token ثم اضغط رفع البيانات لإنشاء Gist وحفظها سحابياً.";
  if (!githubSync.gistId && githubSync.token) {
    document.getElementById("githubSyncStatus").textContent = "GitHub Token محفوظ. سيتم إنشاء Gist تلقائيا عند أول حفظ أو تعديل.";
  }
  if (!persistentStorageAvailable()) {
    document.getElementById("githubSyncStatus").textContent = "تنبيه: هذا المتصفح يمنع التخزين المحلي. استخدم GitHub Sync حتى لا تضيع البيانات.";
  }
}

function renderReports() {
  const daily = salesHistory.filter((sale) => isWithinPeriod(sale.date, "day")).reduce((sum, sale) => sum + sale.total, 0);
  const weekly = salesHistory.filter((sale) => isWithinPeriod(sale.date, "week")).reduce((sum, sale) => sum + sale.total, 0);
  const monthly = salesHistory.filter((sale) => isWithinPeriod(sale.date, "month")).reduce((sum, sale) => sum + sale.total, 0);
  const selectedPeriod = document.getElementById("reportPeriod")?.value || "week";

  document.getElementById("periodReports").innerHTML = [
    ["مبيعات يومية", daily],
    ["مبيعات أسبوعية", weekly],
    ["مبيعات شهرية", monthly]
  ].map(([label, value]) => `
    <div class="period-row">
      <div>
        <strong>${label}</strong>
        <div class="muted">إجمالي الفترة المحددة</div>
      </div>
      <strong>${money(value)}</strong>
    </div>
  `).join("");

  document.getElementById("soldUnsoldReport").innerHTML = products.length ? products.map((product) => {
    const sold = soldQtyInPeriod(product.id, selectedPeriod);
    const available = product.stock;
    const total = sold + available;
    const ratio = total ? Math.round((sold / total) * 100) : 0;
    return `
      <div class="sold-unsold-row">
        <div>
          <strong>${product.name}</strong>
          <div class="split">
            <span>مباع: ${fmt.format(sold)}</span>
            <span>غير مباع: ${fmt.format(available)}</span>
          </div>
          <div class="bar"><span style="width:${ratio}%"></span></div>
        </div>
        <span class="status ${sold ? "ok" : "low"}">${sold ? `${fmt.format(ratio)}%` : "بدون بيع"}</span>
      </div>
    `;
  }).join("") : '<div class="muted">لا توجد أصناف لعرض المباع وغير المباع.</div>';

  document.getElementById("profitReports").innerHTML = products.length ? [...products]
    .sort((a, b) => (b.price - b.cost) * b.sold - (a.price - a.cost) * a.sold)
    .slice(0, 5)
    .map((product) => `
      <div class="profit-row">
        <div><strong>${product.name}</strong><div class="muted">هامش ${money(product.price - product.cost)}</div></div>
        <strong>${money((product.price - product.cost) * product.sold)}</strong>
      </div>
    `).join("") : '<div class="muted">لا توجد أرباح بعد. سجّل مبيعات لاحتساب الربحية.</div>';

  document.getElementById("remainingStock").innerHTML = products.length ? products.map((product) => {
    const ratio = Math.min(100, Math.round((product.stock / Math.max(product.reorder * 3, 1)) * 100));
    return `
      <div class="stock-row">
        <div>
          <strong>${product.name}</strong>
          <div class="muted">المتبقي ${fmt.format(product.stock)} | حد الطلب ${fmt.format(product.reorder)}</div>
          <div class="bar"><span style="width:${ratio}%"></span></div>
        </div>
        <span class="status ${productStatus(product)}">${productStatus(product) === "low" ? "منخفض" : "جيد"}</span>
      </div>
    `;
  }).join("") : '<div class="muted">لا يوجد مخزون مسجل بعد.</div>';

  document.getElementById("relationshipReport").innerHTML = suppliers.length ? suppliers.map((supplier) => {
    const linkedProducts = products.filter((product) => Number(product.supplierId) === supplier.id);
    const linkedSales = linkedProducts.reduce((sum, product) => sum + soldQtyInPeriod(product.id, "month"), 0);
    const stockValue = linkedProducts.reduce((sum, product) => sum + product.stock * product.price, 0);
    return `
      <div class="entity-row">
        <div>
          <strong>${supplier.name}</strong>
          <div class="muted">الأصناف: ${linkedProducts.length ? linkedProducts.map((product) => product.name).join("، ") : "لا توجد"}</div>
          <div class="muted">مبيعات آخر شهر: ${fmt.format(linkedSales)} قطعة | قيمة المخزون: ${money(stockValue)}</div>
        </div>
        <span class="status ${linkedProducts.length ? "ok" : "low"}">${fmt.format(linkedProducts.length)} صنف</span>
      </div>
    `;
  }).join("") : '<div class="muted">أضف موردين واربطهم بالأصناف لعرض العلاقات.</div>';

  const shareRows = partnerShareRows(selectedPeriod);
  const shareTotals = Object.values(partnerTotals(selectedPeriod));
  const periodSalesTotal = salesLog
    .filter((sale) => isWithinPeriod(sale.date, selectedPeriod))
    .reduce((sum, sale) => sum + Number(sale.total || 0), 0);

  document.getElementById("partnerProfitSummary").innerHTML = `
    <div class="capital-card"><span class="muted">إجمالي المبيعات</span><strong>${money(periodSalesTotal)}</strong></div>
    <div class="capital-card"><span class="muted">عدد حصص الشركاء</span><strong>${fmt.format(shareRows.length)}</strong></div>
    <div class="capital-card"><span class="muted">إجمالي الحصص</span><strong>${money(shareTotals.reduce((sum, entry) => sum + entry.total, 0))}</strong></div>
    ${shareTotals.map((entry) => `<div class="capital-card"><span class="muted">${entry.name}</span><strong>${money(entry.total)}</strong></div>`).join("")}
  `;

  document.getElementById("partnerShareTable").innerHTML = shareRows.length ? shareRows
    .sort((a, b) => `${b.sale.date} ${b.sale.time}`.localeCompare(`${a.sale.date} ${a.sale.time}`))
    .map(({ sale, share }) => `
      <tr>
        <td>#${sale.id}</td>
        <td>${sale.date} ${sale.time}</td>
        <td>${share.partnerName || "شريك محذوف"}</td>
        <td>${share.productName || productName(share.productId)} | ${money(share.basisProfit)}</td>
        <td>${fmt.format(Number(share.sharePercent || 0))}%</td>
        <td>${money(share.amount)}</td>
      </tr>
    `).join("") : '<tr><td colspan="6" class="muted">لا توجد حصص شركاء مسجلة في الفترة المحددة.</td></tr>';

  document.getElementById("salesLogTable").innerHTML = salesLog.length ? [...salesLog]
    .sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`))
    .slice(0, 10)
    .map((sale) => {
      const itemText = sale.items.map((item) => {
        const product = products.find((entry) => entry.id === item.productId);
        return `${product?.name || "صنف محذوف"} (${fmt.format(item.qty)})`;
      }).join("، ");
      return `
        <tr>
          <td>#${sale.id}</td>
          <td>${sale.date}</td>
          <td>${sale.time}</td>
          <td>${sale.customerName || "عميل نقدي"}</td>
          <td><span class="status ${sale.paymentType === "debt" ? "low" : "ok"}">${sale.paymentType === "debt" ? "دين" : "تسديد"}</span></td>
          <td>${itemText}</td>
          <td>${money(sale.total)}</td>
          <td><button class="small-btn" data-delete-sale="${sale.id}" type="button">حذف</button></td>
        </tr>
      `;
    }).join("") : '<tr><td colspan="8" class="muted">لم يتم تسجيل أي عملية بيع بعد.</td></tr>';
}

function renderAll() {
  refreshToday();
  products = products.map((product) => ({
    supplierId: "",
    sold: 0,
    stock: 0,
    cost: 0,
    price: 0,
    ...product,
    sold: Number(product.sold || 0),
    stock: Number(product.stock || 0),
    cost: Number(product.cost || 0),
    price: Number(product.price || 0)
  }));
  partners = partners.map(normalizePartner);
  renderSupplierOptions();
  renderCustomerOptions();
  renderDashboard();
  renderInventory();
  renderPOS();
  renderSuppliers();
  renderCustomers();
  renderCapital();
  renderPartners();
  renderSettings();
  renderReports();
}

function switchView(viewId) {
  document.querySelectorAll(".view").forEach((view) => view.classList.toggle("active", view.id === viewId));
  document.querySelectorAll(".nav-item").forEach((item) => item.classList.toggle("active", item.dataset.view === viewId));
  const active = document.querySelector(`.nav-item[data-view="${viewId}"]`);
  document.getElementById("pageTitle").textContent = active ? active.textContent.trim() : "الرئيسية";
}

function handleAction(event) {
  const target = event.target;
  if (!(target instanceof Element)) return;
  if (event.type === "click" && Date.now() - lastPointerActionAt < 450) return;
  if (event.type === "pointerup") {
    if (event.pointerType === "mouse") return;
    if (target.closest("input, select, textarea, label")) return;
    if (!target.closest("button, [data-view], [data-view-jump], [data-add-product], [data-remove-line], [data-save-stock], [data-delete-customer], [data-delete-supplier], [data-delete-product], [data-delete-capital], [data-delete-sale], [data-delete-payment], [data-delete-partner], [data-save-partner-share], [data-delete-product-share]")) return;
    event.preventDefault();
    lastPointerActionAt = Date.now();
  }
  const nav = target.closest("[data-view]");
  const jump = target.closest("[data-view-jump]");
  const add = target.closest("[data-add-product]");
  const remove = target.closest("[data-remove-line]");
  const save = target.closest("[data-save-stock]");
  const deleteCustomer = target.closest("[data-delete-customer]");
  const deleteSupplier = target.closest("[data-delete-supplier]");
  const deleteProduct = target.closest("[data-delete-product]");
  const deleteCapital = target.closest("[data-delete-capital]");
  const deleteSale = target.closest("[data-delete-sale]");
  const deletePayment = target.closest("[data-delete-payment]");
  const deletePartner = target.closest("[data-delete-partner]");
  const savePartnerShare = target.closest("[data-save-partner-share]");
  const deleteProductShare = target.closest("[data-delete-product-share]");

  if (nav) switchView(nav.dataset.view);
  if (jump) switchView(jump.dataset.viewJump);
  if (add) {
    const product = products.find((item) => item.id === Number(add.dataset.addProduct));
    const line = invoice.find((item) => item.product.id === product.id);
    if (line) line.qty = Math.min(product.stock, line.qty + 1);
    else invoice.push({ product, qty: 1 });
    renderPOS();
  }
  if (remove) {
    invoice = invoice.filter((line) => line.product.id !== Number(remove.dataset.removeLine));
    renderPOS();
  }
  if (save) {
    const id = Number(save.dataset.saveStock);
    const input = document.querySelector(`[data-stock-id="${id}"]`);
    const product = products.find((item) => item.id === id);
    product.stock = Number(input.value);
    product.updated = TODAY;
    persistState();
    renderAll();
    showToast("تم تحديث بيانات المخزون");
  }
  if (deleteProduct) {
    const productId = Number(deleteProduct.dataset.deleteProduct);
    products = products.filter((product) => product.id !== productId);
    invoice = invoice.filter((line) => line.product.id !== productId);
    persistState();
    renderAll();
    showToast("تم حذف الصنف من المخزون");
  }
  if (deleteCustomer) {
    const customerId = Number(deleteCustomer.dataset.deleteCustomer);
    customers = customers.filter((customer) => customer.id !== customerId);
    salesLog = salesLog.map((sale) => Number(sale.customerId) === customerId
      ? { ...sale, customerId: null, customerName: "عميل محذوف" }
      : sale);
    persistState();
    renderAll();
    showToast("تم حذف العميل");
  }
  if (deleteSupplier) {
    const supplierId = Number(deleteSupplier.dataset.deleteSupplier);
    suppliers = suppliers.filter((supplier) => supplier.id !== supplierId);
    products = products.map((product) => Number(product.supplierId) === supplierId ? { ...product, supplierId: "" } : product);
    persistState();
    renderAll();
    showToast("تم حذف المورد وفك ربطه عن الأصناف");
  }
  if (deleteCapital) {
    capitalMovements = capitalMovements.filter((entry) => entry.id !== Number(deleteCapital.dataset.deleteCapital));
    persistState();
    renderCapital();
    showToast("تم حذف حركة رأس المال");
  }
  if (deleteSale) {
    const saleId = Number(deleteSale.dataset.deleteSale);
    const sale = salesLog.find((entry) => entry.id === saleId);
    if (sale) {
      sale.items.forEach((item) => {
        const product = products.find((entry) => entry.id === item.productId);
        if (product) {
          product.stock = Number(product.stock || 0) + item.qty;
          product.sold = Math.max(0, Number(product.sold || 0) - item.qty);
        }
      });
      const day = salesHistory.find((entry) => entry.date === sale.date);
      if (day) day.total = Math.max(0, day.total - sale.total);
      salesHistory = salesHistory.filter((entry) => entry.total > 0);
      salesLog = salesLog.filter((entry) => entry.id !== saleId);
      persistState();
      renderAll();
      showToast("تم حذف عملية البيع وإرجاع المخزون");
    }
  }
  if (deletePayment) {
    customerPayments = customerPayments.filter((payment) => payment.id !== Number(deletePayment.dataset.deletePayment));
    persistState();
    renderAll();
    showToast("تم حذف التسديد");
  }
  if (deletePartner) {
    partners = partners.filter((partner) => partner.id !== Number(deletePartner.dataset.deletePartner));
    persistState();
    renderAll();
    showToast("تم حذف الشريك");
  }
  if (savePartnerShare) {
    const partnerId = Number(savePartnerShare.dataset.savePartnerShare);
    const input = document.querySelector(`[data-partner-share-input="${partnerId}"]`);
    const partner = partners.find((entry) => Number(entry.id) === partnerId);
    const share = Number(input?.value || 0);
    if (!partner || share < 0 || share > 100) {
      showToast("ادخل نسبة صحيحة بين 0 و 100");
      return;
    }
    if (totalDefaultPartnerShare(partnerId, share) > 100) {
      showToast("مجموع نسب الشركاء العامة لا يمكن أن يتجاوز 100%");
      return;
    }
    const overSharedProduct = products.find((product) => totalProductShareWithDefault(product.id, partnerId, share) > 100);
    if (overSharedProduct) {
      showToast(`تعديل النسبة يجعل مجموع صنف ${overSharedProduct.name} يتجاوز 100%`);
      return;
    }
    partner.share = share;
    persistState();
    renderAll();
    showToast("تم حفظ نسبة الشريك");
  }
  if (deleteProductShare) {
    const [partnerId, productId] = deleteProductShare.dataset.deleteProductShare.split(":").map(Number);
    const partner = partners.find((entry) => Number(entry.id) === partnerId);
    if (partner) {
      partner.productShares = (partner.productShares || []).filter((entry) => Number(entry.productId) !== productId);
      persistState();
      renderAll();
      showToast("تم حذف النسبة الخاصة بالصنف");
    }
  }
}

document.addEventListener("click", handleAction);
if (window.PointerEvent) {
  document.addEventListener("pointerup", handleAction, { passive: false });
}

document.addEventListener("input", (event) => {
  if (event.target.matches("#inventorySearch, #typeFilter, #dateFilter, #makerFilter")) renderInventory();
  if (event.target.matches("#customerSearch")) renderCustomers();
  if (event.target.matches("#supplierSearch")) renderSuppliers();
  if (event.target.matches("#partnerSearch")) renderPartners();
  if (event.target.matches("#posSearch")) renderPOS();
  if (event.target.matches("#purchasePrice, #salePrice")) updatePriceMargin();
  if (event.target.matches("[data-qty]")) {
    const line = invoice.find((item) => item.product.id === Number(event.target.dataset.qty));
    line.qty = Math.max(1, Math.min(Number(event.target.value), line.product.stock));
    renderPOS();
  }
});

document.addEventListener("change", (event) => {
  if (event.target.matches("#typeFilter, #dateFilter, #makerFilter")) renderInventory();
  if (event.target.matches("#reportPeriod")) renderReports();
});

document.getElementById("productForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  products.unshift({
    id: Date.now(),
    barcode: `622${Math.floor(1000 + Math.random() * 9000)}`,
    name: form.get("name"),
    price: Number(form.get("price")),
    cost: Number(form.get("cost")),
    maker: form.get("maker"),
    supplierId: form.get("supplierId"),
    type: form.get("type"),
    stock: Number(form.get("stock")),
    reorder: Number(form.get("reorder") || settings.defaultReorder || 0),
    sold: 0,
    updated: TODAY
  });
  event.currentTarget.reset();
  persistState();
  renderAll();
  showToast("تمت إضافة الصنف بنجاح");
  switchView("inventory");
});

document.getElementById("supplierForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const orderNote = form.get("orders").trim();
  suppliers.unshift({
    id: Date.now(),
    name: form.get("name"),
    contact: form.get("contact"),
    product: form.get("product") || "غير محدد",
    orders: orderNote ? [orderNote] : []
  });
  event.currentTarget.reset();
  persistState();
  renderAll();
  showToast("تم حفظ المورد وربطه بقائمة الأصناف");
});

document.getElementById("customerForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  customers.unshift({
    id: Date.now(),
    name: form.get("name"),
    phone: form.get("phone"),
    type: form.get("type"),
    notes: form.get("notes")
  });
  event.currentTarget.reset();
  persistState();
  renderCustomers();
  showToast("تم حفظ العميل");
});

document.getElementById("customerPaymentForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const customerId = Number(form.get("customerId"));
  const amount = Number(form.get("amount"));
  const now = new Date();
  customerPayments.unshift({
    id: Date.now(),
    customerId,
    amount,
    note: form.get("note"),
    date: TODAY,
    time: `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`
  });
  event.currentTarget.reset();
  persistState();
  renderAll();
  showToast("تم تسجيل تسديد العميل");
});

document.getElementById("capitalForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const now = new Date();
  capitalMovements.unshift({
    id: Date.now(),
    type: form.get("type"),
    amount: Number(form.get("amount")),
    note: form.get("note"),
    date: TODAY,
    time: `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`
  });
  event.currentTarget.reset();
  persistState();
  renderCapital();
  showToast("تم حفظ حركة رأس المال");
});

document.getElementById("partnerForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const share = Number(form.get("share"));
  if (share < 0 || share > 100 || totalDefaultPartnerShare() + share > 100) {
    showToast("مجموع نسب الشركاء العامة لا يمكن أن يتجاوز 100%");
    return;
  }
  partners.unshift({
    id: Date.now(),
    name: form.get("name"),
    phone: form.get("phone"),
    share,
    capital: Number(form.get("capital")),
    notes: form.get("notes"),
    productShares: []
  });
  event.currentTarget.reset();
  persistState();
  renderAll();
  showToast("تم حفظ الشريك");
});

document.getElementById("partnerProductShareForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const partnerId = Number(form.get("partnerId"));
  const productId = Number(form.get("productId"));
  const share = Number(form.get("share"));
  const partner = partners.find((entry) => Number(entry.id) === partnerId);
  if (!partner || !productId || share < 0 || share > 100) {
    showToast("اختر الشريك والصنف وادخل نسبة صحيحة");
    return;
  }
  if (totalProductPartnerShare(productId, { partnerId, share }) > 100) {
    showToast("مجموع نسب هذا الصنف لا يمكن أن يتجاوز 100%");
    return;
  }
  partner.productShares = partner.productShares || [];
  const existing = partner.productShares.find((entry) => Number(entry.productId) === productId);
  if (existing) existing.share = share;
  else partner.productShares.push({ productId, share });
  event.currentTarget.reset();
  persistState();
  renderAll();
  showToast("تم حفظ نسبة الشريك لهذا الصنف");
});

document.getElementById("settingsForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  settings = {
    storeName: form.get("storeName"),
    currency: form.get("currency"),
    taxRate: Number(form.get("taxRate") || 0),
    defaultReorder: Number(form.get("defaultReorder") || 0),
    storePhone: form.get("storePhone"),
    storeAddress: form.get("storeAddress"),
    loginUsername: form.get("loginUsername"),
    loginPassword: form.get("loginPassword")
  };
  persistState();
  renderAll();
  showToast("تم حفظ الإعدادات");
});

document.getElementById("loginForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const username = String(form.get("username") || "").trim();
  const password = String(form.get("password") || "");
  const loginError = document.getElementById("loginError");

  if (username === settings.loginUsername && password === settings.loginPassword) {
    storageSet(AUTH_SESSION_KEY, "true", "session");
    document.body.classList.remove("locked");
    event.currentTarget.reset();
    loginError.textContent = "";
    renderAll();
    return;
  }

  loginError.textContent = "اسم المستخدم أو كلمة المرور غير صحيحة.";
});

document.getElementById("logoutBtn").addEventListener("click", () => {
  storageRemove(AUTH_SESSION_KEY, "session");
  document.body.classList.add("locked");
  showToast("تم تسجيل الخروج");
});

document.getElementById("githubSyncForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  githubSync.token = form.get("githubToken").trim();
  githubSync.gistId = form.get("githubGistId").trim();
  githubSync.autoSync = form.get("githubAutoSync") === "on";
  persistGithubSync();
  renderSettings();
  scheduleCloudSync();
  showToast("تم حفظ إعدادات GitHub");
});

document.getElementById("pushGithubBtn").addEventListener("click", async () => {
  try {
    await pushToGithub();
    githubSync.autoSync = true;
    persistGithubSync();
    renderSettings();
  } catch (error) {
    showToast(error.message);
  }
});

document.getElementById("pullGithubBtn").addEventListener("click", async () => {
  try {
    await pullFromGithub();
  } catch (error) {
    showToast(error.message);
  }
});

document.getElementById("resetDataBtn").addEventListener("click", () => {
  products = [];
  salesHistory = [];
  salesLog = [];
  customers = [];
  customerPayments = [];
  capitalMovements = [];
  partners = [];
  invoice = [];
  persistState();
  renderAll();
  showToast("تم تصفير بيانات التطبيق");
});

document.getElementById("recordSaleBtn").addEventListener("click", () => {
  refreshToday();
  if (!invoice.length) {
    showToast("أضف صنفاً واحداً على الأقل للفاتورة");
    return;
  }
  const subtotal = invoice.reduce((sum, line) => sum + line.qty * line.product.price, 0);
  const total = subtotal + subtotal * ((settings.taxRate || 0) / 100);
  const now = new Date();
  const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const selectedCustomerId = Number(document.getElementById("saleCustomer").value);
  const selectedCustomer = customers.find((customer) => customer.id === selectedCustomerId);
  const paymentType = document.getElementById("paymentType").value;
  if (paymentType === "debt" && !selectedCustomer) {
    showToast("اختر عميلاً قبل تسجيل الفاتورة كدين");
    return;
  }
  const overSharedLine = invoice.find((line) => totalProductPartnerShare(line.product.id) > 100);
  if (overSharedLine) {
    showToast(`مجموع نسب الشركاء للصنف ${overSharedLine.product.name} يتجاوز 100%`);
    return;
  }
  const partnerShares = calculatePartnerSharesForInvoice(invoice);
  const grossProfit = invoice.reduce((sum, line) => {
    return sum + Math.max(0, (Number(line.product.price || 0) - Number(line.product.cost || 0)) * line.qty);
  }, 0);
  invoice.forEach((line) => {
    line.product.stock = Number(line.product.stock || 0) - line.qty;
    line.product.sold = Number(line.product.sold || 0) + line.qty;
    line.product.updated = TODAY;
  });
  salesLog.unshift({
    id: Date.now(),
    date: TODAY,
    time,
    customerId: selectedCustomer?.id || null,
    customerName: selectedCustomer?.name || "عميل نقدي",
    paymentType,
    items: invoice.map((line) => ({
      productId: line.product.id,
      productName: line.product.name,
      qty: line.qty,
      price: Number(line.product.price || 0),
      cost: Number(line.product.cost || 0),
      profit: Math.max(0, (Number(line.product.price || 0) - Number(line.product.cost || 0)) * line.qty)
    })),
    total,
    grossProfit,
    partnerShares
  });
  const todaySale = salesHistory.find((sale) => sale.date === TODAY);
  if (todaySale) todaySale.total += total;
  else salesHistory.unshift({ date: TODAY, total });
  invoice = [];
  persistState();
  renderAll();
  showToast(`تم تسجيل العملية بقيمة ${money(total)}`);
});

document.getElementById("quickSaleBtn").addEventListener("click", () => switchView("pos"));
document.getElementById("exportExcelBtn").addEventListener("click", exportActiveSection);
document.getElementById("printSectionBtn").addEventListener("click", printActiveSection);
document.getElementById("globalSearch").addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    document.getElementById("inventorySearch").value = event.target.value;
    switchView("inventory");
    renderInventory();
  }
});

initIcons();
renderAll();
