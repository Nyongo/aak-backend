import { PrismaClient } from '@prisma/client';
import {
  LOAN_STAGE_OPTIONS,
  REGION_OPTIONS,
  PRODUCT_OPTIONS,
  SOURCE_OF_CLIENT_OPTIONS,
} from '../src/pipeline-management/constants/pipeline-options';
import { computeExpectedDisbursement } from '../src/pipeline-management/constants/pipeline-stage-config';

const prisma = new PrismaClient();

const REGIONS = [...REGION_OPTIONS];
const PIPELINE_STAGES = [...LOAN_STAGE_OPTIONS];
const PRODUCTS = [...PRODUCT_OPTIONS];

const SECTORS = [
  'Education',
  'Retail',
  'Agriculture',
  'Healthcare',
  'Transport',
  'Manufacturing',
  'Services',
  'Construction',
];

const CLIENT_TYPES = ['New', 'Existing'];

const ENTITY_PREFIXES = [
  'Rehoboth',
  'Kiambaa st ann',
  'Green Reed',
  'Sunrise Academy',
  'Metro Traders',
  'Highland Farm',
  'Valley School',
  'Central Medical',
  'Prime Motors',
  'BuildRight',
  'Tech Solutions',
  'Fresh Foods',
  'Grace Academy',
  'Pioneer Sacco',
  'Summit Business',
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomPastDate(monthsBack: number): Date {
  const now = new Date();
  const past = new Date(now);
  past.setMonth(past.getMonth() - randomInt(0, monthsBack));
  past.setDate(randomInt(1, 28));
  past.setHours(randomInt(8, 18), randomInt(0, 59), 0, 0);
  return past;
}

function randomFutureDate(daysAhead: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + randomInt(1, daysAhead));
  return d;
}

function phoneNumber(): string {
  return '7' + randomInt(10, 99) + '' + randomInt(1000000, 9999999);
}

async function main() {
  const count = parseInt(process.env.PIPELINE_SEED_COUNT ?? '1500', 10);

  console.log('Clearing all existing pipeline entries...');
  const deleted = await prisma.pipelineEntry.deleteMany({});
  console.log(`Deleted ${deleted.count} pipeline entries.`);

  const sslStaffIds = await prisma.sslStaff.findMany({ select: { id: true } }).then((r) => r.map((x) => x.id));
  const useSsl = sslStaffIds.length > 0;

  const guaranteed =
    REGIONS.length + PRODUCTS.length + PIPELINE_STAGES.length;
  const minCount = Math.max(count, guaranteed);
  const randomCount = minCount - guaranteed;

  console.log(
    `Using ${sslStaffIds.length} SSL staff IDs. Generating ${minCount} pipeline entries (all ${REGIONS.length} regions, ${PRODUCTS.length} products, ${PIPELINE_STAGES.length} loan stages covered)...`,
  );

  const entries: Parameters<PrismaClient['pipelineEntry']['create']>[0]['data'][] = [];
  const seenEntities = new Set<string>();

  function makeEntry(overrides: {
    region?: string;
    product?: string;
    loanStage?: string;
  } = {}): Parameters<PrismaClient['pipelineEntry']['create']>[0]['data'] {
    const prefix = pick(ENTITY_PREFIXES);
    const suffix = randomInt(1, 99999);
    let entityName = `${prefix} ${suffix}`;
    while (seenEntities.has(entityName)) {
      entityName = `${prefix} ${randomInt(1000, 99999)}`;
    }
    seenEntities.add(entityName);

    const createdAt = randomPastDate(12);
    const estimatedClosing = Math.random() > 0.3 ? randomFutureDate(90) : null;
    const amount = randomInt(50, 5000) * 1000;
    const topUpAmount = Math.random() > 0.85 ? randomInt(10, 500) * 1000 : 0;
    const loanStage = overrides.loanStage ?? pick(PIPELINE_STAGES);
    const expectedDisbursement = computeExpectedDisbursement(
      loanStage,
      amount,
      topUpAmount,
    );

    return {
      clientType: pick(CLIENT_TYPES),
      entityName,
      clientTel: phoneNumber(),
      sector: pick(SECTORS),
      product: overrides.product ?? pick(PRODUCTS),
      amount,
      topUpAmount,
      isTopUp: Math.random() > 0.85,
      crossSellOpportunities:
        Math.random() > 0.9 ? 'Insurance, asset finance' : undefined,
      sourceOfClient: Math.random() > 0.3 ? pick([...SOURCE_OF_CLIENT_OPTIONS]) : undefined,
      sslStaffId: useSsl && Math.random() > 0.15 ? pick(sslStaffIds) : undefined,
      region: overrides.region ?? pick(REGIONS),
      loanStage,
      estimatedClosing,
      probabilityOfClosing: randomInt(10, 95),
      expectedDisbursement,
      status: Math.random() > 0.05 ? 'Active' : 'Closed',
      comments: Math.random() > 0.8 ? 'Follow up scheduled' : undefined,
      createdAt,
      loanStageEnteredAt: createdAt,
    };
  }

  // Guarantee one entry per region (all pipeline options)
  for (const region of REGIONS) {
    entries.push(makeEntry({ region }));
  }
  // Guarantee one entry per product
  for (const product of PRODUCTS) {
    entries.push(makeEntry({ product }));
  }
  // Guarantee one entry per loan stage
  for (const loanStage of PIPELINE_STAGES) {
    entries.push(makeEntry({ loanStage }));
  }

  // Fill the rest with random distribution across all options
  for (let i = 0; i < randomCount; i++) {
    entries.push(makeEntry());
  }

  let created = 0;
  const batchSize = 200;
  for (let i = 0; i < entries.length; i += batchSize) {
    const batch = entries.slice(i, i + batchSize);
    await prisma.$transaction(
      batch.map((data) =>
        prisma.pipelineEntry.create({
          data: {
            ...data,
            stageHistory: {
              create: {
                stageName: data.loanStage ?? 'Client Negotiation',
                enteredAt: data.loanStageEnteredAt ?? data.createdAt ?? new Date(),
                exitedAt: null,
                wasDelayed: false,
                delayFlag: null,
              },
            },
          },
        }),
      ),
    );
    created += batch.length;
    console.log(`Created ${created}/${minCount} pipeline entries (with stage history)...`);
  }

  console.log(
    `Done. Created ${created} pipeline entries (all ${REGIONS.length} regions, ${PRODUCTS.length} products, ${PIPELINE_STAGES.length} loan stages covered).`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
