import path from 'node:path';
import type {WebpackOverrideFn} from '@remotion/bundler';

/**
 * Teaches the Remotion webpack bundle about the `@/*` path alias so video
 * components can import from `@/lib/...` and `@/data/...` just like the Next app.
 */
export const webpackOverride: WebpackOverrideFn = (config) => {
  return {
    ...config,
    resolve: {
      ...config.resolve,
      alias: {
        ...(config.resolve?.alias ?? {}),
        '@': path.join(process.cwd()),
      },
    },
  };
};
