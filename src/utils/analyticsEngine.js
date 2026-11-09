/**
 * Filters the dataset according to active global filters
 */
export function applyGlobalFilters(data, filters, columnProfiles) {
  if (!data || data.length === 0) return [];
  if (!filters) return data;

  const { search, categoryFilters, dateRangeFilters } = filters;
  const hasSearch = search && search.trim().length > 0;
  const searchLower = hasSearch ? search.trim().toLowerCase() : '';

  const activeCategoryCols = Object.keys(categoryFilters || {}).filter(
    col => Array.isArray(categoryFilters[col]) && categoryFilters[col].length > 0
  );

  const activeDateCols = Object.keys(dateRangeFilters || {}).filter(
    col => dateRangeFilters[col]?.start || dateRangeFilters[col]?.end
  );

  // If no filters are active, return entire data
  if (!hasSearch && activeCategoryCols.length === 0 && activeDateCols.length === 0) {
    return data;
  }

  return data.filter(row => {
    // 1. Text search across all fields
    if (hasSearch) {
      let matched = false;
      for (const key in row) {
        const val = row[key];
        if (val !== null && val !== undefined && String(val).toLowerCase().includes(searchLower)) {
          matched = true;
          break;
        }
      }
      if (!matched) return false;
    }

    // 2. Category filters
    for (const col of activeCategoryCols) {
      const allowed = categoryFilters[col];
      const val = row[col];
      const stringVal = val === null || val === undefined ? '(Blank)' : String(val);
      if (!allowed.includes(stringVal)) {
        return false;
      }
    }

    // 3. Date range filters
    for (const col of activeDateCols) {
      const { start, end } = dateRangeFilters[col];
      const val = row[col];
      if (!val) return false;
      const rowDate = new Date(val).getTime();
      if (isNaN(rowDate)) return false;

      if (start) {
        const startDate = new Date(start).getTime();
        if (rowDate < startDate) return false;
      }
      if (end) {
        const endDate = new Date(end).getTime() + (24 * 60 * 60 * 1000 - 1); // end of that day
        if (rowDate > endDate) return false;
      }
    }

    return true;
  });
}

/**
 * Calculates a single KPI value from the dataset
 */
export function calculateKPI(data, yField, aggregation = 'sum') {
  if (!data || data.length === 0) return 0;
  if (!yField || aggregation === 'count') return data.length;

  let sum = 0;
  let count = 0;
  let min = Infinity;
  let max = -Infinity;

  for (let i = 0; i < data.length; i++) {
    const val = data[i][yField];
    if (typeof val === 'number' && !isNaN(val)) {
      sum += val;
      count++;
      if (val < min) min = val;
      if (val > max) max = val;
    }
  }

  if (count === 0) return 0;

  switch (aggregation) {
    case 'sum':
      return sum;
    case 'avg':
      return sum / count;
    case 'min':
      return min === Infinity ? 0 : min;
    case 'max':
      return max === -Infinity ? 0 : max;
    case 'count':
    default:
      return count;
  }
}

/**
 * Aggregates data for Bar, Line, Area, and Pie charts
 */
export function aggregateData(data, xField, yField, aggregation = 'sum', limit = 15) {
  if (!data || data.length === 0 || !xField) return [];

  const groups = new Map();

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    let key = row[xField];
    if (key === null || key === undefined || key === '') {
      key = '(Blank)';
    } else {
      key = String(key);
    }

    let rawVal = 1;
    if (yField && yField !== xField) {
      const v = row[yField];
      rawVal = typeof v === 'number' && !isNaN(v) ? v : 0;
    }

    let g = groups.get(key);
    if (!g) {
      g = { sum: 0, count: 0, min: Infinity, max: -Infinity };
      groups.set(key, g);
    }

    g.sum += rawVal;
    g.count += 1;
    if (rawVal < g.min) g.min = rawVal;
    if (rawVal > g.max) g.max = rawVal;
  }

  const result = [];
  groups.forEach((g, key) => {
    let finalVal = 0;
    switch (aggregation) {
      case 'sum':
        finalVal = g.sum;
        break;
      case 'avg':
        finalVal = g.count > 0 ? (g.sum / g.count) : 0;
        break;
      case 'min':
        finalVal = g.min !== Infinity ? g.min : 0;
        break;
      case 'max':
        finalVal = g.max !== -Infinity ? g.max : 0;
        break;
      case 'count':
      default:
        finalVal = g.count;
        break;
    }

    result.push({
      name: key,
      value: Math.round(finalVal * 100) / 100,
      count: g.count
    });
  });

  // Check if keys look like dates (chronological sort) or categories (top by value sort)
  const isDateLike = result.length > 0 && !isNaN(Date.parse(result[0].name)) && (result[0].name.includes('-') || result[0].name.includes('/'));

  if (isDateLike) {
    result.sort((a, b) => new Date(a.name) - new Date(b.name));
  } else {
    // Sort descending by value
    result.sort((a, b) => b.value - a.value);
  }

  if (limit && result.length > limit) {
    if (isDateLike) {
      // For dates, take chronological step sampling if very large
      return result.slice(0, limit);
    } else {
      const top = result.slice(0, limit);
      const otherValue = result.slice(limit).reduce((acc, curr) => acc + curr.value, 0);
      if (otherValue > 0) {
        top.push({
          name: 'Other',
          value: Math.round(otherValue * 100) / 100,
          count: result.slice(limit).reduce((acc, curr) => acc + curr.count, 0)
        });
      }
      return top;
    }
  }

  return result;
}

/**
 * Builds histogram bins for a numeric column
 */
export function buildHistogramData(data, field, numBins = 10) {
  if (!data || data.length === 0 || !field) return [];

  const values = [];
  for (let i = 0; i < data.length; i++) {
    const val = data[i][field];
    if (typeof val === 'number' && !isNaN(val)) {
      values.push(val);
    }
  }

  if (values.length === 0) return [];

  let min = Math.min(...values);
  let max = Math.max(...values);

  if (min === max) {
    return [{ name: `${min}`, count: values.length, range: [min, max] }];
  }

  const step = (max - min) / numBins;
  const bins = Array.from({ length: numBins }, (_, idx) => {
    const bStart = min + idx * step;
    const bEnd = idx === numBins - 1 ? max : min + (idx + 1) * step;
    return {
      name: `${Math.round(bStart * 10) / 10} - ${Math.round(bEnd * 10) / 10}`,
      start: bStart,
      end: bEnd,
      count: 0
    };
  });

  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    let placed = false;
    for (let b = 0; b < bins.length; b++) {
      if (v >= bins[b].start && (b === bins.length - 1 ? v <= bins[b].end : v < bins[b].end)) {
        bins[b].count++;
        placed = true;
        break;
      }
    }
    if (!placed) {
      bins[bins.length - 1].count++;
    }
  }

  return bins.map(b => ({
    name: b.name,
    value: b.count,
    count: b.count
  }));
}

/**
 * Prepares scatter plot points with optional downsampling for 60fps rendering
 */
export function buildScatterData(data, xField, yField, maxPoints = 1500) {
  if (!data || data.length === 0 || !xField || !yField) return [];

  const points = [];
  const step = data.length > maxPoints ? Math.ceil(data.length / maxPoints) : 1;

  for (let i = 0; i < data.length; i += step) {
    const row = data[i];
    const x = row[xField];
    const y = row[yField];
    if (typeof x === 'number' && !isNaN(x) && typeof y === 'number' && !isNaN(y)) {
      points.push({
        x: Math.round(x * 100) / 100,
        y: Math.round(y * 100) / 100,
        tooltip: `${xField}: ${x}, ${yField}: ${y}`
      });
    }
  }

  return points;
}
