import 'server-only';
import {z} from 'zod';
import type {Episode, FinancialClaim, ResearchSource} from '@/lib/schemas';
import {getTextModel} from '@/lib/ai/router';
import {parseWith} from '@/lib/ai/json';
import {bookCost} from './cost';
import {nowIso, shortId} from '@/lib/util/id';

/**
 * Schema for a model's research response. The model may only propose claim
 * *questions* and whether they are critical — never values, evidence, or a
 * verified status. Everything it returns is forced to UNSUPPORTED with no value.
 */
const LiveResearchSchema = z.object({
  claims: z
    .array(z.object({text: z.string().min(8), critical: z.boolean().optional()}))
    .max(12)
    .optional(),
});

const RESEARCH_PROMPT = (topic: string) =>
  `For a US personal-finance video on "${topic}", list the specific numeric/factual claims ` +
  `that MUST be sourced from authoritative US sources (IRS, Federal Reserve, BLS, CFPB, SEC, ` +
  `Census, Treasury). Do NOT provide values — only the claim to verify.\n` +
  `Return ONLY JSON: {"claims":[{"text":"...","critical":true}]}`;

/**
 * Research engine.
 *
 * Produces a set of authoritative source stubs and a list of financial claims
 * the script will need. CRITICAL RULE: we never fabricate current statistics.
 * In mock mode (and until real evidence is attached), numeric claims are emitted
 * WITHOUT invented values and marked NEEDS_REVIEW / UNSUPPORTED so a human must
 * supply and verify the figure before publish.
 */

/** Standard authoritative US sources this channel relies on. */
export function standardSources(): ResearchSource[] {
  const retrievedAt = nowIso();
  return [
    {id: 'src-irs', name: 'IRS', authority: 'IRS', url: 'https://www.irs.gov', note: 'Federal income-tax brackets and rules', retrievedAt},
    {id: 'src-bls', name: 'Bureau of Labor Statistics', authority: 'BLS', url: 'https://www.bls.gov', note: 'Consumer spending (CEX) and inflation (CPI)', retrievedAt},
    {id: 'src-fed', name: 'Federal Reserve', authority: 'FEDERAL_RESERVE', url: 'https://www.federalreserve.gov', note: 'Household debt and consumer credit (G.19)', retrievedAt},
    {id: 'src-fred', name: 'FRED (St. Louis Fed)', authority: 'FRED', url: 'https://fred.stlouisfed.org', note: 'Time-series economic data', retrievedAt},
    {id: 'src-cfpb', name: 'CFPB', authority: 'CFPB', url: 'https://www.consumerfinance.gov', note: 'Consumer credit and debt burden research', retrievedAt},
    {id: 'src-census', name: 'US Census Bureau', authority: 'CENSUS', url: 'https://www.census.gov', note: 'Household income and housing cost data', retrievedAt},
  ];
}

/**
 * The claim skeletons a "$100k feels broke" style episode needs. Values are
 * intentionally omitted — a researcher/human fills and verifies them.
 */
function claimSkeletons(topic: string): FinancialClaim[] {
  const base: Array<Omit<FinancialClaim, 'id'>> = [
    {
      text: 'Effective federal + payroll tax on a $100k single filer reduces take-home pay by roughly [FILL]%.',
      unit: '%',
      period: '[FILL year]',
      evidence: [],
      confidence: 0,
      status: 'NEEDS_REVIEW',
      critical: true,
    },
    {
      text: 'Median monthly housing cost in high-cost US metros is approximately $[FILL].',
      unit: 'USD/month',
      period: '[FILL year]',
      evidence: [],
      confidence: 0,
      status: 'NEEDS_REVIEW',
      critical: true,
    },
    {
      text: 'Average new-car monthly payment in the US is about $[FILL].',
      unit: 'USD/month',
      period: '[FILL year]',
      evidence: [],
      confidence: 0,
      status: 'UNSUPPORTED',
      critical: true,
    },
    {
      text: 'Total US credit card balances recently reached $[FILL] trillion.',
      unit: 'USD trillion',
      period: '[FILL quarter]',
      evidence: [],
      confidence: 0,
      status: 'UNSUPPORTED',
      critical: true,
    },
    {
      text: 'Annual US consumer inflation (CPI) was approximately [FILL]%.',
      unit: '%',
      period: '[FILL year]',
      evidence: [],
      confidence: 0,
      status: 'NEEDS_REVIEW',
      critical: false,
    },
  ];
  return base.map((c) => ({...c, id: `claim-${shortId()}`, text: c.text}));
}

export interface ResearchResult {
  episode: Episode;
  sources: ResearchSource[];
  claims: FinancialClaim[];
}

export async function runResearch(episode: Episode): Promise<ResearchResult> {
  // Exercise the provider abstraction (and book its cost). The mock returns a
  // stub; real providers would return a source/claim plan we'd parse. We never
  // let the model's raw text become a "verified" figure.
  const model = getTextModel('topic-research');
  const res = await model.generate('topic-research', RESEARCH_PROMPT(episode.topic), {json: true});

  const sources = standardSources();
  const claims = claimSkeletons(episode.topic);

  // Append model-proposed claim questions — always UNSUPPORTED, never valued.
  const live = parseWith(LiveResearchSchema, res.text);
  if (live?.claims) {
    for (const c of live.claims) {
      claims.push({
        id: `claim-${shortId()}`,
        text: c.text,
        evidence: [],
        confidence: 0,
        status: 'UNSUPPORTED',
        critical: Boolean(c.critical),
      });
    }
  }

  const withCost = bookCost(episode, 'research', res.provider, res.costUsd, 'research plan');
  const updated: Episode = {...withCost, sources, claims};
  return {episode: updated, sources, claims};
}
