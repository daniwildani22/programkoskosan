/**
 * ============================================================================
 * KOS MANAGEMENT SYSTEM (KMS) - DATA MIGRATION BRIDGE KE SUPABASE
 * File: MigrateToSupabase.gs
 * Description: Export All Existing Google Sheets Data Directly to Supabase
 * ============================================================================
 * 
 * CARA MENGGUNAKAN:
 * 1. Buka dashboard Supabase Anda (https://supabase.com).
 * 2. Masuk ke Project Settings > API.
 * 3. Salin Project URL dan service_role secret key (bukan anon key).
 * 4. Masukkan ke variabel SUPABASE_MIGRATION_CONFIG di bawah ini.
 * 5. Pilih fungsi 'runFullMigrationToSupabase' lalu klik 'Run' (Jalankan).
 * ============================================================================
 */

var SUPABASE_MIGRATION_CONFIG = {
  // GANTI DENGAN URL PROJECT SUPABASE ANDA (contoh: https://xyzcompany.supabase.co)
  SUPABASE_URL: "https://YOUR_PROJECT_ID.supabase.co",
  
  // GANTI DENGAN SERVICE ROLE KEY DARI SUPABASE (Project Settings > API > service_role)
  SUPABASE_SERVICE_KEY: "YOUR_SUPABASE_SERVICE_ROLE_KEY"
};

/**
 * Fungsi Utama: Menjalankan Migrasi Seluruh Tabel
 */
function runFullMigrationToSupabase() {
  var url = SUPABASE_MIGRATION_CONFIG.SUPABASE_URL.replace(/\/$/, "");
  var key = SUPABASE_MIGRATION_CONFIG.SUPABASE_SERVICE_KEY;

  if (!url || url.indexOf("YOUR_PROJECT") !== -1 || !key || key.indexOf("YOUR_") !== -1) {
    Logger.log("? ERROR: Silakan isi SUPABASE_URL dan SUPABASE_SERVICE_KEY terlebih dahulu pada file ini!");
    return "Error: Konfigurasi Supabase belum diisi.";
  }

  Logger.log("?? MEMULAI PROSES MIGRASI DATA DARI GOOGLE SPREADSHEET KE SUPABASE...");
  var report = {};

  var validPropertyIds = {};
  var validRoomIds = {};
  var validAccountIds = {};
  var validTenantIds = {};
  var validContractIds = {};
  var validBillIds = {};

  try {
    // 1. Properties
    report.properties = migrateTable(CONFIG.SHEETS.PROPERTIES, "properties", function(row, idx) {
      var propId = String(row.id || ("PROP_" + (idx + 1))).trim();
      validPropertyIds[propId] = true;
      return {
        id: propId,
        property_code: String(row.property_code || ("KOS-" + (idx + 1))).trim(),
        name: String(row.name || "Kos Graha Asri").trim(),
        address: String(row.address || "-").trim(),
        owner_name: String(row.owner_name || "-").trim(),
        phone: String(row.phone || "-").trim(),
        total_floors: Number(row.total_floors) || 1,
        photo_url: String(row.photo_url || "").trim(),
        description: String(row.description || "").trim(),
        status: String(row.status || "ACTIVE").trim()
      };
    });

    // 2. Rooms
    report.rooms = migrateTable(CONFIG.SHEETS.ROOMS, "rooms", function(row, idx) {
      var roomId = String(row.id || ("ROOM_" + (idx + 1))).trim();
      validRoomIds[roomId] = true;
      return {
        id: roomId,
        room_code: String(row.room_code || ("KMR-" + (idx + 1))).trim(),
        name: String(row.name || row.room_code || ("Kamar " + (idx + 1))).trim(),
        property_id: cleanFk(row.property_id, validPropertyIds),
        floor: Number(row.floor) || 1,
        room_type: String(row.room_type || "STANDARD").trim(),
        dimensions: String(row.dimensions || "3x4 m").trim(),
        base_price: Number(row.base_price) || 0,
        facilities: String(row.facilities || "").trim(),
        photo_url: String(row.photo_url || "").trim(),
        status: String(row.status || "KOSONG").trim(),
        notes: String(row.notes || "").trim()
      };
    });

    // 3. Cash & Bank Accounts (Rekening Bank)
    report.cash_bank_accounts = migrateTable(CONFIG.SHEETS.CASH_BANK, "cash_bank_accounts", function(row, idx) {
      var accId = String(row.id || ("ACC_" + (idx + 1))).trim();
      validAccountIds[accId] = true;
      return {
        id: accId,
        account_code: String(row.account_code || ("ACC-" + (idx + 1))).trim(),
        account_name: String(row.account_name || "Kas/Bank").trim(),
        account_type: String(row.account_type || "BANK").trim(),
        bank_name: String(row.bank_name || "-").trim(),
        account_number: String(row.account_number || "-").trim(),
        holder_name: String(row.holder_name || "-").trim(),
        initial_balance: Number(row.initial_balance) || 0,
        current_balance: Number(row.current_balance) || 0,
        status: String(row.status || "ACTIVE").trim(),
        notes: String(row.notes || "").trim()
      };
    });

    // 4. Tenants (Dukungan foto & deduplikasi kode)
    var tenantSheetName = CONFIG.SHEETS.TENANTS || "TENANTS";
    var ss = getSpreadsheet();
    if (typeof findTenantSheet === "function") {
      try {
        var sh = findTenantSheet();
        if (sh) tenantSheetName = sh.getName();
      } catch (e) {}
    } else {
      var altNames = ["TENANTS", "tenants", "Penghuni", "penghuni", "Data Penghuni"];
      for (var a = 0; a < altNames.length; a++) {
        if (ss.getSheetByName(altNames[a])) {
          tenantSheetName = altNames[a];
          break;
        }
      }
    }

    var usedTenantCodes = {};
    report.tenants = migrateTable(tenantSheetName, "tenants", function(row, idx) {
      var rawId = String(row.id || ("TNT_" + (idx + 1))).trim();
      validTenantIds[rawId] = true;

      var displayName = String(row.full_name || row.nama || row.name || ("Penghuni " + (idx + 1))).trim();
      var photoUrl = String(row.photo_url || row.photo || row.foto || "").trim();
      if (!photoUrl) {
        photoUrl = "https://ui-avatars.com/api/?name=" + encodeURIComponent(displayName) + "&background=064e3b&color=ffffff&bold=true";
      }

      var rawCode = String(row.tenant_code || row.kode || ("PNG-" + ("000" + (idx + 1)).slice(-3))).trim();
      if (!rawCode || rawCode === "-" || usedTenantCodes[rawCode]) {
        var baseCode = rawCode && rawCode !== "-" ? rawCode : ("PNG-" + ("000" + (idx + 1)).slice(-3));
        var count = 1;
        while (usedTenantCodes[baseCode]) {
          baseCode = "PNG-" + ("000" + (idx + 1)).slice(-3) + "-" + count;
          count++;
        }
        rawCode = baseCode;
      }
      usedTenantCodes[rawCode] = true;

      return {
        id: rawId,
        tenant_code: rawCode,
        full_name: displayName,
        id_card_number: String(row.id_card_number || row.nik || "").trim(),
        phone: String(row.phone || row.no_telp || row.no_hp || "-").trim(),
        email: String(row.email || "").trim(),
        origin_address: String(row.origin_address || row.alamat || "").trim(),
        emergency_contact_name: String(row.emergency_contact_name || "").trim(),
        emergency_contact_phone: String(row.emergency_contact_phone || "").trim(),
        emergency_contact_relation: String(row.emergency_contact_relation || "").trim(),
        occupation: String(row.occupation || row.pekerjaan || "").trim(),
        photo_url: photoUrl,
        id_card_photo_url: String(row.id_card_photo_url || "").trim(),
        notes: String(row.notes || row.keterangan || "").trim(),
        status: String(row.status || "ACTIVE").trim()
      };
    });

    // 5. Contracts
    var usedContractNums = {};
    report.contracts = migrateTable(CONFIG.SHEETS.CONTRACTS, "contracts", function(row, idx) {
      var contractId = String(row.id || ("CTR_" + (idx + 1))).trim();
      validContractIds[contractId] = true;

      var rawContractNum = String(row.contract_number || ("CTR-" + (idx + 1))).trim();
      if (!rawContractNum || usedContractNums[rawContractNum]) {
        rawContractNum = "CTR-" + (idx + 1) + "-" + (1000 + idx);
      }
      usedContractNums[rawContractNum] = true;

      return {
        id: contractId,
        contract_number: rawContractNum,
        tenant_id: cleanFk(row.tenant_id, validTenantIds),
        room_id: cleanFk(row.room_id, validRoomIds),
        property_id: cleanFk(row.property_id, validPropertyIds),
        start_date: formatDateIso(row.start_date),
        end_date: formatDateIso(row.end_date),
        rent_price: Number(row.rent_price) || 0,
        billing_cycle: String(row.billing_cycle || "BULANAN").trim(),
        due_day: Number(row.due_day) || 1,
        deposit_amount: Number(row.deposit_amount) || 0,
        terms_and_conditions: String(row.terms_and_conditions || "").trim(),
        status: String(row.status || "ACTIVE").trim()
      };
    });

    // 6. Rent Bills
    var usedBillNums = {};
    report.rent_bills = migrateTable(CONFIG.SHEETS.RENT_BILLS, "rent_bills", function(row, idx) {
      var billId = String(row.id || ("BIL_" + (idx + 1))).trim();
      validBillIds[billId] = true;

      var rawBillNum = String(row.bill_number || ("INV-" + (idx + 1))).trim();
      if (!rawBillNum || usedBillNums[rawBillNum]) {
        rawBillNum = "INV-" + (idx + 1) + "-" + (1000 + idx);
      }
      usedBillNums[rawBillNum] = true;

      return {
        id: billId,
        bill_number: rawBillNum,
        contract_id: cleanFk(row.contract_id, validContractIds),
        tenant_id: cleanFk(row.tenant_id, validTenantIds),
        room_id: cleanFk(row.room_id, validRoomIds),
        property_id: cleanFk(row.property_id, validPropertyIds),
        period_name: String(row.period_name || "Sewa Bulanan").trim(),
        due_date: formatDateIso(row.due_date),
        rent_amount: Number(row.rent_amount) || 0,
        other_charges: Number(row.other_charges) || 0,
        discount_amount: Number(row.discount_amount) || 0,
        total_amount: Number(row.total_amount) || 0,
        paid_amount: Number(row.paid_amount) || 0,
        remaining_amount: Number(row.remaining_amount) || 0,
        status: String(row.status || "UNPAID").trim(),
        notes: String(row.notes || "").trim()
      };
    });

    // 7. Payments
    var usedPayNums = {};
    report.payments = migrateTable(CONFIG.SHEETS.PAYMENTS, "payments", function(row, idx) {
      var rawPayNum = String(row.payment_number || ("PAY-" + (idx + 1))).trim();
      if (!rawPayNum || usedPayNums[rawPayNum]) {
        rawPayNum = "PAY-" + (idx + 1) + "-" + (1000 + idx);
      }
      usedPayNums[rawPayNum] = true;

      return {
        id: String(row.id || ("PAY_" + (idx + 1))).trim(),
        payment_number: rawPayNum,
        bill_id: cleanFk(row.bill_id, validBillIds),
        contract_id: cleanFk(row.contract_id, validContractIds),
        tenant_id: cleanFk(row.tenant_id, validTenantIds),
        room_id: cleanFk(row.room_id, validRoomIds),
        property_id: cleanFk(row.property_id, validPropertyIds),
        payment_date: formatDateIso(row.payment_date),
        amount: Number(row.amount) || 0,
        payment_method: String(row.payment_method || "TRANSFER_BANK").trim(),
        account_id: cleanFk(row.account_id, validAccountIds),
        proof_url: String(row.proof_url || "").trim(),
        receipt_number: String(row.receipt_number || "").trim(),
        notes: String(row.notes || "").trim(),
        received_by: String(row.received_by || "Admin").trim(),
        status: String(row.status || "CONFIRMED").trim()
      };
    });

    // 8. Settings
    report.settings = migrateTable(CONFIG.SHEETS.SETTINGS, "settings", function(row, idx) {
      return {
        id: String(row.id || ("SET_" + (idx + 1))).trim(),
        key: String(row.key || ("CONFIG_" + (idx + 1))).trim(),
        value: String(row.value || "").trim(),
        category: String(row.category || "GENERAL").trim(),
        description: String(row.description || "").trim()
      };
    });

    Logger.log("? MIGRASI SELESAI DENGAN SUKSES!");
    Logger.log(JSON.stringify(report, null, 2));
    return report;

  } catch (err) {
    Logger.log("? GAGAL MIGRASI: " + err.message);
    throw err;
  }
}

/**
 * Helper untuk membersihkan Foreign Key (mengembalikan null jika referensi tidak valid/kosong)
 */
function cleanFk(val, validMap) {
  if (!val) return null;
  var str = String(val).trim();
  if (!str || str === "-" || str === "null" || str === "undefined" || str === "0") return null;
  if (validMap && Object.keys(validMap).length > 0 && !validMap[str]) {
    // Jika tidak ditemukan di map parent, kembalikan null agar tidak memicu foreign key violation
    return null;
  }
  return str;
}

/**
 * Helper untuk migrasi 1 sheet ke tabel Supabase via REST API Upsert
 */
function migrateTable(sheetName, supabaseTableName, transformFn) {
  try {
    if (!sheetName) return 0;
    var rawData = [];
    try {
      rawData = Database.getAll(sheetName);
    } catch (e) {
      Logger.log("?? Sheet '" + sheetName + "' tidak dapat dibaca: " + e.message);
      return 0;
    }

    if (!rawData || rawData.length === 0) {
      Logger.log("?? Sheet '" + sheetName + "' kosong. Dilewati.");
      return 0;
    }

    var cleanRecords = [];
    for (var i = 0; i < rawData.length; i++) {
      var item = transformFn(rawData[i], i);
      if (item && item.id) {
        cleanRecords.push(item);
      }
    }

    if (cleanRecords.length === 0) return 0;

    var url = SUPABASE_MIGRATION_CONFIG.SUPABASE_URL.replace(/\/$/, "") + "/rest/v1/" + supabaseTableName + "?on_conflict=id";
    var options = {
      method: "post",
      headers: {
        "apikey": SUPABASE_MIGRATION_CONFIG.SUPABASE_SERVICE_KEY,
        "Authorization": "Bearer " + SUPABASE_MIGRATION_CONFIG.SUPABASE_SERVICE_KEY,
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates"
      },
      payload: JSON.stringify(cleanRecords),
      muteHttpExceptions: true
    };

    var res = UrlFetchApp.fetch(url, options);
    var code = res.getResponseCode();

    if (code >= 200 && code < 300) {
      Logger.log("? Berhasil migrasi " + cleanRecords.length + " data ke tabel '" + supabaseTableName + "'.");
      return cleanRecords.length;
    } else {
      Logger.log("?? Gagal kirim ke '" + supabaseTableName + "' (HTTP " + code + "): " + res.getContentText());
      return 0;
    }
  } catch (e) {
    Logger.log("?? Error pada tabel '" + supabaseTableName + "': " + e.message);
    return 0;
  }
}

function formatDateIso(val) {
  if (!val) return new Date().toISOString().substring(0, 10);
  if (val instanceof Date) return val.toISOString().substring(0, 10);
  var str = String(val).trim();
  if (str.length >= 10 && str.charAt(4) === '-' && str.charAt(7) === '-') {
    return str.substring(0, 10);
  }
  return new Date().toISOString().substring(0, 10);
}
