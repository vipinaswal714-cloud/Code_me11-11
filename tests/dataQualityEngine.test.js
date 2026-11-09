import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { 
  auditDataQuality, 
  detectOutliersIQR, 
  detectInconsistentTextValues, 
  detectSuspiciousValues 
} from '../src/utils/dataQualityEngine.js';

describe('Phase 1: Data Quality Report & Audit Engine', () => {
  const dirtyData = [
    { id: 1, city: 'Delhi', amount: 100, qty: 2, date: '2024-01-01' },
    { id: 2, city: 'delhi ', amount: 120, qty: 3, date: '2024-01-02' },
    { id: 3, city: 'Dehli', amount: 105, qty: 1, date: '2024-01-03' }, // Typo
    { id: 4, city: 'Mumbai', amount: 110, qty: 2, date: '2024-01-04' },
    { id: 5, city: 'Mumbai', amount: 115, qty: -5, date: '2024-01-05' }, // Negative qty
    { id: 6, city: 'Bangalore', amount: 50000, qty: 4, date: '2024-01-06' }, // Severe outlier
    { id: 7, city: null, amount: null, qty: 1, date: '2024-01-07' }, // Missing
    { id: 8, city: 'Kolkata', amount: 130, qty: 2, date: '2099-01-01' }, // Suspicious future date
    { id: 1, city: 'Delhi', amount: 100, qty: 2, date: '2024-01-01' } // Duplicate row
  ];

  const columns = [
    { name: 'id', type: 'number' },
    { name: 'city', type: 'category' },
    { name: 'amount', type: 'number' },
    { name: 'qty', type: 'number' },
    { name: 'date', type: 'date' }
  ];

  it('detects outliers using rigorous IQR calculation (Q1 - 1.5*IQR, Q3 + 1.5*IQR)', () => {
    const numbers = [100, 105, 110, 115, 120, 130, 50000];
    const outlierResult = detectOutliersIQR(numbers);

    assert.ok(outlierResult.outliers.includes(50000), '50,000 must be flagged as an outlier');
    assert.equal(outlierResult.outliers.length, 1);
    assert.ok(outlierResult.upperBound < 50000);
    assert.ok(outlierResult.lowerBound <= 100);
    assert.ok(outlierResult.iqr > 0);
  });

  it('detects inconsistent/fuzzy text values (e.g. "Delhi", "delhi ", "Dehli")', () => {
    const textValues = dirtyData.map(r => r.city).filter(Boolean);
    const inconsistencies = detectInconsistentTextValues(textValues);

    assert.ok(inconsistencies.length > 0, 'Must detect fuzzy duplicate clusters');
    const cluster = inconsistencies.find(c => c.canonical.toLowerCase() === 'delhi');
    assert.ok(cluster, 'Cluster for Delhi must exist');
    assert.ok(cluster.variants.includes('delhi '));
    assert.ok(cluster.variants.includes('Dehli'));
  });

  it('detects suspicious values such as negative quantities or extreme future dates', () => {
    const suspicious = detectSuspiciousValues(dirtyData, columns);
    assert.ok(suspicious.some(s => s.column === 'qty' && s.reason.includes('Negative')));
    assert.ok(suspicious.some(s => s.column === 'date' && s.reason.includes('Future')));
  });

  it('generates a comprehensive Data Quality Report with score, severity levels, and one-click fixes', () => {
    const report = auditDataQuality(dirtyData, columns);

    assert.ok(typeof report.qualityScore === 'number');
    assert.ok(report.qualityScore >= 0 && report.qualityScore <= 100);
    assert.ok(report.issues.length >= 4);

    // Verify presence of severity and recommended fixes
    for (const issue of report.issues) {
      assert.ok(['high', 'medium', 'low'].includes(issue.severity));
      assert.ok(issue.recommendedFix, 'Issue must have a recommended fix for Cleaning Panel');
      assert.ok(issue.recommendedFix.action, 'Recommended fix must define an actionable cleaning command');
    }
  });
});
