/**
 * Metrica Smart Schema Detection Engine
 *
 * Infers semantic business roles:
 * - 'dimension': Categorical grouping attributes (e.g. Region, Product, Status)
 * - 'measure': Quantitative numeric metrics for aggregation (e.g. Revenue, Cost, Qty)
 * - 'datetime': Date, timestamp, and period fields
 * - 'id_key': Primary and Foreign entity identifiers
 *
 * Also detects Primary Key candidates and inter-sheet Foreign Key relationships.
 */

const ID_NAME_PATTERNS = /(?:^|_)(?:id|key|code|sku|uuid|pk|fk|num|number|ref|reference|no)(?:$|_)/i;
const MEASURE_NAME_PATTERNS = /(?:sale|revenue|cost|price|amount|profit|margin|spend|budget|qty|quantity|count|score|rating|discount|weight|tax|fee|rate|total|val|value)/i;

/**
 * Detects semantic roles for each column in a dataset
 * @param {Array<Object>} data 
 * @param {Array<Object>} columns 
 * @returns {Record<string, { role: 'dimension'|'measure'|'datetime'|'id_key', isPrimaryKey: boolean, uniqueCount: number, nullCount: number, confidence: number }>}
 */
export function detectColumnRoles(data, columns) {
  if (!Array.isArray(columns) || !Array.isArray(data)) return {};

  const totalRows = data.length;
  const roleMap = {};

  for (const col of columns) {
    const colName = col.name;
    const type = col.type || 'category';
    const values = data.map(r => r ? r[colName] : undefined);
    
    let nullCount = 0;
    const uniqueSet = new Set();
    
    for (let i = 0; i < values.length; i++) {
      const v = values[i];
      if (v === null || v === undefined || v === '') {
        nullCount++;
      } else {
        uniqueSet.add(v);
      }
    }

    const uniqueCount = uniqueSet.size;
    const nonNullCount = totalRows - nullCount;
    const uniquenessRatio = nonNullCount > 0 ? uniqueCount / nonNullCount : 0;
    const isNamedLikeId = ID_NAME_PATTERNS.test(colName);
    const isNamedLikeMeasure = MEASURE_NAME_PATTERNS.test(colName);

    let role = 'dimension';
    let isPrimaryKey = false;
    let confidence = 0.8;

    // 1. Check Date / Time
    if (type === 'date') {
      role = 'datetime';
      confidence = 0.95;
    }
    // 2. Check ID / Key
    else if (isNamedLikeId || (uniquenessRatio > 0.95 && type !== 'number')) {
      role = 'id_key';
      confidence = 0.9;
      // Primary Key candidate: 100% unique and 0 missing values
      if (totalRows > 0 && nullCount === 0 && uniqueCount === totalRows) {
        isPrimaryKey = true;
        confidence = 0.98;
      }
    }
    // 3. Check Numeric Measure vs Numeric ID
    else if (type === 'number') {
      if (isNamedLikeId && uniqueCount === totalRows && nullCount === 0) {
        role = 'id_key';
        isPrimaryKey = true;
        confidence = 0.9;
      } else {
        role = 'measure';
        confidence = isNamedLikeMeasure ? 0.95 : 0.85;
      }
    }
    // 4. Default Categorical Dimension
    else {
      role = 'dimension';
      confidence = 0.85;
    }

    roleMap[colName] = {
      role,
      isPrimaryKey,
      uniqueCount,
      nullCount,
      confidence
    };
  }

  return roleMap;
}

/**
 * Detects relationships across multiple sheets or tables
 * @param {Array<{ name: string, data: Array<Object>, columns: Array<Object> }>} sheets
 * @returns {Array<{ fromTable: string, fromColumn: string, toTable: string, toColumn: string, type: 'one_to_many'|'many_to_one'|'one_to_one' }>}
 */
export function detectKeyRelationships(sheets) {
  if (!Array.isArray(sheets) || sheets.length < 2) return [];

  const relationships = [];

  for (let i = 0; i < sheets.length; i++) {
    for (let j = 0; j < sheets.length; j++) {
      if (i === j) continue;

      const sheetA = sheets[i];
      const sheetB = sheets[j];
      const rolesA = detectColumnRoles(sheetA.data, sheetA.columns);
      const rolesB = detectColumnRoles(sheetB.data, sheetB.columns);

      for (const colA of sheetA.columns) {
        for (const colB of sheetB.columns) {
          // Check matching column name or foreign key name convention
          const sameName = colA.name.toLowerCase() === colB.name.toLowerCase();
          const isFkPattern = colA.name.toLowerCase().endsWith('_id') && colB.name.toLowerCase().endsWith('_id');

          if (sameName || isFkPattern) {
            const roleInfoA = rolesA[colA.name];
            const roleInfoB = rolesB[colB.name];

            if (roleInfoA?.role === 'id_key' || roleInfoB?.role === 'id_key') {
              // Extract non-null unique values
              const setA = new Set(sheetA.data.map(r => r[colA.name]).filter(v => v !== null && v !== undefined));
              const setB = new Set(sheetB.data.map(r => r[colB.name]).filter(v => v !== null && v !== undefined));

              let intersection = 0;
              for (const val of setA) {
                if (setB.has(val)) intersection++;
              }

              // Overlap check
              if (setA.size > 0 && intersection / setA.size >= 0.5) {
                let relType = 'many_to_one';
                if (roleInfoA?.isPrimaryKey && !roleInfoB?.isPrimaryKey) {
                  relType = 'one_to_many';
                } else if (!roleInfoA?.isPrimaryKey && roleInfoB?.isPrimaryKey) {
                  relType = 'many_to_one';
                } else if (roleInfoA?.isPrimaryKey && roleInfoB?.isPrimaryKey) {
                  relType = 'one_to_one';
                }

                relationships.push({
                  fromTable: sheetA.name,
                  fromColumn: colA.name,
                  toTable: sheetB.name,
                  toColumn: colB.name,
                  type: relType
                });
              }
            }
          }
        }
      }
    }
  }

  // Deduplicate symmetrical relationships
  const uniqueKeys = new Set();
  return relationships.filter(rel => {
    const key = [rel.fromTable, rel.fromColumn, rel.toTable, rel.toColumn].sort().join('::');
    if (uniqueKeys.has(key)) return false;
    uniqueKeys.add(key);
    return true;
  });
}

/**
 * Generates human-readable assumptions about detected schema, roles, and candidate keys
 * @param {Array<Object>} data 
 * @param {Array<Object>} columns 
 * @returns {Array<string>}
 */
export function generateSchemaAssumptions(data, columns) {
  if (!Array.isArray(columns) || !Array.isArray(data) || data.length === 0) return [];

  const roles = detectColumnRoles(data, columns);
  const assumptions = [];

  for (const col of columns) {
    const info = roles[col.name];
    if (!info) continue;

    if (info.isPrimaryKey) {
      assumptions.push(`Assumed "${col.name}" is a Primary Key candidate because all ${info.uniqueCount} values are unique and non-null.`);
    } else if (info.role === 'measure') {
      assumptions.push(`Assumed "${col.name}" is a quantitative Measure suitable for sum/avg aggregation.`);
    } else if (info.role === 'datetime') {
      assumptions.push(`Assumed "${col.name}" represents temporal data for timeline analysis.`);
    } else if (info.role === 'dimension') {
      assumptions.push(`Assumed "${col.name}" is a categorical Dimension with ${info.uniqueCount} distinct groups.`);
    } else if (info.role === 'id_key') {
      assumptions.push(`Assumed "${col.name}" is an Identifier field based on naming convention.`);
    }
  }

  return assumptions;
}
