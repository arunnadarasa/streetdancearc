// A2A 0.3 + a2a-x402 + AP2 Mandates — client-safe types and helpers.
// Spec refs:
//   https://a2a-protocol.org/latest/
//   https://github.com/google-agentic-commerce/a2a-x402
//   https://github.com/google-agentic-commerce/AP2

export const A2A_PROTOCOL_VERSION = "0.3.0";
export const X402_EXTENSION_URI = "https://github.com/google-agentic-commerce/a2a-x402/v0.1";
export const AP2_VERSION = "0.1";

export const MIME = {
  X402_REQUIRED: "application/vnd.a2a.x402.payment-required+json",
  X402_PAYLOAD: "application/vnd.a2a.x402.payment-payload+json",
  X402_RECEIPT: "application/vnd.a2a.x402.receipt+json",
  AP2_INTENT: "application/vnd.ap2.mandate.intent+json",
  AP2_CART: "application/vnd.ap2.mandate.cart+json",
  AP2_PAYMENT: "application/vnd.ap2.mandate.payment+json",
} as const;

export type A2ATextPart = { kind: "text"; text: string };
export type A2ADataPart = {
  kind: "data";
  mimeType: string;
  data: unknown;
  metadata?: Record<string, unknown>;
};
export type A2APart = A2ATextPart | A2ADataPart;

export type A2AMessage = {
  messageId: string;
  role: "agent" | "user";
  kind: "message";
  contextId?: string;
  taskId?: string;
  parts: A2APart[];
};

export type A2ATaskState =
  | "submitted"
  | "working"
  | "input-required"
  | "completed"
  | "canceled"
  | "failed"
  | "rejected"
  | "auth-required";

export type A2ATaskStatus = {
  state: A2ATaskState;
  timestamp: string;
  message?: A2AMessage;
};

export type A2AArtifact = {
  artifactId: string;
  name?: string;
  parts: A2APart[];
};

export type A2ATask = {
  id: string;
  contextId: string;
  kind: "task";
  status: A2ATaskStatus;
  artifacts: A2AArtifact[];
};

export type AgentCapabilityExtension = {
  uri: string;
  description?: string;
  required?: boolean;
};

export type AgentCard = {
  protocolVersion?: string;
  name: string;
  description: string;
  url?: string;
  provider?: { organization: string; url: string };
  version?: string;
  capabilities?: {
    streaming?: boolean;
    pushNotifications?: boolean;
    stateTransitionHistory?: boolean;
    extensions?: AgentCapabilityExtension[];
  };
  defaultInputModes?: string[];
  defaultOutputModes?: string[];
  skills?: Array<Record<string, unknown>>;
  extensions?: Record<string, unknown>;
};

export type JSONRPCRequest = {
  jsonrpc: "2.0";
  id?: string | number | null;
  method: string;
  params?: unknown;
};

export type JSONRPCResponse = {
  jsonrpc: "2.0";
  id?: string | number | null;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
};

export function rpcOk(id: string | number | null | undefined, result: unknown): JSONRPCResponse {
  return { jsonrpc: "2.0", id: id ?? null, result };
}

export function rpcErr(id: string | number | null | undefined, code: number, message: string): JSONRPCResponse {
  return { jsonrpc: "2.0", id: id ?? null, error: { code, message } };
}

export function findDataPart<T>(parts: A2APart[] | undefined, mime: string): T | undefined {
  return (parts ?? []).find(
    (p): p is A2ADataPart => p.kind === "data" && p.mimeType === mime,
  )?.data as T | undefined;
}

export function buildA2ATask({
  id,
  contextId,
  state,
  message,
  artifacts = [],
}: {
  id: string;
  contextId: string;
  state: A2ATaskState;
  message?: A2AMessage;
  artifacts?: A2AArtifact[];
}): A2ATask {
  return {
    id,
    contextId,
    kind: "task",
    status: { state, timestamp: new Date().toISOString(), message },
    artifacts,
  };
}
