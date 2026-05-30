import { createProxyHandler } from "../../../_shared/proxy";

export const onRequest = createProxyHandler("https://api.chzzk.naver.com");
