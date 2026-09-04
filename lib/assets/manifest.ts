import type {Asset, AssetType, Episode} from '@/lib/schemas';
import {shortId, nowIso} from '@/lib/util/id';

/**
 * Asset manifest helpers.
 *
 * Assets are tracked on the episode. Before generating a new asset, prefer
 * reusing an existing one with the same reuseKey (type + label) to save cost.
 */
export function reuseKey(type: AssetType, label: string): string {
  return `${type}:${label}`;
}

export function findReusable(episode: Episode, type: AssetType, label: string): Asset | undefined {
  return episode.assets.find(
    (a) => a.type === type && a.label === label && a.source !== 'placeholder',
  );
}

export function makeAsset(input: Omit<Asset, 'id' | 'createdAt'> & {id?: string}): Asset {
  return {
    id: input.id ?? `asset-${shortId()}`,
    createdAt: nowIso(),
    ...input,
  };
}

export function upsertAsset(episode: Episode, asset: Asset): Episode {
  const existing = episode.assets.findIndex((a) => a.id === asset.id);
  const assets = [...episode.assets];
  if (existing >= 0) assets[existing] = asset;
  else assets.push(asset);
  return {...episode, assets};
}

export function attachAssetToScene(episode: Episode, sceneId: number, assetId: string): Episode {
  const scenes = episode.scenes.map((s) =>
    s.id === sceneId && !s.assetRefs.includes(assetId)
      ? {...s, assetRefs: [...s.assetRefs, assetId]}
      : s,
  );
  return {...episode, scenes};
}
