/**
 * Generates an automatic starter dashboard configuration based on dataset columns
 */
export function generateStarterDashboard(columns, totalRows) {
  const numCols = columns.filter(c => c.type === 'number');
  const catCols = columns.filter(c => c.type === 'category');
  const dateCols = columns.filter(c => c.type === 'date');

  const tiles = [];
  let tileIdCounter = 1;

  // Select key columns
  // Try to pick numeric columns that look like revenue/amount/total/sales or highest variance
  const primaryNum = numCols.find(c => /sale|rev|amount|total|price|cost|profit|spend|qty|unit/i.test(c.name)) || numCols[0];
  const secondaryNum = numCols.find(c => c.name !== primaryNum?.name) || (numCols.length > 1 ? numCols[1] : null);

  // Try to pick category columns that look like region/category/type/department/product
  const primaryCat = catCols.find(c => /cat|type|region|segment|department|status|product|group/i.test(c.name)) || catCols[0];
  const secondaryCat = catCols.find(c => c.name !== primaryCat?.name) || (catCols.length > 1 ? catCols[1] : null);

  const primaryDate = dateCols[0];

  // 1. KPI Cards (4 cards)
  if (primaryNum) {
    tiles.push({
      id: `tile-kpi-${tileIdCounter++}`,
      type: 'kpi',
      title: `Total ${primaryNum.name}`,
      yField: primaryNum.name,
      aggregation: 'sum',
      w: 1,
      color: '#026fc7',
      kpiSubtitle: 'Sum of all records'
    });

    tiles.push({
      id: `tile-kpi-${tileIdCounter++}`,
      type: 'kpi',
      title: `Avg ${primaryNum.name}`,
      yField: primaryNum.name,
      aggregation: 'avg',
      w: 1,
      color: '#0891b2',
      kpiSubtitle: 'Mean average value'
    });

    tiles.push({
      id: `tile-kpi-${tileIdCounter++}`,
      type: 'kpi',
      title: `Max ${primaryNum.name}`,
      yField: primaryNum.name,
      aggregation: 'max',
      w: 1,
      color: '#7c3aed',
      kpiSubtitle: 'Peak single record'
    });

    if (secondaryNum) {
      tiles.push({
        id: `tile-kpi-${tileIdCounter++}`,
        type: 'kpi',
        title: `Avg ${secondaryNum.name}`,
        yField: secondaryNum.name,
        aggregation: 'avg',
        w: 1,
        color: '#10b981',
        kpiSubtitle: 'Mean average value'
      });
    } else {
      tiles.push({
        id: `tile-kpi-${tileIdCounter++}`,
        type: 'kpi',
        title: `Min ${primaryNum.name}`,
        yField: primaryNum.name,
        aggregation: 'min',
        w: 1,
        color: '#10b981',
        kpiSubtitle: 'Lowest recorded value'
      });
    }
  } else {
    // Only text columns available
    tiles.push({
      id: `tile-kpi-${tileIdCounter++}`,
      type: 'kpi',
      title: 'Total Records',
      yField: primaryCat?.name,
      aggregation: 'count',
      w: 1,
      color: '#026fc7',
      kpiSubtitle: 'Total rows in dataset'
    });

    if (primaryCat) {
      tiles.push({
        id: `tile-kpi-${tileIdCounter++}`,
        type: 'kpi',
        title: `Distinct ${primaryCat.name}`,
        yField: primaryCat.name,
        aggregation: 'count',
        w: 1,
        color: '#0891b2',
        kpiSubtitle: `${primaryCat.uniqueCount} unique categories`
      });
    }

    if (secondaryCat) {
      tiles.push({
        id: `tile-kpi-${tileIdCounter++}`,
        type: 'kpi',
        title: `Distinct ${secondaryCat.name}`,
        yField: secondaryCat.name,
        aggregation: 'count',
        w: 1,
        color: '#7c3aed',
        kpiSubtitle: `${secondaryCat.uniqueCount} unique categories`
      });
    }

    tiles.push({
      id: `tile-kpi-${tileIdCounter++}`,
      type: 'kpi',
      title: 'Analyzed Columns',
      yField: null,
      aggregation: 'count',
      w: 1,
      color: '#10b981',
      kpiSubtitle: `${columns.length} columns detected`
    });
  }

  // 2. Bar Chart: Primary Category vs Primary Metric
  if (primaryCat) {
    tiles.push({
      id: `tile-chart-${tileIdCounter++}`,
      type: 'bar',
      title: primaryNum ? `${primaryNum.name} by ${primaryCat.name}` : `Distribution of ${primaryCat.name}`,
      xField: primaryCat.name,
      yField: primaryNum ? primaryNum.name : primaryCat.name,
      aggregation: primaryNum ? 'sum' : 'count',
      w: 2,
      color: '#026fc7'
    });
  }

  // 3. Line or Area Chart: Date trend (if date exists) or secondary category
  if (primaryDate && primaryNum) {
    tiles.push({
      id: `tile-chart-${tileIdCounter++}`,
      type: 'line',
      title: `${primaryNum.name} Trend over Time`,
      xField: primaryDate.name,
      yField: primaryNum.name,
      aggregation: 'sum',
      w: 2,
      color: '#0891b2'
    });
  } else if (secondaryCat) {
    tiles.push({
      id: `tile-chart-${tileIdCounter++}`,
      type: 'bar',
      title: primaryNum ? `${primaryNum.name} by ${secondaryCat.name}` : `Count of ${secondaryCat.name}`,
      xField: secondaryCat.name,
      yField: primaryNum ? primaryNum.name : secondaryCat.name,
      aggregation: primaryNum ? 'avg' : 'count',
      w: 2,
      color: '#0891b2'
    });
  }

  // 4. Pie / Donut Chart: Proportions
  const pieCatCandidate = catCols.find(c => c.uniqueCount >= 2 && c.uniqueCount <= 10) || primaryCat;
  if (pieCatCandidate) {
    tiles.push({
      id: `tile-chart-${tileIdCounter++}`,
      type: 'donut',
      title: `${pieCatCandidate.name} Share`,
      xField: pieCatCandidate.name,
      yField: primaryNum ? primaryNum.name : pieCatCandidate.name,
      aggregation: primaryNum ? 'sum' : 'count',
      w: 2,
      color: '#7c3aed'
    });
  }

  // 5. Scatter Plot or Histogram
  if (primaryNum && secondaryNum) {
    tiles.push({
      id: `tile-chart-${tileIdCounter++}`,
      type: 'scatter',
      title: `Correlation: ${primaryNum.name} vs ${secondaryNum.name}`,
      xField: primaryNum.name,
      yField: secondaryNum.name,
      aggregation: 'none',
      w: 2,
      color: '#f59e0b'
    });
  } else if (primaryNum) {
    tiles.push({
      id: `tile-chart-${tileIdCounter++}`,
      type: 'histogram',
      title: `Distribution of ${primaryNum.name}`,
      xField: primaryNum.name,
      yField: primaryNum.name,
      aggregation: 'count',
      w: 2,
      color: '#10b981'
    });
  }

  // If we have an extra numeric column and didn't use histogram, add histogram
  if (primaryNum && secondaryNum) {
    tiles.push({
      id: `tile-chart-${tileIdCounter++}`,
      type: 'histogram',
      title: `Frequency Distribution of ${primaryNum.name}`,
      xField: primaryNum.name,
      yField: primaryNum.name,
      aggregation: 'count',
      w: 2,
      color: '#ec4899'
    });
  }

  return tiles;
}
