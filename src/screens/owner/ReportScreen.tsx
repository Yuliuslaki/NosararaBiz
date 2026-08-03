import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  Keyboard,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import { useAppAlert } from "../../components/alerts/AppAlertProvider";
import { ScreenHeader } from "../../components/navigation/ScreenHeader";
import { useAndroidBackButton } from "../../hooks/useAndroidBackButton";
import {
  clearOwnerWhatsappNumber,
  getReportDashboardSnapshot,
  setDailyWhatsappEnabled,
  updateOwnerWhatsappNumber,
  type ReportDashboardSnapshot,
  type ReportDeliveryHistoryItem,
  type ReportDeliveryStatus,
  type ReportType,
} from "../../services/reportService";
import { formatCurrency } from "../../utils/formatters";

type ReportScreenProps = {
  onBack: () => void;
};

type SummaryCardProps = {
  label: string;
  value: string;
};

function formatDate(timestamp: number): string {
  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return "Tanggal tidak tersedia";
  }

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatDateTime(timestamp: number): string {
  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return "Waktu tidak tersedia";
  }

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getReportTypeLabel(reportType: ReportType): string {
  switch (reportType) {
    case "daily_message":
      return "Pesan Harian";

    case "pdf":
      return "PDF";

    case "excel":
      return "Excel";

    default:
      return reportType;
  }
}

function getDeliveryStatusLabel(status: ReportDeliveryStatus): string {
  switch (status) {
    case "pending":
      return "Menunggu";

    case "generated":
      return "File Dibuat";

    case "waiting_connection":
      return "Menunggu Internet";

    case "sent":
      return "Terkirim";

    case "failed":
      return "Gagal";

    default:
      return status;
  }
}

function SummaryCard({ label, value }: SummaryCardProps) {
  return (
    <View className="h-[104px] flex-1 justify-between rounded-xl border border-brand-black bg-brand-cream px-4 py-3">
      <Text
        numberOfLines={2}
        className="min-h-[34px] font-atkinson text-[13px] leading-5 text-brand-black"
      >
        {label}
      </Text>

      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.68}
        className="font-atkinson-bold text-[19px] leading-7 text-brand-black"
      >
        {value}
      </Text>
    </View>
  );
}

function DeliveryHistoryCard({ item }: { item: ReportDeliveryHistoryItem }) {
  return (
    <View className="mb-3 rounded-xl border border-brand-black bg-brand-white p-4">
      <View className="flex-row items-start justify-between">
        <View className="mr-3 flex-1">
          <Text className="font-atkinson-bold text-[16px] text-brand-black">
            {getReportTypeLabel(item.reportType)}
          </Text>

          <Text className="mt-1 font-atkinson text-[13px] leading-5 text-brand-black">
            {formatDate(item.periodStart)} sampai {formatDate(item.periodEnd)}
          </Text>
        </View>

        <View className="rounded-full border border-brand-black bg-brand-cream px-3 py-1.5">
          <Text className="font-atkinson-bold text-[12px] text-brand-black">
            {getDeliveryStatusLabel(item.status)}
          </Text>
        </View>
      </View>

      <View className="mt-3 border-t border-brand-black pt-3">
        <Text className="font-atkinson text-[13px] leading-5 text-brand-black">
          Dibuat: {formatDateTime(item.createdAt)}
        </Text>

        {item.fileName ? (
          <Text className="mt-1 font-atkinson text-[13px] leading-5 text-brand-black">
            File: {item.fileName}
          </Text>
        ) : null}
      </View>

      {item.errorMessage ? (
        <View className="mt-3 rounded-xl border border-brand-black bg-brand-cream p-3">
          <Text className="font-atkinson-bold text-[13px] leading-5 text-brand-black">
            {item.errorMessage}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

export function ReportScreen({ onBack }: ReportScreenProps) {
  const { showAlert } = useAppAlert();

  const [snapshot, setSnapshot] = useState<ReportDashboardSnapshot | null>(
    null,
  );

  const [whatsappNumber, setWhatsappNumber] = useState("");

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(true);

  const [isSubmitting, setIsSubmitting] = useState(false);

  function loadReportData(): void {
    try {
      const nextSnapshot = getReportDashboardSnapshot();

      setSnapshot(nextSnapshot);

      setWhatsappNumber(nextSnapshot.settings.ownerWaNumber ?? "");

      setErrorMessage(null);
    } catch (error) {
      setSnapshot(null);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Data laporan tidak dapat dimuat.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadReportData();

    const appStateSubscription = AppState.addEventListener(
      "change",
      (nextAppState) => {
        if (nextAppState === "active") {
          loadReportData();
        }
      },
    );

    return () => {
      appStateSubscription.remove();
    };
  }, []);

  function handleBack(): void {
    if (isSubmitting) {
      return;
    }

    onBack();
  }

  useAndroidBackButton(handleBack);

  function handleReload(): void {
    setIsLoading(true);
    loadReportData();
  }

  function handleSaveWhatsappNumber(): void {
    if (isSubmitting) {
      return;
    }

    Keyboard.dismiss();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      if (whatsappNumber.trim().length === 0) {
        clearOwnerWhatsappNumber();
      } else {
        updateOwnerWhatsappNumber(whatsappNumber);
      }

      const nextSnapshot = getReportDashboardSnapshot();

      setSnapshot(nextSnapshot);

      setWhatsappNumber(nextSnapshot.settings.ownerWaNumber ?? "");

      showAlert({
        tone: "success",
        title: "Nomor WhatsApp disimpan",
        message:
          nextSnapshot.settings.ownerWaNumber === null
            ? "Nomor WhatsApp Owner telah dikosongkan."
            : "Nomor WhatsApp Owner berhasil diperbarui.",
        confirmText: "OK",
      });
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Nomor WhatsApp belum dapat disimpan.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleToggleDailyReport(): void {
    if (snapshot === null || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const nextEnabledStatus = !snapshot.settings.dailyWhatsappEnabled;

      setDailyWhatsappEnabled(nextEnabledStatus);

      const nextSnapshot = getReportDashboardSnapshot();

      setSnapshot(nextSnapshot);

      showAlert({
        tone: "success",
        title: nextEnabledStatus
          ? "Laporan harian diaktifkan"
          : "Laporan harian dinonaktifkan",
        message: nextEnabledStatus
          ? "Pengaturan laporan harian pukul 00.00 telah disimpan."
          : "Pengaturan laporan harian telah dinonaktifkan.",
        confirmText: "OK",
      });
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Pengaturan laporan harian belum dapat diperbarui.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-brand-cream px-6">
        <View className="w-full max-w-sm items-center rounded-xl border border-brand-black bg-brand-white px-6 py-8">
          <ActivityIndicator size="large" color="#111111" />

          <Text className="mt-4 text-center font-atkinson-bold text-[16px] text-brand-black">
            Memuat data laporan...
          </Text>
        </View>
      </View>
    );
  }

  if (snapshot === null) {
    return (
      <View className="flex-1 bg-brand-cream px-6 py-10">
        <View className="w-full max-w-md self-center">
          <ScreenHeader
            title="Laporan"
            description="Pusat laporan usaha Nosarara Biz."
            onBack={handleBack}
          />

          <View className="mt-5 rounded-xl border border-brand-black bg-brand-white p-5">
            <Text className="font-atkinson-bold text-[19px] text-brand-black">
              Data laporan belum dapat dimuat
            </Text>

            <Text className="mt-2 font-atkinson text-[15px] leading-6 text-brand-black">
              {errorMessage ?? "Terjadi kesalahan saat membaca data laporan."}
            </Text>

            <Pressable
              onPress={handleReload}
              accessibilityRole="button"
              accessibilityLabel="Muat ulang laporan"
              className="mt-5 min-h-12 items-center justify-center rounded-xl bg-brand-black px-4 py-3"
            >
              <Text className="font-atkinson-bold text-[16px] text-brand-white">
                Muat Ulang
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  const { settings, previousDaySummary } = snapshot;

  return (
    <ScrollView
      className="flex-1 bg-brand-cream"
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      contentContainerStyle={{
        paddingHorizontal: 18,
        paddingTop: 32,
        paddingBottom: 80,
      }}
    >
      <View className="w-full max-w-md self-center">
        <ScreenHeader
          title="Laporan"
          description="Kelola laporan harian WhatsApp serta laporan PDF dan Excel."
          onBack={handleBack}
          disabled={isSubmitting}
        />

        {errorMessage ? (
          <View className="mt-4 rounded-xl border border-brand-black bg-brand-white p-4">
            <Text className="font-atkinson-bold text-[15px] text-brand-black">
              Tindakan belum dapat diselesaikan
            </Text>

            <Text className="mt-2 font-atkinson text-[14px] leading-6 text-brand-black">
              {errorMessage}
            </Text>
          </View>
        ) : null}

        <View className="mt-5 rounded-xl border border-brand-black bg-brand-white p-5">
          <Text className="font-atkinson-bold text-[20px] text-brand-black">
            Laporan Harian WhatsApp
          </Text>

          <Text className="mt-2 font-atkinson text-[15px] leading-6 text-brand-black">
            Ringkasan hari sebelumnya dijadwalkan setiap pukul 00.00.
          </Text>

          <View className="mt-4 rounded-xl border border-brand-black bg-brand-cream p-4">
            <View className="flex-row items-center justify-between">
              <View className="mr-4 flex-1">
                <Text className="font-atkinson-bold text-[16px] text-brand-black">
                  Status laporan harian
                </Text>

                <Text className="mt-1 font-atkinson text-[13px] leading-5 text-brand-black">
                  {settings.dailyWhatsappEnabled
                    ? "Pengaturan laporan aktif"
                    : "Pengaturan laporan nonaktif"}
                </Text>
              </View>

              <Pressable
                onPress={handleToggleDailyReport}
                disabled={isSubmitting}
                accessibilityRole="switch"
                accessibilityState={{
                  checked: settings.dailyWhatsappEnabled,
                  disabled: isSubmitting,
                }}
                accessibilityLabel="Aktifkan atau nonaktifkan laporan harian"
                className={`min-w-[90px] rounded-xl border border-brand-black px-4 py-3 ${
                  settings.dailyWhatsappEnabled
                    ? "bg-brand-black"
                    : "bg-brand-white"
                } ${isSubmitting ? "opacity-50" : ""}`}
              >
                <Text
                  className={`text-center font-atkinson-bold text-[14px] ${
                    settings.dailyWhatsappEnabled
                      ? "text-brand-white"
                      : "text-brand-black"
                  }`}
                >
                  {settings.dailyWhatsappEnabled ? "Aktif" : "Nonaktif"}
                </Text>
              </Pressable>
            </View>

            <View className="mt-4 border-t border-brand-black pt-4">
              <Text className="font-atkinson text-[13px] text-brand-black">
                Waktu pengiriman
              </Text>

              <Text className="mt-1 font-atkinson-bold text-[19px] text-brand-black">
                00.00
              </Text>
            </View>

            <View className="mt-4 border-t border-brand-black pt-4">
              <Text className="font-atkinson text-[13px] text-brand-black">
                Ketika perangkat offline
              </Text>

              <Text className="mt-1 font-atkinson-bold text-[15px] leading-6 text-brand-black">
                Menunggu sampai koneksi internet tersedia
              </Text>
            </View>
          </View>

          <Text className="mt-5 font-atkinson-bold text-[16px] text-brand-black">
            Nomor WhatsApp Owner
          </Text>

          <TextInput
            value={whatsappNumber}
            onChangeText={(value) => {
              setWhatsappNumber(value);
              setErrorMessage(null);
            }}
            editable={!isSubmitting}
            keyboardType="phone-pad"
            autoCorrect={false}
            maxLength={20}
            placeholder="Contoh: +6281234567890"
            placeholderTextColor="#666666"
            selectionColor="#F4E7D3"
            cursorColor="#111111"
            accessibilityLabel="Nomor WhatsApp Owner"
            className="mt-2 min-h-14 rounded-xl border border-brand-black bg-brand-white px-4 py-3 font-atkinson text-[17px] text-brand-black"
          />

          <Text className="mt-2 font-atkinson text-[13px] leading-5 text-brand-black">
            Gunakan nomor dengan kode negara, misalnya +62 untuk Indonesia.
          </Text>

          <Pressable
            onPress={handleSaveWhatsappNumber}
            disabled={isSubmitting}
            accessibilityRole="button"
            accessibilityLabel="Simpan nomor WhatsApp Owner"
            accessibilityState={{
              disabled: isSubmitting,
            }}
            className={`mt-4 min-h-12 items-center justify-center rounded-xl bg-brand-black px-4 py-3 ${
              isSubmitting ? "opacity-50" : ""
            }`}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text className="font-atkinson-bold text-[16px] text-brand-white">
                Simpan Nomor WhatsApp
              </Text>
            )}
          </Pressable>
        </View>

        <View className="mt-5 rounded-xl border border-brand-black bg-brand-white p-4">
          <Text className="font-atkinson-bold text-[19px] text-brand-black">
            Ringkasan Hari Sebelumnya
          </Text>

          <Text className="mt-1 font-atkinson text-[14px] text-brand-black">
            {formatDate(previousDaySummary.periodStart)}
          </Text>

          <View className="mt-4 flex-row gap-3">
            <SummaryCard
              label="Total penjualan"
              value={formatCurrency(previousDaySummary.totalSales)}
            />

            <SummaryCard
              label="Transaksi berhasil"
              value={String(previousDaySummary.totalTransactions)}
            />
          </View>

          <View className="mt-3 flex-row gap-3">
            <SummaryCard
              label="Pembayaran tunai"
              value={formatCurrency(previousDaySummary.cashSales)}
            />

            <SummaryCard
              label="Pembayaran QRIS"
              value={formatCurrency(previousDaySummary.qrisSales)}
            />
          </View>

          <View className="mt-3 flex-row gap-3">
            <SummaryCard
              label="Pengeluaran"
              value={formatCurrency(previousDaySummary.totalExpense)}
            />

            <SummaryCard
              label="Saldo bersih"
              value={formatCurrency(previousDaySummary.netCashBalance)}
            />
          </View>
        </View>

        <View className="mt-5 rounded-xl border border-brand-black bg-brand-white p-5">
          <Text className="font-atkinson-bold text-[20px] text-brand-black">
            Laporan PDF dan Excel
          </Text>

          <Text className="mt-2 font-atkinson text-[15px] leading-6 text-brand-black">
            PDF dan Excel akan berisi data usaha sejak data pertama hingga
            laporan dibuat. File dapat dikirim ke WhatsApp setelah Owner menekan
            tombol kirim.
          </Text>

          <Pressable
            disabled
            accessibilityRole="button"
            accessibilityLabel="Buat laporan PDF"
            accessibilityState={{
              disabled: true,
            }}
            className="mt-4 min-h-12 items-center justify-center rounded-xl bg-brand-black px-4 py-3 opacity-40"
          >
            <Text className="font-atkinson-bold text-[16px] text-brand-white">
              Buat Laporan PDF
            </Text>
          </Pressable>

          <Pressable
            disabled
            accessibilityRole="button"
            accessibilityLabel="Buat laporan Excel"
            accessibilityState={{
              disabled: true,
            }}
            className="mt-3 min-h-12 items-center justify-center rounded-xl bg-brand-black px-4 py-3 opacity-40"
          >
            <Text className="font-atkinson-bold text-[16px] text-brand-white">
              Buat Laporan Excel
            </Text>
          </Pressable>

          <View className="mt-4 rounded-xl border border-brand-black bg-brand-cream p-3">
            <Text className="text-center font-atkinson-bold text-[13px] leading-5 text-brand-black">
              Ekspor file akan dibuat pada tahap berikutnya.
            </Text>
          </View>
        </View>

        <View className="mt-5">
          <Text className="mb-3 font-atkinson-bold text-[20px] text-brand-black">
            Riwayat Laporan
          </Text>

          {snapshot.recentDeliveryHistory.length === 0 ? (
            <View className="rounded-xl border border-brand-black bg-brand-white p-5">
              <Text className="text-center font-atkinson-bold text-[18px] text-brand-black">
                Belum ada riwayat laporan
              </Text>

              <Text className="mt-2 text-center font-atkinson text-[14px] leading-6 text-brand-black">
                Riwayat pembuatan dan pengiriman laporan akan muncul di sini.
              </Text>
            </View>
          ) : (
            snapshot.recentDeliveryHistory.map((item) => (
              <DeliveryHistoryCard key={item.id} item={item} />
            ))
          )}
        </View>
      </View>
    </ScrollView>
  );
}
