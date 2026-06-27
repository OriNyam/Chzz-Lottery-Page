import { secureShuffle } from "./fairRandom";
import { selectEligibleViewers } from "./draw";
import type { DrawOptions, Viewer } from "../types";

export interface ThreeDrawOrbAssignment {
  id: string;
  winner: Viewer;
}

export function createThreeDrawOrbAssignments(
  viewers: readonly Viewer[],
  previousWinners: readonly Viewer[],
  options: DrawOptions
): ThreeDrawOrbAssignment[] {
  const candidates = selectEligibleViewers(viewers, previousWinners, options);

  if (candidates.length === 0) {
    throw new Error("추첨 가능한 참여자가 없습니다.");
  }

  const winnerCount = Math.min(5, candidates.length);
  const winners = secureShuffle(candidates).slice(0, winnerCount);

  return secureShuffle(winners).map((winner, index) => ({
    id: `three-draw-orb-${index}-${winner.userIdHash}`,
    winner,
  }));
}
