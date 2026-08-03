import { useEffect, useState } from "react";
import { AppState, Pressable, ScrollView, Text, View } from "react-native";

import type { AuthenticatedUser } from "../../services/authService";
import {
  getTodayTransactionSummary,
  type TodayTransactionSummary,
} from "../../services/transactionHistoryService";
import { formatCurrency } from "../../utils/formatters";

type OwnerHomeScreenProps = {
  user: AuthenticatedUser;
  onOpenSales: () => void;
  onOpenProducts: () => void;
  onOpenTransactionHistory: () => void;
  onOpenCashBook: () => void;
  onOpenOfficers?: () => void;
  onOpenReports: () => void;
  onLogout: () => void;
};

type DashboardMenuItemProps = {
  title: string;
  description: string;
  onPress?: () => void;
};

type SummaryCardProps = {
  label: string;
  value: string;
};

const EMPTY_SUMMARY: TodayTransactionSummary = {
  totalSales: 0,
  totalTransactions: 0,
  cashSales: 0,
  qrisSales: 0,
  cancelledTransactions: 0,
};

function SummaryCard({ label, value }: SummaryCardProps) {
  return (
    <View className="min-h-[108px] flex-1 justify-between rounded-xl border border-brand-black bg-brand-white p-4">
      <Text
        numberOfLines={2}
        className="font-atkinson text-[15px] leading-5 text-brand-black"
      >
        {label}
      </Text>

      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
        className="mt-3 font-atkinson-bold text-[21px] leading-7 text-brand-black"
      >
        {value}
      </Text>
    </View>
  );
}

function DashboardMenuItem({
  title,
  description,
  onPress,
}: DashboardMenuItemProps) {
  const isAvailable = onPress !== undefined;

  return (
    <Pressable
      onPress={onPress}
      disabled={!isAvailable}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{
        disabled: !isAvailable,
      }}
      className={`mb-3 min-h-[96px] rounded-xl border border-brand-black bg-brand-white px-5 py-4 ${
        isAvailable ? "" : "opacity-50"
      }`}
    >
      <View className="flex-row items-center justify-between">
        <View className="mr-4 flex-1">
          <Text className="font-atkinson-bold text-[19px] leading-6 text-brand-black">
            {title}
          </Text>

          <Text className="mt-1 font-atkinson text-[15px] leading-5 text-brand-black">
            {description}
          </Text>
        </View>

        <Text className="font-atkinson-bold text-[26px] text-brand-black">
          ›
        </Text>
      </View>
    </Pressable>
  );
}

export function OwnerHomeScreen({
  user,
  onOpenSales,
  onOpenProducts,
  onOpenTransactionHistory,
  onOpenCashBook,
  onOpenOfficers,
  onOpenReports,
  onLogout,
}: OwnerHomeScreenProps) {
  const [summary, setSummary] =
    useState<TodayTransactionSummary>(EMPTY_SUMMARY);

  const [summaryError, setSummaryError] = useState<string | null>(null);

  useEffect(() => {
    let midnightTimer: ReturnType<typeof setTimeout> | null = null;

    let screenIsActive = true;

    function loadSummary(): void {
      if (!screenIsActive) {
        return;
      }

      try {
        setSummary(getTodayTransactionSummary());
        setSummaryError(null);
      } catch (error) {
        setSummary(EMPTY_SUMMARY);

        setSummaryError(
          error instanceof Error
            ? error.message
            : "Ringkasan hari ini tidak dapat dimuat.",
        );
      }
    }

    function scheduleMidnightRefresh(): void {
      const now = new Date();

      const nextMidnight = new Date(now);

      nextMidnight.setHours(24, 0, 0, 250);

      const delay = Math.max(nextMidnight.getTime() - Date.now(), 1000);

      midnightTimer = setTimeout(() => {
        loadSummary();
        scheduleMidnightRefresh();
      }, delay);
    }

    loadSummary();
    scheduleMidnightRefresh();

    const appStateSubscription = AppState.addEventListener(
      "change",
      (nextAppState) => {
        if (nextAppState === "active") {
          loadSummary();
        }
      },
    );

    return () => {
      screenIsActive = false;

      appStateSubscription.remove();

      if (midnightTimer !== null) {
        clearTimeout(midnightTimer);
      }
    };
  }, []);

  return (
    <ScrollView
      className="flex-1 bg-brand-cream"
      contentContainerStyle={{
        paddingHorizontal: 20,
        paddingTop: 40,
        paddingBottom: 48,
      }}
    >
      <View className="w-full max-w-md self-center">
        <View className="border-b border-brand-black pb-5">
          <Text className="font-atkinson text-[16px] text-brand-black">
            Selamat datang,
          </Text>

          <Text className="mt-1 font-atkinson-bold text-[30px] leading-9 text-brand-black">
            {user.fullName}
          </Text>

          <Text className="mt-2 font-atkinson text-[16px] leading-6 text-brand-black">
            Ringkasan dan pengelolaan usaha
          </Text>
        </View>

        <View className="mt-6">
          <Text className="font-atkinson-bold text-[22px] text-brand-black">
            Ringkasan Hari Ini
          </Text>

          <View className="mt-4 flex-row gap-3">
            <SummaryCard
              label="Total penjualan"
              value={formatCurrency(summary.totalSales)}
            />

            <SummaryCard
              label="Jumlah transaksi"
              value={String(summary.totalTransactions)}
            />
          </View>

          <View className="mt-3 flex-row gap-3">
            <SummaryCard
              label="Pembayaran tunai"
              value={formatCurrency(summary.cashSales)}
            />

            <SummaryCard
              label="Pembayaran QRIS"
              value={formatCurrency(summary.qrisSales)}
            />
          </View>

          {summaryError ? (
            <View className="mt-4 rounded-xl border border-brand-black bg-brand-white p-4">
              <Text className="font-atkinson-bold text-[15px] text-brand-black">
                Ringkasan belum dapat dimuat
              </Text>

              <Text className="mt-2 font-atkinson text-[14px] leading-5 text-brand-black">
                {summaryError}
              </Text>
            </View>
          ) : null}
        </View>

        <Text className="mb-4 mt-8 font-atkinson-bold text-[22px] text-brand-black">
          Pilih Menu
        </Text>

        <DashboardMenuItem
          title="Penjualan"
          description="Catat transaksi penjualan baru."
          onPress={onOpenSales}
        />

        <DashboardMenuItem
          title="Produk dan Stok"
          description="Kelola produk, harga, dan jumlah stok."
          onPress={onOpenProducts}
        />

        <DashboardMenuItem
          title="Riwayat Transaksi"
          description="Lihat transaksi yang sudah tersimpan."
          onPress={onOpenTransactionHistory}
        />

        <DashboardMenuItem
          title="Buku Kas"
          description="Lihat pemasukan dan catat pengeluaran."
          onPress={onOpenCashBook}
        />

        <DashboardMenuItem
          title="Kelola Petugas"
          description="Kelola akun petugas usaha."
          onPress={onOpenOfficers}
        />

        <DashboardMenuItem
          title="Laporan"
          description="Lihat dan buat laporan usaha."
          onPress={onOpenReports}
        />

        <Pressable
          onPress={onLogout}
          accessibilityRole="button"
          accessibilityLabel="Keluar dari akun"
          className="mt-5 min-h-14 items-center justify-center rounded-xl bg-brand-black px-5 py-4"
        >
          <Text className="font-atkinson-bold text-[18px] text-brand-white">
            Keluar dari Akun
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
