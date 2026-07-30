import * as Crypto from "expo-crypto";

import { DEFAULT_EGG_RACK_SIZE } from "../constants/app";
import { sqliteDatabase } from "../db/client";
import { createPinSecurity, validatePin } from "./pinSecurity";

const MIN_BUSINESS_NAME_LENGTH = 2;
const MAX_BUSINESS_NAME_LENGTH = 100;

const MIN_OWNER_NAME_LENGTH = 2;
const MAX_OWNER_NAME_LENGTH = 100;

const MIN_USERNAME_LENGTH = 3;
const MAX_USERNAME_LENGTH = 30;

const USERNAME_PATTERN = /^[a-z0-9][a-z0-9._-]{2,29}$/;

const WA_NUMBER_PATTERN = /^\+?[0-9]{9,15}$/;

type SetupConfigRow = {
  setupCompleted: number;
};

type ExistingUserRow = {
  id: string;
};

export type InitialSetupState = {
  isRequired: boolean;
  isCompleted: boolean;
  isInconsistent: boolean;
};

export type CompleteInitialSetupInput = {
  businessName: string;
  ownerWaNumber?: string;
  ownerFullName: string;
  ownerUsername: string;
  ownerPin: string;
  ownerPinConfirmation: string;
};

export type CompleteInitialSetupResult = {
  ownerId: string;
  ownerUsername: string;
};

function normalizeRequiredText(
  value: string,
  label: string,
  minimumLength: number,
  maximumLength: number,
): string {
  const normalizedValue = value.trim();

  if (normalizedValue.length < minimumLength) {
    throw new Error(`${label} minimal ${minimumLength} karakter.`);
  }

  if (normalizedValue.length > maximumLength) {
    throw new Error(`${label} maksimal ${maximumLength} karakter.`);
  }

  return normalizedValue;
}

function normalizeUsername(username: string): string {
  const normalizedUsername = username.trim().toLowerCase();

  if (
    normalizedUsername.length < MIN_USERNAME_LENGTH ||
    normalizedUsername.length > MAX_USERNAME_LENGTH
  ) {
    throw new Error(
      `Username harus terdiri dari ${MIN_USERNAME_LENGTH} sampai ${MAX_USERNAME_LENGTH} karakter.`,
    );
  }

  if (!USERNAME_PATTERN.test(normalizedUsername)) {
    throw new Error(
      "Username harus diawali huruf atau angka dan hanya boleh berisi huruf kecil, angka, titik, garis bawah, atau tanda hubung.",
    );
  }

  return normalizedUsername;
}

function normalizeOptionalWaNumber(ownerWaNumber?: string): string | null {
  if (ownerWaNumber === undefined) {
    return null;
  }

  const normalizedNumber = ownerWaNumber.trim().replace(/[\s()-]/g, "");

  if (normalizedNumber.length === 0) {
    return null;
  }

  if (!WA_NUMBER_PATTERN.test(normalizedNumber)) {
    throw new Error(
      "Nomor WhatsApp harus terdiri dari 9 sampai 15 angka dan boleh diawali tanda +.",
    );
  }

  return normalizedNumber;
}

export function getInitialSetupState(): InitialSetupState {
  const configRow = sqliteDatabase.getFirstSync<SetupConfigRow>(`
      SELECT
        setup_completed AS setupCompleted
      FROM app_config
      WHERE id = 1
      LIMIT 1;
    `);

  const ownerRow = sqliteDatabase.getFirstSync<ExistingUserRow>(`
      SELECT id
      FROM users
      WHERE role = 'owner'
        AND deleted_at IS NULL
      LIMIT 1;
    `);

  const configIsCompleted = configRow?.setupCompleted === 1;

  const ownerExists = ownerRow !== null;

  return {
    isRequired: !configIsCompleted && !ownerExists,

    isCompleted: configIsCompleted && ownerExists,

    isInconsistent: configIsCompleted !== ownerExists,
  };
}

export async function completeInitialSetup(
  input: CompleteInitialSetupInput,
): Promise<CompleteInitialSetupResult> {
  const initialState = getInitialSetupState();

  if (initialState.isCompleted) {
    throw new Error("Pengaturan awal aplikasi sudah diselesaikan.");
  }

  if (initialState.isInconsistent) {
    throw new Error(
      "Data pengaturan awal tidak konsisten. Konfigurasi usaha dan akun Owner harus diperiksa.",
    );
  }

  const businessName = normalizeRequiredText(
    input.businessName,
    "Nama usaha",
    MIN_BUSINESS_NAME_LENGTH,
    MAX_BUSINESS_NAME_LENGTH,
  );

  const ownerFullName = normalizeRequiredText(
    input.ownerFullName,
    "Nama Owner",
    MIN_OWNER_NAME_LENGTH,
    MAX_OWNER_NAME_LENGTH,
  );

  const ownerUsername = normalizeUsername(input.ownerUsername);

  const ownerWaNumber = normalizeOptionalWaNumber(input.ownerWaNumber);

  validatePin(input.ownerPin);

  if (input.ownerPin !== input.ownerPinConfirmation) {
    throw new Error("Konfirmasi PIN Owner tidak sama.");
  }

  const { pinHash, pinSalt } = await createPinSecurity(input.ownerPin);

  const ownerId = Crypto.randomUUID();
  const now = Date.now();

  sqliteDatabase.withTransactionSync(() => {
    const transactionState = getInitialSetupState();

    if (transactionState.isCompleted) {
      throw new Error("Pengaturan awal aplikasi sudah diselesaikan.");
    }

    if (transactionState.isInconsistent) {
      throw new Error("Data pengaturan awal tidak konsisten.");
    }

    const usernameConflict = sqliteDatabase.getFirstSync<ExistingUserRow>(
      `
          SELECT id
          FROM users
          WHERE lower(username) = $username
          LIMIT 1;
        `,
      {
        $username: ownerUsername,
      },
    );

    if (usernameConflict !== null) {
      throw new Error("Username sudah digunakan. Gunakan username lain.");
    }

    sqliteDatabase.runSync(
      `
        INSERT INTO app_config (
          id,
          business_name,
          owner_wa_number,
          egg_rack_size,
          setup_completed,
          session_timeout_minutes,
          created_at,
          updated_at
        )
        VALUES (
          1,
          $businessName,
          $ownerWaNumber,
          $eggRackSize,
          1,
          5,
          $createdAt,
          $updatedAt
        )
        ON CONFLICT(id) DO UPDATE SET
          business_name = excluded.business_name,
          owner_wa_number = excluded.owner_wa_number,
          egg_rack_size = excluded.egg_rack_size,
          setup_completed = excluded.setup_completed,
          session_timeout_minutes =
            excluded.session_timeout_minutes,
          updated_at = excluded.updated_at;
      `,
      {
        $businessName: businessName,
        $ownerWaNumber: ownerWaNumber,
        $eggRackSize: DEFAULT_EGG_RACK_SIZE,
        $createdAt: now,
        $updatedAt: now,
      },
    );

    sqliteDatabase.runSync(
      `
        INSERT INTO users (
          id,
          full_name,
          username,
          role,
          pin_hash,
          pin_salt,
          is_active,
          failed_login_attempts,
          created_at,
          updated_at
        )
        VALUES (
          $id,
          $fullName,
          $username,
          'owner',
          $pinHash,
          $pinSalt,
          1,
          0,
          $createdAt,
          $updatedAt
        );
      `,
      {
        $id: ownerId,
        $fullName: ownerFullName,
        $username: ownerUsername,
        $pinHash: pinHash,
        $pinSalt: pinSalt,
        $createdAt: now,
        $updatedAt: now,
      },
    );
  });

  return {
    ownerId,
    ownerUsername,
  };
}
