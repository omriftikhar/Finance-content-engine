import type {Episode} from '@/lib/schemas';
import type {CostCategory, CostEntry} from '@/lib/schemas';

/**
 * Cost governor.
 *
 * Tracks estimated/actual variable API cost per episode and enforces a budget
 * ceiling. If an action would push an episode significantly over budget, callers
 * should warn or block using assertWithinBudget().
 */
export function getBudgetUsd(): number {
  const raw = Number(process.env.MAX_VIDEO_BUDGET_USD);
  return Number.isFinite(raw) && raw > 0 ? raw : 3;
}

export function bookCost(
  episode: Episode,
  category: CostCategory,
  provider: string,
  costUsd: number,
  note?: string,
): Episode {
  const entry: CostEntry = {
    category,
    provider,
    costUsd,
    note,
    at: new Date().toISOString(),
  };
  const costs = [...episode.costs, entry];
  const estimatedCostUsd = costs.reduce((s, c) => s + c.costUsd, 0);
  return {...episode, costs, estimatedCostUsd};
}

export interface CostBreakdown {
  research: number;
  script: number;
  storyboard: number;
  voice: number;
  images: number;
  video: number;
  packaging: number;
  total: number;
}

export function costBreakdown(episode: Pick<Episode, 'costs'>): CostBreakdown {
  const b: CostBreakdown = {
    research: 0,
    script: 0,
    storyboard: 0,
    voice: 0,
    images: 0,
    video: 0,
    packaging: 0,
    total: 0,
  };
  for (const c of episode.costs) {
    b[c.category] += c.costUsd;
    b.total += c.costUsd;
  }
  return b;
}

export interface BudgetCheck {
  ok: boolean;
  spent: number;
  budget: number;
  projected: number;
  overBy: number;
}

/** Threshold above budget (10%) that flips a warning into a hard block. */
const HARD_BLOCK_MARGIN = 1.1;

export function checkBudget(episode: Pick<Episode, 'costs'>, additionalUsd = 0): BudgetCheck {
  const budget = getBudgetUsd();
  const spent = episode.costs.reduce((s, c) => s + c.costUsd, 0);
  const projected = spent + additionalUsd;
  return {
    ok: projected <= budget * HARD_BLOCK_MARGIN,
    spent,
    budget,
    projected,
    overBy: Math.max(0, projected - budget),
  };
}

export function assertWithinBudget(episode: Pick<Episode, 'costs'>, additionalUsd = 0): void {
  const check = checkBudget(episode, additionalUsd);
  if (!check.ok) {
    throw new Error(
      `Budget exceeded: projected $${check.projected.toFixed(2)} vs ceiling $${check.budget.toFixed(2)}. ` +
        `Raise MAX_VIDEO_BUDGET_USD or reduce generation scope.`,
    );
  }
}
