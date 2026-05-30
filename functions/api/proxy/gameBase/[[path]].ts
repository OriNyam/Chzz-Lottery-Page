import { createProxyHandler } from "../../../_shared/proxy";

export const onRequest = createProxyHandler(
  "https://comm-api.game.naver.com/nng_main"
);
