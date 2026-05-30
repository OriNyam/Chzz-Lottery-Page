import { ChzzkClient } from "chzzk";
import type { Channel } from "../types";

const BASE_URLS = {
  chzzkBaseUrl: "/api/proxy/chzzkBase",
  gameBaseUrl: "/api/proxy/gameBase",
};

function extractChannelId(input: string): string | null {
  const trimmed = input.trim();

  try {
    const url = new URL(trimmed);
    const path = url.pathname.split("/").filter(Boolean).pop() ?? "";
    return /^[A-Za-z0-9]{32}$/.test(path) ? path : null;
  } catch {
    return /^[A-Za-z0-9]{32}$/.test(trimmed) ? trimmed : null;
  }
}

export async function findChannel(input: string): Promise<Channel | null> {
  const channelId = extractChannelId(input);
  if (!channelId) return null;

  const client = new ChzzkClient({ baseUrls: BASE_URLS });
  const channel = await client.channel(channelId);
  if (!channel) return null;

  return {
    channelId: channel.channelId,
    channelImageUrl: channel.channelImageUrl ?? "",
    channelName: channel.channelName,
    verifiedMark: channel.verifiedMark,
    followerCount: channel.followerCount,
  };
}
