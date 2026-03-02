/**
 * prisma/seed-ssl-staff.ts
 *
 * Creates two SslStaff records so both users can log in via the CRM
 * (Google OAuth → NextAuth → GET /users/by-email/:email → sslStaff lookup).
 *
 * James Etole   — sslId: F93EA90D  (regular user, no blog access)
 * Naomi Wairimu — sslId: 10BB2D9A  (will be added to blog whitelist later)
 *
 * Run:
 *   npx ts-node prisma/seed-ssl-staff.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱  Seeding SslStaff records...\n');

  // ── James Etole ───────────────────────────────────────────────
  const james = await prisma.sslStaff.upsert({
    where: { id: 'F93EA90D' },
    update: {
      // Re-running refreshes any fields that may have changed
      name: 'James Etole',
      email: 'etolejames@gmail.com',
      phoneNumber: '0714918582',
      sslId: 'F93EA90D',
      isActive: true,
    },
    create: {
      id: 'F93EA90D',
      name: 'James Etole',
      email: 'etolejames@gmail.com',
      phoneNumber: '0714918582',
      sslId: 'F93EA90D',
      type: 'Staff',
      borrowerId: 'N/A',
      nationalIdNumber: '00000001',
      roleInSchool: 'Loan Officer',
      dateOfBirth: '1990-01-01',
      address: 'Nairobi, Kenya',
      gender: 'Male',
      startDate: '2024-01-01',
      isActive: true,
      status: 'Active',
    },
  });

  console.log(`✅  SslStaff created: ${james.name}`);
  console.log(`    Email  : ${james.email}`);
  console.log(`    SSL ID : ${james.sslId}`);
  console.log(`    Role   : Regular staff — no blog access\n`);

  // ── Naomi Wairimu ─────────────────────────────────────────────
  const naomi = await prisma.sslStaff.upsert({
    where: { id: '10BB2D9A' },
    update: {
      name: 'Naomi Wairimu',
      email: 'etolejames1@gmail.com',
      phoneNumber: '0714918582',
      sslId: '10BB2D9A',
      isActive: true,
    },
    create: {
      id: '10BB2D9A',
      name: 'Naomi Wairimu',
      email: 'etolejames1@gmail.com',
      phoneNumber: '0714918582',
      sslId: '10BB2D9A',
      type: 'Admin',
      borrowerId: 'N/A',
      nationalIdNumber: '00000002',
      roleInSchool: 'Blog Manager',
      dateOfBirth: '1992-05-15',
      address: 'Nairobi, Kenya',
      gender: 'Female',
      startDate: '2024-01-01',
      isActive: true,
      status: 'Active',
    },
  });

  console.log(`✅  SslStaff created: ${naomi.name}`);
  console.log(`    Email  : ${naomi.email}`);
  console.log(`    SSL ID : ${naomi.sslId}`);
  console.log(`    Role   : Will be added to blog whitelist\n`);

  console.log('─────────────────────────────────────────────');
  console.log('Done! Both users can now log into the CRM via Google.');
  console.log('');
  console.log('Sign in with Google using:');
  console.log('  → etolejames@gmail.com   (James — regular access)');
  console.log('  → etolejames1@gmail.com  (Naomi — blog access after whitelist step)');
  console.log('─────────────────────────────────────────────\n');
}

main()
  .catch((e) => {
    console.error('❌  Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
