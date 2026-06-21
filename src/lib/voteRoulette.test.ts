import { describe, expect, it } from "vitest";
import {
  drawVoteOption,
  normalizeVoteLabel,
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
  { id: "a", label: "참치", author, count: 1 },
  { id: "b", label: "연어", author, count: 1 },
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
});

describe("normalizeVoteLabel", () => {
  it("normalizes whitespace and casing for duplicate detection", () => {
    expect(normalizeVoteLabel("  ABC   참치 ")).toBe("abc 참치");
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
