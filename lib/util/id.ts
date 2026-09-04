import {randomUUID} from 'node:crypto';

export function uuid(): string {
  return randomUUID();
}

/** Short id for jobs/log lines where a full UUID is noisy. */
export function shortId(): string {
  return randomUUID().slice(0, 8);
}

export function nowIso(): string {
  return new Date().toISOString();
}
