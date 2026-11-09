import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { 
  detectColumnRoles, 
  detectKeyRelationships, 
  generateSchemaAssumptions 
} from '../src/utils/schemaDetector.js';

describe('Phase 1: Smart Schema Detection Module', () => {
  const sampleData = [
    { order_id: 'ORD-001', customer_id: 'CUST-10', sales: 1500, cost: 900, order_date: '2024-01-15', region: 'North', status: 'Shipped' },
    { order_id: 'ORD-002', customer_id: 'CUST-20', sales: 3200, cost: 2100, order_date: '2024-01-16', region: 'South', status: 'Pending' },
    { order_id: 'ORD-003', customer_id: 'CUST-10', sales: 750, cost: 400, order_date: '2024-02-01', region: 'North', status: 'Shipped' },
    { order_id: 'ORD-004', customer_id: 'CUST-30', sales: 4800, cost: 3000, order_date: '2024-02-14', region: 'East', status: 'Delivered' }
  ];

  const columns = [
    { name: 'order_id', type: 'category' },
    { name: 'customer_id', type: 'category' },
    { name: 'sales', type: 'number' },
    { name: 'cost', type: 'number' },
    { name: 'order_date', type: 'date' },
    { name: 'region', type: 'category' },
    { name: 'status', type: 'category' }
  ];

  it('correctly labels columns as dimension, measure, datetime, or id_key', () => {
    const roles = detectColumnRoles(sampleData, columns);

    assert.equal(roles.order_id.role, 'id_key');
    assert.equal(roles.order_id.isPrimaryKey, true, 'order_id must be identified as Primary Key candidate');

    assert.equal(roles.customer_id.role, 'id_key');
    assert.equal(roles.customer_id.isPrimaryKey, false, 'customer_id has duplicates so is not a PK candidate');

    assert.equal(roles.sales.role, 'measure');
    assert.equal(roles.cost.role, 'measure');
    assert.equal(roles.order_date.role, 'datetime');
    assert.equal(roles.region.role, 'dimension');
    assert.equal(roles.status.role, 'dimension');
  });

  it('detects likely foreign-key relationships across multiple sheets or tables', () => {
    const ordersSheet = {
      name: 'Orders',
      data: sampleData,
      columns
    };

    const customersSheet = {
      name: 'Customers',
      data: [
        { customer_id: 'CUST-10', name: 'Acme Corp', country: 'US' },
        { customer_id: 'CUST-20', name: 'Global Tech', country: 'UK' },
        { customer_id: 'CUST-30', name: 'Starlight Inc', country: 'CA' }
      ],
      columns: [
        { name: 'customer_id', type: 'category' },
        { name: 'name', type: 'category' },
        { name: 'country', type: 'category' }
      ]
    };

    const relationships = detectKeyRelationships([ordersSheet, customersSheet]);
    assert.ok(relationships.length > 0, 'Must detect relationship between Orders and Customers');
    assert.equal(relationships[0].fromTable, 'Orders');
    assert.equal(relationships[0].fromColumn, 'customer_id');
    assert.equal(relationships[0].toTable, 'Customers');
    assert.equal(relationships[0].toColumn, 'customer_id');
    assert.equal(relationships[0].type, 'many_to_one');
  });

  it('generates explicit assumptions explaining why roles and keys were inferred', () => {
    const assumptions = generateSchemaAssumptions(sampleData, columns);
    assert.ok(assumptions.length >= 3, 'Must list key assumptions for user verification');
    assert.ok(assumptions.some(a => a.toLowerCase().includes('order_id')), 'Assumption about order_id primary key');
  });
});
