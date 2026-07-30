import { sqliteDatabase } from "../db/client";
import type { AuthenticatedUser } from "./authService";
import { verifyPin } from "./pinSecurity";

type SecurityUserRow = {
  id: string;
  role: AuthenticatedUser["role"];
  pinHash: string;
  pinSalt: string;
  isActive: number;
};

export async function verifySensitiveActionPin(
  user: AuthenticatedUser,
  pin: string,
): Promise<void> {
  const normalizedPin = pin.trim();

  if (!/^\d{4,6}$/.test(normalizedPin)) {
    throw new Error("PIN harus terdiri dari 4 sampai 6 digit angka.");
  }

  if (user.role !== "owner") {
    throw new Error(
      "Hanya akun Owner yang dapat mengubah atau menghapus produk.",
    );
  }

  const storedUser = sqliteDatabase.getFirstSync<SecurityUserRow>(
    `
        SELECT
          id,
          role,
          pin_hash AS pinHash,
          pin_salt AS pinSalt,
          is_active AS isActive
        FROM users
        WHERE id = $userId
          AND deleted_at IS NULL
        LIMIT 1;
      `,
    {
      $userId: user.id,
    },
  );

  if (storedUser === null) {
    throw new Error("Akun yang sedang digunakan tidak ditemukan.");
  }

  if (storedUser.isActive !== 1) {
    throw new Error("Akun yang sedang digunakan sudah tidak aktif.");
  }

  if (storedUser.role !== "owner") {
    throw new Error("Akun ini tidak memiliki izin untuk mengelola produk.");
  }

  const pinIsCorrect = await verifyPin(
    normalizedPin,
    storedUser.pinHash,
    storedUser.pinSalt,
  );

  if (!pinIsCorrect) {
    throw new Error("PIN yang dimasukkan tidak benar.");
  }
}
