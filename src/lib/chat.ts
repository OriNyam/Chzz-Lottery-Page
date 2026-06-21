import { ChzzkChat, type DonationEvent, type Profile } from "chzzk";
import type { Viewer } from "../types";

const BASE_URLS = {
  chzzkBaseUrl: "/api/proxy/chzzkBase",
  gameBaseUrl: "/api/proxy/gameBase",
};

function profileToViewer(profile: Profile): Viewer {
  const badges: string[] = [];

  if (profile.badge?.imageUrl) badges.push(profile.badge.imageUrl);
  if (profile.streamingProperty.subscription?.badge.imageUrl) {
    badges.push(profile.streamingProperty.subscription.badge.imageUrl);
  }
  for (const badge of profile.activityBadges ?? []) {
    if (badge.imageUrl) badges.push(badge.imageUrl);
  }

  return {
    userIdHash: profile.userIdHash,
    nickname: profile.nickname,
    badges,
    subscribe: Boolean(profile.streamingProperty.subscription),
  };
}

function anonymousDonationViewer(donation: DonationEvent): Viewer {
  return {
    userIdHash: `anonymous-donation-${donation.time}`,
    nickname: donation.extras.nickname ?? "익명 후원자",
    badges: [],
    subscribe: false,
  };
}

function safeJsonParse(value: unknown): unknown {
  if (typeof value !== "string") return value;

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function rawProfileToViewer(
  profile: unknown,
  fallbackNickname = "익명 후원자",
  fallbackUserId = fallbackNickname
): Viewer {
  const parsed = safeJsonParse(profile) as Partial<Profile> | null;

  if (parsed?.userIdHash && parsed.nickname && parsed.streamingProperty) {
    return profileToViewer(parsed as Profile);
  }

  return {
    userIdHash: `anonymous-donation-${fallbackUserId}`,
    nickname: fallbackNickname,
    badges: [],
    subscribe: false,
  };
}

function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/[^\d.-]/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function rawDonationKey(
  viewer: Viewer,
  message: string,
  payAmount: number,
  time: unknown
): string {
  return `${time ?? ""}:${viewer.userIdHash}:${payAmount}:${message}`;
}

function extractRawDonation(raw: unknown) {
  const payload = raw as {
    cmd?: number;
    bdy?: unknown;
  };
  const body = payload.bdy as
    | {
        messageList?: unknown[];
      }
    | unknown[]
    | undefined;
  const messages = Array.isArray(body)
    ? body
    : Array.isArray(body?.messageList)
      ? body.messageList
      : body
        ? [body]
        : [];

  for (const messageBody of messages) {
    const chat = messageBody as Record<string, unknown>;
    const extras = safeJsonParse(chat.extras) as Record<string, unknown> | null;
    const messageType = chat.msgTypeCode ?? chat.messageTypeCode;
    const isDonation =
      payload.cmd === 93102 ||
      messageType === 10 ||
      messageType === "10" ||
      Boolean(extras?.donationType);

    if (!isDonation) continue;

    const payAmount = toNumber(
      extras?.payAmount ?? chat.payAmount ?? chat.pay_amount
    );
    const nickname =
      typeof extras?.nickname === "string" && extras.nickname.trim()
        ? extras.nickname
        : "익명 후원자";
    const time = chat.msgTime ?? chat.messageTime;
    const viewer = rawProfileToViewer(chat.profile, nickname, String(time ?? nickname));
    const donationMessage =
      String(chat.msg ?? chat.content ?? extras?.message ?? "").trim();

    return {
      viewer,
      message: donationMessage,
      payAmount,
      key: rawDonationKey(
        viewer,
        donationMessage,
        payAmount,
        time
      ),
    };
  }

  return null;
}

export interface ChatConnection {
  disconnect: () => void;
}

export async function connectChat(
  channelId: string,
  onChat: (viewer: Viewer, message: string) => void,
  onStatus: (status: "connected" | "error") => void
): Promise<ChatConnection> {
  const client = new ChzzkChat({
    channelId,
    pollInterval: 30_000,
    baseUrls: BASE_URLS,
  });

  client.on("connect", () => onStatus("connected"));
  client.on("chat", (chat) =>
    onChat(profileToViewer(chat.profile), chat.message)
  );

  try {
    await client.connect();
  } catch {
    onStatus("error");
    throw new Error("치지직 채팅 연결에 실패했습니다.");
  }

  return {
    disconnect: () => client.disconnect(),
  };
}

export async function connectDonation(
  channelId: string,
  onDonation: (viewer: Viewer, message: string, payAmount: number) => void,
  onStatus: (status: "connected" | "error") => void
): Promise<ChatConnection> {
  const client = new ChzzkChat({
    channelId,
    pollInterval: 30_000,
    baseUrls: BASE_URLS,
  });
  const handledDonationKeys = new Set<string>();

  function handleDonation(viewer: Viewer, message: string, payAmount: number, key: string) {
    if (handledDonationKeys.has(key)) return;
    handledDonationKeys.add(key);
    onDonation(viewer, message, payAmount);
  }

  client.on("connect", () => onStatus("connected"));
  client.on("donation", (donation) => {
    const viewer = donation.profile
      ? profileToViewer(donation.profile)
      : anonymousDonationViewer(donation);

    handleDonation(
      viewer,
      donation.message,
      donation.extras.payAmount,
      rawDonationKey(
        viewer,
        donation.message,
        donation.extras.payAmount,
        donation.time
      )
    );
  });
  client.on("raw", (raw) => {
    const donation = extractRawDonation(raw);
    if (!donation) return;

    handleDonation(
      donation.viewer,
      donation.message,
      donation.payAmount,
      donation.key
    );
  });

  try {
    await client.connect();
  } catch {
    onStatus("error");
    throw new Error("치지직 후원 메시지 연결에 실패했습니다.");
  }

  return {
    disconnect: () => client.disconnect(),
  };
}
