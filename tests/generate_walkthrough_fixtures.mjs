import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FIXTURES_DIR = path.resolve(__dirname, 'fixtures');

if (!fs.existsSync(FIXTURES_DIR)) {
  fs.mkdirSync(FIXTURES_DIR, { recursive: true });
}

// 1. Messy Dataset
const messyCsv = `Order_ID,Customer,City,Order_Date,Quantity,Revenue
ORD-001,Alice,Delhi,2025-01-15,2,450
ORD-002,Bob,delhi ,2025-02-10,1,120
ORD-003,Charlie,Dehli,2025-02-14,3,95000
ORD-004,David,Mumbai,2025-03-01,5,600
ORD-005,Eva,mumbai,2025-03-12,-4,250
ORD-006,Frank,,2025-04-05,2,300
ORD-007,Grace,Bangalore,2035-11-20,1,180
ORD-008,Helen,Bangalore,2025-05-18,,220
ORD-001,Alice,Delhi,2025-01-15,2,450
ORD-009,Ian,Delhi,2025-06-01,4,550
`;
fs.writeFileSync(path.join(FIXTURES_DIR, 'messy_dataset.csv'), messyCsv.trim(), 'utf8');
console.log('✓ Created tests/fixtures/messy_dataset.csv');

// 2. Text-only Dataset
const textOnlyCsv = `Employee_ID,Department,Role,Location,Proficiency,Status
EMP-001,Engineering,Frontend Lead,Remote,Expert,Active
EMP-002,Engineering,Backend Senior,New York,Advanced,Active
EMP-003,Design,Product Designer,London,Expert,Active
EMP-004,Marketing,Growth Specialist,Berlin,Intermediate,Leave
EMP-005,Product,Technical PM,Tokyo,Advanced,Active
EMP-006,Engineering,QA Architect,Remote,Expert,Active
EMP-007,Operations,HR Manager,Singapore,Advanced,Active
EMP-008,Design,UX Researcher,New York,Intermediate,Active
`;
fs.writeFileSync(path.join(FIXTURES_DIR, 'text_only.csv'), textOnlyCsv.trim(), 'utf8');
console.log('✓ Created tests/fixtures/text_only.csv');

// 3. Large Dataset (50,000 rows for real browser walkthrough)
const largeFilePath = path.join(FIXTURES_DIR, 'large_50k.csv');
const writeStream = fs.createWriteStream(largeFilePath, { encoding: 'utf8' });
writeStream.write('Record_ID,Region,Segment,Transaction_Date,Units,Amount\n');

const regions = ['North', 'South', 'East', 'West', 'Central'];
const segments = ['Consumer', 'Corporate', 'Home Office', 'Enterprise'];
const dates = ['2025-01-10', '2025-02-15', '2025-03-20', '2025-04-25', '2025-05-30', '2025-06-15'];

for (let i = 1; i <= 50000; i++) {
  const reg = regions[i % regions.length];
  const seg = segments[i % segments.length];
  const d = dates[i % dates.length];
  const units = (i % 20) + 1;
  const amt = ((i * 17) % 5000) + 25;
  writeStream.write(`REC-${String(i).padStart(6, '0')},${reg},${seg},${d},${units},${amt}\n`);
}
writeStream.end(() => {
  console.log('✓ Created tests/fixtures/large_50k.csv (50,000 rows)');
});
