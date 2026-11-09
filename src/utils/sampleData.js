/**
 * Sample datasets generator for Metrica demos and testing
 */

const REGIONS = ['North America', 'Europe', 'Asia Pacific', 'Latin America', 'Middle East'];
const CATEGORIES = ['Hardware', 'Software', 'Cloud Services', 'Consulting', 'Peripherals'];
const PRODUCTS = {
  Hardware: ['Edge Router X', 'Server Blade v4', 'Workstation Pro', 'IoT Gateway Mini'],
  Software: ['Metrica Studio Pro', 'Security Suite Enterprise', 'DataSync Plus', 'AI Core License'],
  'Cloud Services': ['Compute Cluster A', 'Global Storage Bucket', 'Serverless Run', 'Kubernetes Managed'],
  Consulting: ['Architecture Audit', 'Migration Sprint', 'Security Assessment', 'Training Workshop'],
  Peripherals: ['UltraHD Display 32"', 'Mechanical Pro Deck', 'Noise-Cancelling Headset', 'Multiport Dock Hub']
};
const REPS = ['Elena Rostova', 'Marcus Vance', 'Sarah Jenkins', 'Devon Thorne', 'Amina Idris', 'Lucas Chen'];

/**
 * Generate clean, realistic Sales sample data
 */
export function generateSalesSampleData(count = 1200) {
  const data = [];
  const startDate = new Date('2025-01-01').getTime();
  const endDate = new Date('2025-12-31').getTime();

  for (let i = 0; i < count; i++) {
    const randomTime = startDate + Math.random() * (endDate - startDate);
    const dateStr = new Date(randomTime).toISOString().split('T')[0];
    
    const region = REGIONS[Math.floor(Math.random() * REGIONS.length)];
    const category = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
    const productList = PRODUCTS[category];
    const product = productList[Math.floor(Math.random() * productList.length)];
    const rep = REPS[Math.floor(Math.random() * REPS.length)];
    
    const units = Math.floor(Math.random() * 45) + 5;
    const basePrice = category === 'Consulting' ? 450 : category === 'Hardware' ? 220 : category === 'Cloud Services' ? 180 : 95;
    const unitPrice = Math.round((basePrice + (Math.random() * 80 - 40)) * 100) / 100;
    const revenue = Math.round(units * unitPrice * 100) / 100;
    const margin = 0.25 + Math.random() * 0.45;
    const profit = Math.round(revenue * margin * 100) / 100;
    const customerRating = Math.round((3.2 + Math.random() * 1.8) * 10) / 10;

    data.push({
      Date: dateStr,
      Region: region,
      Category: category,
      Product: product,
      'Sales Rep': rep,
      'Units Sold': units,
      'Unit Price': unitPrice,
      Revenue: revenue,
      Profit: profit,
      Rating: customerRating
    });
  }

  return data;
}

/**
 * Generate large dataset (e.g. 100,000 rows) for stress testing
 */
export function generateLargeDataset(count = 100000) {
  const data = new Array(count);
  const channels = ['Online Direct', 'Enterprise B2B', 'Partner Reseller', 'Retail'];
  const statuses = ['Completed', 'Processing', 'Delivered', 'Cancelled'];

  const startDate = new Date('2024-01-01').getTime();
  const oneYear = 365 * 24 * 60 * 60 * 1000;

  for (let i = 0; i < count; i++) {
    const d = new Date(startDate + (i % 700) * 86400000).toISOString().split('T')[0];
    const units = (i % 25) + 1;
    const unitPrice = 20 + ((i * 7) % 300);
    const revenue = units * unitPrice;
    const profit = Math.round(revenue * 0.32);

    data[i] = {
      'Transaction ID': `TX-${100000 + i}`,
      Date: d,
      Channel: channels[i % channels.length],
      Category: CATEGORIES[i % CATEGORIES.length],
      Status: statuses[i % statuses.length],
      Units: units,
      Revenue: revenue,
      Profit: profit,
      Cost: revenue - profit
    };
  }

  return data;
}

/**
 * Generate dataset with deliberate empty cells and duplicates
 */
export function generateDuplicatesAndMissingData(count = 500) {
  const base = generateSalesSampleData(count - 60);

  // Inject duplicate rows
  for (let i = 0; i < 35; i++) {
    const pickIndex = Math.floor(Math.random() * (base.length - 10));
    base.push({ ...base[pickIndex] }); // exact duplicate
  }

  // Inject empty values
  for (let i = 0; i < base.length; i++) {
    if (Math.random() < 0.12) {
      base[i].Profit = null; // empty number
    }
    if (Math.random() < 0.08) {
      base[i].Region = ''; // empty category
    }
    if (Math.random() < 0.06) {
      base[i].Rating = null;
    }
  }

  return base;
}

/**
 * Generate text-only dataset (no numeric metrics)
 */
export function generateOnlyTextData(count = 350) {
  const departments = ['Engineering', 'Marketing', 'Customer Success', 'Finance', 'Legal', 'Product Design'];
  const severities = ['Low', 'Medium', 'High', 'Critical'];
  const statuses = ['Open', 'In Review', 'Resolved', 'Deferred'];
  const sentiments = ['Positive', 'Neutral', 'Negative'];

  const data = [];
  for (let i = 0; i < count; i++) {
    data.push({
      'Ticket Code': `TICK-${2000 + i}`,
      Department: departments[Math.floor(Math.random() * departments.length)],
      Severity: severities[Math.floor(Math.random() * severities.length)],
      Status: statuses[Math.floor(Math.random() * statuses.length)],
      Feedback: sentiments[Math.floor(Math.random() * sentiments.length)],
      Assignee: REPS[Math.floor(Math.random() * REPS.length)]
    });
  }

  return data;
}
