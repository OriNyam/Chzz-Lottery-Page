import { describe, expect, it } from "vitest";
import { drawViewer, selectEligibleViewers } from "./draw";
import type { DrawOptions, Viewer } from "../types";

const viewers: Viewer[] = [
  {
    userIdHash: "viewer-a",
    nickname: "A",
    badges: [],
    subscribe: false,
  },
  {
    userIdHash: "viewer-b",
    nickname: "B",
    badges: [],
    subscribe: true,
  },
  {
    userIdHash: "viewer-c",
    nickname: "C",
    badges: [],
    subscribe: true,
  },
];

function options(
  overrides: Partial<DrawOptions> = {}
): DrawOptions {
  return {
    subscriberOnly: false,
    excludePreviousWinners: false,
    ...overrides,
  };
}

describe("selectEligibleViewers", () => {
  it("keeps all collected viewers when options are disabled", () => {
    expect(selectEligibleViewers(viewers, [], options())).toEqual(viewers);
  });

  it("keeps only subscribers when subscriber-only mode is enabled", () => {
    expect(
      selectEligibleViewers(viewers, [], options({ subscriberOnly: true }))
    ).toEqual([viewers[1], viewers[2]]);
  });

  it("excludes previous winners when exclusion is enabled", () => {
    expect(
      selectEligibleViewers(
        viewers,
        [viewers[1]],
        options({ excludePreviousWinners: true })
      )
    ).toEqual([viewers[0], viewers[2]]);
  });

  it("combines subscriber-only and previous-winner exclusion", () => {
    expect(
      selectEligibleViewers(
        viewers,
        [viewers[1]],
        options({
          subscriberOnly: true,
          excludePreviousWinners: true,
        })
      )
    ).toEqual([viewers[2]]);
  });
});

describe("drawViewer", () => {
  it("always applies the shuffle after filtering eligible viewers", () => {
    const calls: string[][] = [];
    const result = drawViewer(
      viewers,
      [viewers[1]],
      options({
        subscriberOnly: true,
        excludePreviousWinners: true,
      }),
      (candidates) => {
        calls.push(
          candidates.map((candidate) => (candidate as Viewer).userIdHash)
        );
        return [...candidates];
      }
    );

    expect(calls).toEqual([["viewer-c"]]);
    expect(result.winner).toEqual(viewers[2]);
  });

  it("throws instead of drawing when no eligible viewer remains", () => {
    expect(() =>
      drawViewer(
        viewers,
        [viewers[1], viewers[2]],
        options({
          subscriberOnly: true,
          excludePreviousWinners: true,
        })
      )
    ).toThrow("추첨 가능한 참여자가 없습니다.");
  });
});
