interface ProxyContext {
  request: Request;
  params: {
    path?: string | string[];
  };
}

function resolvePath(path: string | string[] | undefined): string {
  if (Array.isArray(path)) return path.join("/");
  return path ?? "";
}

export function createProxyHandler(baseUrl: string) {
  return async ({ request, params }: ProxyContext): Promise<Response> => {
    const incomingUrl = new URL(request.url);
    const targetUrl = new URL(`${baseUrl}/${resolvePath(params.path)}`);
    targetUrl.search = incomingUrl.search;

    const headers = new Headers(request.headers);
    headers.delete("host");
    headers.delete("cf-connecting-ip");
    headers.delete("cf-ipcountry");
    headers.delete("cf-ray");
    headers.delete("x-forwarded-proto");

    return fetch(targetUrl, {
      method: request.method,
      headers,
      body:
        request.method === "GET" || request.method === "HEAD"
          ? undefined
          : request.body,
      redirect: "follow",
    });
  };
}
