import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const adminRole = await prisma.role.upsert({
    where: { name: 'ADMIN' },
    update: {}, // No fields to update if it already exists
    create: {
      name: 'ADMIN',
      permissions: {
        create: [
          { permission: { create: { name: 'READ' } } },
          { permission: { create: { name: 'WRITE' } } },
          { permission: { create: { name: 'DELETE' } } },
        ],
      },
    },
  });

  const userRole = await prisma.role.upsert({
    where: { name: 'USER' },
    update: {},
    create: {
      name: 'USER',
      permissions: {
        create: [{ permission: { create: { name: 'READ' } } }],
      },
    },
  });

  console.log({ adminRole, userRole });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
