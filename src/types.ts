export interface Channel {
  channelId: string;
  channelImageUrl: string;
  channelName: string;
  verifiedMark: boolean;
  followerCount: number;
}

export interface Viewer {
  userIdHash: string;
  nickname: string;
  badges: string[];
  subscribe: boolean;
}

export interface DrawOptions {
  subscriberOnly: boolean;
  excludePreviousWinners: boolean;
}

export interface DrawResult {
  winner: Viewer;
  candidates: Viewer[];
  shuffledCandidates: Viewer[];
  drawnAt: string;
}

export interface VoteOption {
  id: string;
  label: string;
  author: Viewer;
  count: number;
}

export interface VoteRouletteResult {
  winner: VoteOption;
  candidates: VoteOption[];
  shuffledCandidates: VoteOption[];
  drawnAt: string;
}
