import type { ReactNode } from "react";
import { Text, View } from "react-native";
import { useMigrations } from "drizzle-orm/expo-sqlite/migrator";

import migrations from "../../drizzle/migrations";
import { database } from "../db/client";

type DatabaseMigrationGateProps = {
  children: ReactNode;
};

export function DatabaseMigrationGate({
  children,
}: DatabaseMigrationGateProps) {
  const { success, error } = useMigrations(database, migrations);

  if (error) {
    return (
      <View className="flex-1 items-center justify-center bg-brand-cream px-6">
        <View className="w-full rounded-3xl bg-brand-white p-6">
          <Text className="text-center font-atkinson-bold text-[24px] text-brand-brown">
            Database gagal disiapkan
          </Text>

          <Text className="mt-3 text-center font-atkinson text-[16px] leading-6 text-brand-black">
            Tutup dan buka kembali aplikasi. Jika masalah tetap terjadi, catat
            pesan kesalahan berikut.
          </Text>

          <View className="mt-5 rounded-2xl border-2 border-brand-yellow p-4">
            <Text className="font-atkinson text-[14px] leading-5 text-brand-brown">
              {error.message}
            </Text>
          </View>
        </View>
      </View>
    );
  }

  if (!success) {
    return (
      <View className="flex-1 items-center justify-center bg-brand-cream px-6">
        <Text className="font-atkinson-bold text-[22px] text-brand-brown">
          Menyiapkan data aplikasi...
        </Text>

        <Text className="mt-2 text-center font-atkinson text-[16px] text-brand-black">
          Mohon jangan tutup aplikasi.
        </Text>
      </View>
    );
  }

  return <>{children}</>;
}
