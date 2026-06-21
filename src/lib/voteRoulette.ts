import { secureShuffle } from "./fairRandom";
import type { VoteOption, VoteRouletteResult } from "../types";

export const MAX_VOTE_LABEL_LENGTH = 12;
export const DONATION_WON_PER_VOTE = 1000;

const HANGUL_BASE_CODE = 0xac00;
const HANGUL_LAST_CODE = 0xd7a3;
const JUNGSEONG_COUNT = 21;
const JONGSEONG_COUNT = 28;

const CHOSEONG = [
  "ㄱ",
  "ㄲ",
  "ㄴ",
  "ㄷ",
  "ㄸ",
  "ㄹ",
  "ㅁ",
  "ㅂ",
  "ㅃ",
  "ㅅ",
  "ㅆ",
  "ㅇ",
  "ㅈ",
  "ㅉ",
  "ㅊ",
  "ㅋ",
  "ㅌ",
  "ㅍ",
  "ㅎ",
];
const JUNGSEONG = [
  "ㅏ",
  "ㅐ",
  "ㅑ",
  "ㅒ",
  "ㅓ",
  "ㅔ",
  "ㅕ",
  "ㅖ",
  "ㅗ",
  "ㅘ",
  "ㅙ",
  "ㅚ",
  "ㅛ",
  "ㅜ",
  "ㅝ",
  "ㅞ",
  "ㅟ",
  "ㅠ",
  "ㅡ",
  "ㅢ",
  "ㅣ",
];
const JONGSEONG = [
  "",
  "ㄱ",
  "ㄲ",
  "ㄳ",
  "ㄴ",
  "ㄵ",
  "ㄶ",
  "ㄷ",
  "ㄹ",
  "ㄺ",
  "ㄻ",
  "ㄼ",
  "ㄽ",
  "ㄾ",
  "ㄿ",
  "ㅀ",
  "ㅁ",
  "ㅂ",
  "ㅄ",
  "ㅅ",
  "ㅆ",
  "ㅇ",
  "ㅈ",
  "ㅊ",
  "ㅋ",
  "ㅌ",
  "ㅍ",
  "ㅎ",
];

const CHOSEONG_ROMAJA = [
  "g",
  "kk",
  "n",
  "d",
  "tt",
  "r",
  "m",
  "b",
  "pp",
  "s",
  "ss",
  "",
  "j",
  "jj",
  "ch",
  "k",
  "t",
  "p",
  "h",
];
const JUNGSEONG_ROMAJA = [
  "a",
  "ae",
  "ya",
  "yae",
  "eo",
  "e",
  "yeo",
  "ye",
  "o",
  "wa",
  "wae",
  "oe",
  "yo",
  "u",
  "wo",
  "we",
  "wi",
  "yu",
  "eu",
  "ui",
  "i",
];
const JONGSEONG_ROMAJA = [
  "",
  "k",
  "k",
  "k",
  "n",
  "n",
  "n",
  "t",
  "l",
  "k",
  "m",
  "l",
  "l",
  "l",
  "p",
  "l",
  "m",
  "p",
  "p",
  "t",
  "t",
  "ng",
  "t",
  "t",
  "k",
  "t",
  "p",
  "t",
];

export function parseVoteMessage(
  message: string,
  acceptPlainMessage = false
): string | null {
  const trimmed = message.trim();

  if (acceptPlainMessage) {
    const label = trimmed.startsWith("!") ? trimmed.slice(1).trim() : trimmed;
    const normalized = label.replace(/\s+/g, " ");
    return normalized.length > 0 && normalized.length <= MAX_VOTE_LABEL_LENGTH
      ? normalized
      : null;
  }

  if (!trimmed.startsWith("!")) return null;

  const label = trimmed.slice(1).trim().replace(/\s+/g, " ");
  return label.length > 0 && label.length <= MAX_VOTE_LABEL_LENGTH
    ? label
    : null;
}

export function normalizeVoteLabel(label: string): string {
  return label.trim().replace(/\s+/g, " ").toLocaleLowerCase("ko-KR");
}

export function getDonationVoteCount(payAmount: number): number {
  if (!Number.isFinite(payAmount) || payAmount < DONATION_WON_PER_VOTE) {
    return 0;
  }

  return Math.floor(payAmount / DONATION_WON_PER_VOTE);
}

export function normalizeVoteLabelForMerge(label: string): string {
  return label
    .normalize("NFKC")
    .replace(/\s+/g, "")
    .toLocaleLowerCase("ko-KR");
}

function decomposeHangul(label: string): string {
  return Array.from(normalizeVoteLabelForMerge(label))
    .map((character) => {
      const code = character.codePointAt(0) ?? 0;
      if (code < HANGUL_BASE_CODE || code > HANGUL_LAST_CODE) {
        return character;
      }

      const syllableIndex = code - HANGUL_BASE_CODE;
      const choseongIndex = Math.floor(
        syllableIndex / (JUNGSEONG_COUNT * JONGSEONG_COUNT)
      );
      const jungseongIndex = Math.floor(
        (syllableIndex % (JUNGSEONG_COUNT * JONGSEONG_COUNT)) /
          JONGSEONG_COUNT
      );
      const jongseongIndex = syllableIndex % JONGSEONG_COUNT;

      return `${CHOSEONG[choseongIndex]}${JUNGSEONG[jungseongIndex]}${JONGSEONG[jongseongIndex]}`;
    })
    .join("");
}

function romanizeHangul(label: string): string {
  return Array.from(normalizeVoteLabelForMerge(label))
    .map((character) => {
      const code = character.codePointAt(0) ?? 0;
      if (code < HANGUL_BASE_CODE || code > HANGUL_LAST_CODE) {
        return character;
      }

      const syllableIndex = code - HANGUL_BASE_CODE;
      const choseongIndex = Math.floor(
        syllableIndex / (JUNGSEONG_COUNT * JONGSEONG_COUNT)
      );
      const jungseongIndex = Math.floor(
        (syllableIndex % (JUNGSEONG_COUNT * JONGSEONG_COUNT)) /
          JONGSEONG_COUNT
      );
      const jongseongIndex = syllableIndex % JONGSEONG_COUNT;

      return `${CHOSEONG_ROMAJA[choseongIndex]}${JUNGSEONG_ROMAJA[jungseongIndex]}${JONGSEONG_ROMAJA[jongseongIndex]}`;
    })
    .join("");
}

function getEditSimilarity(left: string, right: string): number {
  if (left.length === 0 || right.length === 0) return 0;

  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  const current = Array.from({ length: right.length + 1 }, () => 0);

  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    current[0] = leftIndex;

    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const substitutionCost = left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1;
      current[rightIndex] = Math.min(
        previous[rightIndex] + 1,
        current[rightIndex - 1] + 1,
        previous[rightIndex - 1] + substitutionCost
      );
    }

    for (let index = 0; index <= right.length; index += 1) {
      previous[index] = current[index];
      current[index] = 0;
    }
  }

  return 1 - previous[right.length] / Math.max(left.length, right.length);
}

function getDiceSimilarity(left: string, right: string): number {
  if (left === right) return 1;
  if (left.length < 2 || right.length < 2) return 0;

  const leftBigrams = new Map<string, number>();
  for (let index = 0; index < left.length - 1; index += 1) {
    const bigram = left.slice(index, index + 2);
    leftBigrams.set(bigram, (leftBigrams.get(bigram) ?? 0) + 1);
  }

  let intersection = 0;
  for (let index = 0; index < right.length - 1; index += 1) {
    const bigram = right.slice(index, index + 2);
    const count = leftBigrams.get(bigram) ?? 0;
    if (count > 0) {
      leftBigrams.set(bigram, count - 1);
      intersection += 1;
    }
  }

  return (2 * intersection) / (left.length + right.length - 2);
}

export function getVoteLabelSimilarity(source: string, target: string): number {
  const sourceText = normalizeVoteLabelForMerge(source);
  const targetText = normalizeVoteLabelForMerge(target);
  const sourceJamo = decomposeHangul(source);
  const targetJamo = decomposeHangul(target);
  const sourceSound = romanizeHangul(source);
  const targetSound = romanizeHangul(target);

  return Math.max(
    getEditSimilarity(sourceText, targetText),
    getDiceSimilarity(sourceText, targetText),
    getEditSimilarity(sourceJamo, targetJamo),
    getDiceSimilarity(sourceJamo, targetJamo),
    getEditSimilarity(sourceSound, targetSound)
  );
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
