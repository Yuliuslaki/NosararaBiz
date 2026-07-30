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
    <View className="h-[104px] flex-1 justify-between rounded-2xl bg-brand-cream px-4 py-3">
      <Text
        numberOfLines={2}
        className="min-h-[34px] font-atkinson text-[13px] leading-5 text-brand-black"
      >
        {label}
      </Text>

      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.72}
        className="font-atkinson-bold text-[20px] leading-7 text-brand-brown"
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
      className={`mb-4 rounded-2xl border-2 bg-brand-white px-5 py-4 ${
        isAvailable ? "border-brand-orange" : "border-brand-yellow"
      }`}
    >
      <Text className="font-atkinson-bold text-[18px] text-brand-brown">
        {title}
      </Text>

      <Text className="mt-2 font-atkinson text-[15px] leading-6 text-brand-black">
        {description}
      </Text>

      <Text className="mt-3 font-atkinson-bold text-[14px] text-brand-orange">
        {isAvailable ? "Buka menu" : "Akan dibuat pada tahap berikutnya"}
      </Text>
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
        <View className="rounded-3xl bg-brand-orange px-6 py-6">
          <Text className="font-atkinson text-[16px] text-brand-white">
            Selamat datang,
          </Text>

          <Text className="mt-1 font-atkinson-bold text-[28px] leading-9 text-brand-white">
            {user.fullName}
          </Text>

          <Text className="mt-2 font-atkinson text-[15px] text-brand-white">
            Dashboard Owner
          </Text>
        </View>

        <View className="mt-5 rounded-3xl bg-brand-white p-4">
          <Text className="font-atkinson-bold text-[18px] text-brand-brown">
            Ringkasan Hari Ini
          </Text>

          <View className="mt-4 flex-row gap-3">
            <SummaryCard
              label="Total penjualan"
              value={formatCurrency(summary.totalSales)}
            />

            <SummaryCard
              label="Transaksi berhasil"
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
            <View className="mt-3 rounded-2xl border border-brand-orange bg-brand-white p-3">
              <Text className="font-atkinson-bold text-[13px] text-brand-brown">
                Ringkasan belum dapat dimuat
              </Text>

              <Text className="mt-1 font-atkinson text-[13px] leading-5 text-brand-black">
                {summaryError}
              </Text>
            </View>
          ) : null}
        </View>

        <Text className="mb-4 mt-7 font-atkinson-bold text-[22px] text-brand-brown">
          Menu Utama
        </Text>

        <DashboardMenuItem
          title="Transaksi Penjualan"
          description="Membuat transaksi penjualan telur dan produk lainnya."
          onPress={onOpenSales}
        />

        <DashboardMenuItem
          title="Produk dan Stok"
          description="Mengelola produk, harga, stok awal, dan penambahan stok."
          onPress={onOpenProducts}
        />

        <DashboardMenuItem
          title="Riwayat Transaksi"
          description="Melihat seluruh transaksi penjualan yang berhasil."
          onPress={onOpenTransactionHistory}
        />

        <DashboardMenuItem
          title="Buku Kas"
          description="Melihat pemasukan serta mencatat pengeluaran usaha."
          onPress={onOpenCashBook}
        />

        <DashboardMenuItem
          title="Kelola Officer"
          description="Membuat, mengubah, mengaktifkan, menonaktifkan, dan menghapus akun Officer."
          onPress={onOpenOfficers}
        />

        <DashboardMenuItem
          title="Laporan"
          description="Kelola laporan harian WhatsApp serta laporan PDF dan Excel."
          onPress={onOpenReports}
        />

        <Pressable
          onPress={onLogout}
          accessibilityRole="button"
          accessibilityLabel="Keluar dari akun"
          className="mt-3 min-h-14 items-center justify-center rounded-2xl border-2 border-brand-orange bg-brand-white px-5 py-4"
        >
          <Text className="font-atkinson-bold text-[18px] text-brand-orange">
            Keluar dari Akun
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
