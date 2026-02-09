export const WORKSPACE_HEADER = "x-workspace-id";
export const DEFAULT_WORKSPACE_ID =
  process.env.NEXT_PUBLIC_DEFAULT_WORKSPACE_ID ?? "ws-demo";

export function workspaceFetch(input: string, init?: RequestInit) {
  const headers = new Headers(init?.headers);
  headers.set(WORKSPACE_HEADER, DEFAULT_WORKSPACE_ID);

  return fetch(input, {
    ...init,
    headers,
  });
}
