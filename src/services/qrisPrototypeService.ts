import * as Crypto from "expo-crypto";

export const QRIS_PROTOTYPE_DURATION_MS = 5 * 60 * 1000;

export const QRIS_PROTOTYPE_LABEL = "SIMULASI QRIS";

export type QrisPrototypeStatus = "pending" | "paid" | "expired" | "cancelled";

export type QrisPrototypeSession = {
  id: string;
  referenceNumber: string;
  totalAmount: number;
  payload: string;
  status: QrisPrototypeStatus;
  createdAt: number;
  expiresAt: number;
  paidAt: number | null;
  cancelledAt: number | null;
};

type QrisPrototypePayload = {
  type: "NOSARARA_BIZ_QRIS_SIMULATION";
  version: 1;
  environment: "prototype";
  sessionId: string;
  referenceNumber: string;
  totalAmount: number;
  currency: "IDR";
  createdAt: number;
  expiresAt: number;
};

function padNumber(value: number, length = 2): string {
  return String(value).padStart(length, "0");
}

function createReferenceNumber(createdAt: number, sessionId: string): string {
  const date = new Date(createdAt);

  const dateSection = [
    date.getFullYear(),
    padNumber(date.getMonth() + 1),
    padNumber(date.getDate()),
  ].join("");

  const timeSection = [
    padNumber(date.getHours()),
    padNumber(date.getMinutes()),
    padNumber(date.getSeconds()),
  ].join("");

  const uniqueSection = sessionId.replace(/-/g, "").slice(0, 8).toUpperCase();

  return ["QR", dateSection, timeSection, uniqueSection].join("-");
}

function createSimulationPayload(
  sessionId: string,
  referenceNumber: string,
  totalAmount: number,
  createdAt: number,
  expiresAt: number,
): string {
  const payload: QrisPrototypePayload = {
    type: "NOSARARA_BIZ_QRIS_SIMULATION",
    version: 1,
    environment: "prototype",
    sessionId,
    referenceNumber,
    totalAmount,
    currency: "IDR",
    createdAt,
    expiresAt,
  };

  return JSON.stringify(payload);
}

function validateTotalAmount(totalAmount: number): void {
  if (!Number.isSafeInteger(totalAmount) || totalAmount <= 0) {
    throw new Error(
      "Total pembayaran QRIS harus berupa bilangan bulat lebih dari nol.",
    );
  }
}

export function createQrisPrototypeSession(
  totalAmount: number,
): QrisPrototypeSession {
  validateTotalAmount(totalAmount);

  const id = Crypto.randomUUID();
  const createdAt = Date.now();

  const expiresAt = createdAt + QRIS_PROTOTYPE_DURATION_MS;

  const referenceNumber = createReferenceNumber(createdAt, id);

  const payload = createSimulationPayload(
    id,
    referenceNumber,
    totalAmount,
    createdAt,
    expiresAt,
  );

  return {
    id,
    referenceNumber,
    totalAmount,
    payload,
    status: "pending",
    createdAt,
    expiresAt,
    paidAt: null,
    cancelledAt: null,
  };
}

export function getQrisPrototypeRemainingSeconds(
  session: QrisPrototypeSession,
  currentTime = Date.now(),
): number {
  if (session.status !== "pending") {
    return 0;
  }

  const remainingMilliseconds = session.expiresAt - currentTime;

  return Math.max(0, Math.ceil(remainingMilliseconds / 1000));
}

export function isQrisPrototypeExpired(
  session: QrisPrototypeSession,
  currentTime = Date.now(),
): boolean {
  return session.status === "pending" && currentTime >= session.expiresAt;
}

export function resolveQrisPrototypeSession(
  session: QrisPrototypeSession,
  currentTime = Date.now(),
): QrisPrototypeSession {
  if (!isQrisPrototypeExpired(session, currentTime)) {
    return session;
  }

  return {
    ...session,
    status: "expired",
  };
}

export function simulateQrisPrototypePayment(
  session: QrisPrototypeSession,
  paidAt = Date.now(),
): QrisPrototypeSession {
  const resolvedSession = resolveQrisPrototypeSession(session, paidAt);

  if (resolvedSession.status === "expired") {
    throw new Error(
      "Kode QR sudah kedaluwarsa. Buat kode QR baru untuk melanjutkan.",
    );
  }

  if (resolvedSession.status === "paid") {
    throw new Error("Pembayaran QRIS sudah pernah diproses.");
  }

  if (resolvedSession.status === "cancelled") {
    throw new Error("Sesi pembayaran QRIS telah dibatalkan.");
  }

  return {
    ...resolvedSession,
    status: "paid",
    paidAt,
  };
}

export function cancelQrisPrototypeSession(
  session: QrisPrototypeSession,
  cancelledAt = Date.now(),
): QrisPrototypeSession {
  const resolvedSession = resolveQrisPrototypeSession(session, cancelledAt);

  if (resolvedSession.status !== "pending") {
    return resolvedSession;
  }

  return {
    ...resolvedSession,
    status: "cancelled",
    cancelledAt,
  };
}

export function regenerateQrisPrototypeSession(
  session: QrisPrototypeSession,
): QrisPrototypeSession {
  if (session.status !== "expired" && session.status !== "cancelled") {
    throw new Error(
      "Kode QR hanya dapat dibuat ulang setelah kedaluwarsa atau dibatalkan.",
    );
  }

  return createQrisPrototypeSession(session.totalAmount);
}
