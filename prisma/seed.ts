/**
 * Seeds a demo operator plus a worked mission so a fresh clone has something
 * to look at before any API key is configured. Idempotent — safe to re-run.
 *
 *   npx tsx prisma/seed.ts
 */
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

const SEED_EMAIL = 'operator@loqi.local';

async function main() {
  const user = await db.user.upsert({
    where: { email: SEED_EMAIL },
    update: {},
    create: { email: SEED_EMAIL, name: 'Demo Operator', role: 'OPERATOR' }
  });

  console.log(`▸ user ${user.email} (${user.role})`);

  const existing = await db.mission.findFirst({ where: { userId: user.id } });
  if (existing) {
    console.log('▸ demo mission already present — skipping');
    return;
  }

  const mission = await db.mission.create({
    data: {
      userId: user.id,
      objective: 'Assess whether we should migrate the landing scene from Canvas 2D to WebGPU.',
      status: 'SUCCEEDED',
      tokensIn: 18_420,
      tokensOut: 6_180,
      toolCalls: 5,
      report: [
        '## Recommendation',
        '',
        '**Do not migrate yet.** WebGPU gives a real throughput win on the nine-world',
        'particle field, but Safari support landed too recently to carry a public',
        'landing page without a Canvas 2D fallback — which means maintaining both',
        'renderers for the entire window in which the migration is supposed to pay off.',
        '',
        '### What holds',
        '',
        '- Draw-call overhead drops substantially for instanced geometry.',
        '- Compute shaders would move the orbital integration off the main thread.',
        '',
        '### What does not',
        '',
        '- A fallback path is mandatory, so the code gets larger, not smaller.',
        '- ORION could not source a reliable share-of-traffic figure for the browsers',
        '  in question, so the payoff estimate has a wide spread. Treat the ratio as',
        '  directional, not decisive.',
        '',
        '_Revisit once the fallback can be dropped._'
      ].join('\n'),
      tasks: {
        create: [
          {
            agentId: 'itachi',
            title: 'Establish WebGPU support baseline',
            brief: 'Determine current WebGPU availability across evergreen browsers.',
            dependsOn: [],
            status: 'SUCCEEDED',
            tokensIn: 6200, tokensOut: 1800, toolCalls: 2,
            output: 'Support is broad on Chromium and present on recent Safari. A Canvas 2D fallback remains necessary for older Safari.\n\nHANDOFF: fallback is non-optional; factor its maintenance cost in.'
          },
          {
            agentId: 'orion',
            title: 'Quantify the performance delta',
            brief: 'Estimate frame-time improvement for the nine-world particle field.',
            dependsOn: [],
            status: 'SUCCEEDED',
            tokensIn: 5100, tokensOut: 1600, toolCalls: 2,
            output: 'Instanced draw-call overhead falls materially; the integration step moves to a compute shader.\n\nCaveat: no reliable share-of-traffic figure was available, so the payoff ratio has a wide spread.\n\nHANDOFF: treat the ratio as directional, not decisive.'
          },
          {
            agentId: 'vexa',
            title: 'Attack the migration case',
            brief: 'Find the flaw in the recommendation to migrate.',
            dependsOn: ['recon', 'metrics'],
            status: 'SUCCEEDED',
            tokensIn: 4300, tokensOut: 1400, toolCalls: 1,
            output: 'MAJOR: the performance case assumes the fallback is discarded. It cannot be, so both renderers must be maintained across the entire payback window. This inverts the conclusion.'
          },
          {
            agentId: 'nara',
            title: 'Mission report',
            brief: 'Synthesise the returns into a recommendation.',
            dependsOn: ['recon', 'metrics', 'assay'],
            status: 'SUCCEEDED',
            tokensIn: 2820, tokensOut: 1380, toolCalls: 0,
            output: 'See mission report.'
          }
        ]
      }
    }
  });

  console.log(`▸ mission ${mission.id} with 4 tasks`);

  await db.kbEntry.createMany({
    data: [
      {
        userId: user.id, world: 'itachi',
        claim: 'A Canvas 2D fallback is mandatory for the public landing scene until older Safari can be dropped.',
        source: 'derived', confidence: 'HIGH', tags: ['webgpu', 'browser-support', 'landing'],
        committedBy: 'itachi', missionId: mission.id
      },
      {
        userId: user.id, world: 'orion',
        claim: 'WebGPU payoff estimate for the nine-world field has a wide spread; no reliable traffic-share figure was obtainable.',
        source: 'derived', confidence: 'MEDIUM', tags: ['webgpu', 'performance', 'estimate'],
        committedBy: 'orion', missionId: mission.id
      },
      {
        userId: user.id, world: 'kairo',
        claim: 'Maintaining two renderers across a payback window can invert an otherwise-positive migration case.',
        source: 'derived', confidence: 'HIGH', tags: ['architecture', 'migration', 'doctrine'],
        committedBy: 'kairo', missionId: mission.id
      }
    ]
  });

  console.log('▸ 3 vault entries');
  console.log('\n▸ Seed complete.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
