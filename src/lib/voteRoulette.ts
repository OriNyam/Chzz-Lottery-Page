import { secureShuffle } from "./fairRandom";
import type { VoteOption, VoteRouletteResult } from "../types";

export function parseVoteMessage(message: string): string | null {
  const trimmed = message.trim();

  if (!trimmed.startsWith("!")) return null;

  const label = trimmed.slice(1).trim().replace(/\s+/g, " ");
  return label.length > 0 ? label : null;
}

export function normalizeVoteLabel(label: string): string {
  return label.trim().replace(/\s+/g, " ").toLocaleLowerCase("ko-KR");
}

export function normalizeVoteLabelForMerge(label: string): string {
  return label.replace(/\s+/g, "").toLocaleLowerCase("ko-KR");
}

export function getVoteLabelSimilarity(source: string, target: string): number {
  const left = normalizeVoteLabelForMerge(source);
  const right = normalizeVoteLabelForMerge(target);

  if (left.length === 0 || right.length === 0) return 0;

  const previous = Array.from({ length: right.length + 1 }, () => 0);
  const current = Array.from({ length: right.length + 1 }, () => 0);

  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      current[rightIndex] =
        left[leftIndex - 1] === right[rightIndex - 1]
          ? previous[rightIndex - 1] + 1
          : Math.max(previous[rightIndex], current[rightIndex - 1]);
    }

    for (let index = 0; index <= right.length; index += 1) {
      previous[index] = current[index];
      current[index] = 0;
    }
  }

  return previous[right.length] / Math.max(left.length, right.length);
}

export function findMergeTargetOption<T extends { label: string }>(
  label: string,
  options: readonly T[],
  threshold = 0.7
): T | null {
  let bestMatch: T | null = null;
  let bestScore = threshold;

  for (const option of options) {
    const score = getVoteLabelSimilarity(label, option.label);
    if (score >= bestScore) {
      bestMatch = option;
      bestScore = score;
    }
  }

  return bestMatch;
}

export function drawVoteOption(
  options: readonly VoteOption[],
  shuffle: typeof secureShuffle = secureShuffle
): VoteRouletteResult {
  if (options.length === 0) {
    throw new Error("룰렛에 들어간 후보가 없습니다.");
  }

  const shuffledCandidates = shuffle(options);

  return {
    winner: shuffledCandidates[0],
    candidates: [...options],
    shuffledCandidates,
    drawnAt: new Date().toISOString(),
  };
}
