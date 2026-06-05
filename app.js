const TODAY = "2026-06-05";
const STORAGE_KEY = "daily-pos-state-v2";
const GITHUB_SYNC_KEY = "daily-pos-github-sync-v1";
const GITHUB_DATA_FILE = "dashboard-pos-data.json";
const LEGACY_STORAGE_KEYS = ["daily-pos-state-v1"];
const fmt = new Intl.NumberFormat("ar", { maximumFractionDigits: 0 });
const money = (value) => `${fmt.format(value)} ${settings?.currency || "أوقية"}`;

const initialProducts = [];

const suppliers = [];

const initialSalesHistory = [];

const initialSalesLog = [];
const initialCustomers = [];
const initialCapitalMovements = [];
const defaultSettings = {
  storeName: "Hamma Busness",
  currency: "أوقية",
  taxRate: 0,
  defaultReorder: 10,
  storePhone: "",
  storeAddress: ""
};

const savedState = loadState();
const savedGithubSync = loadGithubSync();
let products = savedState?.products || initialProducts;
let salesHistory = savedState?.salesHistory || initialSalesHistory;
let salesLog = savedState?.salesLog || initialSalesLog;
let customers = savedState?.customers || initialCustomers;
let capitalMovements = savedState?.capitalMovements || initialCapitalMovements;
let settings = { ...defaultSettings, ...(savedState?.settings || {}) };
if (!savedState?.settings?.storeName || savedState.settings.storeName === "ميزان البيع") {
  settings.storeName = defaultSettings.storeName;
}
let githubSync = {
  token: savedGithubSync?.token || "",
  gistId: savedGithubSync?.gistId || "",
  lastSyncAt: savedGithubSync?.lastSyncAt || ""
};
let invoice = [];

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
  settings: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06-2.12 2.12-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V20h-3v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06-2.12-2.12.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3v-3h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06L6.33 6l.06.06a1.65 1.65 0 0 0 1.82.33H8.3a1.65 1.65 0 0 0 1-1.51V4h3v.09a1.65 1.65 0 0 0 1 1.51h.09a1.65 1.65 0 0 0 1.82-.33l.06-.06 2.12 2.12-.06.06a1.65 1.65 0 0 0-.33 1.82v.09a1.65 1.65 0 0 0 1.51 1H21v3h-.09a1.65 1.65 0 0 0-1.51 1Z"/></svg>'
};

function initIcons() {
  document.querySelectorAll("[data-icon]").forEach((node) => {
    node.innerHTML = icons[node.dataset.icon] || "";
  });
}

function loadState() {
  try {
    LEGACY_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
    return JSON.parse(localStorage.getItem(STORAGE_KEY));
  } catch {
    return null;
  }
}

function loadGithubSync() {
  try {
    return JSON.parse(localStorage.getItem(GITHUB_SYNC_KEY));
  } catch {
    return null;
  }
}

function persistState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ products, salesHistory, salesLog, customers, capitalMovements, settings }));
}

function persistGithubSync() {
  localStorage.setItem(GITHUB_SYNC_KEY, JSON.stringify(githubSync));
}

function getAppState() {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    products,
    salesHistory,
    salesLog,
    customers,
    capitalMovements,
    settings
  };
}

function applyAppState(state) {
  products = Array.isArray(state.products) ? state.products : [];
  salesHistory = Array.isArray(state.salesHistory) ? state.salesHistory : [];
  salesLog = Array.isArray(state.salesLog) ? state.salesLog : [];
  customers = Array.isArray(state.customers) ? state.customers : [];
  capitalMovements = Array.isArray(state.capitalMovements) ? state.capitalMovements : [];
  settings = { ...defaultSettings, ...(state.settings || {}) };
  invoice = [];
  persistState();
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

function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 2200);
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

async function pushToGithub() {
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
  showToast("تم رفع البيانات إلى GitHub");
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
      <td>${product.type}</td>
      <td>${money(product.price)}</td>
      <td><input class="edit-input" data-stock-id="${product.id}" type="number" min="0" value="${product.stock}" /></td>
      <td><button class="small-btn" data-save-stock="${product.id}" type="button">حفظ</button></td>
    </tr>
  `).join("") : '<tr><td colspan="7" class="muted">لا توجد أصناف مطابقة. أضف صنفاً جديداً للبدء.</td></tr>';
}

function renderPOS() {
  const term = document.getElementById("posSearch").value.trim();
  const visible = products.filter((product) => !term || product.name.includes(term) || product.barcode.includes(term));
  const saleCustomer = document.getElementById("saleCustomer");
  const selectedCustomer = saleCustomer.value;

  saleCustomer.innerHTML = '<option value="">عميل نقدي</option>' + customers
    .map((customer) => `<option value="${customer.id}">${customer.name} - ${customer.phone}</option>`)
    .join("");
  saleCustomer.value = selectedCustomer;

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
  document.getElementById("supplierCards").innerHTML = suppliers.length ? suppliers.map((supplier) => `
    <article class="supplier-card">
      <h3>${supplier.name}</h3>
      <dl>
        <div><dt>الهاتف</dt><dd>${supplier.contact}</dd></div>
        <div><dt>المنتجات</dt><dd>${supplier.product}</dd></div>
        <div><dt>سجل الطلبات</dt><dd>${supplier.orders.join("، ")}</dd></div>
      </dl>
    </article>
  `).join("") : '<div class="muted">لا توجد بيانات موردين بعد.</div>';
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
        <div class="muted">${customer.notes || "لا توجد ملاحظات"}</div>
      </div>
      <button class="small-btn" data-delete-customer="${customer.id}" type="button">حذف</button>
    </div>
  `).join("") : '<div class="muted">لا توجد بيانات عملاء بعد.</div>';
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
        <strong>${money(entry.amount)}</strong>
      </div>
    `).join("") : '<div class="muted">لا توجد حركات رأس مال بعد.</div>';
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

  const githubForm = document.getElementById("githubSyncForm");
  githubForm.githubToken.value = githubSync.token;
  githubForm.githubGistId.value = githubSync.gistId;
  document.getElementById("githubSyncStatus").textContent = githubSync.gistId
    ? `مرتبط بـ Gist: ${githubSync.gistId}${githubSync.lastSyncAt ? ` | آخر مزامنة: ${githubSync.lastSyncAt}` : ""}`
    : "لم يتم ربط GitHub بعد. احفظ Token ثم ارفع البيانات لإنشاء Gist جديد.";
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
    <div class="period-row"><span>${label}</span><strong>${money(value)}</strong></div>
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
          <td>${itemText}</td>
          <td>${money(sale.total)}</td>
        </tr>
      `;
    }).join("") : '<tr><td colspan="6" class="muted">لم يتم تسجيل أي عملية بيع بعد.</td></tr>';
}

function renderAll() {
  renderDashboard();
  renderInventory();
  renderPOS();
  renderSuppliers();
  renderCustomers();
  renderCapital();
  renderSettings();
  renderReports();
}

function switchView(viewId) {
  document.querySelectorAll(".view").forEach((view) => view.classList.toggle("active", view.id === viewId));
  document.querySelectorAll(".nav-item").forEach((item) => item.classList.toggle("active", item.dataset.view === viewId));
  const active = document.querySelector(`.nav-item[data-view="${viewId}"]`);
  document.getElementById("pageTitle").textContent = active ? active.textContent.trim() : "الرئيسية";
}

document.addEventListener("click", (event) => {
  const nav = event.target.closest("[data-view]");
  const jump = event.target.closest("[data-view-jump]");
  const add = event.target.closest("[data-add-product]");
  const remove = event.target.closest("[data-remove-line]");
  const save = event.target.closest("[data-save-stock]");
  const deleteCustomer = event.target.closest("[data-delete-customer]");

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
  if (deleteCustomer) {
    customers = customers.filter((customer) => customer.id !== Number(deleteCustomer.dataset.deleteCustomer));
    persistState();
    renderCustomers();
    showToast("تم حذف العميل");
  }
});

document.addEventListener("input", (event) => {
  if (event.target.matches("#inventorySearch, #typeFilter, #dateFilter, #makerFilter")) renderInventory();
  if (event.target.matches("#customerSearch")) renderCustomers();
  if (event.target.matches("#posSearch")) renderPOS();
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
    cost: Number(form.get("price")) * 0.72,
    maker: form.get("maker"),
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

document.getElementById("settingsForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  settings = {
    storeName: form.get("storeName"),
    currency: form.get("currency"),
    taxRate: Number(form.get("taxRate") || 0),
    defaultReorder: Number(form.get("defaultReorder") || 0),
    storePhone: form.get("storePhone"),
    storeAddress: form.get("storeAddress")
  };
  persistState();
  renderAll();
  showToast("تم حفظ الإعدادات");
});

document.getElementById("githubSyncForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  githubSync.token = form.get("githubToken").trim();
  githubSync.gistId = form.get("githubGistId").trim();
  persistGithubSync();
  renderSettings();
  showToast("تم حفظ ربط GitHub محلياً");
});

document.getElementById("pushGithubBtn").addEventListener("click", async () => {
  try {
    await pushToGithub();
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
  capitalMovements = [];
  invoice = [];
  localStorage.removeItem(STORAGE_KEY);
  renderAll();
  showToast("تم تصفير بيانات التطبيق");
});

document.getElementById("recordSaleBtn").addEventListener("click", () => {
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
  invoice.forEach((line) => {
    line.product.stock -= line.qty;
    line.product.sold += line.qty;
    line.product.updated = TODAY;
  });
  salesLog.unshift({
    id: Date.now(),
    date: TODAY,
    time,
    customerId: selectedCustomer?.id || null,
    customerName: selectedCustomer?.name || "عميل نقدي",
    items: invoice.map((line) => ({ productId: line.product.id, qty: line.qty })),
    total
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
document.getElementById("globalSearch").addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    document.getElementById("inventorySearch").value = event.target.value;
    switchView("inventory");
    renderInventory();
  }
});

initIcons();
renderAll();
