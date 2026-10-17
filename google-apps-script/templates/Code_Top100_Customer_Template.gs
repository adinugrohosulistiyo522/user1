/**
 * KLIKTIVA TOP100 — STANDALONE DEVELOPMENT BACKEND v1.0.0
 * Public/Admin static UI: Cloudflare Workers Static Assets
 * Business logic + database + image upload: Google Apps Script
 * Customer databases: Operational, Accounts, and Analytics are per-customer.
 * Licensing: one global/private License Database + one shared global License Server for all customers.
 * System_Config in the operational spreadsheet provides database IDs and upload folder; Script Properties may override them.
 */
const APP = {
  SPREADSHEET_ID: '',
  PRODUCTS_SHEET: 'Products',
  COLLECTIONS_SHEET: 'Collections',
  SETTINGS_SHEET: 'Settings',
  SYSTEM_CONFIG_SHEET: 'System_Config',
  TOP100_LINKS_SHEET: 'Top100_Links',
  TOP100_PRODUCT_META_SHEET: 'Top100_Product_Metadata',
  TOP100_COLLECTION_META_SHEET: 'Top100_Collection_Metadata',
  TOP100_RELATION_SHEET: 'Top100_Product_Collections',
  ACCOUNTS_SHEET: 'Accounts',
  LICENSE_SPREADSHEET_PROPERTY: 'LICENSE_SPREADSHEET_ID',
  LICENSE_SHEET: 'Licenses',
  ACCOUNTS_SPREADSHEET_PROPERTY: 'ACCOUNTS_SPREADSHEET_ID',
  ANALYTICS_SPREADSHEET_PROPERTY: 'ANALYTICS_SPREADSHEET_ID',
  ANALYTICS_EVENTS_SHEET: 'Analytics_Events',
  ANALYTICS_DAILY_SHEET: 'Analytics_Daily',
  ANALYTICS_SUMMARY_SHEET: 'Analytics_Summary',
  ANALYTICS_PRODUCT_ALIASES_SHEET: 'Analytics_Product_Aliases',
  ANALYTICS_AGGREGATION_BATCH_SIZE: 5000,
  ANALYTICS_DASHBOARD_CACHE_SECONDS: 180,
  ANALYTICS_AGGREGATION_PREFIX: 'Analytics_Agg_',
  DRIVE_FOLDER_PROPERTY: 'DRIVE_UPLOAD_FOLDER_ID',
  MAIN_SHEET_PROPERTY: 'MAIN_SPREADSHEET_ID',
  LICENSE_API_PROPERTY: 'LICENSE_API_URL',
  LICENSE_CACHE_SECONDS: 5,
  LICENSE_VALID_CACHE_SECONDS: 240,
  SESSION_SECONDS: 21600,
  WA_NUMBER: '6289693123544',
  TIME_ZONE: 'Asia/Jakarta'
};

const PRODUCT_HEADERS = [
  'ProductID', 'Judul Produk', 'Link Affiliate', 'Link Gambar', 'Status',
  'KoleksiID', 'UrutanTampilan', 'Harga Tampil', 'Label Tombol', 'Dibuat Pada', 'Diubah Pada', 'Thumbnail Otomatis'
];
const COLLECTION_HEADERS = ['CollectionID', 'Nama Koleksi', 'Dibuat Pada', 'Diubah Pada', 'UrutanTampilan'];
const SETTINGS_HEADERS = ['Key', 'Value'];
const ACCOUNT_HEADERS = ['Username', 'Password', 'Role', 'Dibuat pada', 'Diubah pada'];
const ANALYTICS_EVENT_HEADERS = ['EventID', 'Timestamp', 'EventDate', 'EventType', 'TargetID', 'TargetName', 'VisitorID', 'SessionID', 'Path'];
const ANALYTICS_DAILY_HEADERS = ['EventDate', 'PageViews', 'EstimatedUniqueVisitors', 'CollectionViews', 'ProductAffiliateClicks', 'SocialClicks', 'UpdatedAt'];
const ANALYTICS_SUMMARY_HEADERS = ['Metric', 'Value', 'UpdatedAt'];
const ANALYTICS_PRODUCT_ALIAS_HEADERS = ['LegacyName', 'ProductID', 'CreatedAt'];
const ANALYTICS_AGGREGATE_HEADERS = ['EventDate', 'Hour', 'Metric', 'TargetID', 'TargetName', 'Count', 'UpdatedAt'];
const LICENSE_SHEET_HEADERS = ['Kode Aktivasi', 'Status', 'Tanggal Aktif', 'Tanggal Expired', 'Nama Pengguna', 'No Hape Pengguna', 'Tampilkan CTA Pemesanan Website'];
const DEFAULT_SETTINGS = {
  name: '', photoUrl: '', bio: '', motto: '', theme: 'beige', fontTheme: 'inter', uiTemplate: 'classic',
  instagram: '', tiktok: '', shopee: '', youtube: '', facebook: '', threads: '',
  other1Label: '', other1Url: '', other2Label: '', other2Url: '', other3Label: '', other3Url: '',
  other4Label: '', other4Url: '', other5Label: '', other5Url: '', activationCode: '',
  about: '', seoTitle: '', seoDescription: '', address: '', locationMode: 'coordinates', coordinates: '', mapsUrl: '',
  bannerUrl: '', bannerFit: 'cover', bannerX: '50', bannerY: '50', bannerZoom: '1',
  homeVisibility: '', homeLabels: '', favoriteCollectionIds: '', favoriteProductIds: '', navigationItems: '',
  top100Font: 'inter', top100Language: 'id', top100SidebarCollapsed: 'false'
};
const SOCIAL_PREFIXES = {
  instagram: 'https://www.instagram.com/',
  tiktok: 'https://www.tiktok.com/@',
  shopee: 'https://shopee.co.id/',
  youtube: 'https://www.youtube.com/@',
  facebook: 'https://www.facebook.com/',
  threads: 'https://www.threads.net/@'
};

/** Public health endpoint. Does not reveal IDs, secrets, or license customer data. */
function doGet() {
  // Safe diagnostics: booleans only, never return folder IDs, license codes, or secrets.
  return apiJson_({
    ok: true,
    service: 'Project Bio Affiliate / Toko API',
    message: 'Backend Kliktiva Top100 aktif. Frontend di-host pada Cloudflare Workers.',
    diagnostics: getDiagnosticFlags_(),
    timestamp: new Date().toISOString()
  });
}

/** Cloudflare Worker posts {action,args}; only activation/status is accessible before a valid license. */
function doPost(e) {
  try {
    const raw = e && e.postData && e.postData.contents ? e.postData.contents : '{}';
    const request = JSON.parse(raw);
    const action = String(request.action || '');
    const args = Array.isArray(request.args) ? request.args : [];
    const handlers = {
      getLicenseStatus: getLicenseStatus,
      activateLicense: activateLicense,
      adminLogin: adminLogin,
      getPublicData: getPublicData,
      getTop100PublicData: getTop100PublicData,
      adminGetData: adminGetData,
      adminGetTop100State: adminGetTop100State,
      adminSaveTop100State: adminSaveTop100State,
      adminSaveProfile: adminSaveProfile,
      adminRemoveProfilePhoto: adminRemoveProfilePhoto,
      adminSaveProduct: adminSaveProduct,
      adminRefreshProductThumbnail: adminRefreshProductThumbnail,
      adminDeleteProduct: adminDeleteProduct,
      adminSaveCollection: adminSaveCollection,
      adminSaveCollectionOrder: adminSaveCollectionOrder,
      adminDeleteCollection: adminDeleteCollection,
      adminSaveDisplayOrder: adminSaveDisplayOrder,
      adminGetAccounts: adminGetAccounts,
      adminSaveAccount: adminSaveAccount,
      adminDeleteAccount: adminDeleteAccount,
      adminGetDisplayProducts: adminGetDisplayProducts,
      trackAnalyticsEvent: trackAnalyticsEvent,
      adminGetAnalytics: adminGetAnalytics,
      uploadImageToDrive: uploadImageToDrive,
      cekKonfigurasiDrive: cekKonfigurasiDrive
    };
    const handler = handlers[action];
    if (typeof handler !== 'function') throw appError_('ACTION_NOT_ALLOWED', 'API action tidak dikenal atau tidak diizinkan.');

    // These two actions must work before first activation so a buyer can activate the installation.
    let requestLicense = null;
    if (action !== 'getLicenseStatus' && action !== 'activateLicense') requestLicense = assertLicensedForRequest_(false);

    const result = (action === 'getPublicData' || action === 'getTop100PublicData') ? handler(requestLicense) : handler.apply(null, args);
    return apiJson_({ ok: true, data: result });
  } catch (err) {
    return apiJson_({ ok: false, code: err && err.appCode ? err.appCode : 'BACKEND_ERROR', error: err && err.message ? err.message : String(err) });
  }
}

function apiJson_(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON);
}
function appError_(code, message) { const e = new Error(message); e.appCode = code; return e; }

/* ----------------------------- DATABASE SETUP ----------------------------- */
function getDb_() {
  const props = PropertiesService.getScriptProperties();
  const id = String(props.getProperty(APP.MAIN_SHEET_PROPERTY) || APP.SPREADSHEET_ID || '').trim();
  const ss = id ? SpreadsheetApp.openById(id) : SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw appError_('DATABASE_NOT_CONFIGURED', 'Spreadsheet database belum bisa dibuka. Pastikan Code.gs terikat pada spreadsheet Database Operasional, atau atur MAIN_SPREADSHEET_ID di Script Properties.');
  const actualId = ss.getId();
  const config = readSystemConfigMapFromSpreadsheet_(ss);
  const accountsId = String(props.getProperty(APP.ACCOUNTS_SPREADSHEET_PROPERTY) || config.ACCOUNTS_SPREADSHEET_ID || '').trim();
  const analyticsId = String(props.getProperty(APP.ANALYTICS_SPREADSHEET_PROPERTY) || config.ANALYTICS_SPREADSHEET_ID || '').trim();
  const licenseId = String(props.getProperty(APP.LICENSE_SPREADSHEET_PROPERTY) || config.LICENSE_SPREADSHEET_ID || '').trim();
  if (actualId === accountsId || actualId === analyticsId || actualId === licenseId) throw appError_('DATABASE_SEPARATION_REQUIRED', 'Database Operasional harus terpisah dari Accounts, Analytics, dan Lisensi. Periksa System_Config.');
  return ss;
}

/** Read key/value configuration without routing back through getSystemConfigValue_ (avoids recursion). */
function readSystemConfigMapFromSpreadsheet_(ss) {
  const sh = ss && ss.getSheetByName ? ss.getSheetByName(APP.SYSTEM_CONFIG_SHEET) : null;
  const map = {};
  if (!sh || sh.getLastRow() < 2 || sh.getLastColumn() < 2) return map;
  sh.getRange(2, 1, sh.getLastRow() - 1, 2).getDisplayValues().forEach(r => {
    const key = String(r[0] || '').trim();
    if (key) map[key] = String(r[1] || '').trim();
  });
  return map;
}
function getSystemConfigValue_(key) {
  const ss = getDb_();
  return String(readSystemConfigMapFromSpreadsheet_(ss)[String(key || '').trim()] || '').trim();
}
/** Script Properties overrides System_Config; normal standalone setup relies on System_Config. */
function getConfiguredValue_(scriptProperty, configKey) {
  const props = PropertiesService.getScriptProperties();
  const override = scriptProperty ? String(props.getProperty(scriptProperty) || '').trim() : '';
  return override || getSystemConfigValue_(configKey);
}
function getConfiguredSpreadsheetId_(scriptProperty, configKey) {
  return String(getConfiguredValue_(scriptProperty, configKey) || '').trim();
}
function ensureSystemConfigSheet_(ss) {
  let sh = ss.getSheetByName(APP.SYSTEM_CONFIG_SHEET);
  if (!sh) sh = ss.insertSheet(APP.SYSTEM_CONFIG_SHEET);
  if (!sh.getLastRow()) styleHeader_(sh, ['Key', 'Value']);
  else {
    const header = sh.getRange(1, 1, 1, Math.max(2, sh.getLastColumn())).getDisplayValues()[0].map(v => String(v || '').trim());
    if (header[0] !== 'Key' || header[1] !== 'Value') throw appError_('SYSTEM_CONFIG_SCHEMA_INVALID', 'Header System_Config harus Key | Value. Jangan menghapus atau mengganti urutan header.');
    sh.setFrozenRows(1);
  }
  return sh;
}
function getOrCreateSheet_(ss, name) { return ss.getSheetByName(name) || ss.insertSheet(name); }
function styleHeader_(sh, headers) {
  sh.getRange(1, 1, 1, headers.length).setValues([headers]);
  sh.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#79563f').setFontColor('#ffffff');
  sh.setFrozenRows(1);
}
function setupDatabase() {
  const ss = getDb_();
  const products = getOrCreateSheet_(ss, APP.PRODUCTS_SHEET);
  const collections = getOrCreateSheet_(ss, APP.COLLECTIONS_SHEET);
  const settings = getOrCreateSheet_(ss, APP.SETTINGS_SHEET);
  ensureSystemConfigSheet_(ss);
  migrateCatalogSchema_(products, collections);
  ensureSettings_(settings);
  ensureTop100Schema_();
  styleHeader_(products, PRODUCT_HEADERS);
  styleHeader_(collections, COLLECTION_HEADERS);
  styleHeader_(settings, SETTINGS_HEADERS);
  products.getRange('A:A').setNumberFormat('0');
  products.getRange('F:G').setNumberFormat('0');
  collections.getRange('A:A').setNumberFormat('0');
  collections.getRange('E:E').setNumberFormat('0');
  return { ok: true, message: 'Database operasional siap: Products, Collections, Settings, System_Config, dan schema Top100.', spreadsheetId: ss.getId() };
}

/** One-time setup from the bound Operational spreadsheet. Records the main spreadsheet ID so Web App calls do not depend on an active UI. */
function setupKliktivaTop100DatabaseSet() {
  const active = SpreadsheetApp.getActiveSpreadsheet();
  const boundId = String(APP.SPREADSHEET_ID || '').trim();
  if (active && boundId && active.getId() !== boundId) throw appError_('WRONG_BOUND_DATABASE', 'Project ini harus terikat pada Database Operasional customer yang sesuai.');
  if (boundId) PropertiesService.getScriptProperties().setProperty(APP.MAIN_SHEET_PROPERTY, boundId);
  const operational = setupDatabase();
  const accounts = setupAccountsDatabase();
  const analytics = setupAnalyticsDatabase();
  const licenseUrl = String(getConfiguredValue_(APP.LICENSE_API_PROPERTY, 'LICENSE_API_URL') || '').trim();
  if (!/^https:\/\/script\.google\.com\/macros\/s\/[^\s]+\/exec(?:\?.*)?$/.test(licenseUrl)) throw appError_('LICENSE_SERVER_NOT_CONFIGURED', 'LICENSE_API_URL belum terisi dengan URL License Server global yang valid.');
  return { ok: true, message: 'Database customer terhubung ke License Server global.', operational: operational.spreadsheetId, accounts: accounts.spreadsheetId, analytics: analytics.spreadsheetId, licenseServerUrl: licenseUrl };
}

function setupLocalLicenseDatabase_() {
  const id = getConfiguredSpreadsheetId_(APP.LICENSE_SPREADSHEET_PROPERTY, 'LICENSE_SPREADSHEET_ID');
  if (!id) throw appError_('LICENSE_API_NOT_CONFIGURED', 'System_Config belum berisi LICENSE_SPREADSHEET_ID. Jalankan bootstrap database terlebih dahulu.');
  const mainId = getDb_().getId();
  const accountsId = getConfiguredSpreadsheetId_(APP.ACCOUNTS_SPREADSHEET_PROPERTY, 'ACCOUNTS_SPREADSHEET_ID');
  const analyticsId = getConfiguredSpreadsheetId_(APP.ANALYTICS_SPREADSHEET_PROPERTY, 'ANALYTICS_SPREADSHEET_ID');
  if (id === mainId || id === accountsId || id === analyticsId) throw appError_('DATABASE_SEPARATION_REQUIRED', 'Database Lisensi harus terpisah dari Operational, Accounts, dan Analytics.');
  const ss = SpreadsheetApp.openById(id);
  let sh = ss.getSheetByName(APP.LICENSE_SHEET);
  if (!sh) sh = ss.insertSheet(APP.LICENSE_SHEET);
  if (sh.getLastRow() <= 1) styleHeader_(sh, LICENSE_SHEET_HEADERS);
  else {
    const header = sh.getRange(1, 1, 1, sh.getLastColumn()).getDisplayValues()[0].map(v => String(v || '').trim());
    if (!LICENSE_SHEET_HEADERS.every(h => header.includes(h))) throw appError_('LICENSE_SCHEMA_INVALID', 'Header sheet Licenses tidak sesuai. Backup dan periksa database lisensi.');
  }
  sh.getRange('A:A').setNumberFormat('@');
  sh.getRange('C:D').setNumberFormat('yyyy-mm-dd');
  const rows = Math.max(1, sh.getMaxRows() - 1);
  sh.getRange(2, 2, rows, 1).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(['Aktif', 'Nonaktif'], true).setAllowInvalid(false).build());
  sh.getRange(2, 7, rows, 1).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(['YA', 'TIDAK'], true).setAllowInvalid(false).build());
  return { ok: true, spreadsheetId: id, url: ss.getUrl(), message: 'Database lisensi siap.' };
}

function migrateCatalogSchema_(productsSh, collectionsSh) {
  const pv = productsSh.getLastRow() ? productsSh.getDataRange().getValues() : [];
  const cv = collectionsSh.getLastRow() ? collectionsSh.getDataRange().getValues() : [];
  const pHeader = pv.length ? pv[0].map(v => String(v || '').trim()) : [];
  const cHeader = cv.length ? cv[0].map(v => String(v || '').trim()) : [];
  const pm = mapHeaders_(pHeader), cm = mapHeaders_(cHeader);
  const oldProducts = pv.length > 1 ? pv.slice(1) : [];
  const oldCollections = cv.length > 1 ? cv.slice(1) : [];
  const collections = [], nameToId = new Map(), usedCids = new Set();
  let maxCid = maxIdFromRows_(oldCollections, cm, ['CollectionID', 'ID Koleksi', 'ID']);
  oldCollections.forEach(r => {
    const name = String(valueAlias_(r, cm, ['Nama Koleksi', 'Koleksi', 'Kategori']) || '').trim();
    if (!name) return;
    let id = validId_(valueAlias_(r, cm, ['CollectionID', 'ID Koleksi', 'ID']));
    if (!id || usedCids.has(id)) id = ++maxCid;
    maxCid = Math.max(maxCid, id); usedCids.add(id);
    const key = name.toLowerCase();
    if (!nameToId.has(key)) nameToId.set(key, id);
    const orderRaw = Number(valueAlias_(r, cm, ['UrutanTampilan', 'Urutan Koleksi', 'Order']));
    const order = Number.isInteger(orderRaw) && orderRaw > 0 ? orderRaw : collections.length + 1;
    collections.push([id, name, valueAlias_(r, cm, ['Dibuat Pada', 'CreatedAt']) || new Date(), valueAlias_(r, cm, ['Diubah Pada', 'UpdatedAt']) || new Date(), order]);
  });
  function ensureCollection(name) {
    const n = String(name || '').trim(); if (!n) return null;
    const key = n.toLowerCase(); if (nameToId.has(key)) return nameToId.get(key);
    const id = ++maxCid; nameToId.set(key, id); usedCids.add(id); collections.push([id, n, new Date(), new Date(), collections.length + 1]); return id;
  }
  let maxPid = maxIdFromRows_(oldProducts, pm, ['ProductID', 'ID Produk', 'ID']);
  const usedPids = new Set(), products = [];
  const productOrders = new Map();
  oldProducts.forEach(r => {
    const title = String(valueAlias_(r, pm, ['Judul Produk', 'Nama Produk', 'Product Name']) || '').trim();
    if (!title) return;
    let pid = validId_(valueAlias_(r, pm, ['ProductID', 'ID Produk', 'ID']));
    if (!pid || usedPids.has(pid)) pid = ++maxPid;
    maxPid = Math.max(maxPid, pid); usedPids.add(pid);
    let cid = validId_(valueAlias_(r, pm, ['KoleksiID', 'CollectionID', 'ID Koleksi']));
    const oldCollectionName = String(valueAlias_(r, pm, ['Nama Koleksi', 'Koleksi']) || '').trim();
    const oldCategory = String(valueAlias_(r, pm, ['Kategori', 'Category']) || '').trim();
    if (!cid || !collections.some(c => c[0] === cid)) cid = ensureCollection(oldCollectionName || oldCategory);
    const cidKey = cid ? String(cid) : 'none';
    const orderRaw = Number(valueAlias_(r, pm, ['UrutanTampilan', 'Urutan', 'Order']));
    const order = Number.isInteger(orderRaw) && orderRaw > 0 ? orderRaw : (productOrders.get(cidKey) || 0) + 1;
    productOrders.set(cidKey, Math.max(productOrders.get(cidKey) || 0, order));
    products.push([
      pid, title,
      String(valueAlias_(r, pm, ['Link Affiliate', 'Link Produk', 'URL', 'Link']) || '').trim(),
      String(valueAlias_(r, pm, ['Link Gambar', 'URL Gambar', 'Image URL', 'Gambar']) || '').trim(),
      String(valueAlias_(r, pm, ['Status', 'Status Publikasi']) || 'DRAFT').trim().toUpperCase(),
      cid || '', order,
      String(valueAlias_(r, pm, ['Harga Tampil', 'Harga']) || '').trim(),
      String(valueAlias_(r, pm, ['Label Tombol', 'Label CTA']) || 'Lihat Produk').trim(),
      valueAlias_(r, pm, ['Dibuat Pada', 'CreatedAt']) || new Date(), new Date(),
      String(valueAlias_(r, pm, ['Thumbnail Otomatis', 'Auto Thumbnail URL']) || '').trim()
    ]);
  });
  // Normalize the display order per collection, with stable old order then numeric ID.
  const groups = new Map();
  products.forEach((r, i) => { const k = validId_(r[5]) ? String(r[5]) : 'none'; if (!groups.has(k)) groups.set(k, []); groups.get(k).push({ r, i }); });
  groups.forEach(arr => {
    arr.sort((a, b) => (Number(a.r[6]) || 999999) - (Number(b.r[6]) || 999999) || Number(a.r[0]) - Number(b.r[0]));
    arr.forEach((x, i) => products[x.i][6] = i + 1);
  });
  productsSh.clearContents(); productsSh.getRange(1, 1, 1, PRODUCT_HEADERS.length).setValues([PRODUCT_HEADERS]);
  if (products.length) productsSh.getRange(2, 1, products.length, PRODUCT_HEADERS.length).setValues(products);
  collectionsSh.clearContents(); collectionsSh.getRange(1, 1, 1, COLLECTION_HEADERS.length).setValues([COLLECTION_HEADERS]);
  if (collections.length) collectionsSh.getRange(2, 1, collections.length, COLLECTION_HEADERS.length).setValues(collections);
}
function mapHeaders_(headers) { const m = {}; headers.forEach((v, i) => m[String(v || '').trim()] = i); return m; }
function valueAlias_(row, map, aliases) { for (const a of aliases) if (map[a] !== undefined) return row[map[a]]; return ''; }
function validId_(v) { if (v === '' || v === null || v === undefined) return null; const n = Number(v); return Number.isSafeInteger(n) && n > 0 ? n : null; }
function maxIdFromRows_(rows, map, aliases) { let m = 0; rows.forEach(r => { const n = validId_(valueAlias_(r, map, aliases)); if (n && n > m) m = n; }); return m; }
function ensureSettings_(sh) {
  if (!sh.getLastRow()) sh.getRange(1, 1, 1, 2).setValues([SETTINGS_HEADERS]);
  const vals = sh.getDataRange().getValues();
  const head = vals[0].map(v => String(v || '').trim());
  if (!head.includes('Key') || !head.includes('Value')) {
    sh.clearContents(); sh.getRange(1, 1, 1, 2).setValues([SETTINGS_HEADERS]);
  }
  const existing = new Set(sh.getLastRow() >= 2 ? sh.getRange(2, 1, sh.getLastRow() - 1, 1).getDisplayValues().flat().map(v => String(v).trim()) : []);
  Object.keys(DEFAULT_SETTINGS).forEach(k => { if (!existing.has(k)) sh.appendRow([k, DEFAULT_SETTINGS[k]]); });
}
/** Ensure the pre-created Accounts database schema. The bootstrap creates it inside the instance folder. */
function setupAccountsDatabase() {
  const id = getConfiguredSpreadsheetId_(APP.ACCOUNTS_SPREADSHEET_PROPERTY, 'ACCOUNTS_SPREADSHEET_ID');
  if (!id) throw appError_('ACCOUNTS_DATABASE_NOT_CONFIGURED', 'System_Config belum berisi ACCOUNTS_SPREADSHEET_ID. Jalankan Bootstrap_Create_Top100_DB_Set.gs terlebih dahulu.');
  const mainId = getDb_().getId();
  const analyticsId = getConfiguredSpreadsheetId_(APP.ANALYTICS_SPREADSHEET_PROPERTY, 'ANALYTICS_SPREADSHEET_ID');
  if (id === mainId || (analyticsId && id === analyticsId)) throw appError_('DATABASE_SEPARATION_REQUIRED', 'ACCOUNTS_SPREADSHEET_ID harus berbeda dari database operasional dan Analytics.');
  const ss = SpreadsheetApp.openById(id);
  let sh = ss.getSheetByName(APP.ACCOUNTS_SHEET);
  if (!sh && ss.getSheets().length === 1 && ss.getSheets()[0].getLastRow() === 0) { sh = ss.getSheets()[0]; sh.setName(APP.ACCOUNTS_SHEET); }
  if (!sh) sh = ss.insertSheet(APP.ACCOUNTS_SHEET);
  const values = sh.getDataRange().getDisplayValues();
  const header = values.length ? values[0].map(v => String(v).trim()) : [];
  if (sh.getLastRow() > 1 && (sh.getLastColumn() !== ACCOUNT_HEADERS.length || JSON.stringify(header) !== JSON.stringify(ACCOUNT_HEADERS))) {
    throw appError_('ACCOUNT_SCHEMA_UNRECOGNIZED', 'Database akun telah berisi data dengan struktur berbeda. Backup data dan koreksi header; data lama tidak dihapus.');
  }
  if (sh.getLastRow() <= 1) styleHeader_(sh, ACCOUNT_HEADERS);
  sh.getRange('A:B').setNumberFormat('@');
  sh.getRange('D:E').setNumberFormat('yyyy-mm-dd hh:mm:ss');
  return { ok: true, spreadsheetId: id, url: ss.getUrl(), message: 'Database akun terpisah siap.' };
}
function getAccountsSpreadsheet_() {
  const id = getConfiguredSpreadsheetId_(APP.ACCOUNTS_SPREADSHEET_PROPERTY, 'ACCOUNTS_SPREADSHEET_ID');
  if (!id) throw appError_('ACCOUNTS_DATABASE_NOT_CONFIGURED', 'System_Config belum berisi ACCOUNTS_SPREADSHEET_ID. Jalankan bootstrap database terlebih dahulu.');
  const mainId = getDb_().getId();
  const analyticsId = getConfiguredSpreadsheetId_(APP.ANALYTICS_SPREADSHEET_PROPERTY, 'ANALYTICS_SPREADSHEET_ID');
  const licenseId = getConfiguredSpreadsheetId_(APP.LICENSE_SPREADSHEET_PROPERTY, 'LICENSE_SPREADSHEET_ID');
  if (id === mainId || (analyticsId && id === analyticsId) || (licenseId && id === licenseId)) throw appError_('DATABASE_SEPARATION_REQUIRED', 'Database akun harus terpisah dari Operational, Analytics, dan Lisensi.');
  return SpreadsheetApp.openById(id);
}
function getAccountsSheet_() {
  const sh = getAccountsSpreadsheet_().getSheetByName(APP.ACCOUNTS_SHEET);
  if (!sh) throw appError_('DATABASE_NOT_SETUP', 'Sheet Accounts belum tersedia. Jalankan setupAccountsDatabase().');
  if (sh.getLastRow() < 1 || sh.getLastColumn() !== ACCOUNT_HEADERS.length || JSON.stringify(sh.getRange(1, 1, 1, ACCOUNT_HEADERS.length).getDisplayValues()[0].map(v => String(v).trim())) !== JSON.stringify(ACCOUNT_HEADERS)) {
    throw appError_('ACCOUNT_SCHEMA_INVALID', 'Header database akun tidak sesuai. Header harus: Username | Password | Role | Dibuat pada | Diubah pada.');
  }
  return sh;
}
function setupAnalyticsDatabase() {
  const id = getConfiguredSpreadsheetId_(APP.ANALYTICS_SPREADSHEET_PROPERTY, 'ANALYTICS_SPREADSHEET_ID');
  if (!id) throw appError_('ANALYTICS_DATABASE_NOT_CONFIGURED', 'System_Config belum berisi ANALYTICS_SPREADSHEET_ID. Jalankan bootstrap database terlebih dahulu.');
  const mainId = getDb_().getId();
  const accountsId = getConfiguredSpreadsheetId_(APP.ACCOUNTS_SPREADSHEET_PROPERTY, 'ACCOUNTS_SPREADSHEET_ID');
  const licenseId = getConfiguredSpreadsheetId_(APP.LICENSE_SPREADSHEET_PROPERTY, 'LICENSE_SPREADSHEET_ID');
  if (id === mainId || (accountsId && id === accountsId) || (licenseId && id === licenseId)) throw appError_('DATABASE_SEPARATION_REQUIRED', 'ANALYTICS_SPREADSHEET_ID harus berbeda dari Operational, Accounts, dan Lisensi.');
  const ss = SpreadsheetApp.openById(id);
  const specs = [
    [APP.ANALYTICS_EVENTS_SHEET, ANALYTICS_EVENT_HEADERS],
    [APP.ANALYTICS_DAILY_SHEET, ANALYTICS_DAILY_HEADERS],
    [APP.ANALYTICS_SUMMARY_SHEET, ANALYTICS_SUMMARY_HEADERS],
    [APP.ANALYTICS_PRODUCT_ALIASES_SHEET, ANALYTICS_PRODUCT_ALIAS_HEADERS]
  ];
  specs.forEach(([name, headers]) => {
    let sh = ss.getSheetByName(name);
    if (!sh && ss.getSheets().length === 1 && ss.getSheets()[0].getLastRow() === 0) { sh = ss.getSheets()[0]; sh.setName(name); }
    if (!sh) sh = ss.insertSheet(name);
    if (sh.getLastRow() > 1 && JSON.stringify(sh.getRange(1, 1, 1, headers.length).getDisplayValues()[0].map(v => String(v).trim())) !== JSON.stringify(headers)) {
      throw appError_('ANALYTICS_SCHEMA_INVALID', 'Header sheet ' + name + ' tidak sesuai. Backup data dan periksa dokumentasi sebelum menjalankan ulang setup.');
    }
    if (sh.getLastRow() <= 1) styleHeader_(sh, headers);
  });
  ss.getSheetByName(APP.ANALYTICS_EVENTS_SHEET).getRange('B:B').setNumberFormat('yyyy-mm-dd hh:mm:ss');
  ss.getSheetByName(APP.ANALYTICS_EVENTS_SHEET).getRange('C:C').setNumberFormat('@');
  ss.getSheetByName(APP.ANALYTICS_DAILY_SHEET).getRange('A:A').setNumberFormat('@');
  return { ok: true, spreadsheetId: id, url: ss.getUrl(), message: 'Database Analytics terpisah siap.' };
}
function getAnalyticsSpreadsheet_() {
  const id = getConfiguredSpreadsheetId_(APP.ANALYTICS_SPREADSHEET_PROPERTY, 'ANALYTICS_SPREADSHEET_ID');
  if (!id) throw appError_('ANALYTICS_DATABASE_NOT_CONFIGURED', 'System_Config belum berisi ANALYTICS_SPREADSHEET_ID. Jalankan bootstrap database terlebih dahulu.');
  const mainId = getDb_().getId();
  const accountsId = getConfiguredSpreadsheetId_(APP.ACCOUNTS_SPREADSHEET_PROPERTY, 'ACCOUNTS_SPREADSHEET_ID');
  const licenseId = getConfiguredSpreadsheetId_(APP.LICENSE_SPREADSHEET_PROPERTY, 'LICENSE_SPREADSHEET_ID');
  if (id === mainId || (accountsId && id === accountsId) || (licenseId && id === licenseId)) throw appError_('DATABASE_SEPARATION_REQUIRED', 'Database Analytics harus terpisah dari Operational, Accounts, dan Lisensi.');
  return SpreadsheetApp.openById(id);
}
function getAnalyticsSheet_(name) {
  const sh = getAnalyticsSpreadsheet_().getSheetByName(name);
  if (!sh) throw appError_('ANALYTICS_DATABASE_NOT_SETUP', 'Sheet Analytics belum tersedia. Jalankan setupAnalyticsDatabase().');
  return sh;
}
function getAnalyticsProductAliasSheet_() {
  const ss = getAnalyticsSpreadsheet_();
  let sh = ss.getSheetByName(APP.ANALYTICS_PRODUCT_ALIASES_SHEET);
  if (!sh) {
    sh = ss.insertSheet(APP.ANALYTICS_PRODUCT_ALIASES_SHEET);
    styleHeader_(sh, ANALYTICS_PRODUCT_ALIAS_HEADERS);
    sh.getRange('B:B').setNumberFormat('0');
  } else if (sh.getLastRow() <= 1) {
    styleHeader_(sh, ANALYTICS_PRODUCT_ALIAS_HEADERS);
    sh.getRange('B:B').setNumberFormat('0');
  } else {
    const headers = sh.getRange(1, 1, 1, ANALYTICS_PRODUCT_ALIAS_HEADERS.length).getDisplayValues()[0].map(v => String(v || '').trim());
    if (JSON.stringify(headers) !== JSON.stringify(ANALYTICS_PRODUCT_ALIAS_HEADERS)) throw appError_('ANALYTICS_ALIAS_SCHEMA_INVALID', 'Header Analytics_Product_Aliases tidak sesuai. Jangan mengubah nama kolom sheet ini.');
  }
  return sh;
}
function getAnalyticsProductAliasMap_() {
  const sh = getAnalyticsProductAliasSheet_();
  const rows = sh.getLastRow() >= 2 ? sh.getRange(2, 1, sh.getLastRow() - 1, ANALYTICS_PRODUCT_ALIAS_HEADERS.length).getDisplayValues() : [];
  const map = new Map();
  rows.forEach(r => {
    const key = normalizeAnalyticsName_(r[0]); const id = String(r[1] || '').trim();
    if (!key || !validId_(id)) return;
    if (!map.has(key)) map.set(key, String(validId_(id)));
    else if (map.get(key) !== String(validId_(id))) map.set(key, ''); // Ambiguous legacy titles are never guessed.
  });
  return map;
}
function recordProductNameAlias_(legacyName, productId) {
  const name = String(legacyName || '').trim(); const id = validId_(productId);
  if (!name || !id) return false;
  const key = normalizeAnalyticsName_(name); if (!key) return false;
  const sh = getAnalyticsProductAliasSheet_();
  const rows = sh.getLastRow() >= 2 ? sh.getRange(2, 1, sh.getLastRow() - 1, ANALYTICS_PRODUCT_ALIAS_HEADERS.length).getDisplayValues() : [];
  if (rows.some(r => normalizeAnalyticsName_(r[0]) === key && validId_(r[1]) === id)) return true;
  sh.appendRow([name, id, new Date()]);
  return true;
}
/** First-admin bootstrap. Password is stored as requested in plain text; secure the spreadsheet permissions. */
function createInitialSystemAdmin() {
  const props = PropertiesService.getScriptProperties();
  const username = String(props.getProperty('INITIAL_SYSTEM_ADMIN_USERNAME') || '').trim();
  const password = String(props.getProperty('INITIAL_SYSTEM_ADMIN_PASSWORD') || '');
  if (!username || !password) throw appError_('INITIAL_ADMIN_NOT_CONFIGURED', 'Atur INITIAL_SYSTEM_ADMIN_USERNAME dan INITIAL_SYSTEM_ADMIN_PASSWORD pada Script Properties terlebih dahulu.');
  if (password.length < 10) throw appError_('PASSWORD_TOO_SHORT', 'Password awal minimal 10 karakter.');
  const sh = getAccountsSheet_();
  if (sh.getLastRow() > 1) throw appError_('INITIAL_ADMIN_EXISTS', 'Database akun sudah berisi akun. Fungsi ini hanya untuk bootstrap pertama.');
  sh.appendRow([username, password, 'SYSTEM_ADMIN', new Date(), new Date()]);
  props.deleteProperty('INITIAL_SYSTEM_ADMIN_PASSWORD');
  return { ok: true, message: 'Akun SYSTEM_ADMIN awal berhasil dibuat. Hapus INITIAL_SYSTEM_ADMIN_USERNAME bila tidak diperlukan.' };
}

/* ---------------------------- LICENSE SYSTEM ----------------------------- */
function getLicenseStatus() {
  const config = getDiagnosticFlags_();
  const code = String(getSetting_('activationCode') || '').trim();
  if (!code) return { active: false, reason: 'NOT_ACTIVATED', message: 'Sistem belum diaktifkan.', contactUrl: 'https://wa.me/' + APP.WA_NUMBER, diagnostics: config };
  try {
    const result = verifyLicenseRemote_(code, true);
    if (!result.valid) return { active: false, reason: result.reason || 'INVALID', message: licenseMessage_(result.reason), activeDate: result.activeDate || '', expiryDate: result.expiryDate || '', showWebsiteCta: false, contactUrl: 'https://wa.me/' + APP.WA_NUMBER, diagnostics: config };
    return { active: true, reason: result.reason || 'ACTIVE', stale: !!result.stale, retryable: !!result.stale, message: result.stale ? 'Status lisensi terakhir valid; server lisensi sementara tidak dapat dijangkau.' : 'Lisensi aktif.', activeDate: result.activeDate || '', expiryDate: result.expiryDate || '', showWebsiteCta: result.showWebsiteCta === true, contactUrl: 'https://wa.me/' + APP.WA_NUMBER, diagnostics: config };
  } catch (e) {
    // A transient server/network error is not proof that a license has expired.
    return { active: null, unavailable: true, retryable: true, reason: e.appCode || 'LICENSE_SERVER_UNAVAILABLE', message: 'Pemeriksaan lisensi sementara tidak dapat dihubungi. Sistem akan mencoba kembali otomatis.', contactUrl: 'https://wa.me/' + APP.WA_NUMBER, diagnostics: config };
  }
}
function activateLicense(code) {
  const clean = normalizeLicenseCode_(code);
  if (!clean) throw appError_('LICENSE_CODE_REQUIRED', 'Masukkan kode aktivasi terlebih dahulu.');
  const existing = String(getSetting_('activationCode') || '').trim();
  if (existing) {
    try {
      const already = verifyLicenseRemote_(existing, true);
      if (already.valid) throw appError_('LOGIN_REQUIRED_TO_CHANGE_LICENSE', 'Lisensi sistem masih aktif. Login ke Web Admin dan ubah kode melalui menu Identitas & Tampilan.');
    } catch (e) { if (e.appCode === 'LOGIN_REQUIRED_TO_CHANGE_LICENSE') throw e; }
  }
  const result = verifyLicenseRemote_(clean, true);
  if (!result.valid) throw appError_('LICENSE_INVALID', licenseMessage_(result.reason));
  setSetting_('activationCode', clean);
  return { active: true, message: 'Aktivasi berhasil. Silakan login.', activeDate: result.activeDate || '', expiryDate: result.expiryDate || '' };
}
function assertLicensedForRequest_(forceRemote) {
  const code = normalizeLicenseCode_(getSetting_('activationCode'));
  if (!code) throw appError_('LICENSE_BLOCKED', 'Sistem belum diaktifkan. Silakan masukkan kode aktivasi atau hubungi Admin melalui WhatsApp.');
  const result = verifyLicenseRemote_(code, !!forceRemote);
  if (!result.valid) throw appError_('LICENSE_BLOCKED', licenseMessage_(result.reason));
  return result;
}
function cachedLicenseResult_(cache, key) {
  const saved = cache.get(key);
  if (!saved) return null;
  try {
    const result = JSON.parse(saved);
    if (!result || result.valid !== true) return null;
    const today = Utilities.formatDate(new Date(), APP.TIME_ZONE, 'yyyy-MM-dd');
    // A cached active license must never be honored beyond its known expiry date.
    if (result.expiryDate && today > result.expiryDate) return { valid: false, reason: 'EXPIRED', activeDate: result.activeDate || '', expiryDate: result.expiryDate, showWebsiteCta: false };
    return result;
  } catch (_) { return null; }
}
function verifyLicenseRemote_(code, force) {
  const cleanCode = normalizeLicenseCode_(code);
  const key = 'lic:' + sha256Hex_(cleanCode);
  const cache = CacheService.getScriptCache();
  const cached = cachedLicenseResult_(cache, key);
  if (!force) {
    const saved = cache.get(key);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        if (data && data.valid === true) {
          const today = Utilities.formatDate(new Date(), APP.TIME_ZONE, 'yyyy-MM-dd');
          if (!data.expiryDate || today <= data.expiryDate) return data;
        } else if (data && data.valid === false) return data;
      } catch (_) {}
    }
  }
  const url = String(getConfiguredValue_(APP.LICENSE_API_PROPERTY, 'LICENSE_API_URL') || '').trim();
  const fallbackToCached = (codeValue) => {
    if (cached && cached.valid === true) return Object.assign({}, cached, { stale: true, retryable: true });
    throw appError_(codeValue || 'LICENSE_SERVER_UNAVAILABLE', 'Tidak dapat menghubungi layanan aktivasi. Sistem akan mencoba kembali otomatis.');
  };
  // Top100 production architecture: every customer must use the one global License Server.
  if (!url) throw appError_('LICENSE_API_NOT_CONFIGURED', 'LICENSE_API_URL belum diisi dengan URL License Server global.');
  if (!/^https:\/\/script\.google\.com\/macros\/s\/[^\s]+\/exec(?:\?.*)?$/.test(url)) {
    return fallbackToCached('LICENSE_API_NOT_CONFIGURED');
  }
  let response;
  try {
    response = UrlFetchApp.fetch(url, {
      method: 'post', contentType: 'application/json', payload: JSON.stringify({ action: 'verifyLicense', code: cleanCode }),
      followRedirects: true, muteHttpExceptions: true
    });
  } catch (e) { return fallbackToCached('LICENSE_SERVER_UNAVAILABLE'); }
  let parsed;
  try { parsed = JSON.parse(response.getContentText()); }
  catch (_) { return fallbackToCached('LICENSE_SERVER_BAD_RESPONSE'); }
  if (response.getResponseCode() < 200 || response.getResponseCode() >= 300 || !parsed || parsed.ok !== true || !parsed.data) {
    return fallbackToCached('LICENSE_SERVER_UNAVAILABLE');
  }
  const data = parsed.data;
  const result = {
    valid: data.valid === true,
    reason: String(data.reason || (data.valid ? 'ACTIVE' : 'INVALID')),
    activeDate: String(data.activeDate || ''),
    expiryDate: String(data.expiryDate || ''),
    showWebsiteCta: data.showWebsiteCta === true,
    verifiedAt: new Date().toISOString()
  };
  cache.put(key, JSON.stringify(result), result.valid ? APP.LICENSE_VALID_CACHE_SECONDS : APP.LICENSE_CACHE_SECONDS);
  return result;
}
function verifyLicenseLocal_(cleanCode) {
  const id = getConfiguredSpreadsheetId_(APP.LICENSE_SPREADSHEET_PROPERTY, 'LICENSE_SPREADSHEET_ID');
  if (!id) throw appError_('LICENSE_API_NOT_CONFIGURED', 'LICENSE_SPREADSHEET_ID belum dikonfigurasi pada System_Config.');
  const mainId = getDb_().getId();
  const accountsId = getConfiguredSpreadsheetId_(APP.ACCOUNTS_SPREADSHEET_PROPERTY, 'ACCOUNTS_SPREADSHEET_ID');
  const analyticsId = getConfiguredSpreadsheetId_(APP.ANALYTICS_SPREADSHEET_PROPERTY, 'ANALYTICS_SPREADSHEET_ID');
  if (id === mainId || id === accountsId || id === analyticsId) throw appError_('DATABASE_SEPARATION_REQUIRED', 'Database Lisensi harus terpisah dari Operational, Accounts, dan Analytics.');
  const ss = SpreadsheetApp.openById(id);
  const sh = ss.getSheetByName(APP.LICENSE_SHEET);
  if (!sh) throw appError_('LICENSE_DATABASE_NOT_SETUP', 'Sheet Licenses belum tersedia pada database aktivasi.');
  if (sh.getLastRow() < 2) return { valid: false, reason: 'NOT_FOUND', showWebsiteCta: false };
  const values = sh.getDataRange().getValues();
  const headers = values[0].map(v => String(v || '').trim());
  const col = {};
  headers.forEach((h, i) => { if (h) col[h] = i; });
  const required = ['Kode Aktivasi', 'Status', 'Tanggal Aktif', 'Tanggal Expired'];
  required.forEach(h => { if (col[h] === undefined) throw appError_('LICENSE_SCHEMA_INVALID', 'Kolom wajib tidak ditemukan pada sheet Licenses: ' + h); });
  const rows = values.slice(1).filter(r => normalizeLicenseCode_(r[col['Kode Aktivasi']]) === cleanCode);
  if (!rows.length) return { valid: false, reason: 'NOT_FOUND', showWebsiteCta: false };
  if (rows.length > 1) return { valid: false, reason: 'DUPLICATE_CODE', showWebsiteCta: false };
  const row = rows[0];
  const status = String(row[col.Status] || '').trim().toLowerCase();
  const activeDate = licenseDateKey_(row[col['Tanggal Aktif']]);
  const expiryDate = licenseDateKey_(row[col['Tanggal Expired']]);
  const today = Utilities.formatDate(new Date(), APP.TIME_ZONE, 'yyyy-MM-dd');
  const ctaIndex = col['Tampilkan CTA Pemesanan Website'];
  let result;
  if (status !== 'aktif') result = { valid: false, reason: 'NOT_ACTIVE' };
  else if (!activeDate || !expiryDate || activeDate > expiryDate) result = { valid: false, reason: 'INVALID_DATES' };
  else if (today < activeDate) result = { valid: false, reason: 'NOT_STARTED', activeDate, expiryDate };
  else if (today > expiryDate) result = { valid: false, reason: 'EXPIRED', activeDate, expiryDate };
  else result = { valid: true, reason: 'ACTIVE', activeDate, expiryDate, showWebsiteCta: ctaIndex !== undefined && String(row[ctaIndex] || '').trim().toUpperCase() === 'YA' };
  if (!Object.prototype.hasOwnProperty.call(result, 'showWebsiteCta')) result.showWebsiteCta = false;
  result.verifiedAt = new Date().toISOString();
  return result;
}
function licenseDateKey_(value) {
  if (value instanceof Date && !isNaN(value.getTime())) return Utilities.formatDate(value, APP.TIME_ZONE, 'yyyy-MM-dd');
  const s = String(value || '').trim();
  if (!s) return '';
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) return m[1] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[3]).slice(-2);
  m = s.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/);
  if (m) return m[3] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[1]).slice(-2);
  const d = new Date(s);
  return !isNaN(d.getTime()) ? Utilities.formatDate(d, APP.TIME_ZONE, 'yyyy-MM-dd') : '';
}

function licenseMessage_(reason) {
  const messages = {
    NOT_FOUND: 'Kode aktivasi tidak ditemukan. Silakan hubungi Admin melalui WhatsApp.',
    NOT_ACTIVE: 'Lisensi belum berstatus Aktif. Silakan hubungi Admin melalui WhatsApp.',
    NOT_STARTED: 'Masa aktivasi belum dimulai. Silakan hubungi Admin melalui WhatsApp.',
    EXPIRED: 'Masa lisensi telah berakhir. Silakan hubungi Admin melalui WhatsApp.',
    INVALID_DATES: 'Tanggal lisensi tidak valid. Silakan hubungi Admin melalui WhatsApp.',
    LICENSE_API_NOT_CONFIGURED: 'Database lisensi lokal atau URL layanan aktivasi belum dikonfigurasi.',
    LICENSE_DATABASE_NOT_SETUP: 'Database lisensi belum siap. Periksa sheet Licenses.',
    LICENSE_SCHEMA_INVALID: 'Struktur sheet Licenses tidak sesuai.',
    DUPLICATE_CODE: 'Kode aktivasi tercatat lebih dari sekali. Hubungi Admin.',
    LICENSE_SERVER_UNAVAILABLE: 'Layanan aktivasi sementara tidak dapat dihubungi. Silakan coba lagi atau hubungi Admin.'
  };
  return messages[reason] || 'Lisensi tidak valid atau tidak aktif. Silakan hubungi Admin melalui WhatsApp.';
}
function normalizeLicenseCode_(v) { return String(v || '').trim().toUpperCase().replace(/\s+/g, ''); }
function getDiagnosticFlags_() {
  const props = PropertiesService.getScriptProperties();
  let dbAvailable = false, activeSpreadsheetAvailable = false, mainId = '';
  try { const ss = getDb_(); dbAvailable = !!ss; mainId = ss.getId(); } catch (_) {}
  try { activeSpreadsheetAvailable = !!SpreadsheetApp.getActiveSpreadsheet(); } catch (_) {}
  let driveFolderId = '', licenseApiUrl = '', accountsId = '', analyticsId = '', licenseId = '';
  try { driveFolderId = getConfiguredValue_(APP.DRIVE_FOLDER_PROPERTY, 'DRIVE_UPLOAD_FOLDER_ID'); } catch (_) {}
  try { licenseApiUrl = getConfiguredValue_(APP.LICENSE_API_PROPERTY, 'LICENSE_API_URL'); } catch (_) {}
  try { accountsId = getConfiguredSpreadsheetId_(APP.ACCOUNTS_SPREADSHEET_PROPERTY, 'ACCOUNTS_SPREADSHEET_ID'); } catch (_) {}
  try { analyticsId = getConfiguredSpreadsheetId_(APP.ANALYTICS_SPREADSHEET_PROPERTY, 'ANALYTICS_SPREADSHEET_ID'); } catch (_) {}
  try { licenseId = getConfiguredSpreadsheetId_(APP.LICENSE_SPREADSHEET_PROPERTY, 'LICENSE_SPREADSHEET_ID'); } catch (_) {}
  return {
    driveFolderConfigured: !!String(driveFolderId || '').trim(),
    licenseApiConfigured: !!String(licenseApiUrl || '').trim() || !!String(licenseId || '').trim(),
    localLicenseDatabaseConfigured: !!String(licenseId || '').trim(),
    spreadsheetIdConfigured: !!String(mainId || props.getProperty(APP.MAIN_SHEET_PROPERTY) || APP.SPREADSHEET_ID || '').trim(),
    activeSpreadsheetAvailable: activeSpreadsheetAvailable,
    databaseAvailable: dbAvailable,
    accountsDatabaseConfigured: !!String(accountsId || '').trim(),
    analyticsDatabaseConfigured: !!String(analyticsId || '').trim()
  };
}
function cekKonfigurasiDrive(token) { assertAdmin_(token); return getDiagnosticFlags_(); }

/* ------------------------- AUTOMATIC THUMBNAILS --------------------------- */
// Apps Script V8 does not expose the browser URL constructor; use conservative parsing.
function extractHttpsHost_(url) {
  const match = String(url || '').trim().match(/^https:\/\/([^\/?#:@]+)(?::\d+)?(?:[\/?#]|$)/i);
  return match ? match[1].toLowerCase().replace(/\.$/, '') : '';
}
function supportedThumbnailHost_(url) {
  const host = extractHttpsHost_(url);
  if (!host) return false;
  const allowed = ['shopee.co.id','shope.ee','s.shopee.co.id','tiktok.com','vt.tiktok.com','vm.tiktok.com','tokopedia.com','lazada.co.id','blibli.com','bukalapak.com'];
  return allowed.some(domain => host === domain || host.endsWith('.' + domain));
}
function resolveThumbnailRedirect_(location, current) {
  const target = String(location || '').trim();
  if (!target) return '';
  if (/^https:\/\//i.test(target)) return target;
  if (/^\/\//.test(target)) return 'https:' + target;
  const origin = String(current || '').match(/^(https:\/\/[^\/?#]+)/i);
  if (!origin) return '';
  if (target.charAt(0) === '/') return origin[1] + target;
  const directory = String(current || '').match(/^(https:\/\/[^?#]*\/)/i);
  return (directory ? directory[1] : origin[1] + '/') + target;
}
function fetchAffiliateThumbnail_(affiliateUrl) {
  let current = String(affiliateUrl || '').trim();
  if (/^http:\/\//i.test(current)) current = current.replace(/^http:/i, 'https:');
  if (!supportedThumbnailHost_(current)) return '';

  for (let hop = 0; hop < 6; hop++) {
    if (!supportedThumbnailHost_(current)) return '';
    let response;
    try {
      response = UrlFetchApp.fetch(current, {
        method: 'get', followRedirects: false, muteHttpExceptions: true,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        }
      });
    } catch (err) {
      Logger.log('Thumbnail fetch blocked/unavailable for supported marketplace URL.');
      return '';
    }
    const code = response.getResponseCode();
    const headers = response.getHeaders() || {};
    const location = headers.Location || headers.location;
    if ([301, 302, 303, 307, 308].includes(code) && location) {
      current = resolveThumbnailRedirect_(location, current);
      if (!current || !supportedThumbnailHost_(current)) return '';
      continue;
    }
    if (code < 200 || code >= 300) return '';
    const contentType = String(headers['Content-Type'] || headers['content-type'] || '').toLowerCase();
    if (contentType && !contentType.includes('text/html') && !contentType.includes('application/xhtml') && !contentType.includes('application/xml')) return '';

    const html = response.getContentText();
    const metaTags = html.match(/<meta\b[^>]*>/gi) || [];
    const wanted = new Set(['og:image', 'og:image:secure_url', 'og:image:url', 'twitter:image', 'twitter:image:src']);
    for (const tag of metaTags) {
      const attrs = {};
      const attrRe = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g;
      let attr;
      while ((attr = attrRe.exec(tag))) attrs[String(attr[1]).toLowerCase()] = attr[2] !== undefined ? attr[2] : (attr[3] !== undefined ? attr[3] : (attr[4] || ''));
      const prop = String(attrs.property || attrs.name || '').trim().toLowerCase();
      if (!wanted.has(prop)) continue;
      let imageUrl = String(attrs.content || '').trim();
      if (!imageUrl) continue;
      imageUrl = imageUrl.replace(/&amp;/gi, '&').replace(/&#38;/g, '&').replace(/&quot;/gi, '"').replace(/&#39;/g, "'");
      if (imageUrl.startsWith('//')) imageUrl = 'https:' + imageUrl;
      else if (!/^https:\/\//i.test(imageUrl)) {
        const origin = current.match(/^(https:\/\/[^\/?#]+)/i);
        if (!origin) continue;
        if (imageUrl.startsWith('/')) imageUrl = origin[1] + imageUrl;
        else if (!/^[a-z][a-z0-9+.-]*:/i.test(imageUrl)) {
          const path = current.match(/^(https:\/\/[^?#]*\/)/i);
          imageUrl = (path ? path[1] : origin[1] + '/') + imageUrl;
        } else continue;
      }
      if (/^https:\/\//i.test(imageUrl) && isHttpUrl_(imageUrl)) return imageUrl.slice(0, 2000);
    }
    return '';
  }
  return '';
}

/* ------------------------------- ANALYTICS ------------------------------- */
function trackAnalyticsEvent(event) {
  const e = event && typeof event === 'object' ? event : {};
  const type = String(e.eventType || '').trim().toLowerCase();
  const validTypes = ['page_view','collection_view','product_click','social_click'];
  if (!validTypes.includes(type)) throw appError_('ANALYTICS_EVENT_INVALID', 'Jenis analytics tidak valid.');
  const visitorId = String(e.visitorId || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 80);
  const sessionId = String(e.sessionId || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 80);
  if (!visitorId || !sessionId) throw appError_('ANALYTICS_VISITOR_INVALID', 'ID pengunjung tidak valid.');
  const targetId = String(e.targetId == null ? '' : e.targetId).slice(0, 100);
  const targetName = String(e.targetName || '').replace(/[\r\n\t]/g, ' ').slice(0, 180);
  const path = String(e.path || '/').split('?')[0].slice(0, 200) || '/';
  const lock = LockService.getScriptLock(); lock.waitLock(10000);
  try {
    const sh = getAnalyticsSheet_(APP.ANALYTICS_EVENTS_SHEET);
    const id = Math.max(0, sh.getLastRow() - 1) + 1;
    const now = new Date(); const day = Utilities.formatDate(now, APP.TIME_ZONE, 'yyyy-MM-dd');
    sh.appendRow([id, now, day, type, targetId, targetName, visitorId, sessionId, path]);
    updateAnalyticsDaily_(day, type, visitorId);
    // Dashboard reads the event log directly. Do not rebuild the entire summary workbook synchronously on a public click.
    CacheService.getScriptCache().remove('analytics-summary-updated');
  } finally { lock.releaseLock(); }
  return { ok: true };
}
function analyticsDateKey_(value, fallbackTimestamp) {
  if (value instanceof Date && !isNaN(value.getTime())) return Utilities.formatDate(value, APP.TIME_ZONE, 'yyyy-MM-dd');
  if (typeof value === 'number' && isFinite(value) && value > 20000 && value < 80000) {
    const parsedSerial = new Date(Date.UTC(1899, 11, 30) + Math.round(value) * 86400000);
    if (!isNaN(parsedSerial.getTime())) return Utilities.formatDate(parsedSerial, APP.TIME_ZONE, 'yyyy-MM-dd');
  }
  const text = String(value == null ? '' : value).trim();
  let m = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) {
    const y = Number(m[1]), mo = Number(m[2]), d = Number(m[3]);
    const dt = new Date(Date.UTC(y, mo - 1, d));
    if (dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d) return y + '-' + ('0' + mo).slice(-2) + '-' + ('0' + d).slice(-2);
  }
  m = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) {
    // Sheets locale formats may be DD/MM/YYYY; analytics event rows are expected to be ISO.
    const d = Number(m[1]), mo = Number(m[2]), y = Number(m[3]);
    const dt = new Date(Date.UTC(y, mo - 1, d));
    if (dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d) return y + '-' + ('0' + mo).slice(-2) + '-' + ('0' + d).slice(-2);
  }
  if (fallbackTimestamp instanceof Date && !isNaN(fallbackTimestamp.getTime())) return Utilities.formatDate(fallbackTimestamp, APP.TIME_ZONE, 'yyyy-MM-dd');
  const dateFallback = new Date(fallbackTimestamp || text);
  if (!isNaN(dateFallback.getTime()) && (fallbackTimestamp || text)) return Utilities.formatDate(dateFallback, APP.TIME_ZONE, 'yyyy-MM-dd');
  return '';
}
function updateAnalyticsDaily_(day, type, visitorId) {
  const sh = getAnalyticsSheet_(APP.ANALYTICS_DAILY_SHEET);
  const last = sh.getLastRow();
  const rows = last >= 2 ? sh.getRange(2, 1, last - 1, ANALYTICS_DAILY_HEADERS.length).getValues() : [];
  const matches = [];
  rows.forEach((r, i) => { if (analyticsDateKey_(r[0]) === day) matches.push({ row: i + 2, values: r }); });
  const metricIndex = { page_view: 1, collection_view: 3, product_click: 4, social_click: 5 }[type];
  const now = new Date();
  let merged;
  if (!matches.length) {
    merged = [day, 0, 0, 0, 0, 0, now];
    if (metricIndex !== undefined) merged[metricIndex] = 1;
    sh.appendRow(merged);
    return;
  }
  // Older builds could create one Analytics_Daily row per event because Date cells stringify differently.
  // Consolidate all rows for this date without losing recorded event counters.
  merged = [day, 0, 0, 0, 0, 0, now];
  matches.forEach(m => {
    for (let i = 1; i <= 5; i++) merged[i] += Number(m.values[i]) || 0;
    if (m.values[6] instanceof Date && m.values[6] > merged[6]) merged[6] = m.values[6];
  });
  if (metricIndex !== undefined) merged[metricIndex] += 1;
  merged[2] = 0; // Exact unique visitor-day count is reconciled from Analytics_Events when reporting.
  sh.getRange(matches[0].row, 1, 1, ANALYTICS_DAILY_HEADERS.length).setValues([merged]);
  matches.slice(1).sort((a, b) => b.row - a.row).forEach(m => sh.deleteRow(m.row));
}
function consolidateAnalyticsDailyRows_() {
  const sh = getAnalyticsSheet_(APP.ANALYTICS_DAILY_SHEET);
  if (sh.getLastRow() < 2) return;
  const values = sh.getRange(2, 1, sh.getLastRow() - 1, ANALYTICS_DAILY_HEADERS.length).getValues();
  const buckets = new Map();
  values.forEach((r, i) => {
    const day = analyticsDateKey_(r[0], r[6]); if (!day) return;
    if (!buckets.has(day)) buckets.set(day, { firstRow: i + 2, values: [day, 0, 0, 0, 0, 0, new Date(0)], rows: [] });
    const b = buckets.get(day); b.rows.push(i + 2);
    for (let c = 1; c <= 5; c++) {
      if (c === 2) b.values[c] = Math.max(Number(b.values[c]) || 0, Number(r[c]) || 0);
      else b.values[c] += Number(r[c]) || 0;
    }
    const updated = r[6] instanceof Date ? r[6] : new Date(r[6] || 0);
    if (!isNaN(updated.getTime()) && updated > b.values[6]) b.values[6] = updated;
  });
  const toDelete = [];
  buckets.forEach(b => { sh.getRange(b.firstRow, 1, 1, ANALYTICS_DAILY_HEADERS.length).setValues([b.values]); b.rows.slice(1).forEach(row => toDelete.push(row)); });
  toDelete.sort((a, b) => b - a).forEach(row => sh.deleteRow(row));
}
function updateAnalyticsSummary_() {
  consolidateAnalyticsDailyRows_();
  const sh = getAnalyticsSheet_(APP.ANALYTICS_DAILY_SHEET);
  const rows = sh.getLastRow() >= 2 ? sh.getRange(2, 1, sh.getLastRow() - 1, ANALYTICS_DAILY_HEADERS.length).getValues() : [];
  const today = Utilities.formatDate(new Date(), APP.TIME_ZONE, 'yyyy-MM-dd');
  const todayRow = rows.find(r => analyticsDateKey_(r[0]) === today) || [];
  const totals = rows.reduce((a,r)=>{ for (let i=1;i<=5;i++) a[i]=(a[i]||0)+(Number(r[i])||0); return a; },{});
  const metrics = [
    ['Today Page Views', Number(todayRow[1])||0], ['Today Estimated Unique Visitor-Days', Number(todayRow[2])||0],
    ['Today Collection Views', Number(todayRow[3])||0], ['Today Product Affiliate Clicks', Number(todayRow[4])||0],
    ['Today Social Clicks', Number(todayRow[5])||0], ['All-Time Product Affiliate Clicks', totals[4]||0],
    ['All-Time Social Clicks', totals[5]||0], ['Updated At', new Date()]
  ];
  const summary = getAnalyticsSheet_(APP.ANALYTICS_SUMMARY_SHEET); summary.clearContents(); styleHeader_(summary, ANALYTICS_SUMMARY_HEADERS);
  summary.getRange(2,1,metrics.length,3).setValues(metrics.map(r=>[r[0],r[1],new Date()]));
}
function defaultAnalyticsRange_() {
  const toDate = Utilities.formatDate(new Date(), APP.TIME_ZONE, 'yyyy-MM-dd');
  const parts = toDate.split('-').map(Number);
  const from = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2] - 29));
  const fromDate = Utilities.formatDate(from, 'Etc/UTC', 'yyyy-MM-dd');
  return { fromDate, toDate };
}
function isValidIsoDate_(value) {
  const s = String(value || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const p = s.split('-').map(Number); const d = new Date(Date.UTC(p[0], p[1]-1, p[2]));
  return d.getUTCFullYear() === p[0] && d.getUTCMonth() === p[1]-1 && d.getUTCDate() === p[2];
}
function dateOnlyLabel_(isoDate) {
  const s = String(isoDate || '');
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s.slice(8,10) + '/' + s.slice(5,7) + '/' + s.slice(0,4) : s;
}
function sumUniqueVisitorDays_(visitorsByDay) {
  let total = 0;
  if (visitorsByDay && typeof visitorsByDay.forEach === 'function') visitorsByDay.forEach(set => { total += set && set.size ? set.size : 0; });
  return total;
}
function normalizeSocialTargetKey_(id, fallback, profile) {
  const labels = { instagram:'Instagram', tiktok:'TikTok', shopee:'Shopee', youtube:'YouTube', facebook:'Facebook', threads:'Threads' };
  const key = String(id || '').trim().toLowerCase();
  if (labels[key] || /^other[1-5]$/.test(key)) return key;
  const legacy = String(fallback || id || '').trim().toLowerCase();
  const match = Object.keys(labels).find(k => labels[k].toLowerCase() === legacy);
  if (match) return match;
  for (let i = 1; i <= 5; i++) {
    const label = String(profile['other' + i + 'Label'] || '').trim().toLowerCase();
    if (label && (legacy === label || key === label)) return 'other' + i;
  }
  return key || ('legacy:' + (legacy || 'tautan'));
}
function currentSocialLabel_(id, fallback, profile) {
  const key = normalizeSocialTargetKey_(id, fallback, profile);
  const labels = { instagram:'Instagram', tiktok:'TikTok', shopee:'Shopee', youtube:'YouTube', facebook:'Facebook', threads:'Threads' };
  if (labels[key]) return labels[key];
  if (/^other[1-5]$/.test(key)) {
    const n = Number(key.slice(-1));
    return String(profile['other' + n + 'Label'] || fallback || ('Link ' + n));
  }
  return String(fallback || id || 'Tautan').trim();
}
function normalizeAnalyticsName_(value) {
  return String(value || '').normalize ? String(value || '').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim() : String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}
function findUniqueProductByLegacyName_(targetId, targetName, products) {
  const candidates = new Set([normalizeAnalyticsName_(targetId), normalizeAnalyticsName_(targetName)].filter(Boolean));
  if (!candidates.size) return null;
  const matches = (products || []).filter(p => candidates.has(normalizeAnalyticsName_(p['Judul Produk'])));
  return matches.length === 1 ? matches[0] : null;
}
function findUniqueCollectionByLegacyName_(targetId, targetName, collections) {
  const candidates = new Set([normalizeAnalyticsName_(targetId), normalizeAnalyticsName_(targetName)].filter(Boolean));
  if (!candidates.size) return null;
  const matches = (collections || []).filter(c => candidates.has(normalizeAnalyticsName_(c['Nama Koleksi'])));
  return matches.length === 1 ? matches[0] : null;
}
function syncDailyUniqueVisitorCounts_(visitorsByDay, fromDate, toDate) {
  const sh = getAnalyticsSheet_(APP.ANALYTICS_DAILY_SHEET);
  if (sh.getLastRow() < 2) return;
  const rows = sh.getRange(2, 1, sh.getLastRow()-1, ANALYTICS_DAILY_HEADERS.length).getValues();
  let changed = false;
  rows.forEach(row => {
    const day = analyticsDateKey_(row[0]);
    if (day && day >= fromDate && day <= toDate) {
      const count = (visitorsByDay.get(day) || new Set()).size;
      if (Number(row[2] || 0) !== count) { row[2] = count; changed = true; }
      if (!(row[0] instanceof Date) && String(row[0] || '') !== day) { row[0] = day; changed = true; }
    }
  });
  if (changed) sh.getRange(2, 1, rows.length, ANALYTICS_DAILY_HEADERS.length).setValues(rows);
}
function adminGetAnalytics(token, fromDate, toDate) {
  assertAdmin_(token, 'SYSTEM_ADMIN');
  let start = String(fromDate || '').trim(), end = String(toDate || '').trim();
  if (!start && !end) { const defaults = defaultAnalyticsRange_(); start = defaults.fromDate; end = defaults.toDate; }
  else if (!start || !end) throw appError_('ANALYTICS_DATE_RANGE_REQUIRED', 'Pilih tanggal awal dan tanggal akhir.');
  if (!isValidIsoDate_(start) || !isValidIsoDate_(end)) throw appError_('ANALYTICS_DATE_INVALID', 'Format tanggal tidak valid.');
  if (start > end) throw appError_('ANALYTICS_DATE_RANGE_INVALID', 'Tanggal awal tidak boleh melebihi tanggal akhir.');

  // Keep the existing dashboard available while the one-time aggregate backfill is running.
  // After backfill is ready, filters read compact monthly rollups instead of the raw event log.
  const props = PropertiesService.getScriptProperties();
  if (props.getProperty('ANALYTICS_AGGREGATION_READY') !== 'true') {
    return adminGetAnalyticsFromRawEvents_(start, end);
  }

  const version = String(props.getProperty('ANALYTICS_AGGREGATION_VERSION') || '0');
  const cacheKey = 'analytics-dashboard-v1:' + version + ':' + start + ':' + end;
  const cache = CacheService.getScriptCache();
  const cached = cache.get(cacheKey);
  if (cached) {
    try { return JSON.parse(cached); } catch (_) { cache.remove(cacheKey); }
  }
  // While a monthly partition is being replaced, prefer a valid cached snapshot; if absent, fall back to source events.
  if (props.getProperty('ANALYTICS_AGGREGATION_IN_PROGRESS') === 'true') {
    return adminGetAnalyticsFromRawEvents_(start, end);
  }

  const result = adminGetAnalyticsFromAggregates_(start, end);
  // CacheService is temporary and caps an individual item at 100 KB. Skip unusually large payloads safely.
  try {
    const serialized = JSON.stringify(result);
    if (serialized.length < 95000) cache.put(cacheKey, serialized, APP.ANALYTICS_DASHBOARD_CACHE_SECONDS);
  } catch (_) { /* Cache is an optimization, not a dependency for Analytics correctness. */ }
  return result;
}

function adminGetAnalyticsFromRawEvents_(start, end) {
  // Ensure the alias schema exists on the first Analytics open, even before the first event.
  const productAliases = getAnalyticsProductAliasMap_();
  const sh = getAnalyticsSheet_(APP.ANALYTICS_EVENTS_SHEET);
  if (sh.getLastRow() < 2) return emptyAnalyticsDashboard_(start, end);
  const eventCount = sh.getLastRow() - 1;
  // Read actual values and normalize EventDate regardless of whether Sheets stored it as ISO text or a Date.
  // Avoid relying on getDisplayValues(), whose result depends on spreadsheet locale/formatting.
  const allRows = sh.getRange(2, 1, eventCount, Math.max(ANALYTICS_EVENT_HEADERS.length, sh.getLastColumn())).getValues();
  const rows = allRows.filter(r => {
    const day = analyticsDateKey_(r[2], r[1]);
    return !!day && day >= start && day <= end;
  }).map(r => { r[2] = analyticsDateKey_(r[2], r[1]); return r; });
  if (!rows.length) return emptyAnalyticsDashboard_(start, end);
  const dailyMap = new Map(), visitorsByDay = new Map(), products = new Map(), collections = new Map(), socials = new Map();
  const hourlyClicks = Array.from({length:24}, (_, hour) => ({hour, totalClicks:0, productClicks:0, socialClicks:0}));
  const visitorsByHour = Array.from({length:24}, () => new Set());
  let pageViews=0, collectionViews=0, productClicks=0, socialClicks=0;
  const currentProducts = getProducts_();
  const productById = new Map(currentProducts.map(p => [String(p.ProductID), p]));
  const productNames = new Map(currentProducts.map(p => [String(p.ProductID), String(p['Judul Produk'] || '').trim()]));
  const currentCollections = getCollections_();
  const collectionNames = new Map(currentCollections.map(c => [String(c.CollectionID), String(c['Nama Koleksi'] || '').trim()]));
  const profile = readSettings_();
  rows.forEach(r => {
    const day = String(r[2] || (r[1] instanceof Date ? Utilities.formatDate(r[1], APP.TIME_ZONE, 'yyyy-MM-dd') : ''));
    if (!day || day < start || day > end) return;
    if (!dailyMap.has(day)) dailyMap.set(day,{date:day,dateLabel:dateOnlyLabel_(day),pageViews:0,uniqueVisitors:0,collectionViews:0,productClicks:0,socialClicks:0});
    const d=dailyMap.get(day), type=String(r[3]||''), id=String(r[4]||''), oldName=String(r[5]||''), visitor=String(r[6]||'');
    if (type==='page_view') {
      pageViews++; d.pageViews++;
      if (!visitorsByDay.has(day)) visitorsByDay.set(day,new Set());
      if (visitor) visitorsByDay.get(day).add(visitor);
      // Count each visitor once per local date and hour. This makes hourly visitor totals comparable across a multi-day filter without counting repeat page views in the same hour.
      const pageTimestamp = r[1] instanceof Date ? r[1] : new Date(r[1]);
      const pageHour = !isNaN(pageTimestamp.getTime()) ? (pageTimestamp.getUTCHours() + 7) % 24 : -1;
      if (visitor && pageHour >= 0 && pageHour <= 23) visitorsByHour[pageHour].add(day + '|' + visitor);
    } else if (type==='collection_view') {
      collectionViews++; d.collectionViews++;
      const hasStableId = collectionNames.has(id);
      const legacyMatch = !hasStableId && !/^\d+$/.test(id) ? findUniqueCollectionByLegacyName_(id, oldName, currentCollections) : null;
      const stableKey = hasStableId ? id : (legacyMatch ? String(legacyMatch.CollectionID) : (id || 'legacy:' + oldName));
      const name = hasStableId ? collectionNames.get(id) : (legacyMatch ? legacyMatch['Nama Koleksi'] : (oldName || (id ? 'Koleksi dihapus · ID '+id : 'Koleksi')));
      addAnalyticsTop_(collections, stableKey, name);
    } else if (type==='product_click') {
      productClicks++; d.productClicks++;
      const clickTimestamp = r[1] instanceof Date ? r[1] : new Date(r[1]);
      // APP.TIME_ZONE is Asia/Jakarta (UTC+7, no daylight-saving adjustment).
      const clickHour = !isNaN(clickTimestamp.getTime()) ? (clickTimestamp.getUTCHours() + 7) % 24 : -1;
      if (clickHour >= 0 && clickHour <= 23) { hourlyClicks[clickHour].productClicks++; hourlyClicks[clickHour].totalClicks++; }
      const hasStableId = productNames.has(id);
      const legacyKey = !/^\d+$/.test(id) ? normalizeAnalyticsName_(id) : '';
      const legacyNameKey = normalizeAnalyticsName_(oldName);
      const aliasId = !hasStableId ? (productAliases.get(legacyKey) || productAliases.get(legacyNameKey) || '') : '';
      const aliasedProduct = aliasId && productById.has(aliasId) ? productById.get(aliasId) : null;
      const legacyMatch = !hasStableId && !aliasedProduct && !/^\d+$/.test(id) ? findUniqueProductByLegacyName_(id, oldName, currentProducts) : null;
      const mappedProduct = hasStableId ? productById.get(id) : (aliasedProduct || legacyMatch);
      const stableKey = mappedProduct ? String(mappedProduct.ProductID) : (id || 'legacy:' + oldName);
      const name = mappedProduct ? String(mappedProduct['Judul Produk'] || '') : (oldName || (id ? 'Produk dihapus · ID '+id : 'Produk'));
      addAnalyticsTop_(products, stableKey, name);
    } else if (type==='social_click') {
      socialClicks++; d.socialClicks++;
      const clickTimestamp = r[1] instanceof Date ? r[1] : new Date(r[1]);
      // APP.TIME_ZONE is Asia/Jakarta (UTC+7, no daylight-saving adjustment).
      const clickHour = !isNaN(clickTimestamp.getTime()) ? (clickTimestamp.getUTCHours() + 7) % 24 : -1;
      if (clickHour >= 0 && clickHour <= 23) { hourlyClicks[clickHour].socialClicks++; hourlyClicks[clickHour].totalClicks++; }
      const socialKey = normalizeSocialTargetKey_(id, oldName, profile);
      addAnalyticsTop_(socials, socialKey, currentSocialLabel_(socialKey, oldName, profile));
    }
  });
  const daily = Array.from(dailyMap.values()).sort((a,b)=>a.date.localeCompare(b.date)).map(d=>({...d,uniqueVisitors:(visitorsByDay.get(d.date)||new Set()).size,date:dateOnlyLabel_(d.date)}));
  const uniqueVisitors = sumUniqueVisitorDays_(visitorsByDay);
  return {
    days: Math.round((Date.parse(end + 'T00:00:00Z') - Date.parse(start + 'T00:00:00Z')) / 86400000) + 1, range: { fromDate:start, toDate:end, fromLabel:dateOnlyLabel_(start), toLabel:dateOnlyLabel_(end) },
    summary:{pageViews,uniqueVisitors,collectionViews,productClicks,socialClicks,ctr:pageViews?Math.round(productClicks/pageViews*10000)/100:0},
    daily,hourlyClicks,hourlyVisitors:visitorsByHour.map((visitors,hour)=>({hour,visitors:visitors.size})),topProducts:analyticsTopArray_(products),topCollections:analyticsTopArray_(collections),topSocial:analyticsTopArray_(socials)
  };
}

function addAnalyticsTop_(map,id,name) { const key=String(id||name||'Unknown'); const item=map.get(key)||{id:key,name:String(name||key),clicks:0}; item.clicks++; map.set(key,item); }
function analyticsTopArray_(map) { return Array.from(map.values()).sort((a,b)=>b.clicks-a.clicks||a.name.localeCompare(b.name)).slice(0,10); }
function emptyAnalyticsDashboard_(fromDate, toDate) {
  const defaults = (fromDate && toDate) ? { fromDate, toDate } : defaultAnalyticsRange_();
  const hourlyClicks = Array.from({length:24}, (_, hour) => ({hour, totalClicks:0, productClicks:0, socialClicks:0}));
  const hourlyVisitors = Array.from({length:24}, (_, hour) => ({hour, visitors:0}));
  return { days:Math.round((Date.parse(defaults.toDate+'T00:00:00Z')-Date.parse(defaults.fromDate+'T00:00:00Z'))/86400000)+1, range:{fromDate:defaults.fromDate,toDate:defaults.toDate,fromLabel:dateOnlyLabel_(defaults.fromDate),toLabel:dateOnlyLabel_(defaults.toDate)}, summary:{pageViews:0,uniqueVisitors:0,collectionViews:0,productClicks:0,socialClicks:0,ctr:0}, daily:[],hourlyClicks,hourlyVisitors,topProducts:[],topCollections:[],topSocial:[] };
}


/* ---------------------- INCREMENTAL ANALYTICS ROLLUPS ---------------------- */
/** Run once manually in the Apps Script editor after deploying this backend. */
function setupAnalyticsAggregation() {
  const events = getAnalyticsSheet_(APP.ANALYTICS_EVENTS_SHEET);
  const props = PropertiesService.getScriptProperties();
  const cursorKey = 'ANALYTICS_AGGREGATION_CURSOR_ROW';
  const targetKey = 'ANALYTICS_AGGREGATION_BOOTSTRAP_TARGET_ROW';
  if (props.getProperty(cursorKey) === null) {
    props.setProperty(cursorKey, '1'); // Row 1 is the header; the next event is row 2.
    props.setProperty(targetKey, String(events.getLastRow()));
    props.setProperty('ANALYTICS_AGGREGATION_READY', 'false');
    props.setProperty('ANALYTICS_AGGREGATION_VERSION', '0');
  } else if (props.getProperty(targetKey) === null && props.getProperty('ANALYTICS_AGGREGATION_READY') !== 'true') {
    props.setProperty(targetKey, String(events.getLastRow()));
  }

  const hasTrigger = ScriptApp.getProjectTriggers().some(t => t.getHandlerFunction() === 'refreshAnalyticsAggregation');
  if (!hasTrigger) ScriptApp.newTrigger('refreshAnalyticsAggregation').timeBased().everyMinutes(5).create();
  const run = refreshAnalyticsAggregation();
  const cursor = Number(props.getProperty(cursorKey) || 1);
  const target = Number(props.getProperty(targetKey) || events.getLastRow());
  const ready = props.getProperty('ANALYTICS_AGGREGATION_READY') === 'true';
  return {
    ok: true,
    triggerInstalled: true,
    ready,
    cursorRow: cursor,
    bootstrapTargetRow: target,
    remainingBootstrapRows: ready ? 0 : Math.max(0, target - cursor),
    refresh: run,
    message: ready ? 'Agregasi Analytics aktif dan refresh berkala terpasang.' : 'Backfill Analytics berjalan bertahap. Trigger akan melanjutkan setiap 5 menit.'
  };
}

/** Trigger worker. It rebuilds each affected day as a replacement, so retrying a batch cannot double-count it. */
function getAnalyticsAggregationStatus() {
  const props = PropertiesService.getScriptProperties();
  const cursor = Math.max(1, Number(props.getProperty('ANALYTICS_AGGREGATION_CURSOR_ROW') || 1));
  const target = Math.max(1, Number(props.getProperty('ANALYTICS_AGGREGATION_BOOTSTRAP_TARGET_ROW') || 1));
  let currentSourceRow = 1;
  try { currentSourceRow = getAnalyticsSheet_(APP.ANALYTICS_EVENTS_SHEET).getLastRow(); } catch (_) {}
  const ready = props.getProperty('ANALYTICS_AGGREGATION_READY') === 'true';
  const triggerInstalled = ScriptApp.getProjectTriggers().some(t => t.getHandlerFunction() === 'refreshAnalyticsAggregation');
  return {
    ready,
    inProgress: props.getProperty('ANALYTICS_AGGREGATION_IN_PROGRESS') === 'true',
    triggerInstalled,
    cursorRow: cursor,
    bootstrapTargetRow: target,
    currentSourceRow,
    remainingBootstrapRows: ready ? 0 : Math.max(0, target - cursor),
    lastRunAt: String(props.getProperty('ANALYTICS_AGGREGATION_LAST_RUN_AT') || ''),
    version: String(props.getProperty('ANALYTICS_AGGREGATION_VERSION') || '0')
  };
}

function refreshAnalyticsAggregation() {
  const lock = LockService.getUserLock();
  if (!lock.tryLock(1000)) return { ok: true, skipped: true, reason: 'Another aggregate refresh is running.' };
  const startedAt = Date.now();
  try {
    const props = PropertiesService.getScriptProperties();
    if (props.getProperty('ANALYTICS_AGGREGATION_CURSOR_ROW') === null) {
      throw appError_('ANALYTICS_AGGREGATION_NOT_SETUP', 'Jalankan setupAnalyticsAggregation() satu kali dari Apps Script editor terlebih dahulu.');
    }
    const events = getAnalyticsSheet_(APP.ANALYTICS_EVENTS_SHEET);
    const cursorKey = 'ANALYTICS_AGGREGATION_CURSOR_ROW';
    let cursor = Math.max(1, Number(props.getProperty(cursorKey) || 1));
    const currentLastRow = events.getLastRow();
    const readyAtStart = props.getProperty('ANALYTICS_AGGREGATION_READY') === 'true';
    const bootstrapTarget = Math.max(1, Number(props.getProperty('ANALYTICS_AGGREGATION_BOOTSTRAP_TARGET_ROW') || currentLastRow));
    const targetRow = readyAtStart ? currentLastRow : Math.min(currentLastRow, bootstrapTarget);
    if (cursor >= targetRow) {
      let readinessChanged = false;
      if (!readyAtStart && cursor >= bootstrapTarget) {
        props.setProperty('ANALYTICS_AGGREGATION_READY', 'true');
        readinessChanged = true;
      }
      if (readinessChanged) bumpAnalyticsAggregationVersion_(props);
      // If a previous run committed its cursor but failed only while clearing this marker, its writes are complete.
      props.setProperty('ANALYTICS_AGGREGATION_IN_PROGRESS', 'false');
      props.setProperty('ANALYTICS_AGGREGATION_LAST_RUN_AT', new Date().toISOString());
      return { ok: true, processedRows: 0, cursorRow: cursor, ready: props.getProperty('ANALYTICS_AGGREGATION_READY') === 'true' };
    }

    const dirtyDays = new Set();
    let scanCursor = cursor;
    const batchSize = Math.max(1000, Number(APP.ANALYTICS_AGGREGATION_BATCH_SIZE) || 5000);
    const maxDaysPerRun = 30;
    // Use a conservative time budget and date cap to leave room for rollup rebuilds and final checkpoints.
    const workDeadline = startedAt + 120000;
    let stoppedAtDateCap = false;
    while (scanCursor < targetRow && Date.now() < workDeadline && !stoppedAtDateCap) {
      const batchEnd = Math.min(targetRow, scanCursor + batchSize);
      const values = events.getRange(scanCursor + 1, 1, batchEnd - scanCursor, ANALYTICS_EVENT_HEADERS.length).getValues();
      for (let i = 0; i < values.length; i++) {
        const row = values[i];
        const day = analyticsDateKey_(row[2], row[1]);
        if (day && !dirtyDays.has(day) && dirtyDays.size >= maxDaysPerRun) {
          // Leave the first row of the next date unprocessed so the next trigger can resume exactly there.
          stoppedAtDateCap = true;
          break;
        }
        if (day) dirtyDays.add(day);
        scanCursor++;
      }
    }

    if (scanCursor === cursor) {
      return { ok: true, processedRows: 0, cursorRow: cursor, ready: readyAtStart };
    }

    // Read only the two date-related columns for indexing. Full rows are read only for affected dates.
    const dirtyDaysByMonth = new Map();
    const newRowsByMonth = new Map();
    const dailyTotalsByDate = new Map();
    if (dirtyDays.size) {
      const dateRanges = getAnalyticsEventDateRanges_(events);
      dirtyDays.forEach(day => {
        const month = day.slice(0, 7);
        if (!dirtyDaysByMonth.has(month)) dirtyDaysByMonth.set(month, new Set());
        dirtyDaysByMonth.get(month).add(day);
        const bounds = dateRanges.get(day);
        const rows = bounds ? events.getRange(bounds.firstRow, 1, bounds.lastRow - bounds.firstRow + 1, ANALYTICS_EVENT_HEADERS.length).getValues() : [];
        const aggregateRows = buildAnalyticsAggregateRowsForDate_(day, rows);
        if (!newRowsByMonth.has(month)) newRowsByMonth.set(month, []);
        aggregateRows.forEach(aggregateRow => newRowsByMonth.get(month).push(aggregateRow));
        dailyTotalsByDate.set(day, analyticsDailyTotalsFromAggregateRows_(day, aggregateRows));
      });

      // Each month partition is replaced for affected dates. If a later write fails, cursor remains unchanged;
      // retrying simply replaces the same date buckets again, rather than incrementing them twice.
      if (dirtyDaysByMonth.size) props.setProperty('ANALYTICS_AGGREGATION_IN_PROGRESS', 'true');
      dirtyDaysByMonth.forEach((days, month) => {
        replaceAnalyticsAggregateDates_(month, days, newRowsByMonth.get(month) || []);
      });
      // trackAnalyticsEvent also writes Analytics_Daily under ScriptLock; use that same lock only for this short sync.
      const dailyLock = LockService.getScriptLock();
      dailyLock.waitLock(10000);
      try { syncAnalyticsDailyFromAggregates_(dailyTotalsByDate); }
      finally { dailyLock.releaseLock(); }
    }

    const nowReady = !readyAtStart && scanCursor >= bootstrapTarget;
    if (nowReady) props.setProperty('ANALYTICS_AGGREGATION_READY', 'true');
    if (dirtyDaysByMonth.size || nowReady) bumpAnalyticsAggregationVersion_(props);
    props.setProperty('ANALYTICS_AGGREGATION_LAST_RUN_AT', new Date().toISOString());
    props.setProperty(cursorKey, String(scanCursor));
    props.setProperty('ANALYTICS_AGGREGATION_IN_PROGRESS', 'false');
    return {
      ok: true,
      processedRows: scanCursor - cursor,
      cursorRow: scanCursor,
      affectedDays: dirtyDays.size,
      ready: props.getProperty('ANALYTICS_AGGREGATION_READY') === 'true',
      durationMs: Date.now() - startedAt
    };
  } finally {
    lock.releaseLock();
  }
}

function bumpAnalyticsAggregationVersion_(props) {
  const key = 'ANALYTICS_AGGREGATION_VERSION';
  const next = Math.max(0, Number(props.getProperty(key) || 0)) + 1;
  props.setProperty(key, String(next));
  return next;
}

function analyticsAggregateMonthSheetName_(month) {
  if (!/^\d{4}-\d{2}$/.test(String(month || ''))) throw appError_('ANALYTICS_MONTH_INVALID', 'Bulan agregasi Analytics tidak valid.');
  return APP.ANALYTICS_AGGREGATION_PREFIX + String(month).replace('-', '_');
}

function getOrCreateAnalyticsAggregateMonthSheet_(month, createIfMissing) {
  const ss = getAnalyticsSpreadsheet_();
  const name = analyticsAggregateMonthSheetName_(month);
  let sh = ss.getSheetByName(name);
  if (!sh && createIfMissing) sh = ss.insertSheet(name);
  if (sh && sh.getLastRow() <= 1) {
    styleHeader_(sh, ANALYTICS_AGGREGATE_HEADERS);
    sh.getRange('A:A').setNumberFormat('@');
    sh.getRange('B:B').setNumberFormat('0');
    sh.getRange('F:F').setNumberFormat('0');
    sh.getRange('G:G').setNumberFormat('yyyy-mm-dd hh:mm:ss');
  }
  if (sh && sh.getLastRow() > 1) {
    const headers = sh.getRange(1, 1, 1, ANALYTICS_AGGREGATE_HEADERS.length).getDisplayValues()[0].map(v => String(v || '').trim());
    if (JSON.stringify(headers) !== JSON.stringify(ANALYTICS_AGGREGATE_HEADERS)) {
      throw appError_('ANALYTICS_AGGREGATE_SCHEMA_INVALID', 'Header sheet ' + name + ' tidak sesuai. Jangan mengubah nama kolom agregasi.');
    }
  }
  return sh;
}

function getAnalyticsEventDateRanges_(eventsSheet) {
  const lastRow = eventsSheet.getLastRow();
  const ranges = new Map();
  if (lastRow < 2) return ranges;
  // Timestamp + EventDate only; this is substantially narrower than reading every event column.
  const dateValues = eventsSheet.getRange(2, 2, lastRow - 1, 2).getValues();
  dateValues.forEach((r, i) => {
    const day = analyticsDateKey_(r[1], r[0]);
    if (!day) return;
    const row = i + 2;
    if (!ranges.has(day)) ranges.set(day, { firstRow: row, lastRow: row });
    else ranges.get(day).lastRow = row;
  });
  return ranges;
}

function buildAnalyticsAggregateRowsForDate_(day, eventRows) {
  const buckets = new Map();
  const dayVisitors = new Set();
  const visitorsByHour = Array.from({ length: 24 }, () => new Set());
  function add(metric, hour, targetId, targetName, amount) {
    const id = String(targetId || ''), name = String(targetName || '');
    const key = JSON.stringify([day, hour, metric, id, name]);
    const item = buckets.get(key) || { day, hour, metric, id, name, count: 0 };
    item.count += Number(amount) || 0;
    buckets.set(key, item);
  }
  (eventRows || []).forEach(row => {
    const rowDay = analyticsDateKey_(row[2], row[1]);
    if (rowDay !== day) return; // Guard against non-contiguous or manually reordered historical rows.
    const type = String(row[3] || '').trim().toLowerCase();
    if (!['page_view', 'collection_view', 'product_click', 'social_click'].includes(type)) return;
    const timestamp = row[1] instanceof Date ? row[1] : new Date(row[1]);
    const hour = !isNaN(timestamp.getTime()) ? (timestamp.getUTCHours() + 7) % 24 : -2;
    const targetId = type === 'page_view' ? '' : String(row[4] || '');
    const targetName = type === 'page_view' ? '' : String(row[5] || '');
    add(type, hour, targetId, targetName, 1);
    if (type === 'page_view') {
      const visitor = String(row[6] || '');
      if (visitor) {
        dayVisitors.add(visitor);
        if (hour >= 0 && hour < 24) visitorsByHour[hour].add(visitor);
      }
    }
  });
  if (dayVisitors.size) add('unique_visitor_day', -1, '', '', dayVisitors.size);
  visitorsByHour.forEach((set, hour) => { if (set.size) add('unique_visitor_hour', hour, '', '', set.size); });
  const updatedAt = new Date();
  return Array.from(buckets.values()).map(b => [b.day, b.hour, b.metric, b.id, b.name, b.count, updatedAt]);
}

function analyticsDailyTotalsFromAggregateRows_(day, rows) {
  const totals = { day, pageViews: 0, uniqueVisitors: 0, collectionViews: 0, productClicks: 0, socialClicks: 0 };
  (rows || []).forEach(row => {
    const metric = String(row[2] || ''), count = Number(row[5]) || 0;
    if (metric === 'page_view') totals.pageViews += count;
    else if (metric === 'unique_visitor_day') totals.uniqueVisitors = count;
    else if (metric === 'collection_view') totals.collectionViews += count;
    else if (metric === 'product_click') totals.productClicks += count;
    else if (metric === 'social_click') totals.socialClicks += count;
  });
  return totals;
}

/** Keep the legacy daily sheet accurate, but update it only in the scheduled worker, never while a user filters. */
function syncAnalyticsDailyFromAggregates_(dailyTotalsByDate) {
  if (!dailyTotalsByDate || !dailyTotalsByDate.size) return;
  const sh = getAnalyticsSheet_(APP.ANALYTICS_DAILY_SHEET);
  const oldCount = Math.max(0, sh.getLastRow() - 1);
  const oldRows = oldCount ? sh.getRange(2, 1, oldCount, ANALYTICS_DAILY_HEADERS.length).getValues() : [];
  const matchesByDay = new Map();
  oldRows.forEach((row, i) => {
    const day = analyticsDateKey_(row[0], row[6]);
    if (!day) return;
    if (!matchesByDay.has(day)) matchesByDay.set(day, []);
    matchesByDay.get(day).push(i + 2);
  });

  const duplicateRows = [];
  const rowsToAppend = [];
  dailyTotalsByDate.forEach(totals => {
    const desired = [totals.day, totals.pageViews, totals.uniqueVisitors, totals.collectionViews, totals.productClicks, totals.socialClicks, new Date()];
    const matches = matchesByDay.get(totals.day) || [];
    if (matches.length) {
      sh.getRange(matches[0], 1, 1, ANALYTICS_DAILY_HEADERS.length).setValues([desired]);
      matches.slice(1).forEach(rowNumber => duplicateRows.push(rowNumber));
    } else rowsToAppend.push(desired);
  });
  duplicateRows.sort((a, b) => b - a).forEach(rowNumber => sh.deleteRow(rowNumber));
  if (rowsToAppend.length) sh.getRange(sh.getLastRow() + 1, 1, rowsToAppend.length, ANALYTICS_DAILY_HEADERS.length).setValues(rowsToAppend);
}

function replaceAnalyticsAggregateDates_(month, daysToReplace, desiredRows) {
  const sh = getOrCreateAnalyticsAggregateMonthSheet_(month, true);
  const oldCount = Math.max(0, sh.getLastRow() - 1);
  const oldRows = oldCount ? sh.getRange(2, 1, oldCount, ANALYTICS_AGGREGATE_HEADERS.length).getValues() : [];
  const keep = oldRows.filter(row => !daysToReplace.has(analyticsDateKey_(row[0], row[6])));
  const output = keep.concat(desiredRows || []);
  output.sort((a, b) => {
    const dateCompare = String(a[0]).localeCompare(String(b[0]));
    if (dateCompare) return dateCompare;
    const hourCompare = Number(a[1]) - Number(b[1]);
    if (hourCompare) return hourCompare;
    const metricCompare = String(a[2]).localeCompare(String(b[2]));
    if (metricCompare) return metricCompare;
    const idCompare = String(a[3]).localeCompare(String(b[3]));
    return idCompare || String(a[4]).localeCompare(String(b[4]));
  });
  const clearCount = Math.max(oldCount, output.length);
  if (clearCount) sh.getRange(2, 1, clearCount, ANALYTICS_AGGREGATE_HEADERS.length).clearContent();
  if (output.length) sh.getRange(2, 1, output.length, ANALYTICS_AGGREGATE_HEADERS.length).setValues(output);
}

function analyticsMonthKeysInRange_(start, end) {
  const result = [];
  const s = String(start).slice(0, 7).split('-').map(Number);
  const e = String(end).slice(0, 7).split('-').map(Number);
  let year = s[0], month = s[1];
  while (year < e[0] || (year === e[0] && month <= e[1])) {
    result.push(year + '-' + String(month).padStart(2, '0'));
    month++;
    if (month > 12) { month = 1; year++; }
  }
  return result;
}

function addAnalyticsTopCount_(map, id, name, count) {
  const key = String(id || name || 'Unknown');
  const item = map.get(key) || { id: key, name: String(name || key), clicks: 0 };
  item.clicks += Number(count) || 0;
  map.set(key, item);
}

function adminGetAnalyticsFromAggregates_(start, end) {
  const ss = getAnalyticsSpreadsheet_();
  const aggregateRows = [];
  analyticsMonthKeysInRange_(start, end).forEach(month => {
    const sh = ss.getSheetByName(analyticsAggregateMonthSheetName_(month));
    if (!sh || sh.getLastRow() < 2) return;
    const rows = sh.getRange(2, 1, sh.getLastRow() - 1, ANALYTICS_AGGREGATE_HEADERS.length).getValues();
    rows.forEach(row => {
      const day = analyticsDateKey_(row[0], row[6]);
      if (day && day >= start && day <= end) {
        row[0] = day;
        aggregateRows.push(row);
      }
    });
  });
  if (!aggregateRows.length) return emptyAnalyticsDashboard_(start, end);

  const dailyMap = new Map();
  const hourlyClicks = Array.from({ length: 24 }, (_, hour) => ({ hour, totalClicks: 0, productClicks: 0, socialClicks: 0 }));
  const hourlyVisitors = Array.from({ length: 24 }, (_, hour) => ({ hour, visitors: 0 }));
  const products = new Map(), collections = new Map(), socials = new Map();
  let pageViews = 0, collectionViews = 0, productClicks = 0, socialClicks = 0, uniqueVisitors = 0;
  const currentProducts = getProducts_();
  const productById = new Map(currentProducts.map(p => [String(p.ProductID), p]));
  const productNames = new Map(currentProducts.map(p => [String(p.ProductID), String(p['Judul Produk'] || '').trim()]));
  const currentCollections = getCollections_();
  const collectionNames = new Map(currentCollections.map(c => [String(c.CollectionID), String(c['Nama Koleksi'] || '').trim()]));
  const profile = readSettings_();
  const productAliases = getAnalyticsProductAliasMap_();
  function dayRecord(day) {
    if (!dailyMap.has(day)) dailyMap.set(day, { date: day, dateLabel: dateOnlyLabel_(day), pageViews: 0, uniqueVisitors: 0, collectionViews: 0, productClicks: 0, socialClicks: 0 });
    return dailyMap.get(day);
  }

  aggregateRows.forEach(row => {
    const day = String(row[0]), hour = Number(row[1]), metric = String(row[2] || ''), id = String(row[3] || ''), oldName = String(row[4] || ''), count = Number(row[5]) || 0;
    if (!count) return;
    const d = dayRecord(day);
    if (metric === 'page_view') { pageViews += count; d.pageViews += count; }
    else if (metric === 'collection_view') {
      collectionViews += count; d.collectionViews += count;
      const hasStableId = collectionNames.has(id);
      const legacyMatch = !hasStableId && !/^\d+$/.test(id) ? findUniqueCollectionByLegacyName_(id, oldName, currentCollections) : null;
      const stableKey = hasStableId ? id : (legacyMatch ? String(legacyMatch.CollectionID) : (id || 'legacy:' + oldName));
      const name = hasStableId ? collectionNames.get(id) : (legacyMatch ? legacyMatch['Nama Koleksi'] : (oldName || (id ? 'Koleksi dihapus · ID ' + id : 'Koleksi')));
      addAnalyticsTopCount_(collections, stableKey, name, count);
    } else if (metric === 'product_click') {
      productClicks += count; d.productClicks += count;
      if (hour >= 0 && hour < 24) { hourlyClicks[hour].productClicks += count; hourlyClicks[hour].totalClicks += count; }
      const hasStableId = productNames.has(id);
      const legacyKey = !/^\d+$/.test(id) ? normalizeAnalyticsName_(id) : '';
      const legacyNameKey = normalizeAnalyticsName_(oldName);
      const aliasId = !hasStableId ? (productAliases.get(legacyKey) || productAliases.get(legacyNameKey) || '') : '';
      const aliasedProduct = aliasId && productById.has(aliasId) ? productById.get(aliasId) : null;
      const legacyMatch = !hasStableId && !aliasedProduct && !/^\d+$/.test(id) ? findUniqueProductByLegacyName_(id, oldName, currentProducts) : null;
      const mappedProduct = hasStableId ? productById.get(id) : (aliasedProduct || legacyMatch);
      const stableKey = mappedProduct ? String(mappedProduct.ProductID) : (id || 'legacy:' + oldName);
      const name = mappedProduct ? String(mappedProduct['Judul Produk'] || '') : (oldName || (id ? 'Produk dihapus · ID ' + id : 'Produk'));
      addAnalyticsTopCount_(products, stableKey, name, count);
    } else if (metric === 'social_click') {
      socialClicks += count; d.socialClicks += count;
      if (hour >= 0 && hour < 24) { hourlyClicks[hour].socialClicks += count; hourlyClicks[hour].totalClicks += count; }
      const socialKey = normalizeSocialTargetKey_(id, oldName, profile);
      addAnalyticsTopCount_(socials, socialKey, currentSocialLabel_(socialKey, oldName, profile), count);
    } else if (metric === 'unique_visitor_day') {
      d.uniqueVisitors = count;
      uniqueVisitors += count;
    } else if (metric === 'unique_visitor_hour' && hour >= 0 && hour < 24) {
      hourlyVisitors[hour].visitors += count;
    }
  });

  const daily = Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date)).map(d => Object.assign({}, d, { date: dateOnlyLabel_(d.date) }));
  return {
    days: Math.round((Date.parse(end + 'T00:00:00Z') - Date.parse(start + 'T00:00:00Z')) / 86400000) + 1,
    range: { fromDate: start, toDate: end, fromLabel: dateOnlyLabel_(start), toLabel: dateOnlyLabel_(end) },
    summary: { pageViews, uniqueVisitors, collectionViews, productClicks, socialClicks, ctr: pageViews ? Math.round(productClicks / pageViews * 10000) / 100 : 0 },
    daily,
    hourlyClicks,
    hourlyVisitors,
    topProducts: analyticsTopArray_(products),
    topCollections: analyticsTopArray_(collections),
    topSocial: analyticsTopArray_(socials)
  };
}

/* ----------------------------- SETTINGS / DATA ---------------------------- */
function getSetting_(key) {
  const sh = getDb_().getSheetByName(APP.SETTINGS_SHEET);
  if (!sh || sh.getLastRow() < 2) return '';
  const vals = sh.getRange(2, 1, sh.getLastRow() - 1, 2).getDisplayValues();
  for (const r of vals) if (String(r[0]).trim() === key) return r[1];
  return '';
}
function setSetting_(key, value) {
  const sh = getDb_().getSheetByName(APP.SETTINGS_SHEET);
  if (!sh) throw appError_('DATABASE_NOT_SETUP', 'Sheet Settings belum tersedia. Jalankan setupDatabase().');
  const vals = sh.getLastRow() >= 2 ? sh.getRange(2, 1, sh.getLastRow() - 1, 2).getDisplayValues() : [];
  const index = vals.findIndex(r => String(r[0]).trim() === key);
  if (index >= 0) sh.getRange(index + 2, 2).setValue(value); else sh.appendRow([key, value]);
}
/** Upsert many settings with one read and one/two range writes. Keeps Admin saves responsive. */
function setSettingsBatch_(updates) {
  const sh = getDb_().getSheetByName(APP.SETTINGS_SHEET);
  if (!sh) throw appError_('DATABASE_NOT_SETUP', 'Sheet Settings belum tersedia. Jalankan setupDatabase().');
  const entries = Object.entries(updates || {});
  if (!entries.length) return;
  const last = sh.getLastRow();
  const rows = last >= 2 ? sh.getRange(2, 1, last - 1, 2).getValues() : [];
  const indexByKey = new Map();
  rows.forEach((r, i) => { const k = String(r[0] || '').trim(); if (k && !indexByKey.has(k)) indexByKey.set(k, i); });
  const appended = [];
  entries.forEach(([rawKey, value]) => {
    const key = String(rawKey || '').trim(); if (!key) return;
    const idx = indexByKey.get(key);
    if (idx !== undefined) rows[idx][1] = value;
    else { indexByKey.set(key, rows.length + appended.length); appended.push([key, value]); }
  });
  if (rows.length) sh.getRange(2, 1, rows.length, 2).setValues(rows);
  if (appended.length) sh.getRange(Math.max(2, last + 1), 1, appended.length, 2).setValues(appended);
}
function readSettings_() {
  const result = Object.assign({}, DEFAULT_SETTINGS);
  const sh = getDb_().getSheetByName(APP.SETTINGS_SHEET);
  if (sh && sh.getLastRow() >= 2) sh.getRange(2, 1, sh.getLastRow() - 1, 2).getDisplayValues().forEach(r => { if (r[0]) result[String(r[0]).trim()] = r[1]; });
  return result;
}
function publicSettings_(p) {
  const o = Object.assign({}, p);
  o.uiTemplate = isAllowedUiTemplate_(o.uiTemplate) ? o.uiTemplate : 'classic';
  delete o.activationCode;
  // Retire the old YouTube music feature even if legacy keys remain in Settings.
  delete o.youtubeMusicEnabled;
  delete o.youtubeMusicUrl;
  // Keep Drive photos in a browser-friendly canonical form and provide an alternate host.
  o.photoUrl = normalizeDriveImageUrl_(o.photoUrl);
  o.photoUrlFallback = driveImageFallbackUrl_(o.photoUrl);
  // CTA authorization is supplied only by the validated License record, never operational Settings.
  delete o.websiteCtaEnabled;
  delete o.websiteCtaWhatsapp;
  return o;
}
function ensureCollectionOrderColumn_(sh) {
  if (!sh || !sh.getLastRow()) return;
  const width = Math.max(sh.getLastColumn(), 1);
  const headers = sh.getRange(1, 1, 1, width).getDisplayValues()[0].map(v => String(v || '').trim());
  if (headers.includes('UrutanTampilan')) return;
  const column = width + 1;
  sh.getRange(1, column).setValue('UrutanTampilan').setFontWeight('bold').setBackground('#79563f').setFontColor('#ffffff');
  sh.setFrozenRows(1);
  const count = Math.max(0, sh.getLastRow() - 1);
  if (count) sh.getRange(2, column, count, 1).setValues(Array.from({length: count}, (_, i) => [i + 1]));
}
function getCollections_() {
  const sh = getDb_().getSheetByName(APP.COLLECTIONS_SHEET); if (!sh || sh.getLastRow() < 2) return [];
  ensureCollectionOrderColumn_(sh);
  const values = sh.getDataRange().getValues(); const m = mapHeaders_(values[0].map(String));
  return values.slice(1).map((r, i) => ({ CollectionID: validId_(r[m.CollectionID]), 'Nama Koleksi': String(r[m['Nama Koleksi']] || '').trim(), UrutanTampilan: Number(r[m.UrutanTampilan]) || i + 1, _row: i + 2 }))
    .filter(c => c.CollectionID && c['Nama Koleksi']).sort((a, b) => a.UrutanTampilan - b.UrutanTampilan || a.CollectionID - b.CollectionID);
}
function getProducts_() {
  const sh = getDb_().getSheetByName(APP.PRODUCTS_SHEET); if (!sh || sh.getLastRow() < 2) return [];
  const values = sh.getDataRange().getValues(); const m = mapHeaders_(values[0].map(String)); const names = new Map(getCollections_().map(c => [c.CollectionID, c['Nama Koleksi']]));
  return values.slice(1).map((r, i) => {
    const cid = validId_(r[m.KoleksiID]);
    return {
      ProductID: validId_(r[m.ProductID]), 'Judul Produk': String(r[m['Judul Produk']] || ''), 'Link Affiliate': String(r[m['Link Affiliate']] || ''),
      'Link Gambar': String(r[m['Link Gambar']] || ''), Status: String(r[m.Status] || 'DRAFT').toUpperCase(), KoleksiID: cid || '',
      Koleksi: cid ? (names.get(cid) || '') : '', UrutanTampilan: Number(r[m.UrutanTampilan]) || i + 1,
      'Harga Tampil': String(r[m['Harga Tampil']] || ''), 'Label Tombol': String(r[m['Label Tombol']] || 'Lihat Produk'),
      'Thumbnail Otomatis': String(r[m['Thumbnail Otomatis']] || ''), _row: i + 2
    };
  }).filter(p => p.ProductID);
}
function getPublicData(licenseResult) {
  const verified = licenseResult && licenseResult.valid ? licenseResult : assertLicensedForRequest_(true);
  const profile = publicSettings_(readSettings_());
  profile.websiteCtaEnabled = verified.showWebsiteCta === true ? 'true' : 'false';
  profile.websiteCtaWhatsapp = APP.WA_NUMBER;
  const allProducts = getProducts_().filter(p => p.Status === 'PUBLISH' && p['Judul Produk'] && isHttpUrl_(p['Link Affiliate']))
    .sort((a, b) => (Number(a.KoleksiID) || 999999) - (Number(b.KoleksiID) || 999999) || a.UrutanTampilan - b.UrutanTampilan || a.ProductID - b.ProductID)
    .map(p => {
      const manualRaw = String(p['Link Gambar'] || '').trim();
      const manual = normalizeDriveImageUrl_(manualRaw) || manualRaw;
      const automatic = String(p['Thumbnail Otomatis'] || '').trim();
      const primary = manual || automatic || '';
      const fallback = (manual && automatic && manual !== automatic) ? automatic : (manual ? driveImageFallbackUrl_(manual) : '');
      return { id: p.ProductID, title: p['Judul Produk'], link: p['Link Affiliate'], image: primary, imageFallback: fallback, status: p.Status, collectionId: p.KoleksiID, collection: p.Koleksi || '', order: p.UrutanTampilan, price: p['Harga Tampil'], buttonLabel: p['Label Tombol'] || 'Lihat Produk' };
    });
  function previewSources_(entries) {
    return entries.map(p => ({ url: p.image || '', fallback: p.imageFallback || '', title: p.title || '' }))
      .filter(x => x.url || x.fallback).slice(0, 12);
  }
  const collections = getCollections_().map(c => {
    const entries = allProducts.filter(p => Number(p.collectionId) === Number(c.CollectionID));
    return { id: c.CollectionID, name: c['Nama Koleksi'], productCount: entries.length, previewImages: previewSources_(entries) };
  }).filter(c => c.productCount > 0);
  const unassigned = allProducts.filter(p => !p.collectionId);
  if (unassigned.length) collections.push({ id: null, name: 'Tanpa Koleksi', productCount: unassigned.length, previewImages: previewSources_(unassigned) });
  return { profile, collections, products: allProducts };
}
function adminGetData(token) {
  const session = assertAdmin_(token);
  const profile = readSettings_();
  profile.photoUrl = normalizeDriveImageUrl_(profile.photoUrl);
  profile.photoUrlFallback = driveImageFallbackUrl_(profile.photoUrl);
  // The CTA flag is master-controlled in the private License spreadsheet; never read it from customer-editable Settings.
  const activationCode = String(getSetting_('activationCode') || '').trim();
  try {
    const licenseRecord = activationCode ? verifyLicenseRemote_(activationCode, true) : { valid: false };
    profile.websiteCtaEnabled = licenseRecord.valid && licenseRecord.showWebsiteCta === true ? 'true' : 'false';
  } catch (_) { profile.websiteCtaEnabled = 'false'; }
  profile.websiteCtaWhatsapp = APP.WA_NUMBER;
  if (session.role !== 'SYSTEM_ADMIN') delete profile.activationCode;
  return { profile, products: getProducts_(), collections: getCollections_(), role: session.role, username: session.username };
}

function adminRemoveProfilePhoto(token) {
  assertAdmin_(token);
  setSetting_('photoUrl', '');
  return { ok: true, photoUrl: '', message: 'Foto profil dihapus dari pengaturan.' };
}

function adminSaveProfile(token, profile, imageDataUrl, fileName) {
  const session = assertAdmin_(token);
  if (!profile || !String(profile.name || '').trim()) {
    throw appError_('NAME_REQUIRED', 'Nama brand wajib diisi.');
  }

  // Validate a changed license code BEFORE uploading a profile image or writing settings.
  let nextActivationCode = '';
  let shouldChangeActivation = false;
  if (profile.activationCode !== undefined && session.role === 'SYSTEM_ADMIN') {
    const current = normalizeLicenseCode_(getSetting_('activationCode'));
    const next = normalizeLicenseCode_(profile.activationCode);
    if (next && next !== current) {
      const license = verifyLicenseRemote_(next, true);
      if (!license.valid) throw appError_('LICENSE_INVALID', licenseMessage_(license.reason));
      nextActivationCode = next;
      shouldChangeActivation = true;
    }
  }

  let uploaded = null;
  try {
    if (imageDataUrl) {
      uploaded = uploadImageToDriveCore_(imageDataUrl, fileName || 'profile', 'profile');
      profile.photoUrl = normalizeDriveImageUrl_(uploaded.imageUrl);
    } else {
      profile.photoUrl = normalizeDriveImageUrl_(profile.photoUrl);
    }

    const settingUpdates = {};
    if (shouldChangeActivation) settingUpdates.activationCode = nextActivationCode;
    Object.keys(DEFAULT_SETTINGS).forEach(key => {
      if (key === 'activationCode' || profile[key] === undefined) return;
      let value = String(profile[key] == null ? '' : profile[key]).trim();
      if (Object.prototype.hasOwnProperty.call(SOCIAL_PREFIXES, key)) value = buildSocialUrl_(key, value);
      if (key === 'theme' && !isAllowedTheme_(value)) value = 'beige';
      if (key === 'fontTheme' && !isAllowedFont_(value)) value = 'inter';
      if (key === 'uiTemplate' && !isAllowedUiTemplate_(value)) value = 'classic';
      settingUpdates[key] = value;
    });
    // Legacy settings are cleared in the same write; the feature has been removed from both UIs.
    settingUpdates.youtubeMusicEnabled = '';
    settingUpdates.youtubeMusicUrl = '';
    setSettingsBatch_(settingUpdates);
    return { ok: true, message: 'Identitas dan pengaturan berhasil disimpan.', photoUrl: profile.photoUrl || '' };
  } catch (err) {
    // Avoid leaving an unused public Drive file if persistence failed.
    if (uploaded && uploaded.fileId) {
      try { DriveApp.getFileById(uploaded.fileId).setTrashed(true); } catch (_) {}
    }
    throw err;
  }
}
function buildSocialUrl_(key, value) {
  const raw = String(value || '').trim(); if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) return isHttpUrl_(raw) ? raw : '';
  const handle = raw.replace(/^@+/, '').replace(/^\/+|\/+$/g, '').trim();
  return handle ? SOCIAL_PREFIXES[key] + encodeURIComponent(handle).replace(/%2F/gi, '/') : '';
}
function isAllowedTheme_(v) { return ['beige','cream','sage','rose','mocha','terracotta','olive','lavender','sky','ocean','navy','burgundy','charcoal','peach','mint','lilac','graphite','earth','powder','emerald','dark'].includes(String(v)); }
function isAllowedFont_(v) { return ['inter','dm-sans','plus-jakarta','montserrat','nunito-sans','lora-inter','playfair-dm','cormorant-inter','baskerville-lato','dm-serif-dm','raleway','bodoni-montserrat','outfit','roboto','open-sans','manrope','baskerville-nunito','prata-inter','cinzel-lato','lato'].includes(String(v)); }
function isAllowedUiTemplate_(v) { const s=String(v==null?'':v).trim(); const n=Number(s); return (/^\d+$/.test(s) && Number.isInteger(n) && n>=1 && n<=100) || ['classic','editorial','modern-grid','minimal','boutique-luxe','card-stack','soft-rounded','gallery','asymmetric','wide-catalog','split-hero','horizontal-collections','compact-shop','luxury-focus','bento-grid','social-first','product-focus','vintage','sidebar','bold-campaign'].includes(s); }

function maxNumericId_(rows, columnIndex) {
  let maximum = 0;
  (rows || []).forEach(row => {
    const id = validId_(row[columnIndex]);
    if (id && id > maximum) maximum = id;
  });
  return maximum;
}

/* -------------------------------- ACCOUNTS -------------------------------- */
function adminLogin(username, password) {
  const uname = String(username || '').trim(); const pass = String(password || '');
  if (!uname || !pass) throw appError_('LOGIN_REQUIRED', 'Username dan password wajib diisi.');
  const sh = getAccountsSheet_();
  if (sh.getLastRow() < 2) throw appError_('NO_ACCOUNTS', 'Belum ada akun. Jalankan createInitialSystemAdmin() setelah menyiapkan Script Properties.');
  const rows = sh.getRange(2, 1, sh.getLastRow() - 1, ACCOUNT_HEADERS.length).getValues();
  const row = rows.find(r => String(r[0] || '').toLowerCase() === uname.toLowerCase());
  // Plain-text comparison is used only because this deployment explicitly requested a Password column.
  if (!row || !String(row[1] || '') || String(row[1]) !== pass) throw appError_('LOGIN_INVALID', 'Username atau password salah.');
  const role = normalizeAccountRole_(row[2]);
  const token = Utilities.getUuid() + Utilities.getUuid();
  CacheService.getScriptCache().put('session:' + token, JSON.stringify({ username: String(row[0]), role }), APP.SESSION_SECONDS);
  return { token, username: String(row[0]), role, expiresIn: APP.SESSION_SECONDS };
}
function normalizeAccountRole_(role) {
  const clean = String(role || '').trim().toUpperCase();
  // Existing deployments may still contain the earlier role name.
  if (clean === 'SUPER_ADMIN') return 'SYSTEM_ADMIN';
  return ['SYSTEM_ADMIN', 'USER'].includes(clean) ? clean : '';
}
function assertAdmin_(token, requiredRole) {
  const sessionKey = 'session:' + String(token || '');
  if (!token) throw appError_('LOGIN_REQUIRED', 'Silakan login kembali.');
  const cache = CacheService.getScriptCache(); const cached = cache.get(sessionKey);
  if (!cached) throw appError_('SESSION_EXPIRED', 'Sesi login telah berakhir. Silakan login kembali.');
  let session;
  try { session = JSON.parse(cached); }
  catch (_) { cache.remove(sessionKey); throw appError_('SESSION_EXPIRED', 'Sesi login tidak valid. Silakan login kembali.'); }
  const accounts = getAccountsSheet_();
  if (accounts.getLastRow() < 2) { cache.remove(sessionKey); throw appError_('SESSION_EXPIRED', 'Akun sudah tidak tersedia. Silakan login kembali.'); }
  const rows = accounts.getRange(2, 1, accounts.getLastRow() - 1, ACCOUNT_HEADERS.length).getValues();
  const account = rows.find(r => String(r[0] || '').toLowerCase() === String(session.username || '').toLowerCase());
  if (!account) { cache.remove(sessionKey); throw appError_('SESSION_EXPIRED', 'Akun sudah tidak tersedia atau username telah berubah. Silakan login kembali.'); }
  const currentRole = normalizeAccountRole_(account[2]);
  if (!currentRole) { cache.remove(sessionKey); throw appError_('ROLE_INVALID', 'Role akun tidak valid. Hubungi SYSTEM_ADMIN.'); }
  if (currentRole !== session.role) { session.role = currentRole; cache.put(sessionKey, JSON.stringify(session), APP.SESSION_SECONDS); }
  if (requiredRole && session.role !== requiredRole) throw appError_('FORBIDDEN', 'Fitur ini hanya dapat diakses oleh SYSTEM_ADMIN.');
  return session;
}
function adminGetAccounts(token) {
  assertAdmin_(token, 'SYSTEM_ADMIN');
  const sh = getAccountsSheet_(); if (sh.getLastRow() < 2) return [];
  return sh.getRange(2, 1, sh.getLastRow() - 1, ACCOUNT_HEADERS.length).getValues().filter(r => r[0]).map(r => ({ username: String(r[0]), role: normalizeAccountRole_(r[2]) || 'USER', createdAt: formatDateTime_(r[3]), updatedAt: formatDateTime_(r[4]) }));
}
function adminSaveAccount(token, account) {
  const session = assertAdmin_(token, 'SYSTEM_ADMIN');
  const username = String(account && account.username || '').trim();
  const password = String(account && account.password || '');
  const role = normalizeAccountRole_(account && account.role || 'USER');
  const original = String(account && account.originalUsername || '').trim();
  if (!/^[A-Za-z0-9._-]{3,40}$/.test(username)) throw appError_('USERNAME_INVALID', 'Username harus 3–40 karakter: huruf, angka, titik, garis bawah, atau tanda hubung.');
  if (!role) throw appError_('ROLE_INVALID', 'Pilih role SYSTEM_ADMIN atau USER.');
  if (original && original.toLowerCase() === session.username.toLowerCase() && role !== session.role) throw appError_('CANNOT_CHANGE_SELF_ROLE', 'Role akun yang sedang digunakan tidak dapat diubah sendiri. Gunakan akun SYSTEM_ADMIN lain.');
  if (original && original.toLowerCase() === session.username.toLowerCase() && username.toLowerCase() !== session.username.toLowerCase()) throw appError_('RENAME_ACTIVE_ACCOUNT_UNSUPPORTED', 'Tidak dapat mengubah username akun yang sedang digunakan. Login dengan akun SYSTEM_ADMIN lain untuk melakukan perubahan.');
  if (!original && password.length < 10) throw appError_('PASSWORD_TOO_SHORT', 'Password akun baru wajib diisi dan minimal 10 karakter.');
  if (password && password.length < 10) throw appError_('PASSWORD_TOO_SHORT', 'Password baru minimal 10 karakter.');
  const lock = LockService.getScriptLock(); lock.waitLock(15000);
  try {
    const sh = getAccountsSheet_();
    const rows = sh.getLastRow() >= 2 ? sh.getRange(2, 1, sh.getLastRow() - 1, ACCOUNT_HEADERS.length).getValues() : [];
    const index = rows.findIndex(r => String(r[0] || '').toLowerCase() === (original || username).toLowerCase());
    if (rows.some((r, i) => i !== index && String(r[0] || '').toLowerCase() === username.toLowerCase())) throw appError_('USERNAME_DUPLICATE', 'Username sudah digunakan.');
    const now = new Date();
    if (index >= 0) {
      const old = rows[index];
      const actualPassword = password || String(old[1] || '');
      if (!actualPassword) throw appError_('PASSWORD_REQUIRED', 'Password harus ditetapkan ulang untuk akun ini.');
      const created = old[3] || now;
      if (normalizeAccountRole_(old[2]) === 'SYSTEM_ADMIN' && role !== 'SYSTEM_ADMIN' && rows.filter(r => normalizeAccountRole_(r[2]) === 'SYSTEM_ADMIN').length <= 1) throw appError_('LAST_SYSTEM_ADMIN', 'Tidak dapat menurunkan role satu-satunya akun SYSTEM_ADMIN.');
      sh.getRange(index + 2, 1, 1, ACCOUNT_HEADERS.length).setValues([[username, actualPassword, role, created, now]]);
      if (String(old[0] || '').toLowerCase() === session.username.toLowerCase()) CacheService.getScriptCache().put('session:' + String(token), JSON.stringify({ username, role }), APP.SESSION_SECONDS);
      return { ok: true, account: { username, role, createdAt: formatDateTime_(created), updatedAt: formatDateTime_(now) }, message: 'Akun berhasil diperbarui.' };
    }
    sh.appendRow([username, password, role, now, now]);
    return { ok: true, account: { username, role, createdAt: formatDateTime_(now), updatedAt: formatDateTime_(now) }, message: 'Akun berhasil ditambahkan.' };
  } finally { lock.releaseLock(); }
}
function adminDeleteAccount(token, username) {
  const session = assertAdmin_(token, 'SYSTEM_ADMIN');
  const target = String(username || '').trim(); if (!target) throw appError_('USERNAME_REQUIRED', 'Username tidak valid.');
  if (target.toLowerCase() === session.username.toLowerCase()) throw appError_('CANNOT_DELETE_SELF', 'Akun yang sedang digunakan tidak dapat dihapus.');
  const lock = LockService.getScriptLock(); lock.waitLock(15000);
  try {
    const sh = getAccountsSheet_(); if (sh.getLastRow() < 2) throw appError_('ACCOUNT_NOT_FOUND', 'Akun tidak ditemukan.');
    const rows = sh.getRange(2, 1, sh.getLastRow() - 1, ACCOUNT_HEADERS.length).getValues();
    const idx = rows.findIndex(r => String(r[0] || '').toLowerCase() === target.toLowerCase()); if (idx < 0) throw appError_('ACCOUNT_NOT_FOUND', 'Akun tidak ditemukan.');
    if (normalizeAccountRole_(rows[idx][2]) === 'SYSTEM_ADMIN' && rows.filter(r => normalizeAccountRole_(r[2]) === 'SYSTEM_ADMIN').length <= 1) throw appError_('LAST_SYSTEM_ADMIN', 'Tidak dapat menghapus satu-satunya akun SYSTEM_ADMIN.');
    sh.deleteRow(idx + 2); return { ok: true, message: 'Akun berhasil dihapus.' };
  } finally { lock.releaseLock(); }
}

/* ------------------------------- PRODUCTS --------------------------------- */
function adminSaveProduct(token, product, imageDataUrl, fileName) {
  assertAdmin_(token);
  if (!product || !String(product['Judul Produk'] || '').trim()) throw appError_('PRODUCT_TITLE_REQUIRED', 'Judul produk wajib diisi.');
  if (!isHttpUrl_(product['Link Affiliate'])) throw appError_('AFFILIATE_URL_INVALID', 'Link Affiliate harus berupa URL http/https yang valid.');
  const cidRaw = product.KoleksiID === '' || product.KoleksiID == null ? null : validId_(product.KoleksiID);
  if (product.KoleksiID !== '' && product.KoleksiID != null && !cidRaw) throw appError_('COLLECTION_INVALID', 'Pilih koleksi yang valid.');
  const status = String(product.Status || 'DRAFT').toUpperCase();
  if (!['PUBLISH','DRAFT','NONAKTIF'].includes(status)) throw appError_('STATUS_INVALID', 'Status publikasi tidak valid.');
  if (cidRaw && !getCollections_().some(c => c.CollectionID === cidRaw)) throw appError_('COLLECTION_NOT_FOUND', 'Koleksi sudah tidak tersedia. Refresh data dan coba lagi.');

  // Drive upload can take time. Do it before taking the global Sheets lock so other Admin actions are not blocked.
  let uploaded = null;
  if (imageDataUrl) uploaded = uploadImageToDriveCore_(imageDataUrl, fileName || 'product', 'product');
  const lock = LockService.getScriptLock();
  let locked = false;
  let result = null;
  let aliasToWrite = null;
  try {
    lock.waitLock(15000); locked = true;
    const sh = getDb_().getSheetByName(APP.PRODUCTS_SHEET);
    if (!sh) throw appError_('DATABASE_NOT_SETUP', 'Sheet Products belum tersedia.');
    const rows = sh.getLastRow() >= 2 ? sh.getRange(2, 1, sh.getLastRow() - 1, PRODUCT_HEADERS.length).getValues() : [];
    const id = validId_(product.ProductID);
    const index = id ? rows.findIndex(r => validId_(r[0]) === id) : -1;
    if (id && index < 0) throw appError_('PRODUCT_NOT_FOUND', 'Produk tidak ditemukan. Refresh data sebelum menyimpan.');
    const old = index >= 0 ? rows[index] : null;
    const productId = old ? id : maxNumericId_(rows, 0) + 1;
    const oldCid = old ? validId_(old[5]) : null;
    const order = old && oldCid === cidRaw ? (Number(old[6]) || nextOrderForCollection_(rows, cidRaw)) : nextOrderForCollection_(rows, cidRaw);
    const affiliateUrl = String(product['Link Affiliate']).trim();
    const imageUrlRaw = uploaded ? uploaded.imageUrl : (String(product['Link Gambar'] || (old ? old[3] : '') || '').trim());
    const imageUrl = normalizeDriveImageUrl_(imageUrlRaw) || imageUrlRaw;
    const oldAffiliateUrl = old ? String(old[2] || '').trim() : '';
    const cachedAutoThumbnail = old && oldAffiliateUrl === affiliateUrl && String(old[11] || '') ? String(old[11] || '').trim() : '';
    const now = new Date();
    const values = [productId, String(product['Judul Produk']).trim(), affiliateUrl, imageUrl, status, cidRaw || '', order, String(product['Harga Tampil'] || '').trim(), String(product['Label Tombol'] || 'Lihat Produk').trim(), old ? (old[9] || now) : now, now, cachedAutoThumbnail];
    if (old) sh.getRange(index + 2, 1, 1, PRODUCT_HEADERS.length).setValues([values]);
    else sh.appendRow(values);
    const previousTitle = old ? String(old[1] || '').trim() : '';
    const currentTitle = String(product['Judul Produk']).trim();
    if (old && previousTitle && normalizeAnalyticsName_(previousTitle) !== normalizeAnalyticsName_(currentTitle)) aliasToWrite = { name: previousTitle, id: productId };
    result = { ok: true, id: productId, order, imageUrl, autoThumbnailUrl: cachedAutoThumbnail, thumbnailFound: !!cachedAutoThumbnail, needsThumbnailLookup: !imageUrl && !cachedAutoThumbnail, analyticsAliasSaved: true, message: old ? 'Produk berhasil diperbarui.' : 'Produk berhasil ditambahkan.' };
  } catch (e) {
    if (uploaded && uploaded.fileId) { try { DriveApp.getFileById(uploaded.fileId).setTrashed(true); } catch (_) {} }
    throw e;
  } finally {
    if (locked) lock.releaseLock();
  }
  // Alias bookkeeping touches the separate Analytics spreadsheet; keep it outside the operational DB lock.
  if (aliasToWrite) {
    try { recordProductNameAlias_(aliasToWrite.name, aliasToWrite.id); }
    catch (aliasError) { result.analyticsAliasSaved = false; Logger.log('Analytics product-alias write failed: ' + (aliasError && aliasError.message ? aliasError.message : aliasError)); }
  }
  return result;
}

function adminRefreshProductThumbnail(token, productId, expectedAffiliateUrl) {
  assertAdmin_(token);
  const id = validId_(productId);
  const expectedUrl = String(expectedAffiliateUrl || '').trim();
  if (!id || !isHttpUrl_(expectedUrl)) throw appError_('THUMBNAIL_REQUEST_INVALID', 'Data permintaan thumbnail tidak valid.');
  const readCurrent = () => {
    const sh = getDb_().getSheetByName(APP.PRODUCTS_SHEET);
    if (!sh || sh.getLastRow() < 2) return null;
    const rows = sh.getRange(2, 1, sh.getLastRow() - 1, PRODUCT_HEADERS.length).getValues();
    const index = rows.findIndex(r => validId_(r[0]) === id);
    return index < 0 ? null : { sh, row: index + 2, values: rows[index] };
  };
  let current = readCurrent();
  if (!current) return { ok: false, stale: true, thumbnailUrl: '', message: 'Produk sudah tidak tersedia.' };
  if (String(current.values[2] || '').trim() !== expectedUrl) return { ok: false, stale: true, thumbnailUrl: String(current.values[11] || ''), message: 'Link affiliate telah berubah; hasil thumbnail lama diabaikan.' };
  const manual = String(current.values[3] || '').trim();
  const already = String(current.values[11] || '').trim();
  if (manual || already) return { ok: true, thumbnailUrl: already, skipped: true, message: 'Gambar manual atau thumbnail otomatis sudah tersedia.' };
  // Network work intentionally happens without holding the script lock, so other Admin saves can proceed.
  const thumbnailUrl = fetchAffiliateThumbnail_(expectedUrl);
  const lock = LockService.getScriptLock(); lock.waitLock(15000);
  try {
    current = readCurrent();
    if (!current || String(current.values[2] || '').trim() !== expectedUrl) return { ok: false, stale: true, thumbnailUrl: '', message: 'Link affiliate telah berubah; hasil thumbnail lama diabaikan.' };
    if (String(current.values[3] || '').trim()) return { ok: true, thumbnailUrl: String(current.values[11] || ''), skipped: true, message: 'Gambar manual lebih diutamakan.' };
    const latestAuto = String(current.values[11] || '').trim();
    if (latestAuto) return { ok: true, thumbnailUrl: latestAuto, skipped: true, message: 'Thumbnail otomatis sudah tersedia.' };
    if (thumbnailUrl) {
      current.sh.getRange(current.row, 12).setValue(thumbnailUrl);
      current.sh.getRange(current.row, 11).setValue(new Date());
    }
    return { ok: true, thumbnailUrl: thumbnailUrl || '', found: !!thumbnailUrl, message: thumbnailUrl ? 'Thumbnail otomatis ditemukan.' : 'Metadata thumbnail tidak tersedia dari marketplace.' };
  } finally { lock.releaseLock(); }
}

function nextOrderForCollection_(rows, collectionId) {
  let max = 0; (rows || []).forEach(r => { const cid = validId_(r[5]); if ((collectionId == null && cid == null) || (collectionId != null && cid === collectionId)) max = Math.max(max, Number(r[6]) || 0); }); return max + 1;
}
function adminDeleteProduct(token, productId) {
  assertAdmin_(token); const id = validId_(productId); if (!id) throw appError_('PRODUCT_ID_INVALID', 'ProductID tidak valid.');
  const lock = LockService.getScriptLock(); lock.waitLock(15000);
  try {
    const sh = getDb_().getSheetByName(APP.PRODUCTS_SHEET); if (!sh || sh.getLastRow() < 2) throw appError_('PRODUCT_NOT_FOUND', 'Produk tidak ditemukan.');
    const rows = sh.getRange(2, 1, sh.getLastRow() - 1, PRODUCT_HEADERS.length).getValues(); const idx = rows.findIndex(r => validId_(r[0]) === id);
    if (idx < 0) throw appError_('PRODUCT_NOT_FOUND', 'Produk tidak ditemukan.'); const cid = validId_(rows[idx][5]); sh.deleteRow(idx + 2); compactOrders_(sh, cid);
    return { ok: true, message: 'Produk berhasil dihapus.' };
  } finally { lock.releaseLock(); }
}
function compactOrders_(sh, cid) {
  if (!sh || sh.getLastRow() < 2) return;
  const rows = sh.getRange(2, 1, sh.getLastRow() - 1, PRODUCT_HEADERS.length).getValues();
  const selected = rows.map((r, i) => ({ r, i })).filter(o => (cid == null && validId_(o.r[5]) == null) || (cid != null && validId_(o.r[5]) === cid))
    .sort((a, b) => (Number(a.r[6]) || 999999) - (Number(b.r[6]) || 999999) || Number(a.r[0]) - Number(b.r[0]));
  const orderByIndex = new Map(selected.map((o, i) => [o.i, i + 1]));
  if (rows.length) sh.getRange(2, 7, rows.length, 1).setValues(rows.map((r, i) => [orderByIndex.has(i) ? orderByIndex.get(i) : (Number(r[6]) || 1)]));
}

/* ------------------------------ COLLECTIONS ------------------------------- */
function adminSaveCollection(token, collection) {
  assertAdmin_(token); const name = String(collection && collection['Nama Koleksi'] || '').trim(); if (!name) throw appError_('COLLECTION_REQUIRED', 'Nama Koleksi wajib diisi.');
  const lock = LockService.getScriptLock(); lock.waitLock(15000);
  try {
    const sh = getDb_().getSheetByName(APP.COLLECTIONS_SHEET); if (!sh) throw appError_('DATABASE_NOT_SETUP', 'Sheet Collections belum tersedia.');
    ensureCollectionOrderColumn_(sh);
    const rows = sh.getLastRow() >= 2 ? sh.getRange(2, 1, sh.getLastRow() - 1, COLLECTION_HEADERS.length).getValues() : [];
    const id = validId_(collection.CollectionID); const duplicate = rows.some(r => String(r[1] || '').trim().toLowerCase() === name.toLowerCase() && validId_(r[0]) !== id);
    if (duplicate) throw appError_('COLLECTION_DUPLICATE', 'Nama koleksi sudah digunakan.'); const now = new Date();
    if (id) { const idx = rows.findIndex(r => validId_(r[0]) === id); if (idx < 0) throw appError_('COLLECTION_NOT_FOUND', 'Koleksi tidak ditemukan.'); sh.getRange(idx + 2, 2, 1, 3).setValues([[name, rows[idx][2] || now, now]]); return { ok: true, id, message: 'Koleksi berhasil diperbarui.' }; }
    const next = maxIdFromRows_(rows, { CollectionID: 0 }, ['CollectionID']) + 1;
    const maxOrder = rows.reduce((m, r) => Math.max(m, Number(r[4]) || 0), 0);
    sh.appendRow([next, name, now, now, maxOrder + 1]); return { ok: true, id: next, order: maxOrder + 1, message: 'Koleksi berhasil ditambahkan.' };
  } finally { lock.releaseLock(); }
}
function adminSaveCollectionOrder(token, collectionIds) {
  assertAdmin_(token);
  if (!Array.isArray(collectionIds)) throw appError_('COLLECTION_ORDER_INVALID', 'Daftar urutan koleksi tidak valid.');
  const ids = collectionIds.map(validId_);
  if (ids.some(id => !id) || new Set(ids).size !== ids.length) throw appError_('COLLECTION_ORDER_INVALID', 'Daftar CollectionID kosong atau duplikat.');
  const lock = LockService.getScriptLock(); lock.waitLock(15000);
  try {
    const sh = getDb_().getSheetByName(APP.COLLECTIONS_SHEET); if (!sh) throw appError_('DATABASE_NOT_SETUP', 'Sheet Collections belum tersedia.');
    ensureCollectionOrderColumn_(sh);
    const rows = sh.getLastRow() >= 2 ? sh.getRange(2, 1, sh.getLastRow() - 1, COLLECTION_HEADERS.length).getValues() : [];
    const expected = rows.filter(r => validId_(r[0]) && String(r[1] || '').trim()).map(r => validId_(r[0])).sort((a,b)=>a-b);
    const given = ids.slice().sort((a,b)=>a-b);
    if (expected.length !== given.length || expected.some((v,i)=>v!==given[i])) throw appError_('COLLECTION_ORDER_STALE', 'Daftar koleksi berubah. Refresh data koleksi sebelum menyimpan urutan.');
    const orderById = new Map(ids.map((id, i) => [id, i + 1]));
    const orders = rows.map((row, i) => { const id = validId_(row[0]); return [orderById.has(id) ? orderById.get(id) : (Number(row[4]) || i + 1)]; });
    if (orders.length) sh.getRange(2, 5, orders.length, 1).setValues(orders);
    return { ok: true, count: ids.length, message: 'Urutan koleksi berhasil disimpan.' };
  } finally { lock.releaseLock(); }
}

function adminDeleteCollection(token, collectionId, mode) {
  assertAdmin_(token); const id = validId_(collectionId); if (!id) throw appError_('COLLECTION_ID_INVALID', 'CollectionID tidak valid.');
  if (mode !== 'deleteProducts' && mode !== 'unlinkProducts') throw appError_('DELETE_MODE_REQUIRED', 'Pilih hapus produk bersama koleksi atau pertahankan tanpa koleksi.');
  const lock = LockService.getScriptLock(); lock.waitLock(15000);
  try {
    const ss = getDb_(), cs = ss.getSheetByName(APP.COLLECTIONS_SHEET), ps = ss.getSheetByName(APP.PRODUCTS_SHEET);
    const cRows = cs.getLastRow() >= 2 ? cs.getRange(2, 1, cs.getLastRow() - 1, COLLECTION_HEADERS.length).getValues() : [];
    const cIdx = cRows.findIndex(r => validId_(r[0]) === id); if (cIdx < 0) throw appError_('COLLECTION_NOT_FOUND', 'Koleksi tidak ditemukan.');
    const pRows = ps.getLastRow() >= 2 ? ps.getRange(2, 1, ps.getLastRow() - 1, PRODUCT_HEADERS.length).getValues() : [];
    const selected = pRows.map((r, i) => ({ r, row: i + 2, index: i })).filter(o => validId_(o.r[5]) === id);
    if (mode === 'deleteProducts') selected.sort((a, b) => b.row - a.row).forEach(o => ps.deleteRow(o.row));
    else if (selected.length) {
      const selectedIds = new Set(selected.map(o => validId_(o.r[0])));
      const currentUnassigned = pRows.map((r, i) => ({ r, i })).filter(o => !selectedIds.has(validId_(o.r[0])) && validId_(o.r[5]) == null)
        .sort((a, b) => (Number(a.r[6]) || 999999) - (Number(b.r[6]) || 999999) || Number(a.r[0]) - Number(b.r[0]));
      const newlyUnassigned = selected.slice().sort((a, b) => (Number(a.r[6]) || 999999) - (Number(b.r[6]) || 999999) || Number(a.r[0]) - Number(b.r[0]));
      let rank = currentUnassigned.length;
      const changedRows = new Set();
      newlyUnassigned.forEach(o => { const r = pRows[o.index]; r[5] = ''; r[6] = ++rank; r[10] = new Date(); changedRows.add(o.index); });
      const unassigned = pRows.map((r, i) => ({ r, i })).filter(o => validId_(o.r[5]) == null)
        .sort((a, b) => (Number(a.r[6]) || 999999) - (Number(b.r[6]) || 999999) || Number(a.r[0]) - Number(b.r[0]));
      unassigned.forEach((o, i) => { if (changedRows.has(o.i)) o.r[6] = i + 1; });
      ps.getRange(2, 6, pRows.length, 1).setValues(pRows.map(r => [r[5]]));
      ps.getRange(2, 7, pRows.length, 1).setValues(pRows.map(r => [r[6]]));
      ps.getRange(2, 11, pRows.length, 1).setValues(pRows.map(r => [r[10]]));
    }
    cs.deleteRow(cIdx + 2);
    return { ok: true, productsAffected: selected.length, mode, message: 'Koleksi berhasil dihapus.' };
  } finally { lock.releaseLock(); }
}
function adminGetDisplayProducts(token, collectionId) {
  assertAdmin_(token);
  const raw = collectionId === '' || collectionId === null || collectionId === undefined ? null : validId_(collectionId);
  if (collectionId !== '' && collectionId !== null && collectionId !== undefined && !raw) throw appError_('COLLECTION_ID_INVALID', 'Koleksi tidak valid.');
  if (raw !== null && !getCollections_().some(c => c.CollectionID === raw)) throw appError_('COLLECTION_NOT_FOUND', 'Koleksi tidak ditemukan. Muat ulang data dan coba lagi.');
  return getProducts_().filter(p => raw === null ? (!p.KoleksiID || p.KoleksiID === '') : Number(p.KoleksiID) === Number(raw))
    .sort((a, b) => (Number(a.UrutanTampilan) || 999999) - (Number(b.UrutanTampilan) || 999999) || Number(a.ProductID) - Number(b.ProductID));
}

function adminSaveDisplayOrder(token, collectionId, productIds) {
  assertAdmin_(token); if (!Array.isArray(productIds)) throw appError_('ORDER_INVALID', 'Daftar urutan tidak valid.');
  const cid = collectionId === '' || collectionId == null ? null : validId_(collectionId);
  if (collectionId !== '' && collectionId != null && !cid) throw appError_('COLLECTION_ID_INVALID', 'Koleksi tidak valid.');
  const ids = productIds.map(validId_); if (ids.some(v => !v) || new Set(ids).size !== ids.length) throw appError_('ORDER_INVALID', 'Daftar ProductID kosong atau duplikat.');
  const lock = LockService.getScriptLock(); lock.waitLock(15000);
  try {
    const sh = getDb_().getSheetByName(APP.PRODUCTS_SHEET); const rows = sh.getLastRow() >= 2 ? sh.getRange(2, 1, sh.getLastRow() - 1, PRODUCT_HEADERS.length).getValues() : [];
    const members = rows.map((r, i) => ({ id: validId_(r[0]), cid: validId_(r[5]), row: i + 2 })).filter(o => cid == null ? o.cid == null : o.cid === cid);
    const expected = members.map(o => o.id).sort((a, b) => a - b), given = ids.slice().sort((a, b) => a - b);
    if (expected.length !== given.length || expected.some((v, i) => v !== given[i])) throw appError_('ORDER_STALE', 'Daftar produk berubah. Refresh menu Tampilan sebelum menyimpan urutan.');
    const rankById = new Map(ids.map((pid, i) => [pid, i + 1]));
    const stamp = new Date();
    const orderColumn = rows.map(r => { const pid = validId_(r[0]); const belongs = cid == null ? validId_(r[5]) == null : validId_(r[5]) === cid; return [belongs && rankById.has(pid) ? rankById.get(pid) : (Number(r[6]) || 1)]; });
    const changedAtColumn = rows.map(r => { const pid = validId_(r[0]); const belongs = cid == null ? validId_(r[5]) == null : validId_(r[5]) === cid; return [belongs && rankById.has(pid) ? stamp : r[10]]; });
    if (rows.length) { sh.getRange(2, 7, rows.length, 1).setValues(orderColumn); sh.getRange(2, 11, rows.length, 1).setValues(changedAtColumn); }
    return { ok: true, count: ids.length, message: 'Urutan berhasil disimpan.' };
  } finally { lock.releaseLock(); }
}

/* ------------------------------ DRIVE UPLOAD ------------------------------ */
function uploadImageToDrive(token, dataUrl, originalName, kind) { assertAdmin_(token); return uploadImageToDriveCore_(dataUrl, originalName, kind); }
function uploadImageToDriveCore_(dataUrl, originalName, kind) {
  if (!dataUrl || typeof dataUrl !== 'string') throw appError_('IMAGE_REQUIRED', 'Pilih file gambar terlebih dahulu.');
  const match = dataUrl.match(/^data:(image\/(?:jpeg|png|gif|webp));base64,([A-Za-z0-9+/=]+)$/);
  if (!match) throw appError_('IMAGE_FORMAT_INVALID', 'Format gambar tidak didukung. Gunakan JPG, PNG, GIF, atau WebP.');
  const bytes = Utilities.base64Decode(match[2]); if (bytes.length > 4 * 1024 * 1024) throw appError_('IMAGE_TOO_LARGE', 'Ukuran gambar maksimal 4 MB.');
  const folderId = String(getConfiguredValue_(APP.DRIVE_FOLDER_PROPERTY, 'DRIVE_UPLOAD_FOLDER_ID') || '').trim();
  if (!folderId) throw appError_('DRIVE_FOLDER_NOT_CONFIGURED', 'DRIVE_UPLOAD_FOLDER_ID belum diatur pada System_Config atau Script Properties.');
  let folder; try { folder = DriveApp.getFolderById(folderId); folder.getName(); } catch (_) { throw appError_('DRIVE_FOLDER_INACCESSIBLE', 'Folder Google Drive tidak dapat diakses. Periksa Folder ID dan izin akun Apps Script.'); }
  const mime = match[1], ext = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/gif': 'gif', 'image/webp': 'webp' }[mime];
  const safeName = String(originalName || kind || 'gambar').replace(/\.[^.]+$/, '').replace(/[^A-Za-z0-9_-]+/g, '_').substring(0, 60) || 'gambar';
  const blob = Utilities.newBlob(bytes, mime, safeName + '_' + Date.now() + '.' + ext);
  const file = folder.createFile(blob);
  try { file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); }
  catch (e) { try { file.setTrashed(true); } catch (_) {} throw appError_('DRIVE_SHARING_BLOCKED', 'Google Drive menolak sharing publik. Periksa kebijakan Google Workspace dan izin berbagi.'); }
  const fileId = file.getId();
  const imageUrl = 'https://drive.google.com/uc?export=view&id=' + encodeURIComponent(fileId);
  return { ok: true, fileId, fileName: file.getName(), folderId: folder.getId(), driveUrl: file.getUrl(), imageUrl, imageFallbackUrl: 'https://lh3.googleusercontent.com/d/' + encodeURIComponent(fileId) };
}

function normalizeWhatsappNumber_(value) {
  let n = String(value || '').replace(/[^0-9]/g, '');
  if (!n) return '';
  if (n.startsWith('0')) n = '62' + n.slice(1);
  else if (n.startsWith('8')) n = '62' + n;
  return n.length >= 9 && n.length <= 16 ? n : '';
}
function driveFileIdFromUrl_(value) {
  const raw = String(value || '').trim();
  if (!raw || !/^https?:\/\//i.test(raw)) return '';
  const host = extractHttpsHost_(raw.replace(/^http:/i, 'https:'));
  if (!['drive.google.com', 'drive.usercontent.google.com'].includes(host)) return '';
  let match = raw.match(/\/(?:file\/d|d)\/([A-Za-z0-9_-]{10,})/i);
  if (match) return match[1];
  match = raw.match(/[?&]id=([A-Za-z0-9_-]{10,})/i);
  return match ? match[1] : '';
}
function normalizeDriveImageUrl_(value) {
  const raw = String(value || '').trim();
  if (!raw || !/^https?:\/\//i.test(raw)) return '';
  const fileId = driveFileIdFromUrl_(raw);
  // Store one canonical URL; clients try thumbnail, googleusercontent, view, and download variants.
  return fileId ? 'https://drive.google.com/uc?export=view&id=' + encodeURIComponent(fileId) : raw;
}
function driveImageFallbackUrl_(value) {
  const fileId = driveFileIdFromUrl_(value);
  return fileId ? 'https://lh3.googleusercontent.com/d/' + encodeURIComponent(fileId) : '';
}
function isHttpUrl_(value) { return /^https?:\/\/[^\s]+$/i.test(String(value || '').trim()); }
function sha256Hex_(value) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(value), Utilities.Charset.UTF_8).map(b => ('0' + ((b + 256) % 256).toString(16)).slice(-2)).join('');
}
function formatDateTime_(v) { if (!v) return ''; try { return Utilities.formatDate(new Date(v), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm'); } catch (_) { return String(v); } }

/* ----------------------- AUTHORIZATION / DIAGNOSTICS ---------------------- */
/**
 * Jalankan fungsi ini MANUAL dari Apps Script Editor sebagai pemilik script.
 * Jika scope external_request belum disetujui, Apps Script akan meminta otorisasi.
 * Setelah persetujuan, jalankan lagi untuk memastikan scope sudah tersedia.
 */
function authorizeExternalRequestScope() {
  const requiredScopes = [
    'https://www.googleapis.com/auth/script.external_request'
  ];
  ScriptApp.requireScopes(ScriptApp.AuthMode.FULL, requiredScopes);
  const info = ScriptApp.getAuthorizationInfo(ScriptApp.AuthMode.FULL, requiredScopes);
  const status = info.getAuthorizationStatus();
  Logger.log('EXTERNAL_REQUEST_AUTH_STATUS=' + status);
  return {
    ok: status === ScriptApp.AuthorizationStatus.NOT_REQUIRED,
    status: String(status),
    message: status === ScriptApp.AuthorizationStatus.NOT_REQUIRED
      ? 'Scope external_request sudah diotorisasi.'
      : 'Periksa status otorisasi dan ikuti dialog izin Google.'
  };
}

/**
 * Tes POST ke License Server dengan kode diagnostik palsu.
 * Tidak mengubah sheet dan tidak pernah menampilkan URL atau secret.
 * Jalankan MANUAL dari Apps Script Editor sebagai pemilik script.
 */
function diagnoseLicenseServerConnection() {
  const requiredScopes = [
    'https://www.googleapis.com/auth/script.external_request'
  ];
  // Memunculkan permintaan izin di Apps Script Editor jika scope belum disetujui.
  ScriptApp.requireScopes(ScriptApp.AuthMode.FULL, requiredScopes);

  const url = String(
    getConfiguredValue_(APP.LICENSE_API_PROPERTY, 'LICENSE_API_URL') || ''
  ).trim();

  if (!url) {
    Logger.log('RESULT=CONFIG_ERROR');
    Logger.log('DETAIL=System_Config LICENSE_API_URL kosong; customer wajib menggunakan License Server global.');
    return {
      ok: false,
      code: 'LICENSE_API_NOT_CONFIGURED',
      message: 'URL License Server global kosong; konfigurasi pusat lisensi wajib diperiksa.'
    };
  }

  if (!/^https:\/\/script\.google\.com\/macros\/s\/[^\s]+\/exec(?:\?.*)?$/.test(url)) {
    Logger.log('RESULT=CONFIG_ERROR');
    Logger.log('DETAIL=LICENSE_API_URL tidak sesuai format Web App Apps Script /exec.');
    return {
      ok: false,
      code: 'LICENSE_API_URL_INVALID',
      message: 'LICENSE_API_URL tidak sesuai format Web App /exec.'
    };
  }

  try {
    const response = UrlFetchApp.fetch(url, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify({
        action: 'verifyLicense',
        code: 'DIAGNOSTIC-TEST-0000'
      }),
      followRedirects: true,
      muteHttpExceptions: true
    });

    const status = response.getResponseCode();
    const body = response.getContentText().slice(0, 1000);
    Logger.log('HTTP_STATUS=' + status);
    Logger.log('RESPONSE_BODY=' + body);

    let parsed = null;
    try { parsed = JSON.parse(response.getContentText()); } catch (_) {}

    const reachable = status >= 200 && status < 300 && !!parsed && parsed.ok === true;
    const result = {
      ok: reachable,
      httpStatus: status,
      serviceResponded: !!parsed,
      responseOk: !!(parsed && parsed.ok === true),
      reason: parsed && parsed.data ? String(parsed.data.reason || '') : '',
      message: reachable
        ? 'License Server dapat menerima POST dan mengembalikan JSON. Kode tes sengaja tidak terdaftar.'
        : 'License Server tidak mengembalikan respons sukses yang diharapkan; periksa RESPONSE_BODY pada Log Eksekusi.'
    };
    Logger.log('DIAGNOSTIC_RESULT=' + JSON.stringify(result));
    return result;
  } catch (error) {
    const detail = error && error.message ? error.message : String(error);
    Logger.log('RESULT=FETCH_ERROR');
    Logger.log('DETAIL=' + detail);
    return {
      ok: false,
      code: 'FETCH_ERROR',
      message: detail
    };
  }
}


/* ----------------------- TOP100 PRODUCTION DATA MODEL ----------------------
 * Additive/backward-compatible sheets. Existing Products, Collections, Settings,
 * Accounts, Analytics and license databases remain in place.
 */
const TOP100_LINK_HEADERS = ['LinkID','Type','Label','URL','Status','UrutanTampilan','Dibuat Pada','Diubah Pada'];
const TOP100_PRODUCT_META_HEADERS = ['ProductID','Deskripsi Produk','Tipe Link','Link Gambar 2','Link Gambar 3','Dibuat Pada','Diubah Pada'];
const TOP100_COLLECTION_META_HEADERS = ['CollectionID','Status Publikasi','Deskripsi Koleksi','Foto Cover','Dibuat Pada','Diubah Pada'];
const TOP100_RELATION_HEADERS = ['ProductID','CollectionID','UrutanRelasi','Dibuat Pada','Diubah Pada'];
const TOP100_DEFAULT_VISIBILITY = {profilePhoto:true,banner:true,name:true,bio:true,motto:true,about:true,location:true,favoriteCollections:true,favoriteProducts:true};
const TOP100_DEFAULT_NAVIGATION = [{key:'home',label:'Home Page',order:1},{key:'findme',label:'Find Me',order:2},{key:'collections',label:'Collections',order:3}];
const TOP100_STANDARD_LINKS = [
  {key:'instagram',type:'Instagram',label:'Instagram'}, {key:'tiktok',type:'TikTok',label:'TikTok'},
  {key:'youtube',type:'YouTube',label:'YouTube'}, {key:'shopee',type:'Shopee',label:'Shopee'},
  {key:'threads',type:'Threads',label:'Threads'}, {key:'facebook',type:'Facebook',label:'Facebook'}
];
function ensureTop100Schema_() {
  const ss = getDb_();
  [[APP.TOP100_LINKS_SHEET,TOP100_LINK_HEADERS],[APP.TOP100_PRODUCT_META_SHEET,TOP100_PRODUCT_META_HEADERS],[APP.TOP100_COLLECTION_META_SHEET,TOP100_COLLECTION_META_HEADERS],[APP.TOP100_RELATION_SHEET,TOP100_RELATION_HEADERS]].forEach(([name,headers])=>{
    const sh = getOrCreateSheet_(ss,name);
    if (!sh.getLastRow()) styleHeader_(sh,headers);
    else {
      const current = sh.getRange(1,1,1,Math.max(1,sh.getLastColumn())).getDisplayValues()[0].map(v=>String(v||'').trim());
      const missing = headers.filter(h=>!current.includes(h));
      if (missing.length) { const start=current.length+1; sh.getRange(1,start,1,missing.length).setValues([missing]); sh.getRange(1,start,1,missing.length).setFontWeight('bold').setBackground('#79563f').setFontColor('#ffffff'); }
      sh.setFrozenRows(1);
    }
  });
}
function top100RowsAsObjects_(sheetName, headers) {
  const sh=getDb_().getSheetByName(sheetName); if(!sh||sh.getLastRow()<2)return [];
  const values=sh.getDataRange().getValues(); const map=mapHeaders_(values[0].map(v=>String(v||'')));
  return values.slice(1).filter(r=>r.some(v=>v!==''&&v!==null)).map(r=>{const o={};headers.forEach(h=>o[h]=map[h]===undefined?'':r[map[h]]);return o;});
}
function top100ReplaceRows_(sheetName, headers, rows) {
  const sh=getOrCreateSheet_(getDb_(),sheetName); styleHeader_(sh,headers); sh.clearContents(); sh.getRange(1,1,1,headers.length).setValues([headers]);
  if(rows.length) sh.getRange(2,1,rows.length,headers.length).setValues(rows.map(r=>headers.map(h=>r[h]===undefined?'':r[h])));
  sh.setFrozenRows(1); return sh;
}
function top100UpsertLegacyRows_(sheetName, idHeader, records) {
  // Update only columns managed by Kliktiva. Existing extra columns/formulas remain untouched
  // for retained IDs; only rows for records intentionally removed from the submitted catalog are cleared.
  const sh=getOrCreateSheet_(getDb_(),sheetName);
  const lastCol=Math.max(1,sh.getLastColumn());
  const headers=sh.getRange(1,1,1,lastCol).getDisplayValues()[0].map(v=>String(v||'').trim());
  const idCol=headers.indexOf(idHeader);
  if(idCol<0)throw appError_('TOP100_SCHEMA_INVALID','Kolom kunci '+idHeader+' tidak ditemukan pada sheet '+sheetName+'.');
  const rowCount=Math.max(0,sh.getLastRow()-1);
  const current=rowCount?sh.getRange(2,1,rowCount,lastCol).getValues():[];
  const existingRowById=new Map();
  current.forEach((row,i)=>{const id=String(row[idCol]||'').trim();if(id&&!existingRowById.has(id))existingRowById.set(id,i+2);});
  const recordById=new Map();
  records.forEach(o=>{const id=String(o[idHeader]||'').trim();if(id)recordById.set(id,o);});
  // Deleting a product/collection in Admin is intentional. Clear that deleted record row only.
  current.forEach((row,i)=>{const id=String(row[idCol]||'').trim();if(id&&!recordById.has(id))sh.getRange(i+2,1,1,lastCol).clearContent();});
  const managedHeaders=[...new Set(records.flatMap(o=>Object.keys(o)).filter(h=>headers.includes(h)))];
  // Column-wise writes avoid overwriting unrelated customer-specific columns.
  managedHeaders.forEach(header=>{
    const col=headers.indexOf(header)+1;
    if(!rowCount)return;
    const updates=current.map(row=>{
      const id=String(row[idCol]||'').trim(); const rec=recordById.get(id);
      if(!rec)return [''];
      if(header==='Dibuat Pada' && row[col-1]!=='' && row[col-1]!==null)return [row[col-1]];
      return [Object.prototype.hasOwnProperty.call(rec,header)?rec[header]:''];
    });
    sh.getRange(2,col,rowCount,1).setValues(updates);
  });
  const newRecords=records.filter(o=>{const id=String(o[idHeader]||'').trim();return id&&!existingRowById.has(id);});
  if(newRecords.length){
    const matrix=newRecords.map(o=>headers.map(h=>Object.prototype.hasOwnProperty.call(o,h)?o[h]:''));
    sh.getRange(Math.max(2,sh.getLastRow()+1),1,matrix.length,lastCol).setValues(matrix);
  }
  sh.setFrozenRows(1);
  return sh;
}
function top100JsonSetting_(value, fallback) { try { const v=JSON.parse(String(value||'')); return v===undefined||v===null?fallback:v; } catch (_) { return fallback; } }
function top100TemplateId_(value) {
  const raw=String(value||'').trim(); const n=Number(raw); if(Number.isInteger(n)&&n>=1&&n<=100)return n;
  const legacy={classic:1,editorial:2,'modern-grid':6,minimal:3,'boutique-luxe':9,'card-stack':7,'soft-rounded':18,gallery:5,asymmetric:8,'wide-catalog':10,'split-hero':24,'horizontal-collections':11,'compact-shop':12,'luxury-focus':14,'bento-grid':15,'social-first':16,'product-focus':17,vintage:20,sidebar:19,'bold-campaign':4};
  return legacy[raw]||1;
}
function top100LegacyLinks_(settings) {
  const out=[]; let order=1;
  TOP100_STANDARD_LINKS.forEach(x=>{const url=String(settings[x.key]||'').trim(); if(url)out.push({LinkID:x.key,Type:x.type,Label:x.label,URL:url,Status:'ACTIVE',UrutanTampilan:order++, 'Dibuat Pada':new Date(),'Diubah Pada':new Date()});});
  for(let i=1;i<=5;i++){const label=String(settings['other'+i+'Label']||'').trim(),url=String(settings['other'+i+'Url']||'').trim();if(label||url){let type=/whats ?app|whatsapp/i.test(label)?'WhatsApp':'Custom';out.push({LinkID:'other'+i,Type:type,Label:label||'Tautan '+i,URL:url,Status:url?'ACTIVE':'INACTIVE',UrutanTampilan:order++,'Dibuat Pada':new Date(),'Diubah Pada':new Date()});}}
  return out;
}
function top100ReadRows_(name, headers) { ensureTop100Schema_(); return top100RowsAsObjects_(name,headers); }
function readTop100State_(publicOnly) {
  ensureTop100Schema_();
  const settings=readSettings_();
  const rawLinks=top100ReadRows_(APP.TOP100_LINKS_SHEET,TOP100_LINK_HEADERS);
  const linkRows=rawLinks.length?rawLinks:top100LegacyLinks_(settings);
  let links=linkRows.map((r,i)=>({id:String(r.LinkID||r.ID||('link-'+(i+1))),type:String(r.Type||'Custom'),label:String(r.Label||r.Type||'Tautan'),url:String(r.URL||''),active:String(r.Status||'ACTIVE').toUpperCase()==='ACTIVE',order:Number(r.UrutanTampilan)||i+1}))
    .filter(l=>!publicOnly || (l.active&&isHttpUrl_(l.url))).sort((a,b)=>a.order-b.order).slice(0,20);
  const prodMetaRows=top100ReadRows_(APP.TOP100_PRODUCT_META_SHEET,TOP100_PRODUCT_META_HEADERS); const prodMeta=new Map(prodMetaRows.map(r=>[String(validId_(r.ProductID)||''),r]));
  const colMetaRows=top100ReadRows_(APP.TOP100_COLLECTION_META_SHEET,TOP100_COLLECTION_META_HEADERS); const colMeta=new Map(colMetaRows.map(r=>[String(validId_(r.CollectionID)||''),r]));
  let products=getProducts_().map((p,i)=>{
    const m=prodMeta.get(String(p.ProductID))||{}; const rawImage=String(p['Link Gambar']||p['Thumbnail Otomatis']||'').trim();
    const image1=normalizeDriveImageUrl_(rawImage)||rawImage, image2=String(m['Link Gambar 2']||''), image3=String(m['Link Gambar 3']||'');
    const linkType=String(m['Tipe Link']||'product').toLowerCase()==='whatsapp'?'whatsapp':'product';
    const url=String(p['Link Affiliate']||'').trim();
    return {id:Number(p.ProductID),name:String(p['Judul Produk']||''),photos:[image1,image2,image3],price:String(p['Harga Tampil']||''),description:String(m['Deskripsi Produk']||''),status:String(p.Status||'DRAFT').toUpperCase(),linkType,url,collectionIds:[],order:Number(p.UrutanTampilan)||i+1,_legacyCollectionId:validId_(p.KoleksiID)};
  }).filter(p=>p.id&&p.name);
  const relationRows=top100ReadRows_(APP.TOP100_RELATION_SHEET,TOP100_RELATION_HEADERS);
  if(relationRows.length){ relationRows.forEach(r=>{const p=products.find(x=>x.id===validId_(r.ProductID)); const cid=validId_(r.CollectionID); if(p&&cid&&!p.collectionIds.includes(cid))p.collectionIds.push(cid);}); }
  else products.forEach(p=>{if(p._legacyCollectionId)p.collectionIds=[p._legacyCollectionId];});
  products.forEach(p=>{delete p._legacyCollectionId;});
  let collections=getCollections_().map((c,i)=>{const m=colMeta.get(String(c.CollectionID))||{};return {id:Number(c.CollectionID),name:String(c['Nama Koleksi']||''),productIds:[],order:Number(c.UrutanTampilan)||i+1,published:String(m['Status Publikasi']||'PUBLISH').toUpperCase()!=='DRAFT'&&String(m['Status Publikasi']||'PUBLISH').toUpperCase()!=='NONAKTIF',description:String(m['Deskripsi Koleksi']||''),coverUrl:String(m['Foto Cover']||'')};});
  collections.forEach(c=>{c.productIds=products.filter(p=>p.collectionIds.includes(c.id)).sort((a,b)=>(Number(a.order)||999999)-(Number(b.order)||999999)||a.id-b.id).map(p=>p.id);});
  const profile={
    name:String(settings.name||''),photoUrl:normalizeDriveImageUrl_(settings.photoUrl)||String(settings.photoUrl||''),bio:String(settings.bio||''),motto:String(settings.motto||''),
    about:String(settings.about||''),seoTitle:String(settings.seoTitle||settings.name||''),seoDescription:String(settings.seoDescription||settings.bio||''),address:String(settings.address||''),
    locationMode:['coordinates','maps'].includes(String(settings.locationMode))?String(settings.locationMode):'coordinates',coordinates:String(settings.coordinates||''),mapsUrl:String(settings.mapsUrl||''),
    bannerUrl:normalizeDriveImageUrl_(settings.bannerUrl)||String(settings.bannerUrl||''),bannerFit:['cover','contain'].includes(String(settings.bannerFit))?String(settings.bannerFit):'cover',
    bannerX:Math.max(0,Math.min(100,Number(settings.bannerX)||50)),bannerY:Math.max(0,Math.min(100,Number(settings.bannerY)||50)),bannerZoom:Math.max(0.5,Math.min(2,Number(settings.bannerZoom)||1))
  };
  const visibility=Object.assign({},TOP100_DEFAULT_VISIBILITY,top100JsonSetting_(settings.homeVisibility,{}));
  const labels=Object.assign({favoriteCollections:'Favorite Collections',favoriteProducts:'Favorite Products',about:'Tentang Brand'},top100JsonSetting_(settings.homeLabels,{}));
  let navigation=top100JsonSetting_(settings.navigationItems,null); if(!Array.isArray(navigation)||!navigation.length)navigation=TOP100_DEFAULT_NAVIGATION.map(x=>({...x}));
  const state={selectedTemplate:top100TemplateId_(settings.uiTemplate),page:'home',openCollection:null,language:['id','en'].includes(String(settings.top100Language))?String(settings.top100Language):'id',sidebarCollapsed:String(settings.top100SidebarCollapsed)==='true',homeLabels:labels,profile,homeVisibility:visibility,settings:{font:['inter','georgia','system','trebuchet','verdana'].includes(String(settings.top100Font))?String(settings.top100Font):'inter'},links,collections,products,
    favoriteCollectionIds:top100JsonSetting_(settings.favoriteCollectionIds,collections.slice(0,5).map(c=>c.id)).map(Number).filter(id=>collections.some(c=>c.id===id),),
    favoriteProductIds:top100JsonSetting_(settings.favoriteProductIds,products.filter(p=>p.status==='PUBLISH').slice(0,5).map(p=>p.id)).map(Number).filter(id=>products.some(p=>p.id===id&&p.status==='PUBLISH')),
    navigation:{items:navigation.map((x,i)=>({key:['home','findme','collections'].includes(x.key)?x.key:TOP100_DEFAULT_NAVIGATION[i%3].key,label:String(x.label||TOP100_DEFAULT_NAVIGATION[i%3].label).slice(0,60),order:Number(x.order)||i+1}))}
  };
  if(publicOnly){
    const hasWa=state.links.some(l=>l.active&&l.type==='WhatsApp'&&isHttpUrl_(l.url));
    state.products=state.products.filter(p=>p.status==='PUBLISH'&&(p.linkType==='whatsapp'?hasWa:isHttpUrl_(p.url)));
    const liveIds=new Set(state.products.map(p=>p.id));
    state.collections=state.collections.filter(c=>c.published).map(c=>({...c,productIds:c.productIds.filter(id=>liveIds.has(id))})).filter(c=>c.productIds.length);
    const liveCids=new Set(state.collections.map(c=>c.id));
    state.products=state.products.map(p=>({...p,collectionIds:p.collectionIds.filter(id=>liveCids.has(id))}));
    state.favoriteCollectionIds=state.favoriteCollectionIds.filter(id=>liveCids.has(id));
    state.favoriteProductIds=state.favoriteProductIds.filter(id=>liveIds.has(id));
    state.homeVisibility=Object.assign({},TOP100_DEFAULT_VISIBILITY,state.homeVisibility);
  }
  return state;
}
function adminGetTop100State(token) { assertAdmin_(token); return readTop100State_(false); }
function adminSaveTop100State(token, payload, scope) {
  assertAdmin_(token);
  if(!payload||typeof payload!=='object')throw appError_('TOP100_PAYLOAD_INVALID','Data Top100 tidak valid. Muat ulang Admin.');
  const profile=payload.profile||{}; if(!String(profile.name||'').trim())throw appError_('NAME_REQUIRED','Nama brand wajib diisi sebelum menyimpan Home Page.');
  const productsIn=Array.isArray(payload.products)?payload.products:[], collectionsIn=Array.isArray(payload.collections)?payload.collections:[], linksIn=Array.isArray(payload.links)?payload.links:[];
  if(productsIn.length>2000||collectionsIn.length>500||linksIn.length>20)throw appError_('TOP100_LIMIT_EXCEEDED','Batas Top100: maksimal 2.000 produk, 500 Collection, dan 20 tautan.');
  const ss=getDb_(); ensureTop100Schema_();
  const now=new Date();
  const oldProducts=getProducts_(), oldProductById=new Map(oldProducts.map(p=>[Number(p.ProductID),p]));
  const oldCollections=getCollections_(), oldCollectionById=new Map(oldCollections.map(c=>[Number(c.CollectionID),c]));
  let maxPid=oldProducts.reduce((m,p)=>Math.max(m,Number(p.ProductID)||0),0), maxCid=oldCollections.reduce((m,c)=>Math.max(m,Number(c.CollectionID)||0),0);
  const usedPids=new Set(), usedCids=new Set();
  const collections=[];
  collectionsIn.forEach((c,i)=>{
    const name=String(c&&c.name||'').trim(); if(!name)return;
    let id=validId_(c.id); if(!id||usedCids.has(id)){id=++maxCid;} maxCid=Math.max(maxCid,id);usedCids.add(id);
    collections.push({id,name:name.slice(0,100),order:Math.max(1,Number(c.order)||i+1),published:c.published!==false,description:String(c.description||'').slice(0,1500),coverUrl:String(c.coverUrl||''),created:(oldCollectionById.get(id)||{})['Dibuat Pada']||now,updated:now,productIds:[]});
  });
  const cidSet=new Set(collections.map(c=>c.id));
  const productRecords=[]; const metaRecords=[]; const relationRecords=[]; const productAliases=[];
  productsIn.forEach((p,i)=>{
    const title=String(p&&p.name||'').trim(); if(!title)return;
    let id=validId_(p.id); if(!id||usedPids.has(id)){id=++maxPid;} maxPid=Math.max(maxPid,id);usedPids.add(id);
    const linkType=String(p.linkType||'product').toLowerCase()==='whatsapp'?'whatsapp':'product';
    const url=String(p.url||'').trim(); if(linkType==='product'&&!isHttpUrl_(url))throw appError_('PRODUCT_URL_INVALID','Setiap produk dengan tipe link Produk harus menggunakan URL http/https yang valid: '+title);
    const status=['PUBLISH','DRAFT','NONAKTIF'].includes(String(p.status||'PUBLISH').toUpperCase())?String(p.status||'PUBLISH').toUpperCase():'DRAFT';
    const imageList=Array.isArray(p.photos)?p.photos:[]; const images=[0,1,2].map(i=>String(imageList[i]||''));
    const collectionIds=(Array.isArray(p.collectionIds)?p.collectionIds:[]).map(validId_).filter((x,i,a)=>x&&cidSet.has(x)&&a.indexOf(x)===i);
    const legacy=oldProductById.get(id); const legacyLink=linkType==='product'?url:'';
    const autoThumb=legacy&&String(legacy['Link Affiliate']||'').trim()===legacyLink?String(legacy['Thumbnail Otomatis']||''):'';
    productRecords.push({ProductID:id,'Judul Produk':title.slice(0,160),'Link Affiliate':legacyLink,'Link Gambar':normalizeDriveImageUrl_(images[0])||images[0],Status:status,KoleksiID:collectionIds.length?collectionIds[0]:'',UrutanTampilan:Math.max(1,Number(p.order)||i+1),'Harga Tampil':String(p.price||'').slice(0,60),'Label Tombol':linkType==='whatsapp'?'Hubungi via WhatsApp':'Lihat Produk','Dibuat Pada':legacy?legacy._createdAt||now:now,'Diubah Pada':now,'Thumbnail Otomatis':autoThumb});
    metaRecords.push({'ProductID':id,'Deskripsi Produk':String(p.description||'').slice(0,600),'Tipe Link':linkType,'Link Gambar 2':normalizeDriveImageUrl_(images[1])||images[1],'Link Gambar 3':normalizeDriveImageUrl_(images[2])||images[2],'Dibuat Pada':now,'Diubah Pada':now});
    collectionIds.forEach((cid,j)=>{relationRecords.push({ProductID:id,CollectionID:cid,UrutanRelasi:j+1,'Dibuat Pada':now,'Diubah Pada':now});const c=collections.find(x=>x.id===cid);if(c)c.productIds.push(id);});
    const previous=oldProductById.get(id);if(previous&&String(previous['Judul Produk']||'').trim()&&normalizeAnalyticsName_(String(previous['Judul Produk']))!==normalizeAnalyticsName_(title))productAliases.push({name:String(previous['Judul Produk']),id});
  });
  // Persist legacy catalog fields additively. Existing custom columns and formulas are not rewritten
  // for retained ProductID/CollectionID rows; only intentionally deleted records are cleared.
  const ps=getOrCreateSheet_(ss,APP.PRODUCTS_SHEET); const pHeaders=ps.getRange(1,1,1,Math.max(ps.getLastColumn(),PRODUCT_HEADERS.length)).getDisplayValues()[0].map(x=>String(x||'').trim());
  if(!pHeaders.includes('ProductID')||!pHeaders.includes('Judul Produk'))throw appError_('PRODUCT_SCHEMA_INVALID','Header Products tidak dikenali; tidak ada data yang disimpan.');
  top100UpsertLegacyRows_(APP.PRODUCTS_SHEET,'ProductID',productRecords);
  const cs=getOrCreateSheet_(ss,APP.COLLECTIONS_SHEET); const cHeaders=cs.getRange(1,1,1,Math.max(cs.getLastColumn(),COLLECTION_HEADERS.length)).getDisplayValues()[0].map(x=>String(x||'').trim());
  if(!cHeaders.includes('CollectionID')||!cHeaders.includes('Nama Koleksi'))throw appError_('COLLECTION_SCHEMA_INVALID','Header Collections tidak dikenali; tidak ada data yang disimpan.');
  top100UpsertLegacyRows_(APP.COLLECTIONS_SHEET,'CollectionID',collections.slice().sort((a,b)=>a.order-b.order||a.id-b.id).map(c=>({CollectionID:c.id,'Nama Koleksi':c.name,'Dibuat Pada':c.created,'Diubah Pada':c.updated,UrutanTampilan:c.order})));
  top100ReplaceRows_(APP.TOP100_PRODUCT_META_SHEET,TOP100_PRODUCT_META_HEADERS,metaRecords);
  top100ReplaceRows_(APP.TOP100_COLLECTION_META_SHEET,TOP100_COLLECTION_META_HEADERS,collections.map(c=>({'CollectionID':c.id,'Status Publikasi':c.published?'PUBLISH':'DRAFT','Deskripsi Koleksi':c.description,'Foto Cover':c.coverUrl,'Dibuat Pada':c.created,'Diubah Pada':c.updated})));
  top100ReplaceRows_(APP.TOP100_RELATION_SHEET,TOP100_RELATION_HEADERS,relationRecords);
  const priorLinkRows=top100ReadRows_(APP.TOP100_LINKS_SHEET,TOP100_LINK_HEADERS), priorLinkById=new Map(priorLinkRows.map(r=>[String(r.LinkID),r]));
  const outLinks=linksIn.slice(0,20).map((l,i)=>{const id=String(l.id||('link-'+(i+1))).slice(0,80), prev=priorLinkById.get(id)||{};const type=String(l.type||'Custom').slice(0,40),label=String(l.label||type).trim().slice(0,100),url=String(l.url||'').trim();if(url&&!isHttpUrl_(url))throw appError_('LINK_URL_INVALID','URL tautan harus menggunakan http:// atau https://.');return {LinkID:id,Type:type,Label:label,URL:url,Status:l.active===false?'INACTIVE':'ACTIVE',UrutanTampilan:Math.max(1,Number(l.order)||i+1),'Dibuat Pada':prev['Dibuat Pada']||now,'Diubah Pada':now};});
  top100ReplaceRows_(APP.TOP100_LINKS_SHEET,TOP100_LINK_HEADERS,outLinks);
  const linkByType=new Map(outLinks.map(l=>[String(l.Type).toLowerCase(),l])); const settingUpdates={
    name:String(profile.name||'').trim().slice(0,100),photoUrl:String(profile.photoUrl||''),bio:String(profile.bio||'').slice(0,260),motto:String(profile.motto||'').slice(0,160),
    about:String(profile.about||'').slice(0,3000),seoTitle:String(profile.seoTitle||profile.name||'').slice(0,160),seoDescription:String(profile.seoDescription||profile.bio||'').slice(0,500),address:String(profile.address||'').slice(0,500),
    locationMode:['coordinates','maps'].includes(String(profile.locationMode))?String(profile.locationMode):'coordinates',coordinates:String(profile.coordinates||'').slice(0,100),mapsUrl:isHttpUrl_(String(profile.mapsUrl||''))?String(profile.mapsUrl||''):'',
    bannerUrl:String(profile.bannerUrl||''),bannerFit:String(profile.bannerFit)==='contain'?'contain':'cover',bannerX:String(Math.max(0,Math.min(100,Number(profile.bannerX)||50))),bannerY:String(Math.max(0,Math.min(100,Number(profile.bannerY)||50))),bannerZoom:String(Math.max(0.5,Math.min(2,Number(profile.bannerZoom)||1))),
    uiTemplate:String(top100TemplateId_(payload.selectedTemplate)),top100Font:['inter','georgia','system','trebuchet','verdana'].includes(String((payload.settings||{}).font))?String(payload.settings.font):'inter',top100Language:['en','id'].includes(String(payload.language))?String(payload.language):'id',top100SidebarCollapsed:payload.sidebarCollapsed?'true':'false',
    homeVisibility:JSON.stringify(Object.assign({},TOP100_DEFAULT_VISIBILITY,payload.homeVisibility||{})),homeLabels:JSON.stringify(payload.homeLabels||{}),favoriteCollectionIds:JSON.stringify((payload.favoriteCollectionIds||[]).map(Number).filter(id=>collections.some(c=>c.id===id))),favoriteProductIds:JSON.stringify((payload.favoriteProductIds||[]).map(Number).filter(id=>productRecords.some(p=>p.ProductID===id&&p.Status==='PUBLISH'))),navigationItems:JSON.stringify(Array.isArray(payload.navigation&&payload.navigation.items)?payload.navigation.items:TOP100_DEFAULT_NAVIGATION)
  };
  TOP100_STANDARD_LINKS.forEach(x=>{settingUpdates[x.key]=String((linkByType.get(x.type.toLowerCase())||{}).URL||'');});
  for(let i=1;i<=5;i++){const c=outLinks.filter(l=>!TOP100_STANDARD_LINKS.some(x=>x.type.toLowerCase()===String(l.Type).toLowerCase())&&String(l.Type).toLowerCase()!=='whatsapp')[i-1];settingUpdates['other'+i+'Label']=c?c.Label:'';settingUpdates['other'+i+'Url']=c?c.URL:'';}
  setSettingsBatch_(settingUpdates);
  productAliases.forEach(a=>{try{recordProductNameAlias_(a.name,a.id);}catch(e){Logger.log('Top100 analytics alias write failed: '+e);}});
  return {ok:true,message:'Data Top100 berhasil disimpan ke Google Sheets.',selectedTemplate:top100TemplateId_(payload.selectedTemplate),productCount:productRecords.length,collectionCount:collections.length,linkCount:outLinks.length};
}
function getTop100PublicData(licenseResult) {
  const verified=licenseResult&&licenseResult.valid?licenseResult:assertLicensedForRequest_(true);
  const state=readTop100State_(true); const profile=publicSettings_(readSettings_());
  profile.websiteCtaEnabled=verified.showWebsiteCta===true?'true':'false'; profile.websiteCtaWhatsapp=APP.WA_NUMBER;
  state.profile=Object.assign({},state.profile,{websiteCtaEnabled:profile.websiteCtaEnabled,websiteCtaWhatsapp:profile.websiteCtaWhatsapp,photoUrlFallback:profile.photoUrlFallback||'',theme:profile.theme,fontTheme:profile.fontTheme,uiTemplate:profile.uiTemplate});
  const collectionById=new Map(state.collections.map(c=>[c.id,c]));
  const products=state.products.map(p=>{const first=(p.photos||[])[0]||'';return {id:p.id,title:p.name,link:p.linkType==='whatsapp'?'':p.url,image:first,imageFallback:'',status:p.status,collectionId:(p.collectionIds||[])[0]||null,collection:((collectionById.get((p.collectionIds||[])[0])||{}).name)||'',order:p.order,price:p.price,buttonLabel:p.linkType==='whatsapp'?'Hubungi via WhatsApp':'Lihat Produk'};});
  const collections=state.collections.map(c=>({id:c.id,name:c.name,productCount:c.productIds.length,previewImages:c.productIds.map(id=>state.products.find(p=>p.id===id)).filter(Boolean).slice(0,12).map(p=>({url:(p.photos||[])[0]||'',fallback:''})).filter(x=>x.url||x.fallback)}));
  return {profile,products,collections,top100:state};
}
