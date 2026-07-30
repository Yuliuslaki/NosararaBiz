import { sqliteDatabase } from "../db/client";
import type { UserRole } from "../types/user";
import { verifyPin } from "./pinSecurity";

const MAX_FAILED_LOGIN_ATTEMPTS = 5;
const LOGIN_LOCK_DURATION_MS = 5 * 60 * 1000;

type LoginUserRow = {
  id: string;
  fullName: string;
  username: string;
  role: UserRole;
  pinHash: string;
  pinSalt: string;
  isActive: number;
  failedLoginAttempts: number;
  lockedUntil: number | null;
};

export type AuthenticatedUser = {
  id: string;
  fullName: string;
  username: string;
  role: UserRole;
};

export type LoginResult =
  | {
      success: true;
      user: AuthenticatedUser;
      loggedInAt: number;
    }
  | {
      success: false;
      reason: "invalid_credentials";
      message: string;
      remainingAttempts?: number;
    }
  | {
      success: false;
      reason: "inactive";
      message: string;
    }
  | {
      success: false;
      reason: "locked";
      message: string;
      lockedUntil: number;
    };

function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

function getLoginUser(username: string): LoginUserRow | null {
  return sqliteDatabase.getFirstSync<LoginUserRow>(
    `
      SELECT
        id,
        full_name AS fullName,
        username,
        role,
        pin_hash AS pinHash,
        pin_salt AS pinSalt,
        is_active AS isActive,
        failed_login_attempts AS failedLoginAttempts,
        locked_until AS lockedUntil
      FROM users
      WHERE lower(username) = $username
        AND deleted_at IS NULL
      LIMIT 1;
    `,
    {
      $username: username,
    },
  );
}

function clearExpiredLoginLock(userId: string, now: number): void {
  sqliteDatabase.runSync(
    `
      UPDATE users
      SET
        failed_login_attempts = 0,
        locked_until = NULL,
        updated_at = $updatedAt
      WHERE id = $userId;
    `,
    {
      $userId: userId,
      $updatedAt: now,
    },
  );
}

function recordSuccessfulLogin(userId: string, now: number): void {
  sqliteDatabase.runSync(
    `
      UPDATE users
      SET
        failed_login_attempts = 0,
        locked_until = NULL,
        last_login_at = $lastLoginAt,
        updated_at = $updatedAt
      WHERE id = $userId;
    `,
    {
      $userId: userId,
      $lastLoginAt: now,
      $updatedAt: now,
    },
  );
}

function recordFailedLogin(
  userId: string,
  currentFailedAttempts: number,
  now: number,
): {
  remainingAttempts: number;
  lockedUntil: number | null;
} {
  const nextFailedAttempts = currentFailedAttempts + 1;

  const shouldLockAccount = nextFailedAttempts >= MAX_FAILED_LOGIN_ATTEMPTS;

  const lockedUntil = shouldLockAccount ? now + LOGIN_LOCK_DURATION_MS : null;

  sqliteDatabase.runSync(
    `
      UPDATE users
      SET
        failed_login_attempts = $failedAttempts,
        locked_until = $lockedUntil,
        updated_at = $updatedAt
      WHERE id = $userId;
    `,
    {
      $userId: userId,
      $failedAttempts: nextFailedAttempts,
      $lockedUntil: lockedUntil,
      $updatedAt: now,
    },
  );

  return {
    remainingAttempts: Math.max(
      0,
      MAX_FAILED_LOGIN_ATTEMPTS - nextFailedAttempts,
    ),
    lockedUntil,
  };
}

export async function loginWithUsernameAndPin(
  username: string,
  pin: string,
): Promise<LoginResult> {
  const normalizedUsername = normalizeUsername(username);

  if (normalizedUsername.length === 0 || pin.length === 0) {
    return {
      success: false,
      reason: "invalid_credentials",
      message: "Masukkan username dan PIN.",
    };
  }

  const user = getLoginUser(normalizedUsername);

  if (user === null) {
    return {
      success: false,
      reason: "invalid_credentials",
      message: "Username atau PIN tidak sesuai.",
    };
  }

  if (user.isActive !== 1) {
    return {
      success: false,
      reason: "inactive",
      message: "Akun ini sedang dinonaktifkan. Hubungi Owner.",
    };
  }

  const now = Date.now();

  let failedLoginAttempts = user.failedLoginAttempts;

  if (user.lockedUntil !== null && user.lockedUntil > now) {
    return {
      success: false,
      reason: "locked",
      message: "Terlalu banyak percobaan login. Akun dikunci sementara.",
      lockedUntil: user.lockedUntil,
    };
  }

  if (user.lockedUntil !== null && user.lockedUntil <= now) {
    clearExpiredLoginLock(user.id, now);
    failedLoginAttempts = 0;
  }

  const pinIsCorrect = await verifyPin(pin, user.pinHash, user.pinSalt);

  if (!pinIsCorrect) {
    const failedLoginResult = recordFailedLogin(
      user.id,
      failedLoginAttempts,
      now,
    );

    if (failedLoginResult.lockedUntil !== null) {
      return {
        success: false,
        reason: "locked",
        message: "PIN salah lima kali. Akun dikunci selama 5 menit.",
        lockedUntil: failedLoginResult.lockedUntil,
      };
    }

    return {
      success: false,
      reason: "invalid_credentials",
      message: `Username atau PIN tidak sesuai. Sisa percobaan: ${failedLoginResult.remainingAttempts}.`,
      remainingAttempts: failedLoginResult.remainingAttempts,
    };
  }

  recordSuccessfulLogin(user.id, now);

  return {
    success: true,
    loggedInAt: now,
    user: {
      id: user.id,
      fullName: user.fullName,
      username: user.username,
      role: user.role,
    },
  };
}
