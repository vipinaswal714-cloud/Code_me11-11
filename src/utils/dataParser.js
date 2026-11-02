import * as XLSX from 'xlsx';

// Security constraints
export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB
export const MAX_ROW_LIMIT = 100000;

const DANGEROUS_OBJECT_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/**
 * Sanitizes column names to completely prevent Prototype Pollution
 */
export function sanitizeColumnName(name) {
  const str = String(name || '').trim();
  if (!str) return 'Unnamed_Column';
  if (DANGEROUS_OBJECT_KEYS.has(str.toLowerCase())) {
    return `col_${str}`;
  }
  return str;
}

/**
 * Infer column type from an array of values
 * Returns 'date' | 'number' | 'category'
 */
export function inferColumnType(values) {
  let numberCount = 0;
  let dateCount = 0;
  let textCount = 0;
  let validCount = 0;

  for (let i = 0; i < values.length; i++) {
    const val = values[i];
    if (val === null || val === undefined || val === '') continue;
    validCount++;

    // Check if Date object
    if (val instanceof Date && !isNaN(val.getTime())) {
      dateCount++;
      continue;
    }

    // Check if numeric or numeric string
    if (typeof val === 'number' && !isNaN(val)) {
      numberCount++;
      continue;
    }

    if (typeof val === 'string') {
      const cleanVal = val.trim();
      // Test if clean currency or percentage: e.g. "$1,234.56" or "15%"
      const numCandidate = cleanVal.replace(/^[$\u20AC\u00A3\u00A5]/, '').replace(/%$/, '').replace(/,/g, '').trim();
      if (numCandidate !== '' && !isNaN(Number(numCandidate))) {
        numberCount++;
        continue;
      }

      // Test date string
      const parsedDate = Date.parse(cleanVal);
      // Ensure it's not a short number parsed as date (e.g. "123")
      if (!isNaN(parsedDate) && isNaN(Number(cleanVal)) && (cleanVal.includes('-') || cleanVal.includes('/') || cleanVal.includes('.'))) {
        dateCount++;
        continue;
      }

      textCount++;
    } else {
      textCount++;
    }
  }

  if (validCount === 0) return 'category';
  if (dateCount / validCount > 0.6) return 'date';
  if (numberCount / validCount > 0.6) return 'number';
  return 'category';
}

/**
 * Normalizes a cell value based on inferred column type
 */
export function normalizeValue(val, type) {
  if (val === null || val === undefined || val === '') return null;

  if (type === 'number') {
    if (typeof val === 'number') return isNaN(val) ? null : val;
    const cleanStr = String(val).replace(/^[$\u20AC\u00A3\u00A5]/, '').replace(/%$/, '').replace(/,/g, '').trim();
    const num = Number(cleanStr);
    return isNaN(num) ? null : num;
  }

  if (type === 'date') {
    if (val instanceof Date) {
      if (isNaN(val.getTime())) return null;
      const year = val.getFullYear();
      const month = String(val.getMonth() + 1).padStart(2, '0');
      const day = String(val.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(val.trim())) {
      return val.trim();
    }
    const d = new Date(val);
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
    return String(val);
  }

  return String(val).trim();
}

/**
 * Processes an array of row objects into column profiles, stats, and summary
 */
export function processJsonDataset(rawRows, fileName = 'dataset.xlsx') {
  if (!rawRows || rawRows.length === 0) {
    return {
      rawData: [],
      columns: [],
      summary: {
        totalRows: 0,
        totalCols: 0,
        missingValues: 0,
        duplicateCount: 0,
        columnProfiles: []
      },
      fileName
    };
  }

  // Enforce maximum row limit to protect memory
  const rowsToProcess = rawRows.length > MAX_ROW_LIMIT ? rawRows.slice(0, MAX_ROW_LIMIT) : rawRows;

  // Extract distinct column keys from first up to 100 rows, strictly sanitizing
  const colKeySet = new Set();
  const inspectLimit = Math.min(rowsToProcess.length, 100);
  for (let i = 0; i < inspectLimit; i++) {
    const rawKeys = Object.keys(rowsToProcess[i] || {});
    for (let k = 0; k < rawKeys.length; k++) {
      const sanitized = sanitizeColumnName(rawKeys[k]);
      colKeySet.add(sanitized);
    }
  }
  const colKeys = Array.from(colKeySet).filter(Boolean);

  // Compute column types and profiles
  const sampleLimit = Math.min(rowsToProcess.length, 500);
  const columnProfiles = colKeys.map(col => {
    const sampleValues = [];
    for (let i = 0; i < sampleLimit; i++) {
      const row = rowsToProcess[i] || {};
      sampleValues.push(row[col]);
    }
    const type = inferColumnType(sampleValues);
    return {
      name: col,
      originalName: col,
      type
    };
  });

  const typeMap = Object.create(null);
  columnProfiles.forEach(c => { typeMap[c.name] = c.type; });

  // Clean, normalize and profile data
  let totalMissing = 0;
  const colStats = Object.create(null);
  columnProfiles.forEach(c => {
    colStats[c.name] = {
      nullCount: 0,
      uniqueSet: new Set(),
      sum: 0,
      min: Infinity,
      max: -Infinity,
      validNumCount: 0
    };
  });

  const rowSignatures = new Set();
  let duplicateCount = 0;
  const len = rowsToProcess.length;
  const normalizedRows = new Array(len);

  // Check duplicates with hashing - for large datasets (> 20000 rows), sample to stay fast
  const checkDups = len <= 20000;

  for (let r = 0; r < len; r++) {
    const row = rowsToProcess[r] || {};
    const normRow = {};
    let rowSig = '';

    for (let c = 0; c < colKeys.length; c++) {
      const col = colKeys[c];
      const type = typeMap[col];
      const val = normalizeValue(row[col], type);
      
      // Store on clean property (prototype pollution safe)
      if (!DANGEROUS_OBJECT_KEYS.has(col)) {
        normRow[col] = val;
      }

      if (checkDups) {
        rowSig += (val !== null ? String(val) : '__NULL__') + '|#|';
      }

      const stats = colStats[col];
      if (val === null || val === undefined) {
        totalMissing++;
        stats.nullCount++;
      } else {
        if (stats.uniqueSet.size < 250) {
          stats.uniqueSet.add(val);
        }
        if (type === 'number' && typeof val === 'number') {
          stats.sum += val;
          stats.validNumCount++;
          if (val < stats.min) stats.min = val;
          if (val > stats.max) stats.max = val;
        }
      }
    }

    if (checkDups) {
      if (rowSignatures.has(rowSig)) {
        duplicateCount++;
      } else {
        rowSignatures.add(rowSig);
      }
    }

    normalizedRows[r] = normRow;
  }

  // Finalize column profile stats
  const enrichedProfiles = columnProfiles.map(c => {
    const stats = colStats[c.name];
    const avg = stats.validNumCount > 0 ? (stats.sum / stats.validNumCount) : 0;
    return {
      ...c,
      nullCount: stats.nullCount,
      uniqueCount: stats.uniqueSet.size,
      sampleValues: Array.from(stats.uniqueSet).slice(0, 5),
      sum: stats.validNumCount > 0 ? stats.sum : null,
      avg: stats.validNumCount > 0 ? avg : null,
      min: stats.min !== Infinity ? stats.min : null,
      max: stats.max !== -Infinity ? stats.max : null
    };
  });

  const summary = {
    totalRows: normalizedRows.length,
    totalCols: colKeys.length,
    missingValues: totalMissing,
    duplicateCount,
    columnProfiles: enrichedProfiles
  };

  return {
    rawData: normalizedRows,
    columns: enrichedProfiles,
    summary,
    fileName
  };
}

/**
 * Parse an Excel or CSV file with size and row limits
 * @param {File | ArrayBuffer} fileOrBuffer
 * @param {string} fileName
 * @returns {Promise<{ rawData: Array, columns: Array, summary: Object, fileName: string }>}
 */
export async function parseSpreadsheet(fileOrBuffer, fileName = 'dataset.xlsx') {
  let workbook;
  
  if (fileOrBuffer instanceof ArrayBuffer) {
    if (fileOrBuffer.byteLength > MAX_FILE_SIZE_BYTES) {
      throw new Error(`File size (${(fileOrBuffer.byteLength / (1024 * 1024)).toFixed(1)} MB) exceeds the maximum allowed 50 MB limit.`);
    }
    workbook = XLSX.read(fileOrBuffer, {
      type: 'array',
      cellDates: true,
      cellNF: false,
      cellText: false,
      cellStyles: false,
      cellHTML: false,
      sheetRows: MAX_ROW_LIMIT + 1
    });
  } else if (fileOrBuffer instanceof File) {
    if (fileOrBuffer.size > MAX_FILE_SIZE_BYTES) {
      throw new Error(`File size (${(fileOrBuffer.size / (1024 * 1024)).toFixed(1)} MB) exceeds the maximum allowed 50 MB limit.`);
    }
    const arrayBuffer = await fileOrBuffer.arrayBuffer();
    workbook = XLSX.read(arrayBuffer, {
      type: 'array',
      cellDates: true,
      cellNF: false,
      cellText: false,
      cellStyles: false,
      cellHTML: false,
      sheetRows: MAX_ROW_LIMIT + 1
    });
    fileName = fileOrBuffer.name;
  } else {
    throw new Error('Unsupported file format or source.');
  }

  if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
    throw new Error('The uploaded spreadsheet contains no sheets or is corrupted.');
  }

  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  // Convert sheet to JSON array of objects
  const rawRows = XLSX.utils.sheet_to_json(worksheet, {
    defval: null,
    raw: false,
    dateNF: 'yyyy-mm-dd'
  });

  return processJsonDataset(rawRows, fileName);
}
