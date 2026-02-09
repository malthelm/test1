const DEFAULT_WORKSPACE_ID = process.env.LIFE_OS_DEFAULT_WORKSPACE_ID ?? "ws-demo";

export type RequestContext = {
  workspaceId: string;
};

export function getRequestContext(req: Request): RequestContext {
  const headerWorkspaceId = req.headers.get("x-workspace-id")?.trim();

  return {
    workspaceId:
      headerWorkspaceId && headerWorkspaceId.length > 0
        ? headerWorkspaceId
        : DEFAULT_WORKSPACE_ID,
  };
}
