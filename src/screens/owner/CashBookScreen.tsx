import { useCallback, useEffect, useMemo, useState } from "react";
import { AppState, Pressable, ScrollView, Text, View } from "react-native";

import {
  BrandCalendarModal,
  type BrandCalendarMode,
} from "../../components/date/BrandCalendarModal";
import { ScreenHeader } from "../../components/navigation/ScreenHeader";
import { useAndroidBackButton } from "../../hooks/useAndroidBackButton";
import {
  getCashBookEntries,
  getCashBookSummary,
  getMonthDateRange,
  getTodayDateRange,
  getYearDateRange,
  type CashBookDateRange,
  type CashBookEntry,
  type CashBookEntryType,
  type CashBookSummary,
} from "../../services/cashBookService";
import { formatCurrency } from "../../utils/formatters";

type CashBookScreenProps = {
  onBack: () => void;
  onAddExpense: () => void;
};

type CashBookPeriod = BrandCalendarMode;

type CashBookTypeFilter = "all" | CashBookEntryType;

type SummaryCardProps = {
  label: string;
  value: string;
};

type PeriodButtonProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
};

type CashBookEntryCardProps = {
  entry: CashBookEntry;
};

type CashBookFilterOption = {
  value: CashBookTypeFilter;
  label: string;
};

const EMPTY_SUMMARY: CashBookSummary = {
  totalIncome: 0,
  totalExpense: 0,
  balance: 0,
  entryCount: 0,
  incomeEntryCount: 0,
  expenseEntryCount: 0,
};

const CASH_BOOK_FILTER_OPTIONS: readonly CashBookFilterOption[] = [
  {
    value: "all",
    label: "Semua Catatan",
  },
  {
    value: "income",
    label: "Pemasukan",
  },
  {
    value: "expense",
    label: "Pengeluaran",
  },
];

function createLocalDate(date: Date): Date {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    12,
    0,
    0,
    0,
  );
}

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

function formatUserRole(role: "owner" | "cashier"): string {
  return role === "owner" ? "Owner" : "Kasir";
}

function getDateRangeByPeriod(
  period: CashBookPeriod,
  selectedDate: Date,
): CashBookDateRange {
  const referenceTime = selectedDate.getTime();

  switch (period) {
    case "day":
      return getTodayDateRange(referenceTime);

    case "month":
      return getMonthDateRange(referenceTime);

    case "year":
      return getYearDateRange(referenceTime);

    default:
      return getTodayDateRange(referenceTime);
  }
}

function getPeriodDescription(
  period: CashBookPeriod,
  selectedDate: Date,
): string {
  switch (period) {
    case "day":
      return new Intl.DateTimeFormat("id-ID", {
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric",
      }).format(selectedDate);

    case "month":
      return new Intl.DateTimeFormat("id-ID", {
        month: "long",
        year: "numeric",
      }).format(selectedDate);

    case "year":
      return String(selectedDate.getFullYear());

    default:
      return "";
  }
}

function getCalendarButtonLabel(period: CashBookPeriod): string {
  switch (period) {
    case "day":
      return "Pilih Tanggal";

    case "month":
      return "Pilih Bulan";

    case "year":
      return "Pilih Tahun";

    default:
      return "Pilih Periode";
  }
}

function getTypeFilterLabel(filter: CashBookTypeFilter): string {
  const selectedOption = CASH_BOOK_FILTER_OPTIONS.find(
    (option) => option.value === filter,
  );

  return selectedOption?.label ?? "Semua Catatan";
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
        minimumFontScale={0.68}
        className="font-atkinson-bold text-[20px] leading-7 text-brand-brown"
      >
        {value}
      </Text>
    </View>
  );
}

function PeriodButton({ label, selected, onPress }: PeriodButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{
        selected,
      }}
      className={`min-h-12 flex-1 items-center justify-center rounded-xl border-2 px-2 py-3 ${
        selected
          ? "border-brand-orange bg-brand-cream"
          : "border-brand-yellow bg-brand-white"
      }`}
    >
      <Text
        className={`text-center font-atkinson-bold text-[13px] ${
          selected ? "text-brand-orange" : "text-brand-brown"
        }`}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function CashBookEntryCard({ entry }: CashBookEntryCardProps) {
  const isIncome = entry.type === "income";

  const amountPrefix = isIncome ? "+" : "-";

  return (
    <View className="mb-4 rounded-3xl border-2 border-brand-yellow bg-brand-white p-4">
      <View className="flex-row items-start justify-between">
        <View className="mr-3 flex-1">
          <Text className="font-atkinson-bold text-[17px] leading-6 text-brand-brown">
            {entry.categoryLabel}
          </Text>

          <Text className="mt-1 font-atkinson text-[13px] leading-5 text-brand-black">
            {formatDateTime(entry.entryDate)}
          </Text>
        </View>

        <View
          className={`rounded-full px-3 py-1.5 ${
            isIncome ? "bg-brand-cream" : "bg-brand-brown"
          }`}
        >
          <Text
            className={`font-atkinson-bold text-[12px] ${
              isIncome ? "text-brand-orange" : "text-brand-white"
            }`}
          >
            {entry.typeLabel}
          </Text>
        </View>
      </View>

      <View className="mt-4 rounded-2xl bg-brand-cream p-4">
        <Text className="font-atkinson text-[13px] text-brand-black">
          Nominal
        </Text>

        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.7}
          className="mt-1 font-atkinson-bold text-[21px] leading-7 text-brand-orange"
        >
          {amountPrefix}
          {formatCurrency(entry.amount)}
        </Text>
      </View>

      <View className="mt-4">
        <Text className="font-atkinson text-[13px] leading-5 text-brand-black">
          Keterangan
        </Text>

        <Text className="mt-1 font-atkinson-bold text-[14px] leading-6 text-brand-brown">
          {entry.description}
        </Text>
      </View>

      {entry.relatedTransactionId !== null ? (
        <View className="mt-4 rounded-2xl border border-brand-yellow bg-brand-white p-3">
          <Text className="font-atkinson text-[12px] leading-5 text-brand-black">
            Catatan ini dibuat otomatis dari transaksi penjualan.
          </Text>
        </View>
      ) : null}

      <View className="mt-4">
        <Text className="font-atkinson text-[13px] leading-5 text-brand-black">
          Dicatat oleh
        </Text>

        <Text className="mt-1 font-atkinson-bold text-[14px] leading-5 text-brand-brown">
          {entry.createdByName} · {formatUserRole(entry.createdByRole)}
        </Text>
      </View>
    </View>
  );
}

export function CashBookScreen({ onBack, onAddExpense }: CashBookScreenProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<CashBookPeriod>("day");

  const [selectedDate, setSelectedDate] = useState<Date>(() =>
    createLocalDate(new Date()),
  );

  const [maximumSelectableDate, setMaximumSelectableDate] = useState<Date>(() =>
    createLocalDate(new Date()),
  );

  const [calendarIsVisible, setCalendarIsVisible] = useState(false);

  const [selectedType, setSelectedType] = useState<CashBookTypeFilter>("all");

  const [filterDropdownIsOpen, setFilterDropdownIsOpen] = useState(false);

  const [entries, setEntries] = useState<CashBookEntry[]>([]);

  const [summary, setSummary] = useState<CashBookSummary>(EMPTY_SUMMARY);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useAndroidBackButton(() => {
    if (calendarIsVisible) {
      setCalendarIsVisible(false);

      return;
    }

    if (filterDropdownIsOpen) {
      setFilterDropdownIsOpen(false);

      return;
    }

    onBack();
  });

  const selectedPeriodDescription = useMemo(
    () => getPeriodDescription(selectedPeriod, selectedDate),
    [selectedDate, selectedPeriod],
  );

  const selectedTypeLabel = useMemo(
    () => getTypeFilterLabel(selectedType),
    [selectedType],
  );

  const loadCashBook = useCallback((): void => {
    try {
      const dateRange = getDateRangeByPeriod(selectedPeriod, selectedDate);

      setEntries(
        getCashBookEntries({
          type: selectedType,
          dateFrom: dateRange.dateFrom,
          dateTo: dateRange.dateTo,
        }),
      );

      setSummary(
        getCashBookSummary({
          dateFrom: dateRange.dateFrom,
          dateTo: dateRange.dateTo,
        }),
      );

      setErrorMessage(null);
    } catch (error) {
      setEntries([]);
      setSummary(EMPTY_SUMMARY);

      setErrorMessage(
        error instanceof Error ? error.message : "Buku kas tidak dapat dimuat.",
      );
    }
  }, [selectedDate, selectedPeriod, selectedType]);

  useEffect(() => {
    loadCashBook();
  }, [loadCashBook]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState === "active") {
        setMaximumSelectableDate(createLocalDate(new Date()));

        loadCashBook();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [loadCashBook]);

  function handlePeriodChange(period: CashBookPeriod): void {
    setSelectedPeriod(period);

    setFilterDropdownIsOpen(false);

    setErrorMessage(null);
  }

  function handleOpenCalendar(): void {
    setFilterDropdownIsOpen(false);

    setCalendarIsVisible(true);
  }

  function handleCloseCalendar(): void {
    setCalendarIsVisible(false);
  }

  function handleConfirmCalendar(date: Date): void {
    setSelectedDate(createLocalDate(date));

    setCalendarIsVisible(false);
    setErrorMessage(null);
  }

  function handleToggleFilterDropdown(): void {
    setFilterDropdownIsOpen((currentValue) => !currentValue);
  }

  function handleSelectTypeFilter(filter: CashBookTypeFilter): void {
    setSelectedType(filter);

    setFilterDropdownIsOpen(false);

    setErrorMessage(null);
  }

  function handleOpenAddExpense(): void {
    setFilterDropdownIsOpen(false);

    onAddExpense();
  }

  return (
    <>
      <ScrollView
        className="flex-1 bg-brand-cream"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingHorizontal: 18,
          paddingTop: 32,
          paddingBottom: 64,
        }}
      >
        <View className="w-full max-w-md self-center">
          <ScreenHeader
            title="Buku Kas"
            description="Lihat pemasukan, pengeluaran, dan saldo usaha."
            onBack={onBack}
          />

          <View className="mt-5 rounded-3xl bg-brand-white p-4">
            <Text className="font-atkinson-bold text-[18px] text-brand-brown">
              Pilih Periode
            </Text>

            <Text className="mt-2 font-atkinson text-[14px] leading-6 text-brand-black">
              Pilih jenis periode yang ingin ditampilkan.
            </Text>

            <View className="mt-4 flex-row gap-2">
              <PeriodButton
                label="Harian"
                selected={selectedPeriod === "day"}
                onPress={() => {
                  handlePeriodChange("day");
                }}
              />

              <PeriodButton
                label="Bulanan"
                selected={selectedPeriod === "month"}
                onPress={() => {
                  handlePeriodChange("month");
                }}
              />

              <PeriodButton
                label="Tahunan"
                selected={selectedPeriod === "year"}
                onPress={() => {
                  handlePeriodChange("year");
                }}
              />
            </View>

            <View className="mt-4 rounded-2xl bg-brand-cream p-4">
              <Text className="font-atkinson text-[13px] text-brand-black">
                Periode yang ditampilkan
              </Text>

              <Text className="mt-1 font-atkinson-bold text-[17px] leading-6 text-brand-brown">
                {selectedPeriodDescription}
              </Text>
            </View>

            <Pressable
              onPress={handleOpenCalendar}
              accessibilityRole="button"
              accessibilityLabel={getCalendarButtonLabel(selectedPeriod)}
              className="mt-3 min-h-12 items-center justify-center rounded-2xl border-2 border-brand-orange bg-brand-white px-4 py-3"
            >
              <Text className="font-atkinson-bold text-[16px] text-brand-orange">
                {getCalendarButtonLabel(selectedPeriod)}
              </Text>
            </Pressable>
          </View>

          <View className="mt-4 rounded-3xl bg-brand-white p-4">
            <Text className="font-atkinson-bold text-[18px] text-brand-brown">
              Ringkasan Kas
            </Text>

            <Text className="mt-2 font-atkinson text-[13px] leading-5 text-brand-black">
              {selectedPeriodDescription}
            </Text>

            <View className="mt-4 flex-row gap-3">
              <SummaryCard
                label="Total pemasukan"
                value={formatCurrency(summary.totalIncome)}
              />

              <SummaryCard
                label="Total pengeluaran"
                value={formatCurrency(summary.totalExpense)}
              />
            </View>

            <View className="mt-3 flex-row gap-3">
              <SummaryCard
                label="Saldo"
                value={formatCurrency(summary.balance)}
              />

              <SummaryCard
                label="Jumlah catatan"
                value={String(summary.entryCount)}
              />
            </View>
          </View>

          <Pressable
            onPress={handleOpenAddExpense}
            accessibilityRole="button"
            accessibilityLabel="Catat pengeluaran usaha"
            className="mt-4 min-h-14 items-center justify-center rounded-2xl bg-brand-orange px-5 py-4"
          >
            <Text className="font-atkinson-bold text-[18px] text-brand-white">
              Catat Pengeluaran
            </Text>
          </Pressable>

          <View className="mt-4 rounded-3xl bg-brand-white p-4">
            <Text className="font-atkinson-bold text-[18px] text-brand-brown">
              Tampilkan Catatan
            </Text>

            <Text className="mt-2 font-atkinson text-[13px] leading-5 text-brand-black">
              Pilih jenis catatan yang ingin ditampilkan.
            </Text>

            <Pressable
              onPress={handleToggleFilterDropdown}
              accessibilityRole="button"
              accessibilityLabel={`Filter catatan: ${selectedTypeLabel}`}
              accessibilityState={{
                expanded: filterDropdownIsOpen,
              }}
              className={`mt-4 min-h-14 flex-row items-center justify-between rounded-2xl border-2 px-4 py-3 ${
                filterDropdownIsOpen
                  ? "border-brand-orange bg-brand-cream"
                  : "border-brand-yellow bg-brand-white"
              }`}
            >
              <View className="mr-3 flex-1">
                <Text className="font-atkinson text-[12px] text-brand-black">
                  Jenis catatan
                </Text>

                <Text className="mt-1 font-atkinson-bold text-[16px] text-brand-brown">
                  {selectedTypeLabel}
                </Text>
              </View>

              <View className="h-9 w-9 items-center justify-center">
                <Text
                  style={{
                    transform: [
                      {
                        rotate: filterDropdownIsOpen ? "-90deg" : "90deg",
                      },
                    ],
                  }}
                  className="font-atkinson-bold text-[30px] leading-8 text-brand-orange"
                >
                  ›
                </Text>
              </View>
            </Pressable>

            {filterDropdownIsOpen ? (
              <View className="mt-2 overflow-hidden rounded-2xl border-2 border-brand-yellow bg-brand-white">
                {CASH_BOOK_FILTER_OPTIONS.map((option, optionIndex) => {
                  const isSelected = option.value === selectedType;

                  const isLastOption =
                    optionIndex === CASH_BOOK_FILTER_OPTIONS.length - 1;

                  return (
                    <Pressable
                      key={option.value}
                      onPress={() => {
                        handleSelectTypeFilter(option.value);
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={`Tampilkan ${option.label}`}
                      accessibilityState={{
                        selected: isSelected,
                      }}
                      className={`min-h-13 flex-row items-center justify-between px-4 py-3 ${
                        isSelected ? "bg-brand-cream" : "bg-brand-white"
                      } ${isLastOption ? "" : "border-b border-brand-yellow"}`}
                    >
                      <Text
                        className={`font-atkinson-bold text-[15px] ${
                          isSelected ? "text-brand-orange" : "text-brand-brown"
                        }`}
                      >
                        {option.label}
                      </Text>

                      {isSelected ? (
                        <View className="h-4 w-4 rounded-full bg-brand-orange" />
                      ) : (
                        <View className="h-4 w-4 rounded-full border-2 border-brand-yellow bg-brand-white" />
                      )}
                    </Pressable>
                  );
                })}
              </View>
            ) : null}
          </View>

          {errorMessage ? (
            <View className="mt-4 rounded-2xl border-2 border-brand-orange bg-brand-white p-4">
              <Text className="font-atkinson-bold text-[15px] text-brand-brown">
                Buku kas belum dapat dimuat
              </Text>

              <Text className="mt-2 font-atkinson text-[14px] leading-6 text-brand-black">
                {errorMessage}
              </Text>
            </View>
          ) : null}

          {entries.length === 0 && errorMessage === null ? (
            <View className="mt-4 rounded-3xl border-2 border-brand-yellow bg-brand-white p-5">
              <Text className="text-center font-atkinson-bold text-[20px] text-brand-brown">
                Belum ada catatan kas
              </Text>

              <Text className="mt-2 text-center font-atkinson text-[15px] leading-6 text-brand-black">
                Belum ada pemasukan atau pengeluaran pada periode dan filter
                yang dipilih.
              </Text>
            </View>
          ) : (
            <View className="mt-6">
              <Text className="mb-3 font-atkinson-bold text-[20px] text-brand-brown">
                Riwayat Kas
              </Text>

              {entries.map((entry) => (
                <CashBookEntryCard key={entry.id} entry={entry} />
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      <BrandCalendarModal
        visible={calendarIsVisible}
        mode={selectedPeriod}
        value={selectedDate}
        maximumDate={maximumSelectableDate}
        onCancel={handleCloseCalendar}
        onConfirm={handleConfirmCalendar}
      />
    </>
  );
}
