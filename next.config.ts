import type {NextConfig} from 'next';
import path from 'node:path';

const nextConfig: NextConfig = {
  // Pin the workspace root so Next does not pick up an unrelated lockfile
  // higher up the filesystem (e.g. ~/package-lock.json).
  outputFileTracingRoot: path.join(__dirname),
  // No ESLint toolchain is configured in this repo; type-safety is enforced by
  // `tsc` in CI/build. Don't let a missing lint config block production builds.
  eslint: {ignoreDuringBuilds: true},
  // Optional heavy deps (@aws-sdk/client-s3, @supabase/supabase-js) are only
  // used by the worker / when configured; keep them external to the server bundle.
  serverExternalPackages: ['@aws-sdk/client-s3', '@supabase/supabase-js'],
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
};

export default nextConfig;
