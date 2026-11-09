/**
 * Metrica Data Quality Engine
 *
 * Performs deterministic automated data quality audits:
 * - Missing values profiling
 * - Duplicate rows detection
 * - Interquartile Range (IQR) statistical outlier detection
 * - Inconsistent text normalization & fuzzy matching (e.g. "Delhi" vs "delhi " vs "Dehli")
 * - Suspicious values detection (negative quantities, extreme future dates, zero variance)
 * - Quality score computation & actionable one-click cleaning fixes
 */

/**
 * Computes percentile from a sorted numeric array using linear interpolation
 */
function getPercentile(sortedArr, p) {
  if (sortedArr.length === 0) return 0;
  if (sortedArr.length === 1) return sortedArr[0];
  const index = (sortedArr.length - 1) * p;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;
  return sortedArr[lower] * (1 - weight) + sortedArr[upper] * weight;
}

/**
 * Detects outliers using the standard Interquartile Range (IQR) method
 * @param {Array<number>} numbers 
 * @returns {{ outliers: Array<number>, lowerBound: number, upperBound: number, q1: number, q3: number, iqr: number }}
 */
export function detectOutliersIQR(numbers) {
  const validNums = numbers
    .map(n => typeof n === 'number' ? n : Number(n))
    .filter(n => typeof n === 'number' && !isNaN(n) && isFinite(n))
    .sort((a, b) => a - b);

  if (validNums.length < 4) {
    return {
      outliers: [],
      lowerBound: validNums[0] || 0,
      upperBound: validNums[validNums.length - 1] || 0,
      q1: validNums[0] || 0,
      q3: validNums[validNums.length - 1] || 0,
      iqr: 0
    };
  }

  const q1 = getPercentile(validNums, 0.25);
  const q3 = getPercentile(validNums, 0.75);
  const iqr = q3 - q1;
  const lowerBound = q1 - 1.5 * iqr;
  const upperBound = q3 + 1.5 * iqr;

  const outliers = validNums.filter(n => n < lowerBound || n > upperBound);

  return {
    outliers,
    lowerBound,
    upperBound,
    q1,
    q3,
    iqr
  };
}

/**
 * Computes Levenshtein edit distance between two strings
 */
function levenshteinDistance(a, b) {
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,      // deletion
        dp[i][j - 1] + 1,      // insertion
        dp[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return dp[m][n];
}

/**
 * Detects inconsistent text values using normalization and fuzzy matching
 * @param {Array<string>} textValues 
 * @returns {Array<{ canonical: string, variants: Array<string>, count: number }>}
 */
export function detectInconsistentTextValues(textValues) {
  if (!Array.isArray(textValues) || textValues.length === 0) return [];

  // Count frequencies of raw text values
  const freqMap = new Map();
  for (const raw of textValues) {
    if (raw === null || raw === undefined) continue;
    const s = String(raw);
    freqMap.set(s, (freqMap.get(s) || 0) + 1);
  }

  const uniqueStrings = Array.from(freqMap.keys());
  const visited = new Set();
  const clusters = [];

  for (let i = 0; i < uniqueStrings.length; i++) {
    const strA = uniqueStrings[i];
    if (visited.has(strA)) continue;

    const normA = strA.trim().toLowerCase().replace(/\s+/g, ' ');
    const clusterVariants = [strA];
    visited.add(strA);

    for (let j = i + 1; j < uniqueStrings.length; j++) {
      const strB = uniqueStrings[j];
      if (visited.has(strB)) continue;

      const normB = strB.trim().toLowerCase().replace(/\s+/g, ' ');

      // Exact normalized match (e.g. "Delhi" vs "delhi ")
      if (normA === normB) {
        clusterVariants.push(strB);
        visited.add(strB);
        continue;
      }

      // Fuzzy match for short/medium strings (Levenshtein distance <= 2 for words >= 4 chars)
      if (normA.length >= 4 && normB.length >= 4) {
        const dist = levenshteinDistance(normA, normB);
        const maxLen = Math.max(normA.length, normB.length);
        const similarity = 1 - dist / maxLen;

        if (dist <= 2 || similarity >= 0.8) {
          clusterVariants.push(strB);
          visited.add(strB);
        }
      }
    }

    if (clusterVariants.length > 1) {
      // Pick the most frequent variant as canonical
      clusterVariants.sort((a, b) => (freqMap.get(b) || 0) - (freqMap.get(a) || 0));
      clusters.push({
        canonical: clusterVariants[0],
        variants: clusterVariants.slice(1),
        count: clusterVariants.reduce((sum, v) => sum + (freqMap.get(v) || 0), 0)
      });
    }
  }

  return clusters;
}

/**
 * Detects suspicious values (negative quantities, extreme future dates, zero-variance columns)
 * @param {Array<Object>} data 
 * @param {Array<Object>} columns 
 * @returns {Array<{ column: string, reason: string, severity: 'high'|'medium'|'low', count: number }>}
 */
export function detectSuspiciousValues(data, columns) {
  if (!Array.isArray(data) || !Array.isArray(columns) || data.length === 0) return [];

  const suspicious = [];
  const currentYear = new Date().getFullYear();

  for (const col of columns) {
    const colName = col.name;

    // 1. Negative numbers in quantity/count/amount
    if (col.type === 'number') {
      const isCountOrQty = /qty|quantity|count|unit|item|order|num/i.test(colName);
      if (isCountOrQty) {
        let negCount = 0;
        for (let i = 0; i < data.length; i++) {
          const v = data[i]?.[colName];
          if (typeof v === 'number' && v < 0) negCount++;
        }
        if (negCount > 0) {
          suspicious.push({
            column: colName,
            reason: `Negative values (${negCount} rows) detected in non-negative quantity field.`,
            severity: 'high',
            count: negCount
          });
        }
      }
    }

    // 2. Extreme future dates (> 5 years from current year)
    if (col.type === 'date') {
      let futureCount = 0;
      for (let i = 0; i < data.length; i++) {
        const d = data[i]?.[colName];
        if (d) {
          const yr = new Date(d).getFullYear();
          if (yr > currentYear + 5) futureCount++;
        }
      }
      if (futureCount > 0) {
        suspicious.push({
          column: colName,
          reason: `Future dates (${futureCount} rows > year ${currentYear + 5}) detected.`,
          severity: 'medium',
          count: futureCount
        });
      }
    }

    // 3. Zero-variance / constant column
    const uniqueSet = new Set(data.map(r => r?.[colName]).filter(v => v !== null && v !== undefined && v !== ''));
    if (uniqueSet.size === 1 && data.length > 5) {
      suspicious.push({
        column: colName,
        reason: `Zero variance: Column has the same constant value across all rows.`,
        severity: 'low',
        count: data.length
      });
    }
  }

  return suspicious;
}

/**
 * Runs a comprehensive Data Quality Audit over the dataset
 * @param {Array<Object>} data 
 * @param {Array<Object>} columns 
 * @returns {{ qualityScore: number, issues: Array<Object>, summary: Object }}
 */
export function auditDataQuality(data, columns) {
  if (!Array.isArray(data) || !Array.isArray(columns) || data.length === 0) {
    return { qualityScore: 100, issues: [], summary: { totalRows: 0, issueCount: 0 } };
  }

  const issues = [];
  const totalRows = data.length;
  let penalty = 0;

  // 1. Missing Values
  for (const col of columns) {
    let missing = 0;
    for (let r = 0; r < totalRows; r++) {
      const v = data[r]?.[col.name];
      if (v === null || v === undefined || v === '') missing++;
    }
    if (missing > 0) {
      const pct = (missing / totalRows) * 100;
      const severity = pct > 20 ? 'high' : pct > 5 ? 'medium' : 'low';
      penalty += severity === 'high' ? 15 : severity === 'medium' ? 8 : 3;

      issues.push({
        id: `missing-${col.name}`,
        type: 'missing_values',
        column: col.name,
        title: `Missing values in "${col.name}"`,
        description: `${missing} empty cells (${pct.toFixed(1)}% of rows).`,
        severity,
        count: missing,
        recommendedFix: {
          action: 'drop_empty_rows',
          column: col.name,
          label: `Drop rows where "${col.name}" is empty`
        }
      });
    }
  }

  // 2. Duplicate Rows
  const sigMap = new Map();
  let duplicateCount = 0;
  for (let r = 0; r < totalRows; r++) {
    const sig = JSON.stringify(data[r]);
    const count = sigMap.get(sig) || 0;
    if (count > 0) duplicateCount++;
    sigMap.set(sig, count + 1);
  }

  if (duplicateCount > 0) {
    const dupPct = (duplicateCount / totalRows) * 100;
    const severity = dupPct > 10 ? 'high' : 'medium';
    penalty += severity === 'high' ? 20 : 10;

    issues.push({
      id: 'duplicates-dataset',
      type: 'duplicate_rows',
      column: null,
      title: 'Duplicate rows detected',
      description: `${duplicateCount} duplicate rows found across identical attributes.`,
      severity,
      count: duplicateCount,
      recommendedFix: {
        action: 'deduplicate',
        label: 'Deduplicate dataset (keep first occurrence)'
      }
    });
  }

  // 3. Outliers (IQR)
  for (const col of columns) {
    if (col.type === 'number') {
      const vals = data.map(r => r?.[col.name]);
      const iqrRes = detectOutliersIQR(vals);
      if (iqrRes.outliers.length > 0) {
        const severity = iqrRes.outliers.length > 10 ? 'high' : 'medium';
        penalty += severity === 'high' ? 10 : 5;

        issues.push({
          id: `outliers-${col.name}`,
          type: 'outliers',
          column: col.name,
          title: `Statistical outliers in "${col.name}" (IQR)`,
          description: `${iqrRes.outliers.length} values outside [${iqrRes.lowerBound.toFixed(1)}, ${iqrRes.upperBound.toFixed(1)}].`,
          severity,
          count: iqrRes.outliers.length,
          metadata: iqrRes,
          recommendedFix: {
            action: 'cap_outliers',
            column: col.name,
            label: `Cap outliers to IQR threshold [${iqrRes.lowerBound.toFixed(0)}, ${iqrRes.upperBound.toFixed(0)}]`
          }
        });
      }
    }
  }

  // 4. Inconsistent Text & Fuzzy Matches
  for (const col of columns) {
    if (col.type === 'category') {
      const vals = data.map(r => r?.[col.name]);
      const clusters = detectInconsistentTextValues(vals);
      for (const cluster of clusters) {
        penalty += 5;
        issues.push({
          id: `fuzzy-${col.name}-${cluster.canonical}`,
          type: 'inconsistent_values',
          column: col.name,
          title: `Inconsistent values for "${cluster.canonical}" in "${col.name}"`,
          description: `Variants: ${cluster.variants.join(', ')} (${cluster.count} occurrences).`,
          severity: 'medium',
          count: cluster.count,
          metadata: cluster,
          recommendedFix: {
            action: 'standardize_fuzzy',
            column: col.name,
            canonical: cluster.canonical,
            variants: cluster.variants,
            label: `Standardize variants to "${cluster.canonical}"`
          }
        });
      }
    }
  }

  // 5. Suspicious Values
  const suspicious = detectSuspiciousValues(data, columns);
  for (const sus of suspicious) {
    penalty += sus.severity === 'high' ? 12 : 5;
    issues.push({
      id: `suspicious-${sus.column}-${sus.severity}`,
      type: 'suspicious_value',
      column: sus.column,
      title: `Suspicious data in "${sus.column}"`,
      description: sus.reason,
      severity: sus.severity,
      count: sus.count,
      recommendedFix: {
        action: 'clean_suspicious',
        column: sus.column,
        label: `Review and sanitize suspicious rows in "${sus.column}"`
      }
    });
  }

  const qualityScore = Math.max(0, Math.min(100, Math.round(100 - penalty)));

  return {
    qualityScore,
    issues,
    summary: {
      totalRows,
      issueCount: issues.length,
      highSeverityCount: issues.filter(i => i.severity === 'high').length,
      mediumSeverityCount: issues.filter(i => i.severity === 'medium').length,
      lowSeverityCount: issues.filter(i => i.severity === 'low').length
    }
  };
}
