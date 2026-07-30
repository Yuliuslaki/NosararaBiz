import { hmac } from "@noble/hashes/hmac.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex, hexToBytes, utf8ToBytes } from "@noble/hashes/utils.js";
import * as Crypto from "expo-crypto";

import { getOrCreateDeviceSecret, requireDeviceSecret } from "./deviceSecret";

export const MIN_PIN_LENGTH = 4;
export const MAX_PIN_LENGTH = 6;

const PIN_PATTERN = /^\d{4,6}$/;

const PIN_HASH_ALGORITHM = "hmac-sha256";
const PIN_HASH_CONTEXT = "nosararabiz-pin-v1";

const PIN_HASH_LENGTH_BYTES = 32;
const PIN_SALT_LENGTH_BYTES = 16;

export type PinSecurityResult = {
  pinHash: string;
  pinSalt: string;
};

function isValidHex(value: string, expectedLength: number): boolean {
  return value.length === expectedLength && /^[0-9a-f]+$/i.test(value);
}

function compareBytesWithoutEarlyExit(
  left: Uint8Array,
  right: Uint8Array,
): boolean {
  if (left.length !== right.length) {
    return false;
  }

  let difference = 0;

  for (let index = 0; index < left.length; index += 1) {
    difference |= left[index] ^ right[index];
  }

  return difference === 0;
}

function parseStoredPinHash(storedPinHash: string): Uint8Array | null {
  const parts = storedPinHash.split("$");

  if (parts.length !== 2) {
    return null;
  }

  const [algorithm, hashHex] = parts;

  if (algorithm !== PIN_HASH_ALGORITHM) {
    return null;
  }

  const expectedHashHexLength = PIN_HASH_LENGTH_BYTES * 2;

  if (!isValidHex(hashHex, expectedHashHexLength)) {
    return null;
  }

  return hexToBytes(hashHex);
}

function createPinMessage(pin: string, saltHex: string): Uint8Array {
  return utf8ToBytes(`${PIN_HASH_CONTEXT}:${saltHex}:${pin}`);
}

function calculatePinHash(
  pin: string,
  saltHex: string,
  deviceSecret: Uint8Array,
): Uint8Array {
  const message = createPinMessage(pin, saltHex);

  return hmac(sha256, deviceSecret, message);
}

export function isValidPin(pin: string): boolean {
  return PIN_PATTERN.test(pin);
}

export function validatePin(pin: string): void {
  if (!isValidPin(pin)) {
    throw new Error("PIN harus terdiri dari 4 sampai 6 angka.");
  }
}

export async function createPinSecurity(
  pin: string,
): Promise<PinSecurityResult> {
  validatePin(pin);

  const deviceSecret = await getOrCreateDeviceSecret();

  const saltBytes = await Crypto.getRandomBytesAsync(PIN_SALT_LENGTH_BYTES);

  const saltHex = bytesToHex(saltBytes);

  const hashBytes = calculatePinHash(pin, saltHex, deviceSecret);

  return {
    pinHash: [PIN_HASH_ALGORITHM, bytesToHex(hashBytes)].join("$"),

    pinSalt: saltHex,
  };
}

export async function verifyPin(
  pin: string,
  storedPinHash: string,
  storedPinSalt: string,
): Promise<boolean> {
  if (!isValidPin(pin)) {
    return false;
  }

  const expectedSaltHexLength = PIN_SALT_LENGTH_BYTES * 2;

  if (!isValidHex(storedPinSalt, expectedSaltHexLength)) {
    return false;
  }

  const expectedHashBytes = parseStoredPinHash(storedPinHash);

  if (expectedHashBytes === null) {
    return false;
  }

  try {
    const deviceSecret = await requireDeviceSecret();

    const actualHashBytes = calculatePinHash(pin, storedPinSalt, deviceSecret);

    return compareBytesWithoutEarlyExit(actualHashBytes, expectedHashBytes);
  } catch {
    return false;
  }
}
