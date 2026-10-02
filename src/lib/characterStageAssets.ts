import { Cache } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import type { GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";

const MODEL_ASSET_BASE_URL = "https://orinyam0508-yt.win";
export const MODEL_URL =
  import.meta.env.VITE_CHARACTER_MODEL_URL ??
  `${MODEL_ASSET_BASE_URL}/models/character.glb`;
export const TARGET_MODEL_URL =
  import.meta.env.VITE_TARGET_MODEL_URL ??
  `${MODEL_ASSET_BASE_URL}/models/target.glb`;

const sharedGltfLoader = new GLTFLoader();
const gltfMemoryCache = new Map<string, Promise<GLTF>>();

Cache.enabled = true;

export function loadCachedGltf(url: string): Promise<GLTF> {
  const cached = gltfMemoryCache.get(url);
  if (cached) return cached;

  const request = new Promise<GLTF>((resolve, reject) => {
    sharedGltfLoader.load(url, resolve, undefined, reject);
  }).catch((error) => {
    gltfMemoryCache.delete(url);
    throw error;
  });

  gltfMemoryCache.set(url, request);
  return request;
}

function scheduleIdleWork(work: () => void): () => void {
  if (typeof window.requestIdleCallback === "function") {
    const handle = window.requestIdleCallback(work, { timeout: 2_000 });
    return () => window.cancelIdleCallback(handle);
  }

  const handle = window.setTimeout(work, 500);
  return () => window.clearTimeout(handle);
}

// Warm parsed models one at a time, yielding before each request. Cancellation
// stops queued work, while an active shared request remains useful to the draw.
export function scheduleCharacterStagePreload(): () => void {
  const urls = [MODEL_URL, TARGET_MODEL_URL];
  let nextIndex = 0;
  let cancelled = false;
  let cancelQueuedWork: (() => void) | undefined;

  function queueNextModel() {
    if (cancelled || nextIndex >= urls.length) return;

    cancelQueuedWork = scheduleIdleWork(() => {
      cancelQueuedWork = undefined;
      if (cancelled) return;

      const url = urls[nextIndex++];
      void loadCachedGltf(url)
        .catch(() => undefined)
        .then(queueNextModel);
    });
  }

  queueNextModel();

  return () => {
    cancelled = true;
    cancelQueuedWork?.();
  };
}
