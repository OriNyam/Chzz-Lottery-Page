import { useEffect, useMemo, useRef, useState } from "react";
import { connectChat, type ChatConnection } from "../lib/chat";
import { selectEligibleViewers } from "../lib/draw";
import { speakMessage, stopSpeaking } from "../lib/speech";
import {
  createThreeDrawOrbAssignments,
  type ThreeDrawOrbAssignment,
} from "../lib/threeDraw";
import type { DrawOptions, Viewer } from "../types";
import { CharacterStage } from "./CharacterStage";

type Screen = "ready" | "collecting" | "completed" | "stage";
type ChatStatus = "idle" | "connecting" | "connected" | "error";
const TTS_STORAGE_KEY = "fair-chzzk-draw-tts";
const CHAT_CONNECTION_FAILURE_MESSAGE =
  "채팅 연결에 실패했습니다. 연령제한, 지역제한 상태인지 확인해주세요.";

interface TtsSettings {
  enabled: boolean;
}

interface ThreeDrawTabProps {
  channelId: string;
}

function readStoredTtsSettings(): TtsSettings {
  try {
    const stored = localStorage.getItem(TTS_STORAGE_KEY);
    return stored ? (JSON.parse(stored) as TtsSettings) : { enabled: true };
  } catch {
    return { enabled: true };
  }
}

export function ThreeDrawTab({ channelId }: ThreeDrawTabProps) {
  const [screen, setScreen] = useState<Screen>("ready");
  const [participants, setParticipants] = useState<Viewer[]>([]);
  const [previousWinners, setPreviousWinners] = useState<Viewer[]>([]);
  const [assignments, setAssignments] = useState<ThreeDrawOrbAssignment[]>([]);
  const [revealedWinnerIds, setRevealedWinnerIds] = useState<Set<string>>(
    () => new Set()
  );
  const [primaryWinner, setPrimaryWinner] = useState<Viewer | null>(null);
  const [winnerMessages, setWinnerMessages] = useState<string[]>([]);
  const [winnerChatStatus, setWinnerChatStatus] = useState<ChatStatus>("idle");
  const [chatStatus, setChatStatus] = useState<ChatStatus>("idle");
  const [notice, setNotice] = useState("");
  const [ttsSettings, setTtsSettings] = useState<TtsSettings>(readStoredTtsSettings);
  const [options, setOptions] = useState<DrawOptions>({
    subscriberOnly: false,
    excludePreviousWinners: false,
  });
  const [timerEnabled, setTimerEnabled] = useState(false);
  const [timerMinutes, setTimerMinutes] = useState(1);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const participantMapRef = useRef(new Map<string, Viewer>());
  const flushTimeoutRef = useRef<number | null>(null);
  const connectionRef = useRef<ChatConnection | null>(null);
  const winnerConnectionRef = useRef<ChatConnection | null>(null);

  function flushParticipants() {
    if (flushTimeoutRef.current !== null) {
      window.clearTimeout(flushTimeoutRef.current);
      flushTimeoutRef.current = null;
    }
    setParticipants([...participantMapRef.current.values()]);
  }

  function scheduleParticipantFlush() {
    if (flushTimeoutRef.current !== null) return;
    flushTimeoutRef.current = window.setTimeout(flushParticipants, 120);
  }

  function addParticipant(viewer: Viewer) {
    if (participantMapRef.current.has(viewer.userIdHash)) return;
    participantMapRef.current.set(viewer.userIdHash, viewer);
    scheduleParticipantFlush();
  }

  function disconnect() {
    connectionRef.current?.disconnect();
    connectionRef.current = null;
    setChatStatus("idle");
  }

  async function startCollecting() {
    setNotice("");
    setAssignments([]);
    setRevealedWinnerIds(new Set());
    setPrimaryWinner(null);
    setWinnerMessages([]);
    winnerConnectionRef.current?.disconnect();
    winnerConnectionRef.current = null;
    participantMapRef.current = new Map();
    setParticipants([]);
    setChatStatus("connecting");
    setScreen("collecting");
    setRemainingSeconds(timerEnabled ? timerMinutes * 60 : null);

    try {
      connectionRef.current = await connectChat(
        channelId,
        (viewer) => addParticipant(viewer),
        (status) => setChatStatus(status)
      );
    } catch {
      setChatStatus("error");
      setNotice(CHAT_CONNECTION_FAILURE_MESSAGE);
    }
  }

  function stopCollecting() {
    disconnect();
    flushParticipants();
    setRemainingSeconds(null);
    setScreen("completed");
  }

  function startThreeDraw() {
    stopCollecting();

    try {
      const nextAssignments = createThreeDrawOrbAssignments(
        [...participantMapRef.current.values()],
        previousWinners,
        options
      );
      setAssignments(nextAssignments);
      setRevealedWinnerIds(new Set());
      setPrimaryWinner(null);
      setWinnerMessages([]);
      winnerConnectionRef.current?.disconnect();
      winnerConnectionRef.current = null;
      setNotice("");
      setScreen("stage");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "3D 추첨을 시작하지 못했습니다.");
      setScreen("collecting");
    }
  }

  function resetDraw() {
    disconnect();
    setAssignments([]);
    setRevealedWinnerIds(new Set());
    setPrimaryWinner(null);
    setWinnerMessages([]);
    winnerConnectionRef.current?.disconnect();
    winnerConnectionRef.current = null;
    setNotice("");
    setRemainingSeconds(null);
    setChatStatus("idle");
    setScreen("ready");
  }

  function closeStage() {
    setAssignments([]);
    setRevealedWinnerIds(new Set());
    setPrimaryWinner(null);
    setWinnerMessages([]);
    winnerConnectionRef.current?.disconnect();
    winnerConnectionRef.current = null;
    setNotice("");
    setRemainingSeconds(null);
    setChatStatus("idle");
    setScreen("completed");
  }

  function revealOrbWinner(orbId: string, primary: boolean) {
    const assignment = assignments.find((item) => item.id === orbId);
    if (!assignment) return;

    setRevealedWinnerIds((current) => {
      const next = new Set(current);
      next.add(assignment.winner.userIdHash);
      return next;
    });

    if (!primary) return;

    setPrimaryWinner(assignment.winner);
    setPreviousWinners((current) =>
      current.some((winner) => winner.userIdHash === assignment.winner.userIdHash)
        ? current
        : [...current, assignment.winner]
    );
  }

  useEffect(() => {
    if (remainingSeconds === null || screen !== "collecting") return;
    if (remainingSeconds <= 0) {
      stopCollecting();
      return;
    }

    const timer = window.setTimeout(
      () => setRemainingSeconds((current) => (current ?? 1) - 1),
      1_000
    );
    return () => window.clearTimeout(timer);
  }, [remainingSeconds, screen]);

  useEffect(() => {
    return () => {
      connectionRef.current?.disconnect();
      winnerConnectionRef.current?.disconnect();
      stopSpeaking();
      if (flushTimeoutRef.current !== null) {
        window.clearTimeout(flushTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    localStorage.setItem(TTS_STORAGE_KEY, JSON.stringify(ttsSettings));
  }, [ttsSettings]);

  useEffect(() => {
    winnerConnectionRef.current?.disconnect();
    winnerConnectionRef.current = null;
    stopSpeaking();
    setWinnerMessages([]);

    if (!primaryWinner) {
      setWinnerChatStatus("idle");
      return;
    }

    let active = true;
    setWinnerChatStatus("connecting");

    void connectChat(
      channelId,
      (viewer, message) => {
        if (!active || viewer.userIdHash !== primaryWinner.userIdHash) return;
        setWinnerMessages((current) => [...current, message]);
        if (ttsSettings.enabled) {
          void speakMessage(message);
        }
      },
      (status) => {
        if (active) setWinnerChatStatus(status);
      }
    )
      .then((connection) => {
        if (!active) {
          connection.disconnect();
          return;
        }
        winnerConnectionRef.current = connection;
      })
      .catch(() => {
        if (active) setWinnerChatStatus("error");
      });

    return () => {
      active = false;
      winnerConnectionRef.current?.disconnect();
      winnerConnectionRef.current = null;
      stopSpeaking();
    };
  }, [channelId, primaryWinner, ttsSettings.enabled]);

  const eligibleCount = useMemo(
    () => selectEligibleViewers(participants, previousWinners, options).length,
    [participants, previousWinners, options]
  );
  const remainingTimeText = useMemo(() => {
    if (remainingSeconds === null) return "";
    const minutes = Math.floor(remainingSeconds / 60);
    const seconds = remainingSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  }, [remainingSeconds]);
  const stageOrbs = useMemo(
    () =>
      assignments.map((assignment) => ({
        id: assignment.id,
        label: assignment.winner.nickname,
        badges: assignment.winner.badges,
        subscribe: assignment.winner.subscribe,
      })),
    [assignments]
  );

  if (screen === "stage") {
    return (
      <section className="three-draw-stage-wrap">
        <div className="three-draw-stage-head">
          <div>
            <h2>당첨 오리를 선택해 공격하세요.</h2>
          </div>
        </div>
        <CharacterStage
          orbs={stageOrbs}
          onBreakOrb={revealOrbWinner}
          winnerChatMessages={winnerMessages}
          winnerChatStatus={winnerChatStatus}
        />
        <div className="three-draw-stage-footer">
          <span>{revealedWinnerIds.size}명 공개됨</span>
          <button className="primary result-close" type="button" onClick={closeStage}>
            닫기
          </button>
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="toolbar card">
        <div className="toolbar-buttons">
          {screen === "ready" ? (
            <button className="primary large" type="button" onClick={startCollecting}>
              참여자 모집 시작
            </button>
          ) : null}
          {screen === "collecting" ? (
            <>
              <button className="primary large" type="button" onClick={startThreeDraw}>
                추첨하기
              </button>
              <button className="secondary large" type="button" onClick={stopCollecting}>
                모집 종료
              </button>
            </>
          ) : null}
          {screen === "completed" ? (
            <>
              <button className="primary large" type="button" onClick={startThreeDraw}>
                추첨하기
              </button>
              <button className="secondary large" type="button" onClick={startCollecting}>
                참여자 다시모집하기
              </button>
            </>
          ) : null}
        </div>

        <div className="option-grid">
          <Toggle
            label="구독자만 추첨하기"
            checked={options.subscriberOnly}
            onChange={() =>
              setOptions((current) => ({
                ...current,
                subscriberOnly: !current.subscriberOnly,
              }))
            }
          />
          <Toggle
            label="이미 당첨된 시청자 제외하기"
            checked={options.excludePreviousWinners}
            onChange={() =>
              setOptions((current) => ({
                ...current,
                excludePreviousWinners: !current.excludePreviousWinners,
              }))
            }
          />
          <div className="timer-option">
            <Toggle
              label="타이머 사용"
              checked={timerEnabled}
              onChange={() => setTimerEnabled((enabled) => !enabled)}
            />
            {timerEnabled ? (
              <label>
                <input
                  type="number"
                  inputMode="numeric"
                  min="1"
                  step="1"
                  value={timerMinutes}
                  onChange={(event) => {
                    const value = Math.floor(Number(event.target.value));
                    setTimerMinutes(Number.isFinite(value) && value > 0 ? value : 1);
                  }}
                  onKeyDown={(event) => {
                    if ([".", ",", "e", "E", "+", "-"].includes(event.key)) {
                      event.preventDefault();
                    }
                  }}
                />
                <span>분</span>
              </label>
            ) : null}
          </div>
          <Toggle
            label="TTS 사용"
            checked={ttsSettings.enabled}
            onChange={() =>
              setTtsSettings((current) => ({ enabled: !current.enabled }))
            }
          />
        </div>
      </section>

      {remainingSeconds !== null ? (
        <div className="timer">{remainingTimeText}</div>
      ) : null}
      {notice ? <p className="notice">{notice}</p> : null}

      <section className="participant-layout">
        <div className="card participants-card">
          <div className="section-title">
            <div>
              <h2>이중가챠 추첨 참여자</h2>
              <p className="muted">
                채팅을 입력한 시청자를 모은 뒤, 최대 5개의 구슬에 당첨 후보를 숨겨둡니다.
              </p>
            </div>
            <Status status={chatStatus} />
          </div>
          <div className="participants">
            {participants.length === 0 ? (
              <div className="empty">아직 참여자가 없습니다.</div>
            ) : (
              participants.map((viewer) => (
                <ViewerChip
                  key={viewer.userIdHash}
                  viewer={viewer}
                  inactive={
                    (options.subscriberOnly && !viewer.subscribe) ||
                    (options.excludePreviousWinners &&
                      previousWinners.some(
                        (winner) => winner.userIdHash === viewer.userIdHash
                      ))
                  }
                />
              ))
            )}
          </div>
          <div className="participant-footer">
            <span>총 {participants.length}명</span>
            <span>현재 추첨 가능 {eligibleCount}명</span>
          </div>
        </div>
      </section>

      {previousWinners.length > 0 ? (
        <section className="card history">
          <h2>당첨 이력</h2>
          <div className="winner-list">
            {previousWinners.map((winner, index) => (
              <ViewerChip
                key={`${winner.userIdHash}-${index}`}
                viewer={winner}
                prefix={`${index + 1}.`}
              />
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="toggle">
      <input type="checkbox" checked={checked} onChange={onChange} />
      <span className="toggle-control" />
      <span>{label}</span>
    </label>
  );
}

function Status({ status }: { status: ChatStatus }) {
  const labels: Record<ChatStatus, string> = {
    idle: "연결 대기",
    connecting: "연결 중",
    connected: "채팅 연결됨",
    error: "연결 오류",
  };

  return <span className={`status ${status}`}>{labels[status]}</span>;
}

function ViewerChip({
  viewer,
  inactive = false,
  prefix,
  className = "",
}: {
  viewer: Viewer;
  inactive?: boolean;
  prefix?: string;
  className?: string;
}) {
  return (
    <div className={`viewer-chip ${inactive ? "inactive" : ""} ${className}`}>
      {prefix ? <strong>{prefix}</strong> : null}
      {viewer.badges.map((badge, index) => (
        <img key={`${badge}-${index}`} src={badge} alt="" />
      ))}
      <span>{viewer.nickname}</span>
      {viewer.subscribe ? <b>구독</b> : null}
    </div>
  );
}
