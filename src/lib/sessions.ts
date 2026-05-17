export type ElementSummary = {
  tagName?: string;
  type?: string | null;
  role?: string | null;
  id?: string | null;
  className?: string | null;
  name?: string | null;
  innerText?: string | null;
  ariaLabel?: string | null;
  title?: string | null;
  placeholder?: string | null;
  href?: string | null;
  value?: string | null;
  selector?: string | null;
  rect?: {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null;
};

export type CaptureContextPayload = {
  actionId: string;
  sessionId: string;
  capturedAt: string;
  page: {
    url: string;
    title: string;
    viewport: { width: number; height: number };
    scroll: { x: number; y: number };
    cursor: { x: number; y: number };
  };
  element: ElementSummary;
  screenshots: {
    viewport: string;
    crop400: string;
    crop100: string;
  };
};

export type CaptureAction = {
  id: string;
  type: "capture_element_context";
  status: "pending" | "fulfilled" | "expired";
  question: string;
  conversationId?: string;
  createdAt: number;
  sentAt?: number;
  fulfilledAt?: number;
  resolve?: (payload: CaptureContextPayload) => void;
  reject?: (reason: Error) => void;
  timer?: ReturnType<typeof setTimeout>;
};

type CallState = {
  phoneNumber?: string;
  conversationId?: string | null;
  callSid?: string | null;
  startedAt?: number;
  message?: string;
};

type ExplanationRecord = {
  actionId: string;
  question: string;
  explanation: string;
  createdAt: number;
  element?: ElementSummary;
};

export type SaarthiSession = {
  id: string;
  createdAt: number;
  lastSeenAt: number;
  pageUrl?: string;
  pageTitle?: string;
  phoneNumber?: string;
  call?: CallState;
  actions: CaptureAction[];
  latestContext?: CaptureContextPayload;
  explanations: ExplanationRecord[];
};

const globalStore = globalThis as typeof globalThis & {
  __saarthiSessions?: Map<string, SaarthiSession>;
};

const sessions = globalStore.__saarthiSessions ?? new Map<string, SaarthiSession>();
globalStore.__saarthiSessions = sessions;

function now() {
  return Date.now();
}

function publicAction(action: CaptureAction) {
  return {
    id: action.id,
    type: action.type,
    question: action.question,
    conversationId: action.conversationId,
    createdAt: action.createdAt,
  };
}

function prune(session: SaarthiSession) {
  const cutoff = now() - 2 * 60 * 1000;
  session.actions = session.actions.filter((action) => {
    const keep = action.status === "pending" && action.createdAt > cutoff;
    if (!keep && action.status === "pending") {
      action.status = "expired";
      action.reject?.(new Error("Capture request expired."));
    }
    return keep;
  });
}

export function getOrCreateSession(
  id: string,
  updates: Partial<Pick<SaarthiSession, "pageUrl" | "pageTitle" | "phoneNumber">> = {},
) {
  const session =
    sessions.get(id) ??
    ({
      id,
      createdAt: now(),
      lastSeenAt: now(),
      actions: [],
      explanations: [],
    } satisfies SaarthiSession);

  session.lastSeenAt = now();
  Object.assign(session, updates);
  sessions.set(id, session);
  prune(session);
  return session;
}

export function getSession(id: string) {
  const session = sessions.get(id);
  if (!session) {
    return undefined;
  }

  session.lastSeenAt = now();
  prune(session);
  return session;
}

export function markCallStarted(sessionId: string, call: CallState) {
  const session = getOrCreateSession(sessionId);
  session.call = {
    ...session.call,
    ...call,
    startedAt: now(),
  };
  return session.call;
}

export function createCaptureRequest(
  sessionId: string,
  question: string,
  conversationId?: string,
  timeoutMs = 18_000,
) {
  const session = getOrCreateSession(sessionId);
  const action: CaptureAction = {
    id: crypto.randomUUID(),
    type: "capture_element_context",
    status: "pending",
    question,
    conversationId,
    createdAt: now(),
  };

  const waitForContext = new Promise<CaptureContextPayload>((resolve, reject) => {
    action.resolve = resolve;
    action.reject = reject;
    action.timer = setTimeout(() => {
      action.status = "expired";
      reject(new Error("Timed out waiting for the browser widget to capture context."));
    }, timeoutMs);
  });

  session.actions.push(action);
  prune(session);
  return { action: publicAction(action), waitForContext };
}

export function listPendingActions(sessionId: string) {
  const session = getOrCreateSession(sessionId);
  const current = now();
  for (const action of session.actions) {
    if (action.status === "pending") {
      action.sentAt = current;
    }
  }

  return session.actions.filter((action) => action.status === "pending").map(publicAction);
}

export function fulfillCapture(sessionId: string, payload: CaptureContextPayload) {
  const session = getOrCreateSession(sessionId);
  const action = session.actions.find((item) => item.id === payload.actionId);

  session.latestContext = payload;

  if (!action || action.status !== "pending") {
    return false;
  }

  action.status = "fulfilled";
  action.fulfilledAt = now();
  if (action.timer) {
    clearTimeout(action.timer);
  }
  action.resolve?.(payload);
  return true;
}

export function recordExplanation(
  sessionId: string,
  actionId: string,
  question: string,
  explanation: string,
  element?: ElementSummary,
) {
  const session = getOrCreateSession(sessionId);
  session.explanations.unshift({
    actionId,
    question,
    explanation,
    element,
    createdAt: now(),
  });
  session.explanations = session.explanations.slice(0, 20);
}

export function getSessionStatus(sessionId: string) {
  const session = getOrCreateSession(sessionId);
  return {
    id: session.id,
    pageUrl: session.pageUrl,
    pageTitle: session.pageTitle,
    call: session.call,
    pendingActions: session.actions.filter((action) => action.status === "pending").length,
    latestElement: session.latestContext?.element,
    explanations: session.explanations,
    lastSeenAt: session.lastSeenAt,
  };
}
