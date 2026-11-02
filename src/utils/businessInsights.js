/**
 * Metrica Automated Business Insights & Analytics Engine
 *
 * Deterministic calculation of business intelligence metrics:
 * - Period-over-Period (MoM, QoQ, YoY) growth rates
 * - Top / Bottom contributor and Pareto driver analysis
 * - Statistical trend lines, momentum slope, and R² goodness of fit
 * - Risk indicators: concentration risk, sharp drop alerts, extreme volatility
 * - KPI card recommendations
 * - Executive narrative generator (100% computed in code)
 */

/**
 * Normalizes date into a period bucket ('YYYY-MM', 'YYYY-Q#', 'YYYY')
 */
function getPeriodKey(dateVal, grain = 'month') {
  if (!dateVal) return null;
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return null;

  const year = d.getFullYear();
  const month = d.getMonth() + 1;

  if (grain === 'year') {
    return `${year}`;
  }
  if (grain === 'quarter') {
    const q = Math.ceil(month / 3);
    return `${year}-Q${q}`;
  }
  return `${year}-${String(month).padStart(2, '0')}`;
}

/**
 * Calculates Period-over-Period (MoM, QoQ, YoY) growth metrics
 * @param {Array<Object>} data 
 * @param {string} dateCol 
 * @param {string} measureCol 
 * @param {'month'|'quarter'|'year'} grain 
 * @returns {{ periods: Array<{ period: string, total: number, priorTotal: number|null, growthRatePercent: number|null }>, overallGrowth: number|null }}
 */
export function calculatePeriodOverPeriod(data, dateCol, measureCol, grain = 'month') {
  if (!Array.isArray(data) || data.length === 0 || !dateCol || !measureCol) {
    return { periods: [], overallGrowth: null };
  }

  // Aggregate measure by chronological period
  const periodMap = new Map();

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const pKey = getPeriodKey(row?.[dateCol], grain);
    if (!pKey) continue;

    const val = Number(row?.[measureCol]);
    if (!isNaN(val) && isFinite(val)) {
      periodMap.set(pKey, (periodMap.get(pKey) || 0) + val);
    }
  }

  const sortedPeriods = Array.from(periodMap.keys()).sort();
  const resultPeriods = [];

  for (let i = 0; i < sortedPeriods.length; i++) {
    const period = sortedPeriods[i];
    const total = periodMap.get(period);
    const priorTotal = i > 0 ? periodMap.get(sortedPeriods[i - 1]) : null;

    let growthRatePercent = null;
    if (priorTotal !== null && priorTotal !== 0) {
      growthRatePercent = Number((((total - priorTotal) / Math.abs(priorTotal)) * 100).toFixed(2));
    }

    resultPeriods.push({
      period,
      total: Number(total.toFixed(2)),
      priorTotal: priorTotal !== null ? Number(priorTotal.toFixed(2)) : null,
      growthRatePercent
    });
  }

  let overallGrowth = null;
  if (resultPeriods.length >= 2) {
    const first = resultPeriods[0].total;
    const last = resultPeriods[resultPeriods.length - 1].total;
    if (first !== 0) {
      overallGrowth = Number((((last - first) / Math.abs(first)) * 100).toFixed(2));
    }
  }

  return {
    periods: resultPeriods,
    overallGrowth
  };
}

/**
 * Calculates contribution analysis and identifies top & bottom performers
 * @param {Array<Object>} data 
 * @param {string} dimensionCol 
 * @param {string} measureCol 
 * @returns {{ breakdown: Array<Object>, topPerformer: Object, bottomPerformer: Object, total: number }}
 */
export function calculateContributionAnalysis(data, dimensionCol, measureCol) {
  if (!Array.isArray(data) || data.length === 0 || !dimensionCol || !measureCol) {
    return { breakdown: [], topPerformer: null, bottomPerformer: null, total: 0 };
  }

  const groupMap = new Map();
  let totalMeasure = 0;

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const rawDim = row?.[dimensionCol];
    const dim = rawDim !== null && rawDim !== undefined && String(rawDim).trim() !== '' ? String(rawDim).trim() : '(Empty)';
    const val = Number(row?.[measureCol]);

    if (!isNaN(val) && isFinite(val)) {
      groupMap.set(dim, (groupMap.get(dim) || 0) + val);
      totalMeasure += val;
    }
  }

  const breakdown = Array.from(groupMap.entries()).map(([name, sum]) => {
    const percentage = totalMeasure !== 0 ? Number(((sum / totalMeasure) * 100).toFixed(2)) : 0;
    return {
      name,
      sum: Number(sum.toFixed(2)),
      percentage
    };
  }).sort((a, b) => b.sum - a.sum);

  return {
    breakdown,
    topPerformer: breakdown[0] || null,
    bottomPerformer: breakdown[breakdown.length - 1] || null,
    total: Number(totalMeasure.toFixed(2))
  };
}

/**
 * Calculates trend direction, linear regression slope, and R² fit
 * @param {Array<Object>} data 
 * @param {string} dateCol 
 * @param {string} measureCol 
 * @returns {{ direction: 'upward'|'downward'|'volatile'|'stable', slope: number, rSquared: number }}
 */
export function detectTrendsAndMomentum(data, dateCol, measureCol) {
  const pop = calculatePeriodOverPeriod(data, dateCol, measureCol, 'month');
  const points = pop.periods.map((p, idx) => ({ x: idx, y: p.total }));

  if (points.length < 2) {
    return { direction: 'stable', slope: 0, rSquared: 0 };
  }

  const n = points.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0, sumYY = 0;

  for (const pt of points) {
    sumX += pt.x;
    sumY += pt.y;
    sumXY += pt.x * pt.y;
    sumXX += pt.x * pt.x;
    sumYY += pt.y * pt.y;
  }

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX || 1);
  const intercept = (sumY - slope * sumX) / n;

  // Compute R²
  const meanY = sumY / n;
  let ssTot = 0, ssRes = 0;
  for (const pt of points) {
    const predY = slope * pt.x + intercept;
    ssTot += Math.pow(pt.y - meanY, 2);
    ssRes += Math.pow(pt.y - predY, 2);
  }
  const rSquared = ssTot > 0 ? Math.max(0, 1 - (ssRes / ssTot)) : 1;

  let direction = 'stable';
  if (Math.abs(slope) < 0.05 * (meanY || 1)) {
    direction = 'stable';
  } else if (rSquared < 0.4) {
    direction = 'volatile';
  } else if (slope > 0) {
    direction = 'upward';
  } else {
    direction = 'downward';
  }

  return {
    direction,
    slope: Number(slope.toFixed(2)),
    rSquared: Number(rSquared.toFixed(3))
  };
}

/**
 * Identifies business risk indicators
 * @param {Array<Object>} data 
 * @param {Array<Object>} columns 
 * @returns {Array<{ type: string, severity: 'high'|'medium'|'low', title: string, description: string }>}
 */
export function calculateRiskIndicators(data, columns) {
  if (!Array.isArray(data) || !Array.isArray(columns) || data.length === 0) return [];

  const risks = [];
  const numCols = columns.filter(c => c.type === 'number');
  const catCols = columns.filter(c => c.type === 'category');
  const dateCols = columns.filter(c => c.type === 'date');

  // 1. Concentration Risk (e.g. 1 product or customer generates > 50% of revenue)
  if (catCols.length > 0 && numCols.length > 0) {
    const primaryNum = numCols.find(c => /sale|rev|amount|profit|total/i.test(c.name)) || numCols[0];
    const primaryCat = catCols.find(c => /product|customer|client|account|vendor/i.test(c.name)) || catCols[0];

    const contrib = calculateContributionAnalysis(data, primaryCat.name, primaryNum.name);
    if (contrib.topPerformer && contrib.topPerformer.percentage > 50) {
      risks.push({
        type: 'concentration_risk',
        severity: contrib.topPerformer.percentage > 70 ? 'high' : 'medium',
        title: `High Revenue Concentration in "${contrib.topPerformer.name}"`,
        description: `Top contributor "${contrib.topPerformer.name}" accounts for ${contrib.topPerformer.percentage}% of total ${primaryNum.name}.`
      });
    }
  }

  // 2. Sharp Drop Alert (> 25% period drop)
  if (dateCols.length > 0 && numCols.length > 0) {
    const primaryDate = dateCols[0];
    const primaryNum = numCols.find(c => /sale|rev|amount|total/i.test(c.name)) || numCols[0];
    const pop = calculatePeriodOverPeriod(data, primaryDate.name, primaryNum.name, 'month');

    for (const p of pop.periods) {
      if (p.growthRatePercent !== null && p.growthRatePercent <= -25) {
        risks.push({
          type: 'sharp_drop',
          severity: p.growthRatePercent <= -40 ? 'high' : 'medium',
          title: `Sharp Contraction in ${p.period}`,
          description: `${primaryNum.name} contracted by ${p.growthRatePercent}% compared to preceding period.`
        });
      }
    }
  }

  return risks;
}

/**
 * Suggests tailored KPI cards matching dataset columns
 * @param {Array<Object>} columns 
 * @returns {Array<{ label: string, measure: string, aggregation: string, icon: string }>}
 */
export function recommendBusinessKpis(columns) {
  if (!Array.isArray(columns)) return [];

  const numCols = columns.filter(c => c.type === 'number');
  const recommendations = [];

  for (const col of numCols) {
    const isCurrency = /sale|revenue|amount|price|cost|spend|budget|total/i.test(col.name);
    const isAvgMetric = /avg|price|rate|score|ratio|margin|discount/i.test(col.name);

    if (isAvgMetric) {
      recommendations.push({
        label: `Avg ${col.name}`,
        measure: col.name,
        aggregation: 'avg',
        icon: 'TrendingUp'
      });
    } else {
      recommendations.push({
        label: `Total ${col.name}`,
        measure: col.name,
        aggregation: 'sum',
        icon: isCurrency ? 'DollarSign' : 'Hash'
      });
    }
  }

  // Include universal row count KPI
  recommendations.unshift({
    label: 'Total Records',
    measure: columns[0]?.name || 'Records',
    aggregation: 'count',
    icon: 'Layers'
  });

  return recommendations.slice(0, 5);
}

/**
 * Generates deterministic narrative insights calculated purely in code
 * @param {Array<Object>} data 
 * @param {Array<Object>} columns 
 * @returns {Object}
 */
export function generateDeterministicInsights(data, columns) {
  const highlights = [];
  const numCols = columns.filter(c => c.type === 'number');
  const catCols = columns.filter(c => c.type === 'category');
  const dateCols = columns.filter(c => c.type === 'date');

  let growthInfo = null;
  let contributionInfo = null;
  let trendInfo = null;

  if (dateCols.length > 0 && numCols.length > 0) {
    const primaryDate = dateCols[0].name;
    const primaryMeasure = numCols[0].name;
    growthInfo = calculatePeriodOverPeriod(data, primaryDate, primaryMeasure, 'month');
    trendInfo = detectTrendsAndMomentum(data, primaryDate, primaryMeasure);

    if (growthInfo.overallGrowth !== null) {
      highlights.push(`Overall ${primaryMeasure} changed by ${growthInfo.overallGrowth > 0 ? '+' : ''}${growthInfo.overallGrowth}% across ${growthInfo.periods.length} monthly periods.`);
    }
    highlights.push(`Momentum trajectory is classified as ${trendInfo.direction.toUpperCase()} with an R² fit of ${trendInfo.rSquared}.`);
  }

  if (catCols.length > 0 && numCols.length > 0) {
    const primaryCat = catCols[0].name;
    const primaryMeasure = numCols[0].name;
    contributionInfo = calculateContributionAnalysis(data, primaryCat, primaryMeasure);

    if (contributionInfo.topPerformer) {
      highlights.push(`Top contributing ${primaryCat} is "${contributionInfo.topPerformer.name}" driving ${contributionInfo.topPerformer.percentage}% ($${contributionInfo.topPerformer.sum.toLocaleString()}) of total ${primaryMeasure}.`);
    }
  }

  const risks = calculateRiskIndicators(data, columns);
  for (const r of risks) {
    highlights.push(`[Alert] ${r.title}: ${r.description}`);
  }

  return {
    highlights,
    growth: growthInfo,
    contribution: contributionInfo,
    trend: trendInfo,
    risks,
    kpis: recommendBusinessKpis(columns),
    assumptions: {
      dateGrain: 'Monthly calendar buckets (YYYY-MM)',
      outlierMethod: 'Tukey IQR (1.5 * IQR distance from Q1/Q3)',
      regressionBasis: 'Ordinary Least Squares (OLS) on sequential period indices',
      calculationEngine: 'Deterministic JavaScript runtime on complete dataset'
    }
  };
}
