import { useEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";

import { ScreenHeader } from "../../components/navigation/ScreenHeader";
import { useAndroidBackButton } from "../../hooks/useAndroidBackButton";
import {
  getStockHistory,
  getStockHistorySummary,
  type StockHistoryItem,
  type StockHistorySummary,
} from "../../services/stockHistoryService";
import { PRODUCT_UNIT_LABELS } from "../../types/product";
import { formatEggStock } from "../../utils/eggStock";

type StockHistoryScreenProps = {
  onBack: () => void;
};

type SummaryCardProps = {
  label: string;
  value: number;
};

type StockHistoryCardProps = {
  item: StockHistoryItem;
};

const EMPTY_SUMMARY: StockHistorySummary = {
  totalRecords: 0,
  stockInRecords: 0,
  stockOutRecords: 0,
  neutralRecords: 0,
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
  }).format(date);
}

function formatAbsoluteStock(quantity: number, item: StockHistoryItem): string {
  const absoluteQuantity = Math.abs(quantity);

  if (
    item.productCategory === "eggs" &&
    item.productRackSize !== null &&
    item.productRackSize > 0
  ) {
    return formatEggStock(absoluteQuantity, item.productRackSize);
  }

  const unitLabel = PRODUCT_UNIT_LABELS[item.productBaseUnit].toLowerCase();

  return `${absoluteQuantity} ${unitLabel}`;
}

function formatQuantityChange(item: StockHistoryItem): string {
  const formattedQuantity = formatAbsoluteStock(item.quantityChange, item);

  if (item.quantityChange > 0) {
    return `+${formattedQuantity}`;
  }

  if (item.quantityChange < 0) {
    return `−${formattedQuantity}`;
  }

  return formattedQuantity;
}

function formatResultingStock(item: StockHistoryItem): string {
  if (
    item.productCategory === "eggs" &&
    item.productRackSize !== null &&
    item.productRackSize > 0
  ) {
    return formatEggStock(item.resultingStock, item.productRackSize);
  }

  const unitLabel = PRODUCT_UNIT_LABELS[item.productBaseUnit].toLowerCase();

  return `${item.resultingStock} ${unitLabel}`;
}

function getDirectionLabel(direction: StockHistoryItem["direction"]): string {
  switch (direction) {
    case "in":
      return "Stok bertambah";

    case "out":
      return "Stok berkurang";

    default:
      return "Tidak berubah";
  }
}

function getDirectionBadgeClassName(
  direction: StockHistoryItem["direction"],
): string {
  switch (direction) {
    case "in":
      return "bg-brand-cream";

    case "out":
      return "bg-brand-brown";

    default:
      return "bg-gray-200";
  }
}

function getDirectionTextClassName(
  direction: StockHistoryItem["direction"],
): string {
  switch (direction) {
    case "in":
      return "text-brand-orange";

    case "out":
      return "text-brand-white";

    default:
      return "text-brand-brown";
  }
}

function SummaryCard({ label, value }: SummaryCardProps) {
  return (
    <View className="h-[102px] flex-1 justify-between rounded-2xl bg-brand-cream px-3 py-3">
      <Text
        numberOfLines={2}
        className="min-h-[32px] font-atkinson text-[12px] leading-4 text-brand-black"
      >
        {label}
      </Text>

      <Text className="font-atkinson-bold text-[19px] leading-6 text-brand-brown">
        {value}
      </Text>
    </View>
  );
}

function StockHistoryCard({ item }: StockHistoryCardProps) {
  const roleLabel = item.performedByRole === "owner" ? "Owner" : "Kasir";

  return (
    <View className="mb-4 rounded-3xl border-2 border-brand-yellow bg-brand-white p-4">
      <View className="flex-row items-start justify-between">
        <View className="mr-3 flex-1">
          <Text className="font-atkinson-bold text-[18px] leading-6 text-brand-brown">
            {item.productName}
          </Text>

          <Text className="mt-1 font-atkinson text-[14px] leading-5 text-brand-black">
            {item.changeTypeLabel}
          </Text>
        </View>

        <View
          className={`rounded-full px-3 py-1.5 ${getDirectionBadgeClassName(
            item.direction,
          )}`}
        >
          <Text
            className={`font-atkinson-bold text-[12px] ${getDirectionTextClassName(
              item.direction,
            )}`}
          >
            {getDirectionLabel(item.direction)}
          </Text>
        </View>
      </View>

      <View className="mt-4 rounded-2xl bg-brand-cream p-4">
        <Text className="font-atkinson text-[13px] leading-5 text-brand-black">
          Perubahan stok
        </Text>

        <Text
          className={`mt-1 font-atkinson-bold text-[20px] leading-6 ${
            item.direction === "out" ? "text-brand-brown" : "text-brand-orange"
          }`}
        >
          {formatQuantityChange(item)}
        </Text>

        <View className="my-3 h-px bg-brand-yellow" />

        <Text className="font-atkinson text-[13px] leading-5 text-brand-black">
          Stok setelah perubahan
        </Text>

        <Text className="mt-1 font-atkinson-bold text-[17px] leading-6 text-brand-brown">
          {formatResultingStock(item)}
        </Text>
      </View>

      {item.note ? (
        <View className="mt-3 rounded-2xl border border-brand-yellow bg-brand-white p-3">
          <Text className="font-atkinson-bold text-[13px] text-brand-brown">
            Catatan
          </Text>

          <Text className="mt-1 font-atkinson text-[14px] leading-5 text-brand-black">
            {item.note}
          </Text>
        </View>
      ) : null}

      <View className="mt-4">
        <Text className="font-atkinson text-[13px] leading-5 text-brand-black">
          Dilakukan oleh
        </Text>

        <Text className="mt-1 font-atkinson-bold text-[14px] leading-5 text-brand-brown">
          {item.performedByName} · {roleLabel}
        </Text>

        <Text className="mt-2 font-atkinson text-[13px] leading-5 text-brand-black">
          {formatDateTime(item.createdAt)}
        </Text>
      </View>
    </View>
  );
}

export function StockHistoryScreen({ onBack }: StockHistoryScreenProps) {
  const [historyItems, setHistoryItems] = useState<StockHistoryItem[]>([]);

  const [summary, setSummary] = useState<StockHistorySummary>(EMPTY_SUMMARY);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useAndroidBackButton(onBack);

  useEffect(() => {
    try {
      setHistoryItems(getStockHistory());

      setSummary(getStockHistorySummary());

      setErrorMessage(null);
    } catch (error) {
      setHistoryItems([]);
      setSummary(EMPTY_SUMMARY);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Riwayat stok tidak dapat dimuat.",
      );
    }
  }, []);

  return (
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
          title="Riwayat Stok"
          description="Lihat seluruh perubahan persediaan produk."
          onBack={onBack}
        />

        <View className="mt-5 rounded-3xl bg-brand-white p-4">
          <Text className="font-atkinson-bold text-[18px] text-brand-brown">
            Ringkasan Riwayat
          </Text>

          <View className="mt-4 flex-row gap-2">
            <SummaryCard label="Semua catatan" value={summary.totalRecords} />

            <SummaryCard
              label="Stok bertambah"
              value={summary.stockInRecords}
            />

            <SummaryCard
              label="Stok berkurang"
              value={summary.stockOutRecords}
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

        {historyItems.length === 0 && errorMessage === null ? (
          <View className="mt-4 rounded-3xl border-2 border-brand-yellow bg-brand-white p-5">
            <Text className="text-center font-atkinson-bold text-[20px] text-brand-brown">
              Belum ada riwayat stok
            </Text>

            <Text className="mt-2 text-center font-atkinson text-[15px] leading-6 text-brand-black">
              Riwayat akan muncul ketika produk ditambahkan, stok dikoreksi,
              atau transaksi memengaruhi persediaan.
            </Text>
          </View>
        ) : (
          <View className="mt-6">
            <Text className="mb-3 font-atkinson-bold text-[20px] text-brand-brown">
              Daftar Perubahan
            </Text>

            {historyItems.map((item) => (
              <StockHistoryCard key={item.id} item={item} />
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}
