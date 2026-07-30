import { useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";

import { ScreenHeader } from "../../components/navigation/ScreenHeader";
import { useAndroidBackButton } from "../../hooks/useAndroidBackButton";
import {
  getTodayTransactionSummary,
  getTransactionDetail,
  getTransactionHistory,
  type TodayTransactionSummary,
  type TransactionDetail,
  type TransactionDetailItem,
  type TransactionHistoryItem,
  type TransactionUserRole,
} from "../../services/transactionHistoryService";
import { PRODUCT_UNIT_LABELS } from "../../types/product";
import { formatCurrency } from "../../utils/formatters";

type TransactionHistoryScreenProps = {
  onBack: () => void;
};

type SummaryCardProps = {
  label: string;
  value: string;
};

type TransactionCardProps = {
  transaction: TransactionHistoryItem;
  onOpenDetail: (transactionId: string) => void;
};

type TransactionDetailModalProps = {
  detail: TransactionDetail | null;
  errorMessage: string | null;
  onClose: () => void;
};

const EMPTY_SUMMARY: TodayTransactionSummary = {
  totalSales: 0,
  totalTransactions: 0,
  cashSales: 0,
  qrisSales: 0,
  cancelledTransactions: 0,
};

function normalizeTimestamp(timestamp: number): number {
  if (timestamp < 1_000_000_000_000) {
    return timestamp * 1000;
  }

  return timestamp;
}

function formatDateTime(timestamp: number): string {
  const date = new Date(normalizeTimestamp(timestamp));

  if (Number.isNaN(date.getTime())) {
    return "Waktu tidak tersedia";
  }

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}

function formatUserRole(role: TransactionUserRole): string {
  switch (role) {
    case "owner":
      return "Owner";

    case "officer":
      return "Officer";

    default:
      return role;
  }
}

function formatItemQuantity(item: TransactionDetailItem): string {
  const unitLabel = PRODUCT_UNIT_LABELS[item.saleUnit].toLowerCase();

  return `${item.quantity} ${unitLabel}`;
}

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

function TransactionCard({ transaction, onOpenDetail }: TransactionCardProps) {
  return (
    <View className="mb-4 rounded-3xl border-2 border-brand-yellow bg-brand-white p-4">
      <View className="flex-row items-start justify-between">
        <View className="mr-3 flex-1">
          <Text
            selectable
            className="font-atkinson-bold text-[15px] leading-5 text-brand-brown"
          >
            {transaction.transactionNumber}
          </Text>

          <Text className="mt-2 font-atkinson text-[13px] leading-5 text-brand-black">
            {formatDateTime(transaction.transactionDate)}
          </Text>
        </View>

        <View className="rounded-full bg-brand-cream px-3 py-1.5">
          <Text className="font-atkinson-bold text-[12px] text-brand-orange">
            Berhasil
          </Text>
        </View>
      </View>

      <View className="mt-4 rounded-2xl bg-brand-cream p-4">
        <Text className="font-atkinson text-[13px] text-brand-black">
          Total transaksi
        </Text>

        <Text className="mt-1 font-atkinson-bold text-[21px] leading-7 text-brand-orange">
          {formatCurrency(transaction.totalAmount)}
        </Text>
      </View>

      <View className="mt-4 flex-row">
        <View className="flex-1">
          <Text className="font-atkinson text-[13px] leading-5 text-brand-black">
            Pembayaran
          </Text>

          <Text className="mt-1 font-atkinson-bold text-[14px] leading-5 text-brand-brown">
            {transaction.paymentMethodLabel}
          </Text>
        </View>

        <View className="flex-1">
          <Text className="font-atkinson text-[13px] leading-5 text-brand-black">
            Jenis produk
          </Text>

          <Text className="mt-1 font-atkinson-bold text-[14px] leading-5 text-brand-brown">
            {transaction.itemCount}
          </Text>
        </View>
      </View>

      <View className="mt-4">
        <Text className="font-atkinson text-[13px] leading-5 text-brand-black">
          Dibuat oleh
        </Text>

        <Text className="mt-1 font-atkinson-bold text-[14px] leading-5 text-brand-brown">
          {transaction.createdByName} ·{" "}
          {formatUserRole(transaction.createdByRole)}
        </Text>
      </View>

      <Pressable
        onPress={() => {
          onOpenDetail(transaction.id);
        }}
        accessibilityRole="button"
        accessibilityLabel={`Lihat detail ${transaction.transactionNumber}`}
        className="mt-4 min-h-12 items-center justify-center rounded-2xl border-2 border-brand-orange bg-brand-white px-4 py-3"
      >
        <Text className="font-atkinson-bold text-[16px] text-brand-orange">
          Lihat Detail
        </Text>
      </Pressable>
    </View>
  );
}

function TransactionItemCard({ item }: { item: TransactionDetailItem }) {
  return (
    <View className="mb-3 rounded-2xl border-2 border-brand-yellow bg-brand-white p-4">
      <Text className="font-atkinson-bold text-[17px] leading-6 text-brand-brown">
        {item.productName}
      </Text>

      <View className="mt-3 flex-row justify-between">
        <Text className="font-atkinson text-[14px] leading-5 text-brand-black">
          Jumlah
        </Text>

        <Text className="font-atkinson-bold text-[14px] leading-5 text-brand-brown">
          {formatItemQuantity(item)}
        </Text>
      </View>

      <View className="mt-2 flex-row justify-between">
        <Text className="font-atkinson text-[14px] leading-5 text-brand-black">
          Harga satuan
        </Text>

        <Text className="font-atkinson-bold text-[14px] leading-5 text-brand-brown">
          {formatCurrency(item.unitPrice)}
        </Text>
      </View>

      <View className="my-3 h-px bg-brand-yellow" />

      <View className="flex-row justify-between">
        <Text className="font-atkinson-bold text-[14px] leading-5 text-brand-brown">
          Subtotal
        </Text>

        <Text className="font-atkinson-bold text-[16px] leading-5 text-brand-orange">
          {formatCurrency(item.subtotal)}
        </Text>
      </View>
    </View>
  );
}

function TransactionDetailModal({
  detail,
  errorMessage,
  onClose,
}: TransactionDetailModalProps) {
  const isVisible = detail !== null || errorMessage !== null;

  return (
    <Modal visible={isVisible} animationType="slide" onRequestClose={onClose}>
      <ScrollView
        className="flex-1 bg-brand-cream"
        contentContainerStyle={{
          paddingHorizontal: 18,
          paddingTop: 32,
          paddingBottom: 64,
        }}
      >
        <View className="w-full max-w-md self-center">
          <ScreenHeader
            title="Detail Transaksi"
            description={detail?.transactionNumber ?? "Informasi transaksi"}
            onBack={onClose}
          />

          {errorMessage ? (
            <View className="mt-5 rounded-2xl border-2 border-brand-orange bg-brand-white p-4">
              <Text className="font-atkinson-bold text-[16px] text-brand-brown">
                Detail tidak dapat dimuat
              </Text>

              <Text className="mt-2 font-atkinson text-[14px] leading-6 text-brand-black">
                {errorMessage}
              </Text>

              <Pressable
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel="Tutup pesan kesalahan"
                className="mt-4 min-h-12 items-center justify-center rounded-2xl border-2 border-brand-orange bg-brand-white px-4 py-3"
              >
                <Text className="font-atkinson-bold text-[16px] text-brand-orange">
                  Tutup
                </Text>
              </Pressable>
            </View>
          ) : null}

          {detail ? (
            <>
              <View className="mt-5 rounded-3xl bg-brand-white p-5">
                <View className="flex-row items-start justify-between">
                  <View className="mr-3 flex-1">
                    <Text className="font-atkinson text-[13px] leading-5 text-brand-black">
                      Waktu transaksi
                    </Text>

                    <Text className="mt-1 font-atkinson-bold text-[15px] leading-6 text-brand-brown">
                      {formatDateTime(detail.transactionDate)}
                    </Text>
                  </View>

                  <View className="rounded-full bg-brand-cream px-3 py-1.5">
                    <Text className="font-atkinson-bold text-[12px] text-brand-orange">
                      Berhasil
                    </Text>
                  </View>
                </View>

                <View className="mt-4 rounded-2xl bg-brand-cream p-4">
                  <Text className="font-atkinson text-[13px] text-brand-black">
                    Total transaksi
                  </Text>

                  <Text className="mt-1 font-atkinson-bold text-[22px] text-brand-orange">
                    {formatCurrency(detail.totalAmount)}
                  </Text>
                </View>
              </View>

              <View className="mt-4 rounded-3xl bg-brand-white p-4">
                <Text className="font-atkinson-bold text-[19px] text-brand-brown">
                  Produk Terjual
                </Text>

                {detail.items.length === 0 ? (
                  <View className="mt-4 rounded-2xl bg-brand-cream p-4">
                    <Text className="text-center font-atkinson text-[14px] leading-6 text-brand-black">
                      Detail produk tidak tersedia.
                    </Text>
                  </View>
                ) : (
                  <View className="mt-4">
                    {detail.items.map((item) => (
                      <TransactionItemCard key={item.id} item={item} />
                    ))}
                  </View>
                )}
              </View>

              <View className="mt-4 rounded-3xl bg-brand-white p-5">
                <Text className="font-atkinson-bold text-[19px] text-brand-brown">
                  Pembayaran
                </Text>

                <View className="mt-4 flex-row justify-between">
                  <Text className="font-atkinson text-[14px] text-brand-black">
                    Metode
                  </Text>

                  <Text className="font-atkinson-bold text-[14px] text-brand-brown">
                    {detail.paymentMethodLabel}
                  </Text>
                </View>

                <View className="mt-3 flex-row justify-between">
                  <Text className="font-atkinson text-[14px] text-brand-black">
                    Total belanja
                  </Text>

                  <Text className="font-atkinson-bold text-[14px] text-brand-brown">
                    {formatCurrency(detail.totalAmount)}
                  </Text>
                </View>

                <View className="mt-3 flex-row justify-between">
                  <Text className="font-atkinson text-[14px] text-brand-black">
                    Uang diterima
                  </Text>

                  <Text className="font-atkinson-bold text-[14px] text-brand-brown">
                    {formatCurrency(detail.amountPaid)}
                  </Text>
                </View>

                <View className="mt-3 flex-row justify-between">
                  <Text className="font-atkinson text-[14px] text-brand-black">
                    Kembalian
                  </Text>

                  <Text className="font-atkinson-bold text-[14px] text-brand-brown">
                    {formatCurrency(detail.changeAmount)}
                  </Text>
                </View>
              </View>

              <View className="mt-4 rounded-3xl bg-brand-white p-5">
                <Text className="font-atkinson-bold text-[19px] text-brand-brown">
                  Petugas
                </Text>

                <Text className="mt-3 font-atkinson text-[13px] text-brand-black">
                  Transaksi dibuat oleh
                </Text>

                <Text className="mt-1 font-atkinson-bold text-[15px] text-brand-brown">
                  {detail.createdByName} ·{" "}
                  {formatUserRole(detail.createdByRole)}
                </Text>
              </View>

              <View className="mt-4 rounded-2xl border-2 border-brand-yellow bg-brand-white p-4">
                <Text className="font-atkinson-bold text-[14px] text-brand-brown">
                  Catatan
                </Text>

                <Text className="mt-2 font-atkinson text-[14px] leading-6 text-brand-black">
                  Transaksi yang sudah tersimpan bersifat tetap dan tidak dapat
                  diubah atau dihapus.
                </Text>
              </View>

              <Pressable
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel="Tutup detail transaksi"
                className="mt-5 min-h-12 items-center justify-center rounded-2xl border-2 border-brand-orange bg-brand-white px-4 py-3"
              >
                <Text className="font-atkinson-bold text-[16px] text-brand-orange">
                  Tutup
                </Text>
              </Pressable>
            </>
          ) : null}
        </View>
      </ScrollView>
    </Modal>
  );
}

export function TransactionHistoryScreen({
  onBack,
}: TransactionHistoryScreenProps) {
  const [transactions, setTransactions] = useState<TransactionHistoryItem[]>(
    [],
  );

  const [summary, setSummary] =
    useState<TodayTransactionSummary>(EMPTY_SUMMARY);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [selectedDetail, setSelectedDetail] =
    useState<TransactionDetail | null>(null);

  const [detailErrorMessage, setDetailErrorMessage] = useState<string | null>(
    null,
  );

  useAndroidBackButton(onBack);

  function refreshTransactions(): void {
    try {
      setTransactions(
        getTransactionHistory({
          status: "paid",
        }),
      );

      setSummary(getTodayTransactionSummary());

      setErrorMessage(null);
    } catch (error) {
      setTransactions([]);
      setSummary(EMPTY_SUMMARY);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Riwayat transaksi tidak dapat dimuat.",
      );
    }
  }

  useEffect(() => {
    refreshTransactions();
  }, []);

  function handleOpenDetail(transactionId: string): void {
    try {
      setSelectedDetail(getTransactionDetail(transactionId));

      setDetailErrorMessage(null);
    } catch (error) {
      setSelectedDetail(null);

      setDetailErrorMessage(
        error instanceof Error
          ? error.message
          : "Detail transaksi tidak dapat dimuat.",
      );
    }
  }

  function handleCloseDetail(): void {
    setSelectedDetail(null);
    setDetailErrorMessage(null);
  }

  return (
    <>
      <ScrollView
        className="flex-1 bg-brand-cream"
        contentContainerStyle={{
          paddingHorizontal: 18,
          paddingTop: 32,
          paddingBottom: 48,
        }}
      >
        <View className="w-full max-w-md self-center">
          <ScreenHeader
            title="Riwayat Transaksi"
            description="Lihat seluruh transaksi penjualan yang berhasil."
            onBack={onBack}
          />

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
          </View>

          {errorMessage ? (
            <View className="mt-4 rounded-2xl border-2 border-brand-orange bg-brand-white p-4">
              <Text className="font-atkinson-bold text-[15px] text-brand-brown">
                Riwayat belum dapat dimuat
              </Text>

              <Text className="mt-2 font-atkinson text-[14px] leading-6 text-brand-black">
                {errorMessage}
              </Text>
            </View>
          ) : null}

          {transactions.length === 0 && errorMessage === null ? (
            <View className="mt-4 rounded-3xl border-2 border-brand-yellow bg-brand-white p-5">
              <Text className="text-center font-atkinson-bold text-[20px] text-brand-brown">
                Belum ada transaksi
              </Text>

              <Text className="mt-2 text-center font-atkinson text-[15px] leading-6 text-brand-black">
                Transaksi penjualan yang berhasil akan muncul otomatis pada
                halaman ini.
              </Text>
            </View>
          ) : (
            <View className="mt-6">
              <Text className="mb-3 font-atkinson-bold text-[20px] text-brand-brown">
                Daftar Transaksi Berhasil
              </Text>

              {transactions.map((transaction) => (
                <TransactionCard
                  key={transaction.id}
                  transaction={transaction}
                  onOpenDetail={handleOpenDetail}
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      <TransactionDetailModal
        detail={selectedDetail}
        errorMessage={detailErrorMessage}
        onClose={handleCloseDetail}
      />
    </>
  );
}
