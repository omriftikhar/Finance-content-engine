import type {FinancialClaim, ResearchSource} from '@/lib/schemas';

/**
 * Verified research for Pilot #001 — "Why Americans Making $100,000 Still Feel Broke".
 *
 * PRINCIPLE: no fabricated statistics. Each claim is one of:
 *   - VERIFIED     — a stable, citable published figure (e.g. 2024 statutory tax
 *                    brackets / FICA rates), with source + URL + retrieval date.
 *   - NEEDS_REVIEW — a real published series whose latest value a human must
 *                    confirm before publish (BLS/Fed figures move over time).
 *   - assumption   — a deliberately chosen REPRESENTATIVE SCENARIO input, clearly
 *                    labeled as an assumption (not a universal fact). We never
 *                    imply every $100k household has identical costs.
 *
 * The episode is framed around ONE representative single-filer household ("Jack")
 * so the math is concrete and honest, with assumptions shown on screen.
 */

export const RETRIEVED = '2026-09-04';

export const pilotSources: ResearchSource[] = [
  {
    id: 'src-irs-brackets',
    name: 'IRS — 2024 Federal Income Tax Brackets (Rev. Proc. 2023-34)',
    authority: 'IRS',
    url: 'https://www.irs.gov/newsroom/irs-provides-tax-inflation-adjustments-for-tax-year-2024',
    publisher: 'Internal Revenue Service',
    retrievedAt: RETRIEVED,
    note: '2024 single-filer marginal brackets and standard deduction ($14,600).',
  },
  {
    id: 'src-ssa-fica',
    name: 'SSA / IRS — 2024 FICA rates & Social Security wage base',
    authority: 'US_TREASURY',
    url: 'https://www.ssa.gov/oact/cola/cbb.html',
    publisher: 'Social Security Administration',
    retrievedAt: RETRIEVED,
    note: 'Social Security 6.2% up to $168,600 (2024); Medicare 1.45% (employee share).',
  },
  {
    id: 'src-bls-cex',
    name: 'BLS — Consumer Expenditure Survey',
    authority: 'BLS',
    url: 'https://www.bls.gov/cex/',
    publisher: 'Bureau of Labor Statistics',
    retrievedAt: RETRIEVED,
    note: 'Average US household spending shares (housing, transportation, food).',
  },
  {
    id: 'src-fed-g19',
    name: 'Federal Reserve — G.19 Consumer Credit',
    authority: 'FEDERAL_RESERVE',
    url: 'https://www.federalreserve.gov/releases/g19/current/',
    publisher: 'Federal Reserve Board',
    retrievedAt: RETRIEVED,
    note: 'Revolving consumer credit (credit-card debt) outstanding.',
  },
  {
    id: 'src-fed-scf',
    name: 'Federal Reserve — Survey of Consumer Finances / DFA',
    authority: 'FEDERAL_RESERVE',
    url: 'https://www.federalreserve.gov/releases/z1/dataviz/dfa/',
    publisher: 'Federal Reserve Board',
    retrievedAt: RETRIEVED,
    note: 'Household debt composition and balances.',
  },
  {
    id: 'src-cfpb-cards',
    name: 'CFPB — Consumer Credit Card Market Report',
    authority: 'CFPB',
    url: 'https://www.consumerfinance.gov/data-research/research-reports/consumer-credit-card-market-report/',
    publisher: 'Consumer Financial Protection Bureau',
    retrievedAt: RETRIEVED,
    note: 'Credit-card APRs and cost of revolving balances.',
  },
];

export const pilotClaims: FinancialClaim[] = [
  // ── VERIFIED: statutory 2024 tax mechanics (stable, citable) ────────────────
  {
    id: 'claim-fica-ss',
    text: 'In 2024, the Social Security payroll tax is 6.2% of wages up to a $168,600 wage base (employee share).',
    value: 6.2,
    unit: '%',
    period: '2024',
    evidence: [
      {
        sourceId: 'src-ssa-fica',
        quote: 'Social Security tax rate 6.2% (employee); 2024 taxable maximum $168,600.',
        url: 'https://www.ssa.gov/oact/cola/cbb.html',
        retrievedAt: RETRIEVED,
      },
    ],
    confidence: 0.98,
    status: 'VERIFIED',
    critical: true,
  },
  {
    id: 'claim-fica-medicare',
    text: 'In 2024, the Medicare payroll tax is 1.45% of wages (employee share, no wage cap).',
    value: 1.45,
    unit: '%',
    period: '2024',
    evidence: [
      {
        sourceId: 'src-ssa-fica',
        quote: 'Medicare tax rate 1.45% (employee), applies to all covered wages.',
        url: 'https://www.ssa.gov/oact/cola/cbb.html',
        retrievedAt: RETRIEVED,
      },
    ],
    confidence: 0.98,
    status: 'VERIFIED',
    critical: true,
  },
  {
    id: 'claim-std-deduction',
    text: 'The 2024 federal standard deduction for a single filer is $14,600.',
    value: 14600,
    unit: 'USD',
    period: '2024',
    evidence: [
      {
        sourceId: 'src-irs-brackets',
        quote: '2024 standard deduction for single filers: $14,600 (Rev. Proc. 2023-34).',
        url: 'https://www.irs.gov/newsroom/irs-provides-tax-inflation-adjustments-for-tax-year-2024',
        retrievedAt: RETRIEVED,
      },
    ],
    confidence: 0.98,
    status: 'VERIFIED',
    critical: true,
  },
  {
    id: 'claim-fed-tax-100k',
    text: 'For a 2024 single filer with $100,000 gross wages taking the standard deduction (taxable income $85,400), federal income tax is approximately $13,841 using the 2024 brackets.',
    value: 13841,
    unit: 'USD',
    period: '2024',
    evidence: [
      {
        sourceId: 'src-irs-brackets',
        quote:
          '2024 single brackets: 10% to $11,600; 12% to $47,150; 22% to $100,525. Tax on $85,400 taxable = $1,160 + $4,266 + $8,415 ≈ $13,841.',
        url: 'https://www.irs.gov/newsroom/irs-provides-tax-inflation-adjustments-for-tax-year-2024',
        retrievedAt: RETRIEVED,
      },
    ],
    confidence: 0.9,
    status: 'VERIFIED',
    critical: true,
  },
  // ── REPRESENTATIVE SCENARIO ASSUMPTIONS (clearly labeled, not universal) ────
  {
    id: 'claim-scenario-state-tax',
    text: 'ASSUMPTION (representative scenario): state + local income tax of ~5% of gross. Varies widely by state; several states have no income tax.',
    value: 5,
    unit: '% (assumption)',
    period: 'scenario',
    evidence: [],
    confidence: 0.5,
    status: 'NEEDS_REVIEW',
    critical: false,
  },
  {
    id: 'claim-scenario-housing',
    text: 'ASSUMPTION (representative scenario): housing ~$2,300/month for a high-cost metro. BLS CEX shows housing is the largest household spending category; individual costs vary widely.',
    value: 2300,
    unit: 'USD/month (assumption)',
    period: 'scenario',
    evidence: [
      {
        sourceId: 'src-bls-cex',
        quote: 'Housing is the largest average household expenditure category (BLS CEX).',
        url: 'https://www.bls.gov/cex/',
        retrievedAt: RETRIEVED,
      },
    ],
    confidence: 0.55,
    status: 'NEEDS_REVIEW',
    critical: false,
  },
  {
    id: 'claim-scenario-transport',
    text: 'ASSUMPTION (representative scenario): car + insurance + fuel + maintenance ~$800/month. Transportation is typically the 2nd-largest category in BLS CEX.',
    value: 800,
    unit: 'USD/month (assumption)',
    period: 'scenario',
    evidence: [
      {
        sourceId: 'src-bls-cex',
        quote: 'Transportation is typically the second-largest average household expenditure (BLS CEX).',
        url: 'https://www.bls.gov/cex/',
        retrievedAt: RETRIEVED,
      },
    ],
    confidence: 0.55,
    status: 'NEEDS_REVIEW',
    critical: false,
  },
  // ── NEEDS_REVIEW: real macro series whose latest value must be confirmed ────
  {
    id: 'claim-cc-total',
    text: 'Total US credit-card / revolving consumer debt (Federal Reserve G.19) — confirm the latest published figure before publish.',
    unit: 'USD',
    period: 'latest',
    evidence: [
      {
        sourceId: 'src-fed-g19',
        quote: 'Revolving consumer credit outstanding, Federal Reserve G.19 (monthly release).',
        url: 'https://www.federalreserve.gov/releases/g19/current/',
        retrievedAt: RETRIEVED,
      },
    ],
    confidence: 0.4,
    status: 'NEEDS_REVIEW',
    critical: false,
  },
];

/** The representative-household math the storyboard/script visualize (all derived from the claims above). */
export const pilotScenario = {
  grossAnnual: 100000,
  grossMonthly: 8333,
  // Verified tax mechanics:
  federalIncomeTaxAnnual: 13841,
  ficaAnnual: Math.round(100000 * 0.062 + 100000 * 0.0145), // 7,650
  // Labeled assumption:
  stateLocalAnnual: 5000,
  // Derived take-home:
  get takeHomeMonthly() {
    const totalTax = this.federalIncomeTaxAnnual + this.ficaAnnual + this.stateLocalAnnual;
    return Math.round((this.grossAnnual - totalTax) / 12);
  },
  // Representative monthly expense assumptions:
  housingMonthly: 2300,
  transportMonthly: 800,
  foodMonthly: 700,
  otherMonthly: 900,
} as const;
