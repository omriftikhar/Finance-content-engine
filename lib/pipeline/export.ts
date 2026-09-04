import 'server-only';
import {promises as fs} from 'node:fs';
import path from 'node:path';
import type {Episode} from '@/lib/schemas';
import {costBreakdown} from './cost';
import {checkApproval} from './approval';

/**
 * Publish package export.
 *
 * Writes /exports/{episode-id}/ with the artifacts a human uploads manually:
 *   video.mp4 (if rendered), thumbnail.png (concept placeholder), metadata.json,
 *   description.txt, chapters.txt, sources.json, script.txt
 * We never auto-upload to YouTube.
 */
export interface ExportResult {
  dir: string;
  files: string[];
  warnings: string[];
}

function fmtTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export async function exportPublishPackage(episode: Episode): Promise<ExportResult> {
  const dir = path.join(process.cwd(), 'exports', episode.id);
  await fs.mkdir(dir, {recursive: true});
  const files: string[] = [];
  const warnings: string[] = [];

  const approval = checkApproval(episode);
  if (!approval.canApprove) {
    warnings.push(
      `${approval.blockingClaims.length} critical claim(s) are not VERIFIED — this package is NOT publish-approved.`,
    );
  }

  const pk = episode.packaging;
  const topTitle = pk?.titles[0]?.text ?? episode.title;

  // metadata.json
  const metadata = {
    id: episode.id,
    topic: episode.topic,
    selectedTitle: topTitle,
    titleCandidates: pk?.titles ?? [],
    thumbnails: pk?.thumbnails ?? [],
    keywords: pk?.keywords ?? [],
    shorts: pk?.shorts ?? [],
    pinnedComment: pk?.pinnedComment ?? '',
    targetMinutes: episode.targetMinutes,
    cost: costBreakdown(episode),
    approved: approval.canApprove,
    exportedAt: new Date().toISOString(),
  };
  await write(dir, 'metadata.json', JSON.stringify(metadata, null, 2), files);

  // description.txt
  await write(dir, 'description.txt', pk?.description ?? '', files);

  // chapters.txt
  const chapters = (pk?.chapters ?? []).map((c) => `${fmtTime(c.startSec)} ${c.label}`).join('\n');
  await write(dir, 'chapters.txt', chapters, files);

  // sources.json — full traceability of claims + evidence
  const sources = {
    sources: episode.sources,
    claims: episode.claims.map((c) => ({
      id: c.id,
      text: c.text,
      status: c.status,
      critical: c.critical,
      confidence: c.confidence,
      evidence: c.evidence,
    })),
  };
  await write(dir, 'sources.json', JSON.stringify(sources, null, 2), files);

  // script.txt
  const script = (episode.script?.beats ?? [])
    .map((b) => `## ${b.type.toUpperCase()}\n${b.text}`)
    .join('\n\n');
  await write(dir, 'script.txt', script, files);

  // thumbnail.png / video.mp4 — copy rendered artifacts if present as assets.
  const videoAsset = episode.assets.find((a) => a.type === 'video' && a.localPath);
  if (videoAsset?.localPath) {
    await copyIfExists(videoAsset.localPath, path.join(dir, 'video.mp4'), files, warnings);
  } else {
    warnings.push('No rendered video.mp4 found — render the episode before publishing.');
  }
  const thumbAsset = episode.assets.find((a) => a.type === 'thumbnail' && a.localPath);
  if (thumbAsset?.localPath) {
    await copyIfExists(thumbAsset.localPath, path.join(dir, 'thumbnail.png'), files, warnings);
  } else {
    warnings.push('No thumbnail.png asset found — produce a thumbnail from a concept before publishing.');
  }

  return {dir, files, warnings};
}

async function write(dir: string, name: string, content: string, files: string[]) {
  await fs.writeFile(path.join(dir, name), content, 'utf8');
  files.push(name);
}

async function copyIfExists(src: string, dest: string, files: string[], warnings: string[]) {
  try {
    await fs.copyFile(src, dest);
    files.push(path.basename(dest));
  } catch {
    warnings.push(`Could not copy ${src} → ${path.basename(dest)}.`);
  }
}
