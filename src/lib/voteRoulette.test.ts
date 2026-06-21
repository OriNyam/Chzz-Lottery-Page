import { describe, expect, it } from "vitest";
import {
  drawVoteOption,
  findMergeTargetOption,
  getVoteLabelSimilarity,
  normalizeVoteLabel,
  normalizeVoteLabelForMerge,
  parseVoteMessage,
} from "./voteRoulette";
import type { VoteOption } from "../types";

const author = {
  userIdHash: "viewer-1",
  nickname: "tester",
  badges: [],
  subscribe: true,
};

const options: VoteOption[] = [
  { id: "a", label: "참치", author, count: 1, voters: [author] },
  { id: "b", label: "연어", author, count: 1, voters: [author] },
];

describe("parseVoteMessage", () => {
  it("extracts a roulette option from bang-prefixed chat", () => {
    expect(parseVoteMessage("!참치")).toBe("참치");
    expect(parseVoteMessage(" !  참치   김밥 ")).toBe("참치 김밥");
  });

  it("ignores normal chat and empty bang commands", () => {
    expect(parseVoteMessage("참치")).toBeNull();
    expect(parseVoteMessage("!   ")).toBeNull();
  });

  it("rejects labels longer than 12 characters", () => {
    expect(parseVoteMessage("!123456789012")).toBe("123456789012");
    expect(parseVoteMessage("!1234567890123")).toBeNull();
    expect(parseVoteMessage("1234567890123", true)).toBeNull();
  });

  it("can accept normal chat for temporary testing", () => {
    expect(parseVoteMessage("참치", true)).toBe("참치");
    expect(parseVoteMessage("!참치", true)).toBe("참치");
  });
});

describe("normalizeVoteLabel", () => {
  it("normalizes whitespace and casing for duplicate detection", () => {
    expect(normalizeVoteLabel("  ABC   참치 ")).toBe("abc 참치");
  });
});

describe("vote option merging", () => {
  it("compares labels after removing whitespace", () => {
    expect(normalizeVoteLabelForMerge(" 참 치  김 밥 ")).toBe("참치김밥");
    expect(getVoteLabelSimilarity("참 치 김밥", "참치김밥")).toBe(1);
  });

  it("finds an existing option when labels match by at least 70 percent", () => {
    expect(findMergeTargetOption("참 치", options)?.label).toBe("참치");
    expect(findMergeTargetOption("완전히다른말", options)).toBeNull();
  });

  it("uses Hangul sound comparison for romanized options", () => {
    expect(getVoteLabelSimilarity("chamchi", "참치")).toBeGreaterThanOrEqual(0.7);
  });
});

describe("drawVoteOption", () => {
  it("draws from a securely shuffled candidate list", () => {
    const result = drawVoteOption(options, (items) => [items[1], items[0]]);

    expect(result.winner.label).toBe("연어");
    expect(result.candidates).toEqual(options);
    expect(result.shuffledCandidates.map((option) => option.id)).toEqual([
      "b",
      "a",
    ]);
  });

  it("throws when no option exists", () => {
    expect(() => drawVoteOption([])).toThrow("룰렛에 들어간 후보가 없습니다.");
  });
});
