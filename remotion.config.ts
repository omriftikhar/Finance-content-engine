import {Config} from '@remotion/cli/config';
import {webpackOverride} from './video/webpack-override';

// Applies the `@/*` alias to Remotion Studio + CLI renders.
Config.overrideWebpackConfig(webpackOverride);
Config.setVideoImageFormat('jpeg');
