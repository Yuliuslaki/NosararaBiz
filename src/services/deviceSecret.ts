import { bytesToHex, hexToBytes } from "@noble/hashes/utils.js";
import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";

const DEVICE_SECRET_STORAGE_KEY = "nosararabiz.device-secret.v1";

const DEVICE_SECRET_LENGTH_BYTES = 32;
const DEVICE_SECRET_HEX_LENGTH = DEVICE_SECRET_LENGTH_BYTES * 2;

function isValidDeviceSecret(value: string): boolean {
  return (
    value.length === DEVICE_SECRET_HEX_LENGTH && /^[0-9a-f]+$/i.test(value)
  );
}

function decodeDeviceSecret(value: string): Uint8Array {
  if (!isValidDeviceSecret(value)) {
    throw new Error(
      "Kunci keamanan perangkat tersimpan dalam format yang tidak valid.",
    );
  }

  return hexToBytes(value);
}

async function ensureSecureStoreAvailable(): Promise<void> {
  const isAvailable = await SecureStore.isAvailableAsync();

  if (!isAvailable) {
    throw new Error("Penyimpanan aman tidak tersedia pada perangkat ini.");
  }
}

export async function getDeviceSecret(): Promise<Uint8Array | null> {
  await ensureSecureStoreAvailable();

  const storedSecret = await SecureStore.getItemAsync(
    DEVICE_SECRET_STORAGE_KEY,
  );

  if (storedSecret === null) {
    return null;
  }

  return decodeDeviceSecret(storedSecret);
}

export async function requireDeviceSecret(): Promise<Uint8Array> {
  const deviceSecret = await getDeviceSecret();

  if (deviceSecret === null) {
    throw new Error(
      "Kunci keamanan perangkat tidak ditemukan. PIN pengguna tidak dapat diverifikasi.",
    );
  }

  return deviceSecret;
}

export async function getOrCreateDeviceSecret(): Promise<Uint8Array> {
  const existingSecret = await getDeviceSecret();

  if (existingSecret !== null) {
    return existingSecret;
  }

  const newSecretBytes = await Crypto.getRandomBytesAsync(
    DEVICE_SECRET_LENGTH_BYTES,
  );

  const newSecretHex = bytesToHex(newSecretBytes);

  await SecureStore.setItemAsync(DEVICE_SECRET_STORAGE_KEY, newSecretHex, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });

  return newSecretBytes;
}
