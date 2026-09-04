import type {z} from 'zod';

/**
 * Robust JSON extraction + validation for LLM output.
 *
 * Models sometimes wrap JSON in prose or ```json fences. We strip those, parse,
 * and validate against a Zod schema. Any failure returns null so callers can
 * fall back to a deterministic scaffold — the pipeline never crashes on a bad
 * model response, and never trusts unvalidated output.
 */
export function extractJson(text: string): unknown | null {
  if (!text) return null;
  const trimmed = text.trim();

  // Fenced ```json ... ``` block.
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fence ? fence[1] : trimmed;

  // Fall back to the first {...} or [...] span if there is surrounding prose.
  const start = candidate.search(/[{[]/);
  if (start === -1) return null;
  const end = Math.max(candidate.lastIndexOf('}'), candidate.lastIndexOf(']'));
  if (end <= start) return null;

  const slice = candidate.slice(start, end + 1);
  try {
    return JSON.parse(slice);
  } catch {
    return null;
  }
}

export function parseWith<T>(schema: z.ZodType<T>, text: string): T | null {
  const raw = extractJson(text);
  if (raw === null) return null;
  const result = schema.safeParse(raw);
  return result.success ? result.data : null;
}
