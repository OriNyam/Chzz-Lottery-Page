import { secureShuffle } from "./fairRandom";
import type { DrawOptions, DrawResult, Viewer } from "../types";

export function selectEligibleViewers(
  viewers: readonly Viewer[],
  previousWinners: readonly Viewer[],
  options: DrawOptions
): Viewer[] {
  const previousWinnerIds = new Set(
    previousWinners.map((viewer) => viewer.userIdHash)
  );

  return viewers.filter(
    (viewer) =>
      (!options.subscriberOnly || viewer.subscribe) &&
      (!options.excludePreviousWinners ||
        !previousWinnerIds.has(viewer.userIdHash))
  );
}

export function drawViewer(
  viewers: readonly Viewer[],
  previousWinners: readonly Viewer[],
  options: DrawOptions,
  shuffle: typeof secureShuffle = secureShuffle
): DrawResult {
  const candidates = selectEligibleViewers(viewers, previousWinners, options);

  if (candidates.length === 0) {
    throw new Error("추첨 가능한 참여자가 없습니다.");
  }

  const shuffledCandidates = shuffle(candidates);

  return {
    winner: shuffledCandidates[0],
    candidates,
    shuffledCandidates,
    drawnAt: new Date().toISOString(),
  };
}
