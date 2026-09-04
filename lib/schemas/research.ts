import {z} from 'zod';

/**
 * Financial research contracts.
 *
 * Core principle: an LLM may *draft* financial claims, but every important
 * numeric/factual claim must be traceable to an authoritative US source with
 * an evidence fragment, a retrieval date and an explicit verification status.
 * Unsupported critical claims must block final approval.
 */

export const SOURCE_AUTHORITIES = [
  'IRS',
  'FEDERAL_RESERVE',
  'FRED',
  'BLS',
  'CFPB',
  'SEC',
  'FINRA',
  'US_TREASURY',
  'CENSUS',
  'OTHER_OFFICIAL',
  'REPUTABLE_MEDIA',
  'UNKNOWN',
] as const;
export const SourceAuthority = z.enum(SOURCE_AUTHORITIES);
export type SourceAuthority = z.infer<typeof SourceAuthority>;

/** Higher = more authoritative for financial claims. Used for ranking/sorting. */
export const AUTHORITY_WEIGHT: Record<SourceAuthority, number> = {
  IRS: 100,
  FEDERAL_RESERVE: 100,
  FRED: 95,
  US_TREASURY: 95,
  BLS: 95,
  CFPB: 90,
  SEC: 90,
  FINRA: 85,
  CENSUS: 85,
  OTHER_OFFICIAL: 70,
  REPUTABLE_MEDIA: 40,
  UNKNOWN: 0,
};

export const ResearchSourceSchema = z.object({
  id: z.string(),
  name: z.string(),
  authority: SourceAuthority,
  url: z.string().url().optional(),
  publisher: z.string().optional(),
  /** ISO date the data was retrieved/checked. */
  retrievedAt: z.string().optional(),
  note: z.string().default(''),
});
export type ResearchSource = z.infer<typeof ResearchSourceSchema>;

export const EvidenceSchema = z.object({
  sourceId: z.string(),
  /** Verbatim fragment supporting the claim. */
  quote: z.string(),
  url: z.string().url().optional(),
  retrievedAt: z.string().optional(),
  page: z.string().optional(),
});
export type Evidence = z.infer<typeof EvidenceSchema>;

export const VERIFICATION_STATUSES = [
  'VERIFIED',
  'NEEDS_REVIEW',
  'UNSUPPORTED',
] as const;
export const VerificationStatus = z.enum(VERIFICATION_STATUSES);
export type VerificationStatus = z.infer<typeof VerificationStatus>;

export const FinancialClaimSchema = z.object({
  id: z.string(),
  /** The claim as it will appear (or be paraphrased) in the script. */
  text: z.string(),
  /** Structured value where the claim is numeric, for chart/animation binding. */
  value: z.number().optional(),
  unit: z.string().optional(),
  /** e.g. "2024", "Q3 2023" — the period the figure describes. */
  period: z.string().optional(),
  evidence: z.array(EvidenceSchema).default([]),
  confidence: z.number().min(0).max(1).default(0),
  status: VerificationStatus.default('NEEDS_REVIEW'),
  /** If true, leaving this UNSUPPORTED blocks final publish approval. */
  critical: z.boolean().default(false),
});
export type FinancialClaim = z.infer<typeof FinancialClaimSchema>;

export const ResearchBundleSchema = z.object({
  sources: z.array(ResearchSourceSchema).default([]),
  claims: z.array(FinancialClaimSchema).default([]),
});
export type ResearchBundle = z.infer<typeof ResearchBundleSchema>;

/** A claim is blocking if it is critical and not verified. */
export function isBlockingClaim(claim: FinancialClaim): boolean {
  return claim.critical && claim.status !== 'VERIFIED';
}
