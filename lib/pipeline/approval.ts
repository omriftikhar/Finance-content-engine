import type {Episode} from '@/lib/schemas';
import {isBlockingClaim} from '@/lib/schemas';

/**
 * Publish-approval gate.
 *
 * A critical financial claim that is not VERIFIED blocks final approval. This is
 * the human-in-the-loop guarantee that no unverified statistic reaches publish.
 */
export interface ApprovalCheck {
  canApprove: boolean;
  blockingClaims: {id: string; text: string; status: string}[];
  needsReview: {id: string; text: string}[];
}

export function checkApproval(episode: Episode): ApprovalCheck {
  const blocking = episode.claims.filter(isBlockingClaim);
  const needsReview = episode.claims.filter((c) => c.status === 'NEEDS_REVIEW' && !c.critical);
  return {
    canApprove: blocking.length === 0,
    blockingClaims: blocking.map((c) => ({id: c.id, text: c.text, status: c.status})),
    needsReview: needsReview.map((c) => ({id: c.id, text: c.text})),
  };
}
