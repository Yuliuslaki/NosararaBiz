import * as Crypto from "expo-crypto";

import { sqliteDatabase } from "../db/client";
import { USER_ROLES } from "../types/user";
import type { AuthenticatedUser } from "./authService";
import { createPinSecurity, validatePin, verifyPin } from "./pinSecurity";

const MIN_OFFICER_NAME_LENGTH = 2;
const MAX_OFFICER_NAME_LENGTH = 100;

const MIN_USERNAME_LENGTH = 3;
const MAX_USERNAME_LENGTH = 30;

const USERNAME_PATTERN = /^[a-z0-9][a-z0-9._-]{2,29}$/;

type ExistingUserRow = {
  id: string;
};

type OwnerSecurityRow = {
  id: string;
  pinHash: string;
  pinSalt: string;
};

type OfficerRow = {
  id: string;
  fullName: string;
  username: string;
  isActive: number;
  failedLoginAttempts: number;
  lockedUntil: number | null;
  lastLoginAt: number | null;
  createdAt: number;
  updatedAt: number;
};

export type OfficerAccount = {
  id: string;
  fullName: string;
  username: string;
  role: "officer";
  isActive: boolean;
  failedLoginAttempts: number;
  lockedUntil: number | null;
  lastLoginAt: number | null;
  createdAt: number;
  updatedAt: number;
};

export type CreateOfficerInput = {
  fullName: string;
  username: string;
  pin: string;
  pinConfirmation: string;
  performedBy: AuthenticatedUser;
};

export type UpdateOfficerIdentityInput = {
  officerId: string;
  fullName: string;
  username: string;
  performedBy: AuthenticatedUser;
};

export type ChangeOfficerPinInput = {
  officerId: string;
  pin: string;
  pinConfirmation: string;
  ownerPin: string;
  performedBy: AuthenticatedUser;
};

export type SetOfficerActiveInput = {
  officerId: string;
  isActive: boolean;
  ownerPin: string;
  performedBy: AuthenticatedUser;
};

export type DeleteOfficerInput = {
  officerId: string;
  ownerPin: string;
  performedBy: AuthenticatedUser;
};

function normalizeOfficerName(fullName: string): string {
  const normalizedName = fullName.trim().replace(/\s+/g, " ");

  if (normalizedName.length < MIN_OFFICER_NAME_LENGTH) {
    throw new Error(
      `Nama Officer minimal ${MIN_OFFICER_NAME_LENGTH} karakter.`,
    );
  }

  if (normalizedName.length > MAX_OFFICER_NAME_LENGTH) {
    throw new Error(
      `Nama Officer maksimal ${MAX_OFFICER_NAME_LENGTH} karakter.`,
    );
  }

  return normalizedName;
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

function validateOfficerId(officerId: string): string {
  const normalizedOfficerId = officerId.trim();

  if (normalizedOfficerId.length === 0) {
    throw new Error("ID Officer tidak valid.");
  }

  return normalizedOfficerId;
}

function validatePerformedByOwner(performedBy: AuthenticatedUser): void {
  if (performedBy.role !== USER_ROLES.OWNER) {
    throw new Error("Hanya Owner yang dapat mengelola akun Officer.");
  }

  if (performedBy.id.trim().length === 0) {
    throw new Error("ID Owner tidak valid.");
  }

  const activeOwner = sqliteDatabase.getFirstSync<ExistingUserRow>(
    `
      SELECT id
      FROM users
      WHERE id = $ownerId
        AND role = 'owner'
        AND is_active = 1
        AND deleted_at IS NULL
      LIMIT 1;
    `,
    {
      $ownerId: performedBy.id,
    },
  );

  if (activeOwner === null) {
    throw new Error(
      "Akun Owner tidak aktif atau tidak ditemukan. Silakan masuk kembali.",
    );
  }
}

function getActiveOwnerSecurity(
  performedBy: AuthenticatedUser,
): OwnerSecurityRow {
  validatePerformedByOwner(performedBy);

  const owner = sqliteDatabase.getFirstSync<OwnerSecurityRow>(
    `
      SELECT
        id,
        pin_hash AS pinHash,
        pin_salt AS pinSalt
      FROM users
      WHERE id = $ownerId
        AND role = 'owner'
        AND is_active = 1
        AND deleted_at IS NULL
      LIMIT 1;
    `,
    {
      $ownerId: performedBy.id,
    },
  );

  if (owner === null) {
    throw new Error(
      "Akun Owner tidak aktif atau tidak ditemukan. Silakan masuk kembali.",
    );
  }

  return owner;
}

async function verifyActiveOwnerPin(
  performedBy: AuthenticatedUser,
  ownerPin: string,
): Promise<void> {
  validatePin(ownerPin);

  const owner = getActiveOwnerSecurity(performedBy);

  const ownerPinIsCorrect = await verifyPin(
    ownerPin,
    owner.pinHash,
    owner.pinSalt,
  );

  if (!ownerPinIsCorrect) {
    throw new Error("PIN Owner tidak sesuai.");
  }
}

function getOfficerRow(officerId: string): OfficerRow | null {
  return sqliteDatabase.getFirstSync<OfficerRow>(
    `
      SELECT
        id,
        full_name AS fullName,
        username,
        is_active AS isActive,
        failed_login_attempts AS failedLoginAttempts,
        locked_until AS lockedUntil,
        last_login_at AS lastLoginAt,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM users
      WHERE id = $officerId
        AND role = 'officer'
        AND deleted_at IS NULL
      LIMIT 1;
    `,
    {
      $officerId: officerId,
    },
  );
}

function requireOfficerRow(officerId: string): OfficerRow {
  const officer = getOfficerRow(officerId);

  if (officer === null) {
    throw new Error("Akun Officer tidak ditemukan.");
  }

  return officer;
}

function mapOfficerRow(row: OfficerRow): OfficerAccount {
  return {
    id: row.id,
    fullName: row.fullName,
    username: row.username,
    role: USER_ROLES.OFFICER,
    isActive: row.isActive === 1,
    failedLoginAttempts: row.failedLoginAttempts,
    lockedUntil: row.lockedUntil,
    lastLoginAt: row.lastLoginAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function ensureUsernameAvailable(
  username: string,
  excludedUserId: string,
): void {
  const usernameConflict = sqliteDatabase.getFirstSync<ExistingUserRow>(
    `
      SELECT id
      FROM users
      WHERE lower(username) = $username
        AND id <> $excludedUserId
      LIMIT 1;
    `,
    {
      $username: username,
      $excludedUserId: excludedUserId,
    },
  );

  if (usernameConflict !== null) {
    throw new Error("Username sudah digunakan. Gunakan username lain.");
  }
}

export function getOfficerAccounts(
  performedBy: AuthenticatedUser,
): OfficerAccount[] {
  validatePerformedByOwner(performedBy);

  const rows = sqliteDatabase.getAllSync<OfficerRow>(`
    SELECT
      id,
      full_name AS fullName,
      username,
      is_active AS isActive,
      failed_login_attempts AS failedLoginAttempts,
      locked_until AS lockedUntil,
      last_login_at AS lastLoginAt,
      created_at AS createdAt,
      updated_at AS updatedAt
    FROM users
    WHERE role = 'officer'
      AND deleted_at IS NULL
    ORDER BY
      is_active DESC,
      full_name COLLATE NOCASE ASC;
  `);

  return rows.map(mapOfficerRow);
}

export function getOfficerAccount(
  officerId: string,
  performedBy: AuthenticatedUser,
): OfficerAccount {
  validatePerformedByOwner(performedBy);

  const normalizedOfficerId = validateOfficerId(officerId);

  return mapOfficerRow(requireOfficerRow(normalizedOfficerId));
}

export async function createOfficer(
  input: CreateOfficerInput,
): Promise<OfficerAccount> {
  validatePerformedByOwner(input.performedBy);

  const fullName = normalizeOfficerName(input.fullName);
  const username = normalizeUsername(input.username);

  validatePin(input.pin);

  if (input.pin !== input.pinConfirmation) {
    throw new Error("Konfirmasi PIN Officer tidak sama.");
  }

  const { pinHash, pinSalt } = await createPinSecurity(input.pin);

  const officerId = Crypto.randomUUID();
  const currentTime = Date.now();

  sqliteDatabase.withTransactionSync(() => {
    validatePerformedByOwner(input.performedBy);

    ensureUsernameAvailable(username, officerId);

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
          locked_until,
          last_login_at,
          deleted_at,
          created_at,
          updated_at
        )
        VALUES (
          $id,
          $fullName,
          $username,
          'officer',
          $pinHash,
          $pinSalt,
          1,
          0,
          NULL,
          NULL,
          NULL,
          $createdAt,
          $updatedAt
        );
      `,
      {
        $id: officerId,
        $fullName: fullName,
        $username: username,
        $pinHash: pinHash,
        $pinSalt: pinSalt,
        $createdAt: currentTime,
        $updatedAt: currentTime,
      },
    );
  });

  return mapOfficerRow(requireOfficerRow(officerId));
}

export function updateOfficerIdentity(
  input: UpdateOfficerIdentityInput,
): OfficerAccount {
  validatePerformedByOwner(input.performedBy);

  const officerId = validateOfficerId(input.officerId);
  const fullName = normalizeOfficerName(input.fullName);
  const username = normalizeUsername(input.username);

  const currentTime = Date.now();

  sqliteDatabase.withTransactionSync(() => {
    validatePerformedByOwner(input.performedBy);

    requireOfficerRow(officerId);

    ensureUsernameAvailable(username, officerId);

    sqliteDatabase.runSync(
      `
        UPDATE users
        SET
          full_name = $fullName,
          username = $username,
          updated_at = $updatedAt
        WHERE id = $officerId
          AND role = 'officer'
          AND deleted_at IS NULL;
      `,
      {
        $officerId: officerId,
        $fullName: fullName,
        $username: username,
        $updatedAt: currentTime,
      },
    );
  });

  return mapOfficerRow(requireOfficerRow(officerId));
}

export async function changeOfficerPin(
  input: ChangeOfficerPinInput,
): Promise<OfficerAccount> {
  validatePerformedByOwner(input.performedBy);

  const officerId = validateOfficerId(input.officerId);

  validatePin(input.pin);

  if (input.pin !== input.pinConfirmation) {
    throw new Error("Konfirmasi PIN Officer tidak sama.");
  }

  requireOfficerRow(officerId);

  await verifyActiveOwnerPin(input.performedBy, input.ownerPin);

  const { pinHash, pinSalt } = await createPinSecurity(input.pin);

  const currentTime = Date.now();

  sqliteDatabase.withTransactionSync(() => {
    validatePerformedByOwner(input.performedBy);

    requireOfficerRow(officerId);

    sqliteDatabase.runSync(
      `
        UPDATE users
        SET
          pin_hash = $pinHash,
          pin_salt = $pinSalt,
          failed_login_attempts = 0,
          locked_until = NULL,
          updated_at = $updatedAt
        WHERE id = $officerId
          AND role = 'officer'
          AND deleted_at IS NULL;
      `,
      {
        $officerId: officerId,
        $pinHash: pinHash,
        $pinSalt: pinSalt,
        $updatedAt: currentTime,
      },
    );
  });

  return mapOfficerRow(requireOfficerRow(officerId));
}

export async function setOfficerActive(
  input: SetOfficerActiveInput,
): Promise<OfficerAccount> {
  validatePerformedByOwner(input.performedBy);

  const officerId = validateOfficerId(input.officerId);

  if (typeof input.isActive !== "boolean") {
    throw new Error("Status akun Officer tidak valid.");
  }

  requireOfficerRow(officerId);

  await verifyActiveOwnerPin(input.performedBy, input.ownerPin);

  const currentTime = Date.now();

  sqliteDatabase.withTransactionSync(() => {
    validatePerformedByOwner(input.performedBy);

    requireOfficerRow(officerId);

    sqliteDatabase.runSync(
      `
        UPDATE users
        SET
          is_active = $isActive,
          failed_login_attempts = 0,
          locked_until = NULL,
          updated_at = $updatedAt
        WHERE id = $officerId
          AND role = 'officer'
          AND deleted_at IS NULL;
      `,
      {
        $officerId: officerId,
        $isActive: input.isActive ? 1 : 0,
        $updatedAt: currentTime,
      },
    );
  });

  return mapOfficerRow(requireOfficerRow(officerId));
}

export async function deleteOfficer(input: DeleteOfficerInput): Promise<void> {
  validatePerformedByOwner(input.performedBy);

  const officerId = validateOfficerId(input.officerId);

  requireOfficerRow(officerId);

  await verifyActiveOwnerPin(input.performedBy, input.ownerPin);

  const currentTime = Date.now();

  sqliteDatabase.withTransactionSync(() => {
    validatePerformedByOwner(input.performedBy);

    const officer = requireOfficerRow(officerId);

    const deletedUsername = [
      officer.username,
      "deleted",
      currentTime.toString(),
      Crypto.randomUUID().slice(0, 8),
    ].join("__");

    sqliteDatabase.runSync(
      `
        UPDATE users
        SET
          username = $deletedUsername,
          is_active = 0,
          failed_login_attempts = 0,
          locked_until = NULL,
          deleted_at = $deletedAt,
          updated_at = $updatedAt
        WHERE id = $officerId
          AND role = 'officer'
          AND deleted_at IS NULL;
      `,
      {
        $officerId: officerId,
        $deletedUsername: deletedUsername,
        $deletedAt: currentTime,
        $updatedAt: currentTime,
      },
    );
  });
}
