import { similarityScore } from '../fuzzy.js';
import type { MatchResult, PlanItemWithPlan, Song, SuggestedSong } from '../types.js';

type MatchProgress = {
  processed: number;
  total: number;
};

type MatchOptions = {
  onProgress?: (progress: MatchProgress) => void;
  progressEvery?: number;
};

export const buildMatchResults = (
  items: PlanItemWithPlan[],
  songs: Song[],
  threshold: number,
  delta: number,
  options: MatchOptions = {}
): MatchResult[] => {
  const results: MatchResult[] = [];
  const total = items.length;
  const progressEvery = options.progressEvery ?? Math.max(1, Math.floor(total / 20));
  let processed = 0;
  for (const item of items) {
    processed += 1;
    if (!item.attributes.title) {
      if (options.onProgress && (processed % progressEvery === 0 || processed === total)) {
        options.onProgress({ processed, total });
      }
      continue;
    }
    let bestScore = 0;
    const candidates: SuggestedSong[] = [];
    for (const song of songs) {
      const score = similarityScore(item.attributes.title, song.attributes.title);
      if (score >= threshold) {
        candidates.push({ song, score });
      }
      if (score > bestScore) {
        bestScore = score;
      }
    }
    if (bestScore >= threshold) {
      const cutoff = Math.max(threshold, bestScore - delta);
      const matches = candidates
        .filter((candidate) => candidate.score >= cutoff)
        .sort((a, b) => b.score - a.score);
      if (matches.length > 0) {
        results.push({ item, matches, bestScore });
      }
    }
    if (options.onProgress && (processed % progressEvery === 0 || processed === total)) {
      options.onProgress({ processed, total });
    }
  }
  return results.sort((a, b) => b.bestScore - a.bestScore);
};
