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

type DirectionSymbolProps = {
  direction: StockHistoryItem["direction"];
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
      return "Stok Bertambah";

    case "out":
      return "Stok Berkurang";

    default:
      return "Tidak Berubah";
  }
}

function DirectionSymbol({ direction }: DirectionSymbolProps) {
  if (direction === "in") {
    return (
      <View className="h-6 w-6 items-center justify-center">
        <View className="absolute h-[3px] w-6 rounded-full bg-brand-white" />

        <View className="absolute h-6 w-[3px] rounded-full bg-brand-white" />
      </View>
    );
  }

  if (direction === "out") {
    return (
      <View className="h-6 w-6 items-center justify-center">
        <View className="h-[3px] w-6 rounded-full bg-brand-white" />
      </View>
    );
  }

  return (
    <View className="h-6 w-6 items-center justify-center">
      <View className="absolute -translate-y-[4px]">
        <View className="h-[3px] w-6 rounded-full bg-brand-white" />
      </View>

      <View className="absolute translate-y-[4px]">
        <View className="h-[3px] w-6 rounded-full bg-brand-white" />
      </View>
    </View>
  );
}

function SummaryCard({ label, value }: SummaryCardProps) {
  return (
    <View className="min-h-[108px] flex-1 justify-between rounded-xl border border-brand-black bg-brand-white p-4">
      <Text
        numberOfLines={2}
        className="font-atkinson text-[14px] leading-5 text-brand-black"
      >
        {label}
      </Text>

      <Text className="mt-3 font-atkinson-bold text-[22px] leading-7 text-brand-black">
        {value}
      </Text>
    </View>
  );
}

function StockHistoryCard({ item }: StockHistoryCardProps) {
  const roleLabel = item.performedByRole === "owner" ? "Owner" : "Kasir";

  return (
    <View className="mb-4 rounded-xl border border-brand-black bg-brand-white p-5">
      <View className="flex-row items-start justify-between">
        <View className="mr-3 flex-1">
          <Text className="font-atkinson-bold text-[20px] leading-6 text-brand-black">
            {item.productName}
          </Text>

          <Text className="mt-1 font-atkinson text-[15px] leading-5 text-brand-black">
            {item.changeTypeLabel}
          </Text>
        </View>

        <View className="h-12 w-12 items-center justify-center rounded-full bg-brand-black">
          <DirectionSymbol direction={item.direction} />
        </View>
      </View>

      <View className="mt-4 rounded-xl border border-brand-black bg-brand-cream p-4">
        <Text className="font-atkinson-bold text-[15px] text-brand-black">
          {getDirectionLabel(item.direction)}
        </Text>

        <Text className="mt-2 font-atkinson text-[14px] text-brand-black">
          Perubahan stok
        </Text>

        <Text className="mt-1 font-atkinson-bold text-[23px] leading-7 text-brand-black">
          {formatQuantityChange(item)}
        </Text>

        <View className="my-4 h-px bg-brand-black" />

        <Text className="font-atkinson text-[14px] text-brand-black">
          Stok setelah perubahan
        </Text>

        <Text className="mt-1 font-atkinson-bold text-[19px] leading-6 text-brand-black">
          {formatResultingStock(item)}
        </Text>
      </View>

      {item.note ? (
        <View className="mt-4 rounded-xl border border-brand-black bg-brand-white p-4">
          <Text className="font-atkinson-bold text-[15px] text-brand-black">
            Catatan
          </Text>

          <Text className="mt-2 font-atkinson text-[15px] leading-6 text-brand-black">
            {item.note}
          </Text>
        </View>
      ) : null}

      <View className="mt-4 border-t border-brand-black pt-4">
        <Text className="font-atkinson text-[14px] leading-5 text-brand-black">
          Dilakukan oleh
        </Text>

        <Text className="mt-1 font-atkinson-bold text-[16px] leading-5 text-brand-black">
          {item.performedByName} · {roleLabel}
        </Text>

        <Text className="mt-2 font-atkinson text-[14px] leading-5 text-brand-black">
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

        <View className="mt-5 rounded-xl border border-brand-black bg-brand-white p-4">
          <Text className="font-atkinson-bold text-[21px] text-brand-black">
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
          <View className="mt-4 rounded-xl border border-brand-black bg-brand-cream p-4">
            <Text className="font-atkinson-bold text-[17px] text-brand-black">
              Riwayat Belum Dapat Dimuat
            </Text>

            <Text className="mt-2 font-atkinson text-[15px] leading-6 text-brand-black">
              {errorMessage}
            </Text>
          </View>
        ) : null}

        {historyItems.length === 0 && errorMessage === null ? (
          <View className="mt-4 rounded-xl border border-brand-black bg-brand-white p-5">
            <Text className="text-center font-atkinson-bold text-[21px] text-brand-black">
              Belum Ada Riwayat Stok
            </Text>

            <Text className="mt-2 text-center font-atkinson text-[15px] leading-6 text-brand-black">
              Riwayat akan muncul ketika produk ditambahkan, stok dikoreksi,
              atau transaksi memengaruhi persediaan.
            </Text>
          </View>
        ) : (
          <View className="mt-6">
            <Text className="mb-3 font-atkinson-bold text-[21px] text-brand-black">
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
