import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";

const { load } = vi.hoisted(() => ({ load: vi.fn() }));

vi.mock("three/examples/jsm/loaders/GLTFLoader.js", () => ({
  GLTFLoader: class {
    load = load;
  },
}));

interface PendingLoad {
  url: string;
  resolve: (gltf: GLTF) => void;
  reject: (error: Error) => void;
}

let requests: PendingLoad[];
let idleCallbacks: Map<number, () => void>;

function runNextIdleCallback() {
  const next = idleCallbacks.entries().next().value;
  if (!next) throw new Error("No idle work is scheduled");
  idleCallbacks.delete(next[0]);
  next[1]();
}

async function flushPromises() {
  for (let index = 0; index < 5; index += 1) await Promise.resolve();
}

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  requests = [];
  idleCallbacks = new Map();
  let nextIdleId = 0;
  vi.stubGlobal("window", {
    requestIdleCallback: vi.fn((callback: () => void) => {
      const id = ++nextIdleId;
      idleCallbacks.set(id, callback);
      return id;
    }),
    cancelIdleCallback: vi.fn((id: number) => idleCallbacks.delete(id)),
  });
  load.mockImplementation((url, resolve, _progress, reject) => {
    requests.push({ url, resolve, reject });
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

describe("character stage asset preloading", () => {
  it("defers work to idle time and loads the models sequentially", async () => {
    const { scheduleCharacterStagePreload, MODEL_URL, TARGET_MODEL_URL } =
      await import("./characterStageAssets");

    scheduleCharacterStagePreload();
    expect(load).not.toHaveBeenCalled();
    expect(window.requestIdleCallback).toHaveBeenCalledWith(
      expect.any(Function),
      { timeout: 2_000 }
    );

    runNextIdleCallback();
    expect(requests.map(({ url }) => url)).toEqual([MODEL_URL]);
    expect(idleCallbacks.size).toBe(0);

    requests[0].resolve({} as GLTF);
    await flushPromises();
    expect(load).toHaveBeenCalledTimes(1);
    expect(idleCallbacks.size).toBe(1);

    runNextIdleCallback();
    expect(requests.map(({ url }) => url)).toEqual([MODEL_URL, TARGET_MODEL_URL]);
    requests[1].resolve({} as GLTF);
    await flushPromises();
    expect(idleCallbacks.size).toBe(0);
  });

  it("shares active requests and parsed models with foreground and repeated warmups", async () => {
    const { scheduleCharacterStagePreload, loadCachedGltf, MODEL_URL, TARGET_MODEL_URL } =
      await import("./characterStageAssets");
    scheduleCharacterStagePreload();
    scheduleCharacterStagePreload();
    runNextIdleCallback();
    runNextIdleCallback();

    const foregroundRequest = loadCachedGltf(MODEL_URL);
    expect(loadCachedGltf(MODEL_URL)).toBe(foregroundRequest);
    expect(load).toHaveBeenCalledTimes(1);

    const character = {} as GLTF;
    requests[0].resolve(character);
    await expect(foregroundRequest).resolves.toBe(character);
    await flushPromises();

    // Starting the draw while warmup is between models also shares the target.
    const targetRequest = loadCachedGltf(TARGET_MODEL_URL);
    runNextIdleCallback();
    runNextIdleCallback();
    expect(load).toHaveBeenCalledTimes(2);
    const target = {} as GLTF;
    requests[1].resolve(target);
    await flushPromises();

    expect(loadCachedGltf(MODEL_URL)).toBe(foregroundRequest);
    expect(loadCachedGltf(TARGET_MODEL_URL)).toBe(targetRequest);
    await expect(loadCachedGltf(TARGET_MODEL_URL)).resolves.toBe(target);

    scheduleCharacterStagePreload();
    runNextIdleCallback();
    await flushPromises();
    runNextIdleCallback();
    await flushPromises();
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("allows foreground retry after failed warmup and still warms the other model", async () => {
    const { scheduleCharacterStagePreload, loadCachedGltf, MODEL_URL, TARGET_MODEL_URL } =
      await import("./characterStageAssets");
    scheduleCharacterStagePreload();
    runNextIdleCallback();
    requests[0].reject(new Error("Temporary model request failure"));
    await flushPromises();

    runNextIdleCallback();
    expect(requests[1].url).toBe(TARGET_MODEL_URL);
    requests[1].resolve({} as GLTF);
    await flushPromises();

    const retry = loadCachedGltf(MODEL_URL);
    expect(requests.map(({ url }) => url)).toEqual([MODEL_URL, TARGET_MODEL_URL, MODEL_URL]);
    const recoveredModel = {} as GLTF;
    requests[2].resolve(recoveredModel);
    await expect(retry).resolves.toBe(recoveredModel);
  });

  it("cancels a queued warmup before any request starts", async () => {
    const { scheduleCharacterStagePreload } = await import("./characterStageAssets");
    const cancel = scheduleCharacterStagePreload();
    cancel();
    expect(idleCallbacks.size).toBe(0);
    expect(load).not.toHaveBeenCalled();
  });

  it("keeps an active request reusable but cancels remaining background work", async () => {
    const { scheduleCharacterStagePreload, loadCachedGltf, MODEL_URL } =
      await import("./characterStageAssets");
    const cancel = scheduleCharacterStagePreload();
    runNextIdleCallback();
    cancel();

    const foregroundRequest = loadCachedGltf(MODEL_URL);
    expect(load).toHaveBeenCalledTimes(1);
    const model = {} as GLTF;
    requests[0].resolve(model);
    await expect(foregroundRequest).resolves.toBe(model);
    await flushPromises();
    expect(idleCallbacks.size).toBe(0);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("uses a cancellable deferred timeout when idle callbacks are unavailable", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("window", {
      setTimeout: globalThis.setTimeout,
      clearTimeout: globalThis.clearTimeout,
    });
    const { scheduleCharacterStagePreload } = await import("./characterStageAssets");

    const cancel = scheduleCharacterStagePreload();
    await vi.advanceTimersByTimeAsync(499);
    expect(load).not.toHaveBeenCalled();
    cancel();
    await vi.runAllTimersAsync();
    expect(load).not.toHaveBeenCalled();

    scheduleCharacterStagePreload();
    await vi.advanceTimersByTimeAsync(500);
    expect(load).toHaveBeenCalledTimes(1);
    requests[0].resolve({} as GLTF);
    await flushPromises();
    await vi.advanceTimersByTimeAsync(499);
    expect(load).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("uses configured model URLs for both preload and foreground access", async () => {
    vi.stubEnv("VITE_CHARACTER_MODEL_URL", "https://example.test/character.glb");
    vi.stubEnv("VITE_TARGET_MODEL_URL", "https://example.test/target.glb");
    const { scheduleCharacterStagePreload, MODEL_URL, TARGET_MODEL_URL } =
      await import("./characterStageAssets");
    expect(MODEL_URL).toBe("https://example.test/character.glb");
    expect(TARGET_MODEL_URL).toBe("https://example.test/target.glb");

    scheduleCharacterStagePreload();
    runNextIdleCallback();
    expect(requests[0].url).toBe(MODEL_URL);
    requests[0].resolve({} as GLTF);
    await flushPromises();
    runNextIdleCallback();
    expect(requests[1].url).toBe(TARGET_MODEL_URL);
  });
});
