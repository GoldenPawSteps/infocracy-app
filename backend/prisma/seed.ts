import bcrypt from 'bcrypt';
import Decimal from 'decimal.js';
import { PrismaClient } from '@prisma/client';
import { cost } from '../src/services/marketMath';

const prisma = new PrismaClient();

async function seed(): Promise<void> {
  const passwordHash = await bcrypt.hash('password123', 12);

  const user = await prisma.user.upsert({
    where: { email: 'demo@infocracy.local' },
    update: {},
    create: {
      username: 'demo',
      email: 'demo@infocracy.local',
      passwordHash,
      balance: {
        create: { balance: '10.0' },
      },
    },
  });

  const existingMarket = await prisma.market.findFirst({ where: { title: 'Should the protocol adopt quadratic funding?' } });
  if (existingMarket) {
    return;
  }

  const liquidityB = '0.25';
  const initialCost = cost(['0', '0'], liquidityB);
  const currentBalance = await prisma.balance.findUniqueOrThrow({ where: { userId: user.id } });

  await prisma.$transaction(async (tx) => {
    await tx.balance.update({
      where: { userId: user.id },
      data: { balance: new Decimal(currentBalance.balance).minus(initialCost).toString() },
    });

    const market = await tx.market.create({
      data: {
        makerId: user.id,
        title: 'Should the protocol adopt quadratic funding?',
        description: 'Seed market for evaluating governance preference.',
        nOutcomes: 2,
        liquidityB,
      },
    });

    await tx.outcome.createMany({
      data: [
        { marketId: market.id, index: 0, name: 'Yes', qValue: '0' },
        { marketId: market.id, index: 1, name: 'No', qValue: '0' },
      ],
    });

    await tx.position.create({
      data: {
        userId: user.id,
        marketId: market.id,
        shares: ['0', '0'],
      },
    });
  });
}

seed()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
