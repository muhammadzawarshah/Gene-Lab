import 'dotenv/config';
import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function seedGLAccounts() {
  // ── Parent Accounts (no parent_account_id) ──────────────────────────────────
  const parents = [
    { gl_account_id: 1,  gl_account_code: '1', name: 'Assets',      type: 'ASSET'     },
    { gl_account_id: 2,  gl_account_code: '2', name: 'Liabilities', type: 'LIABILITY' },
    { gl_account_id: 3,  gl_account_code: '3', name: 'Equity',      type: 'EQUITY'    },
    { gl_account_id: 4,  gl_account_code: '4', name: 'Income',      type: 'INCOME'    },
    { gl_account_id: 5,  gl_account_code: '5', name: 'Expenses',    type: 'EXPENSE'   },
  ];

  for (const acc of parents) {
    await prisma.glaccount.upsert({
      where: { gl_account_id: acc.gl_account_id },
      update: { name: acc.name, type: acc.type, gl_account_code: acc.gl_account_code },
      create: { ...acc, parent_account_id: null, is_control_account: true },
    });
  }
  console.log('✔ GL parent accounts seeded');

  // ── Sub-Accounts ────────────────────────────────────────────────────────────
  const children = [
    // Assets
    { gl_account_id: 11, gl_account_code: '1.1', name: 'Cash',                parent_account_id: 1, type: 'ASSET'     },
    { gl_account_id: 12, gl_account_code: '1.2', name: 'Bank',                parent_account_id: 1, type: 'ASSET'     },
    { gl_account_id: 13, gl_account_code: '1.3', name: 'Accounts Receivable', parent_account_id: 1, type: 'ASSET'     },
    { gl_account_id: 14, gl_account_code: '1.4', name: 'Inventory',           parent_account_id: 1, type: 'ASSET'     },
    { gl_account_id: 15, gl_account_code: '1.5', name: 'Equipment',           parent_account_id: 1, type: 'ASSET'     },
    // Liabilities
    { gl_account_id: 21, gl_account_code: '2.1', name: 'Accounts Payable',    parent_account_id: 2, type: 'LIABILITY' },
    { gl_account_id: 22, gl_account_code: '2.2', name: 'Tax Payable',         parent_account_id: 2, type: 'LIABILITY' },
    // Equity
    { gl_account_id: 31, gl_account_code: '3.1', name: 'Owner Capital',       parent_account_id: 3, type: 'EQUITY'    },
    // Income
    { gl_account_id: 41, gl_account_code: '4.1', name: 'Sales Revenue',       parent_account_id: 4, type: 'INCOME'    },
    // Expenses
    { gl_account_id: 51, gl_account_code: '5.1', name: 'Cost of Goods Sold',  parent_account_id: 5, type: 'EXPENSE'   },
    { gl_account_id: 52, gl_account_code: '5.2', name: 'Salary Expense',      parent_account_id: 5, type: 'EXPENSE'   },
    { gl_account_id: 53, gl_account_code: '5.3', name: 'Rent Expense',        parent_account_id: 5, type: 'EXPENSE'   },
    { gl_account_id: 54, gl_account_code: '5.4', name: 'Utilities Expense',   parent_account_id: 5, type: 'EXPENSE'   },
    { gl_account_id: 55, gl_account_code: '5.5', name: 'Misc Expense',        parent_account_id: 5, type: 'EXPENSE'   },
  ];

  for (const acc of children) {
    await prisma.glaccount.upsert({
      where: { gl_account_id: acc.gl_account_id },
      update: { name: acc.name, type: acc.type, gl_account_code: acc.gl_account_code, parent_account_id: acc.parent_account_id },
      create: { ...acc, is_control_account: false },
    });
  }
  console.log('✔ GL sub-accounts seeded (14 accounts)');
}

async function main() {
  // ── Provinces ──────────────────────────────────────────────────────────────
  const provinces = [
    { province_id: 1, name: 'Punjab' },
    { province_id: 2, name: 'Sindh' },
    { province_id: 3, name: 'Khyber-Pakhtunkhwa' },
    { province_id: 4, name: 'Balochistan' },
    { province_id: 5, name: 'Islamabad Capital Territory' },
  ];

  for (const p of provinces) {
    await prisma.province.upsert({
      where: { province_id: p.province_id },
      update: { name: p.name },
      create: p,
    });
  }
  console.log('✔ Provinces seeded');

  // ── Districts ──────────────────────────────────────────────────────────────
  const districts: { name: string; province_id: number }[] = [
    // Punjab (1)
    { name: 'Lahore',            province_id: 1 },
    { name: 'Faisalabad',        province_id: 1 },
    { name: 'Rawalpindi',        province_id: 1 },
    { name: 'Multan',            province_id: 1 },
    { name: 'Gujranwala',        province_id: 1 },
    { name: 'Sargodha',          province_id: 1 },
    { name: 'Sialkot',           province_id: 1 },
    { name: 'Bahawalpur',        province_id: 1 },
    { name: 'Sheikhupura',       province_id: 1 },
    { name: 'Gujrat',            province_id: 1 },
    { name: 'Kasur',             province_id: 1 },
    { name: 'Rahim Yar Khan',    province_id: 1 },
    { name: 'Sahiwal',           province_id: 1 },
    { name: 'Okara',             province_id: 1 },
    { name: 'Wah Cantonment',    province_id: 1 },
    { name: 'Dera Ghazi Khan',   province_id: 1 },
    { name: 'Chiniot',           province_id: 1 },
    { name: 'Kamoke',            province_id: 1 },
    { name: 'Burewala',          province_id: 1 },
    { name: 'Jhelum',            province_id: 1 },
    { name: 'Sadiqabad',         province_id: 1 },
    { name: 'Khanewal',          province_id: 1 },
    { name: 'Hafizabad',         province_id: 1 },
    { name: 'Muzaffargarh',      province_id: 1 },
    { name: 'Khanpur',           province_id: 1 },
    { name: 'Gojra',             province_id: 1 },
    { name: 'Bahawalnagar',      province_id: 1 },
    { name: 'Muridke',           province_id: 1 },
    { name: 'Pakpattan',         province_id: 1 },
    { name: 'Jaranwala',         province_id: 1 },
    { name: 'Chishtian',         province_id: 1 },
    { name: 'Daska',             province_id: 1 },
    { name: 'Mandi Bahauddin',   province_id: 1 },
    { name: 'Ahmadpur East',     province_id: 1 },
    { name: 'Kamalia',           province_id: 1 },
    { name: 'Vehari',            province_id: 1 },
    { name: 'Wazirabad',         province_id: 1 },
    { name: 'Khushab',           province_id: 1 },
    { name: 'Chakwal',           province_id: 1 },
    { name: 'Mianwali',          province_id: 1 },
    { name: 'Kot Adu',           province_id: 1 },
    { name: 'Farooka',           province_id: 1 },
    { name: 'Chichawatni',       province_id: 1 },

    // Sindh (2)
    { name: 'Karachi',           province_id: 2 },
    { name: 'Hyderabad',         province_id: 2 },
    { name: 'Sukkur',            province_id: 2 },
    { name: 'Kandhkot',          province_id: 2 },
    { name: 'Larkana',           province_id: 2 },
    { name: 'Tando Adam',        province_id: 2 },
    { name: 'Khairpur',          province_id: 2 },
    { name: 'Mirpur Khas',       province_id: 2 },
    { name: 'Nawabshah',         province_id: 2 },
    { name: 'Jacobabad',         province_id: 2 },
    { name: 'Shikarpur',         province_id: 2 },
    { name: 'Dadu',              province_id: 2 },
    { name: 'Tando Allahyar',    province_id: 2 },

    // Khyber-Pakhtunkhwa (3)
    { name: 'Peshawar',          province_id: 3 },
    { name: 'Mardan',            province_id: 3 },
    { name: 'Mingora',           province_id: 3 },
    { name: 'Abbottabad',        province_id: 3 },
    { name: 'Kohat',             province_id: 3 },
    { name: 'Nowshera',          province_id: 3 },
    { name: 'Dera Ismail Khan',  province_id: 3 },
    { name: 'Charsada',          province_id: 3 },
    { name: 'Swabi',             province_id: 3 },
    { name: 'Mansehra',          province_id: 3 },

    // Balochistan (4)
    { name: 'Quetta',            province_id: 4 },
    { name: 'Khuzdar',           province_id: 4 },

    // Islamabad Capital Territory (5)
    { name: 'Islamabad',         province_id: 5 },
  ];

  await prisma.district.createMany({ data: districts, skipDuplicates: true });
  console.log(`✔ ${districts.length} districts seeded`);

  // ── GL Accounts ─────────────────────────────────────────────────────────────
  await seedGLAccounts();
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); await pool.end(); });
