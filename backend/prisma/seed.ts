import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
import { MarketService } from '../src/services/marketService';

const prisma = new PrismaClient();
const marketService = new MarketService(prisma);

type DemoAgent = {
  username: string;
  email: string;
};

type DemoTrade = {
  taker: string;
  deltaQ: string[];
};

type DemoMarket = {
  title: string;
  description: string;
  outcomes: string[];
  liquidityB: string;
  initialQ: string[];
  maker: string;
  trades: DemoTrade[];
};

async function seed(): Promise<void> {
  const passwordHash = await bcrypt.hash('password123', 12);

  const demoMarker = 'Demo: civic budget referendum';
  const existingDemoMarket = await prisma.market.findFirst({ where: { title: demoMarker } });
  if (existingDemoMarket) {
    return;
  }

  const agents: DemoAgent[] = [
    { username: 'athena', email: 'athena@infocracy.local' },
    { username: 'bruno', email: 'bruno@infocracy.local' },
    { username: 'celeste', email: 'celeste@infocracy.local' },
    { username: 'dorian', email: 'dorian@infocracy.local' },
    { username: 'ember', email: 'ember@infocracy.local' },
  ];

  const users = new Map<string, Awaited<ReturnType<typeof prisma.user.upsert>>>();

  for (const agent of agents) {
    const user = await prisma.user.upsert({
      where: { email: agent.email },
      update: {
        username: agent.username,
        passwordHash,
      },
      create: {
        username: agent.username,
        email: agent.email,
        passwordHash,
        balance: {
          create: { balance: '1.0' },
        },
      },
    });

    users.set(agent.username, user);
  }

  const markets: DemoMarket[] = [
    {
      title: demoMarker,
      description: 'Three-agent referendum on whether the city should adopt a civic budget pilot.',
      outcomes: ['Approve', 'Revise', 'Reject'],
      liquidityB: '0.6',
      initialQ: ['0.35', '0.15', '0.05'],
      maker: 'athena',
      trades: [
        { taker: 'bruno', deltaQ: ['0.20', '0.10', '0.00'] },
        { taker: 'celeste', deltaQ: ['0.05', '0.15', '0.05'] },
        { taker: 'bruno', deltaQ: ['0.00', '0.05', '0.10'] },
      ],
    },
    {
      title: 'Demo: treasury grants launch',
      description: 'A maker and two takers position around a small treasury grants program.',
      outcomes: ['Launch', 'Pilot', 'Pause'],
      liquidityB: '0.7',
      initialQ: ['0.10', '0.25', '0.10'],
      maker: 'dorian',
      trades: [
        { taker: 'ember', deltaQ: ['0.25', '0.05', '0.00'] },
        { taker: 'athena', deltaQ: ['0.10', '0.10', '0.05'] },
        { taker: 'celeste', deltaQ: ['0.05', '0.15', '0.10'] },
      ],
    },
    {
      title: 'Demo: civic turnout forecast',
      description: 'A wider forecast market with repeated buying across three outcomes.',
      outcomes: ['Above 65%', 'Between 55% and 65%', 'Below 55%'],
      liquidityB: '0.5',
      initialQ: ['0.20', '0.10', '0.20'],
      maker: 'celeste',
      trades: [
        { taker: 'bruno', deltaQ: ['0.15', '0.10', '0.05'] },
        { taker: 'dorian', deltaQ: ['0.10', '0.15', '0.00'] },
        { taker: 'ember', deltaQ: ['0.05', '0.05', '0.15'] },
      ],
    },
  ];

  for (const marketConfig of markets) {
    const maker = users.get(marketConfig.maker);
    if (!maker) {
      throw new Error(`Missing demo user for maker ${marketConfig.maker}`);
    }

    const market = await marketService.createMarket({
      makerId: maker.id,
      title: marketConfig.title,
      description: marketConfig.description,
      outcomes: marketConfig.outcomes,
      liquidityB: marketConfig.liquidityB,
      initialQ: marketConfig.initialQ,
    });

    for (const tradePlan of marketConfig.trades) {
      const taker = users.get(tradePlan.taker);
      if (!taker) {
        throw new Error(`Missing demo user for taker ${tradePlan.taker}`);
      }

      await marketService.trade({
        marketId: market.id,
        takerId: taker.id,
        deltaQ: tradePlan.deltaQ,
      });
    }

    await marketService.unmake(market.id, maker.id);
  }

  console.log('Seeded comprehensive demo with 5 agents, 3 markets, 9 takes, and 3 unmake actions.');
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
