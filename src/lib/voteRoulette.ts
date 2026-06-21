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
