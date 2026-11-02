import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { 
  calculatePeriodOverPeriod, 
  calculateContributionAnalysis, 
  detectTrendsAndMomentum, 
  calculateRiskIndicators, 
  recommendBusinessKpis, 
  generateDeterministicInsights 
} from '../src/utils/businessInsights.js';

describe('Phase 1: Business Insights & Analytics Engine', () => {
  const timeseriesData = [
    { date: '2024-01-15', revenue: 10000, units: 100, product: 'Laptops', region: 'North' },
    { date: '2024-02-15', revenue: 12000, units: 110, product: 'Laptops', region: 'North' },
    { date: '2024-03-15', revenue: 15000, units: 130, product: 'Phones', region: 'South' },
    { date: '2024-04-15', revenue: 8000, units: 70, product: 'Laptops', region: 'North' }, // Sharp drop
    { date: '2024-05-15', revenue: 18000, units: 150, product: 'Accessories', region: 'East' },
    { date: '2024-06-15', revenue: 22000, units: 180, product: 'Laptops', region: 'North' }
  ];

  const columns = [
    { name: 'date', type: 'date' },
    { name: 'revenue', type: 'number' },
    { name: 'units', type: 'number' },
    { name: 'product', type: 'category' },
    { name: 'region', type: 'category' }
  ];

  it('calculates Period-over-Period (MoM/QoQ/YoY) growth rates accurately', () => {
    const pop = calculatePeriodOverPeriod(timeseriesData, 'date', 'revenue', 'month');
    assert.ok(pop.periods.length >= 5);
    // Period 2: from 10,000 to 12,000 is +20%
    const febGrowth = pop.periods.find(p => p.period.includes('2024-02'));
    assert.ok(febGrowth);
    assert.equal(febGrowth.growthRatePercent, 20);

    // Period 4: from 15,000 to 8,000 is -46.67%
    const aprGrowth = pop.periods.find(p => p.period.includes('2024-04'));
    assert.ok(aprGrowth);
    assert.ok(aprGrowth.growthRatePercent < 0);
  });

  it('performs contribution analysis and ranks top/bottom performers', () => {
    const contribution = calculateContributionAnalysis(timeseriesData, 'product', 'revenue');
    assert.ok(contribution.breakdown.length > 0);
    assert.equal(contribution.topPerformer.name, 'Laptops');
    assert.ok(contribution.topPerformer.percentage > 50, 'Laptops drive the vast majority of revenue');
    assert.ok(contribution.bottomPerformer);
  });

  it('computes trend line, momentum slope and volatility indicators', () => {
    const trend = detectTrendsAndMomentum(timeseriesData, 'date', 'revenue');
    assert.ok(['upward', 'downward', 'volatile', 'stable'].includes(trend.direction));
    assert.equal(typeof trend.slope, 'number');
    assert.equal(typeof trend.rSquared, 'number');
  });

  it('identifies critical business risk indicators (concentration, sharp drops, volatility)', () => {
    const risks = calculateRiskIndicators(timeseriesData, columns);
    assert.ok(risks.some(r => r.type === 'concentration_risk'), 'High revenue concentration in Laptops must trigger alert');
    assert.ok(risks.some(r => r.type === 'sharp_drop'), 'Revenue drop in April must be flagged');
  });

  it('recommends relevant KPIs and generates deterministic executive summary', () => {
    const recommendations = recommendBusinessKpis(columns);
    assert.ok(recommendations.length >= 3);
    assert.ok(recommendations.some(k => k.measure === 'revenue'));

    const summary = generateDeterministicInsights(timeseriesData, columns);
    assert.ok(summary.highlights.length >= 3);
    assert.ok(summary.growth);
    assert.ok(summary.risks);
    assert.equal(typeof summary.assumptions, 'object');
  });
});
