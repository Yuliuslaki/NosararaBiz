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
};

type DeviceLoginSecurityDatabaseRow = {
  login_failed_attempts: number | null;
  login_locked_until: number | null;
};

type DeviceLoginSecurity = {
  loginFailedAttempts: number;
  loginLockedUntil: number | null;
};

type FailedLoginResult = {
  remainingAttempts: number;
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
      remainingAttempts: number;
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

function normalizeFailedAttempts(value: unknown): number {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue) || numericValue < 0) {
    return 0;
  }

  return Math.min(MAX_FAILED_LOGIN_ATTEMPTS, Math.trunc(numericValue));
}

function normalizeLockedUntil(value: unknown): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  const numericValue = Number(value);

  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return null;
  }

  return numericValue;
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
        is_active AS isActive
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

function getDeviceLoginSecurity(): DeviceLoginSecurity {
  const securityRow =
    sqliteDatabase.getFirstSync<DeviceLoginSecurityDatabaseRow>(
      `
        SELECT
          login_failed_attempts,
          login_locked_until
        FROM app_config
        WHERE id = 1
        LIMIT 1;
      `,
    );

  if (securityRow === null) {
    throw new Error("Konfigurasi keamanan login belum tersedia.");
  }

  return {
    loginFailedAttempts: normalizeFailedAttempts(
      securityRow.login_failed_attempts,
    ),
    loginLockedUntil: normalizeLockedUntil(securityRow.login_locked_until),
  };
}

function clearDeviceLoginSecurity(now: number): void {
  sqliteDatabase.runSync(
    `
      UPDATE app_config
      SET
        login_failed_attempts = 0,
        login_locked_until = NULL,
        updated_at = $updatedAt
      WHERE id = 1;
    `,
    {
      $updatedAt: now,
    },
  );
}

function recordFailedDeviceLogin(
  currentFailedAttempts: number,
  now: number,
): FailedLoginResult {
  const safeCurrentFailedAttempts = normalizeFailedAttempts(
    currentFailedAttempts,
  );

  const nextFailedAttempts = safeCurrentFailedAttempts + 1;

  const shouldLockLogin = nextFailedAttempts >= MAX_FAILED_LOGIN_ATTEMPTS;

  const lockedUntil = shouldLockLogin ? now + LOGIN_LOCK_DURATION_MS : null;

  sqliteDatabase.runSync(
    `
      UPDATE app_config
      SET
        login_failed_attempts = $failedAttempts,
        login_locked_until = $lockedUntil,
        updated_at = $updatedAt
      WHERE id = 1;
    `,
    {
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

function recordSuccessfulLogin(userId: string, now: number): void {
  clearDeviceLoginSecurity(now);

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

function createInvalidCredentialsResult(
  currentFailedAttempts: number,
  now: number,
): LoginResult {
  const failedLoginResult = recordFailedDeviceLogin(currentFailedAttempts, now);

  if (failedLoginResult.lockedUntil !== null) {
    return {
      success: false,
      reason: "locked",
      message: "Login gagal lima kali. Aplikasi dikunci selama 5 menit.",
      lockedUntil: failedLoginResult.lockedUntil,
    };
  }

  return {
    success: false,
    reason: "invalid_credentials",
    message: "Username atau PIN tidak sesuai.",
    remainingAttempts: failedLoginResult.remainingAttempts,
  };
}

export async function loginWithUsernameAndPin(
  username: string,
  pin: string,
): Promise<LoginResult> {
  const normalizedUsername = normalizeUsername(username);
  const now = Date.now();

  let deviceSecurity = getDeviceLoginSecurity();

  if (
    deviceSecurity.loginLockedUntil !== null &&
    deviceSecurity.loginLockedUntil > now
  ) {
    return {
      success: false,
      reason: "locked",
      message:
        "Terlalu banyak percobaan login. Tunggu sampai masa penguncian selesai.",
      lockedUntil: deviceSecurity.loginLockedUntil,
    };
  }

  if (
    deviceSecurity.loginLockedUntil !== null &&
    deviceSecurity.loginLockedUntil <= now
  ) {
    clearDeviceLoginSecurity(now);

    deviceSecurity = {
      loginFailedAttempts: 0,
      loginLockedUntil: null,
    };
  }

  if (normalizedUsername.length === 0 || pin.length !== 6) {
    return {
      success: false,
      reason: "invalid_credentials",
      message: "Masukkan username dan PIN yang terdiri dari tepat 6 angka.",
      remainingAttempts: Math.max(
        0,
        MAX_FAILED_LOGIN_ATTEMPTS - deviceSecurity.loginFailedAttempts,
      ),
    };
  }

  const user = getLoginUser(normalizedUsername);

  if (user === null) {
    return createInvalidCredentialsResult(
      deviceSecurity.loginFailedAttempts,
      now,
    );
  }

  if (user.isActive !== 1) {
    return {
      success: false,
      reason: "inactive",
      message: "Akun ini sedang dinonaktifkan. Hubungi Owner.",
    };
  }

  const pinIsCorrect = await verifyPin(pin, user.pinHash, user.pinSalt);

  if (!pinIsCorrect) {
    return createInvalidCredentialsResult(
      deviceSecurity.loginFailedAttempts,
      now,
    );
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
