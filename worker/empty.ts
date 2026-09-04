// Stub for `server-only` when running standalone under tsx (worker/scripts).
// In Next.js the real `server-only` guard applies; the worker runs in Node,
// where these modules are legitimately executed server-side.
export {};
