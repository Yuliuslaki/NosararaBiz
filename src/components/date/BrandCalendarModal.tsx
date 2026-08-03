import { useEffect, useMemo, useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";

export type BrandCalendarMode = "day" | "month" | "year";

type CalendarView = "calendar" | "month" | "year";

type BrandCalendarModalProps = {
  visible: boolean;
  mode: BrandCalendarMode;
  value: Date;
  minimumDate?: Date;
  maximumDate?: Date;
  onCancel: () => void;
  onConfirm: (date: Date) => void;
};

type CalendarDayCell = {
  key: string;
  date: Date | null;
};

type NavigationButtonProps = {
  direction: "previous" | "next";
  disabled?: boolean;
  accessibilityLabel: string;
  onPress: () => void;
};

const MONTH_NAMES = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
] as const;

const SHORT_MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
] as const;

const WEEKDAY_NAMES = [
  "Sen",
  "Sel",
  "Rab",
  "Kam",
  "Jum",
  "Sab",
  "Min",
] as const;

const YEAR_PAGE_SIZE = 12;

function createLocalDate(year: number, month: number, day: number): Date {
  return new Date(year, month, day, 12, 0, 0, 0);
}

function normalizeDate(date: Date): Date {
  return createLocalDate(date.getFullYear(), date.getMonth(), date.getDate());
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getClampedDay(
  year: number,
  month: number,
  requestedDay: number,
): number {
  return Math.min(requestedDay, getDaysInMonth(year, month));
}

function createClampedDate(
  year: number,
  month: number,
  requestedDay: number,
): Date {
  return createLocalDate(year, month, getClampedDay(year, month, requestedDay));
}

function isSameDay(firstDate: Date, secondDate: Date): boolean {
  return (
    firstDate.getFullYear() === secondDate.getFullYear() &&
    firstDate.getMonth() === secondDate.getMonth() &&
    firstDate.getDate() === secondDate.getDate()
  );
}

function isBeforeDate(firstDate: Date, secondDate: Date): boolean {
  return (
    normalizeDate(firstDate).getTime() < normalizeDate(secondDate).getTime()
  );
}

function isAfterDate(firstDate: Date, secondDate: Date): boolean {
  return (
    normalizeDate(firstDate).getTime() > normalizeDate(secondDate).getTime()
  );
}

function clampDateToRange(
  date: Date,
  minimumDate?: Date,
  maximumDate?: Date,
): Date {
  const normalizedDate = normalizeDate(date);

  if (minimumDate && isBeforeDate(normalizedDate, minimumDate)) {
    return normalizeDate(minimumDate);
  }

  if (maximumDate && isAfterDate(normalizedDate, maximumDate)) {
    return normalizeDate(maximumDate);
  }

  return normalizedDate;
}

function isDateSelectable(
  date: Date,
  minimumDate?: Date,
  maximumDate?: Date,
): boolean {
  if (minimumDate && isBeforeDate(date, minimumDate)) {
    return false;
  }

  if (maximumDate && isAfterDate(date, maximumDate)) {
    return false;
  }

  return true;
}

function getMonthStart(year: number, month: number): Date {
  return createLocalDate(year, month, 1);
}

function getMonthEnd(year: number, month: number): Date {
  return createLocalDate(year, month, getDaysInMonth(year, month));
}

function canOpenMonth(
  year: number,
  month: number,
  minimumDate?: Date,
  maximumDate?: Date,
): boolean {
  const monthStart = getMonthStart(year, month);

  const monthEnd = getMonthEnd(year, month);

  if (minimumDate && isBeforeDate(monthEnd, minimumDate)) {
    return false;
  }

  if (maximumDate && isAfterDate(monthStart, maximumDate)) {
    return false;
  }

  return true;
}

function canOpenYear(
  year: number,
  minimumDate?: Date,
  maximumDate?: Date,
): boolean {
  const yearStart = createLocalDate(year, 0, 1);

  const yearEnd = createLocalDate(year, 11, 31);

  if (minimumDate && isBeforeDate(yearEnd, minimumDate)) {
    return false;
  }

  if (maximumDate && isAfterDate(yearStart, maximumDate)) {
    return false;
  }

  return true;
}

function canOpenYearPage(
  pageStart: number,
  minimumDate?: Date,
  maximumDate?: Date,
): boolean {
  return Array.from(
    {
      length: YEAR_PAGE_SIZE,
    },
    (_, index) => pageStart + index,
  ).some((year) => canOpenYear(year, minimumDate, maximumDate));
}

function getMondayBasedDayIndex(date: Date): number {
  const sundayBasedIndex = date.getDay();

  return sundayBasedIndex === 0 ? 6 : sundayBasedIndex - 1;
}

function createMonthGrid(year: number, month: number): CalendarDayCell[] {
  const firstDay = createLocalDate(year, month, 1);

  const firstDayIndex = getMondayBasedDayIndex(firstDay);

  const numberOfDays = getDaysInMonth(year, month);

  return Array.from({ length: 42 }, (_, index) => {
    const dayNumber = index - firstDayIndex + 1;

    if (dayNumber < 1 || dayNumber > numberOfDays) {
      return {
        key: `empty-${index}`,
        date: null,
      };
    }

    return {
      key: `${year}-${month}-${dayNumber}`,
      date: createLocalDate(year, month, dayNumber),
    };
  });
}

function getYearPageStart(year: number): number {
  return Math.floor(year / YEAR_PAGE_SIZE) * YEAR_PAGE_SIZE;
}

function getDefaultView(mode: BrandCalendarMode): CalendarView {
  switch (mode) {
    case "day":
      return "calendar";

    case "month":
      return "month";

    case "year":
      return "year";

    default:
      return "calendar";
  }
}

function getModeTitle(mode: BrandCalendarMode): string {
  switch (mode) {
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

function getHeaderSummary(mode: BrandCalendarMode, date: Date): string {
  switch (mode) {
    case "day":
      return new Intl.DateTimeFormat("id-ID", {
        weekday: "long",
        day: "2-digit",
        month: "long",
      }).format(date);

    case "month":
      return MONTH_NAMES[date.getMonth()];

    case "year":
      return String(date.getFullYear());

    default:
      return "";
  }
}

function getConfirmButtonLabel(mode: BrandCalendarMode): string {
  switch (mode) {
    case "day":
      return "Pilih Tanggal";

    case "month":
      return "Pilih Bulan";

    case "year":
      return "Pilih Tahun";

    default:
      return "Pilih";
  }
}

function NavigationButton({
  direction,
  disabled = false,
  accessibilityLabel,
  onPress,
}: NavigationButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{
        disabled,
      }}
      className={`h-11 w-11 items-center justify-center rounded-xl border border-brand-black bg-brand-white ${
        disabled ? "opacity-25" : ""
      }`}
    >
      <Text className="font-atkinson-bold text-[30px] leading-8 text-brand-black">
        {direction === "previous" ? "‹" : "›"}
      </Text>
    </Pressable>
  );
}

export function BrandCalendarModal({
  visible,
  mode,
  value,
  minimumDate,
  maximumDate,
  onCancel,
  onConfirm,
}: BrandCalendarModalProps) {
  const normalizedMinimumDate = useMemo(
    () => (minimumDate ? normalizeDate(minimumDate) : undefined),
    [minimumDate],
  );

  const normalizedMaximumDate = useMemo(
    () => (maximumDate ? normalizeDate(maximumDate) : undefined),
    [maximumDate],
  );

  const initialValue = clampDateToRange(
    value,
    normalizedMinimumDate,
    normalizedMaximumDate,
  );

  const [selectedDate, setSelectedDate] = useState<Date>(initialValue);

  const [currentView, setCurrentView] = useState<CalendarView>(
    getDefaultView(mode),
  );

  const [visibleYear, setVisibleYear] = useState(initialValue.getFullYear());

  const [visibleMonth, setVisibleMonth] = useState(initialValue.getMonth());

  const [yearPageStart, setYearPageStart] = useState(
    getYearPageStart(initialValue.getFullYear()),
  );

  const today = useMemo(() => normalizeDate(new Date()), []);

  const calendarGrid = useMemo(
    () => createMonthGrid(visibleYear, visibleMonth),
    [visibleMonth, visibleYear],
  );

  const displayedYears = useMemo(
    () =>
      Array.from(
        {
          length: YEAR_PAGE_SIZE,
        },
        (_, index) => yearPageStart + index,
      ),
    [yearPageStart],
  );

  useEffect(() => {
    if (!visible) {
      return;
    }

    const nextValue = clampDateToRange(
      value,
      normalizedMinimumDate,
      normalizedMaximumDate,
    );

    setSelectedDate(nextValue);

    setVisibleYear(nextValue.getFullYear());

    setVisibleMonth(nextValue.getMonth());

    setYearPageStart(getYearPageStart(nextValue.getFullYear()));

    setCurrentView(getDefaultView(mode));
  }, [mode, normalizedMaximumDate, normalizedMinimumDate, value, visible]);

  function handleModalBack(): void {
    const defaultView = getDefaultView(mode);

    if (currentView !== defaultView) {
      setCurrentView(defaultView);

      return;
    }

    onCancel();
  }

  function handleSelectYear(year: number): void {
    if (!canOpenYear(year, normalizedMinimumDate, normalizedMaximumDate)) {
      return;
    }

    const nextDate = clampDateToRange(
      createClampedDate(year, selectedDate.getMonth(), selectedDate.getDate()),
      normalizedMinimumDate,
      normalizedMaximumDate,
    );

    setSelectedDate(nextDate);

    setVisibleYear(nextDate.getFullYear());

    setVisibleMonth(nextDate.getMonth());

    setYearPageStart(getYearPageStart(nextDate.getFullYear()));

    if (mode === "year") {
      return;
    }

    setCurrentView("month");
  }

  function handleSelectMonth(month: number): void {
    if (
      !canOpenMonth(
        visibleYear,
        month,
        normalizedMinimumDate,
        normalizedMaximumDate,
      )
    ) {
      return;
    }

    const nextDate = clampDateToRange(
      createClampedDate(visibleYear, month, selectedDate.getDate()),
      normalizedMinimumDate,
      normalizedMaximumDate,
    );

    setSelectedDate(nextDate);

    setVisibleYear(nextDate.getFullYear());

    setVisibleMonth(nextDate.getMonth());

    if (mode === "day") {
      setCurrentView("calendar");
    }
  }

  function handleSelectDay(date: Date): void {
    if (!isDateSelectable(date, normalizedMinimumDate, normalizedMaximumDate)) {
      return;
    }

    setSelectedDate(date);
  }

  function handlePreviousMonth(): void {
    const previousMonth = createLocalDate(visibleYear, visibleMonth - 1, 1);

    if (
      !canOpenMonth(
        previousMonth.getFullYear(),
        previousMonth.getMonth(),
        normalizedMinimumDate,
        normalizedMaximumDate,
      )
    ) {
      return;
    }

    setVisibleYear(previousMonth.getFullYear());

    setVisibleMonth(previousMonth.getMonth());
  }

  function handleNextMonth(): void {
    const nextMonth = createLocalDate(visibleYear, visibleMonth + 1, 1);

    if (
      !canOpenMonth(
        nextMonth.getFullYear(),
        nextMonth.getMonth(),
        normalizedMinimumDate,
        normalizedMaximumDate,
      )
    ) {
      return;
    }

    setVisibleYear(nextMonth.getFullYear());

    setVisibleMonth(nextMonth.getMonth());
  }

  function handlePreviousYear(): void {
    const previousYear = visibleYear - 1;

    if (
      !canOpenYear(previousYear, normalizedMinimumDate, normalizedMaximumDate)
    ) {
      return;
    }

    setVisibleYear(previousYear);
  }

  function handleNextYear(): void {
    const nextYear = visibleYear + 1;

    if (!canOpenYear(nextYear, normalizedMinimumDate, normalizedMaximumDate)) {
      return;
    }

    setVisibleYear(nextYear);
  }

  function handleConfirm(): void {
    onConfirm(normalizeDate(selectedDate));
  }

  const previousMonth = createLocalDate(visibleYear, visibleMonth - 1, 1);

  const nextMonth = createLocalDate(visibleYear, visibleMonth + 1, 1);

  const previousMonthDisabled = !canOpenMonth(
    previousMonth.getFullYear(),
    previousMonth.getMonth(),
    normalizedMinimumDate,
    normalizedMaximumDate,
  );

  const nextMonthDisabled = !canOpenMonth(
    nextMonth.getFullYear(),
    nextMonth.getMonth(),
    normalizedMinimumDate,
    normalizedMaximumDate,
  );

  const previousYearDisabled = !canOpenYear(
    visibleYear - 1,
    normalizedMinimumDate,
    normalizedMaximumDate,
  );

  const nextYearDisabled = !canOpenYear(
    visibleYear + 1,
    normalizedMinimumDate,
    normalizedMaximumDate,
  );

  const previousYearPageStart = yearPageStart - YEAR_PAGE_SIZE;

  const nextYearPageStart = yearPageStart + YEAR_PAGE_SIZE;

  const previousYearPageDisabled = !canOpenYearPage(
    previousYearPageStart,
    normalizedMinimumDate,
    normalizedMaximumDate,
  );

  const nextYearPageDisabled = !canOpenYearPage(
    nextYearPageStart,
    normalizedMinimumDate,
    normalizedMaximumDate,
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={handleModalBack}
    >
      <View className="flex-1 items-center justify-center bg-black/50 px-5 py-7">
        <View className="w-full max-w-md overflow-hidden rounded-xl border border-brand-black bg-brand-white">
          <View className="items-center border-b border-brand-black bg-brand-black px-5 pb-5 pt-4">
            <Text className="w-full text-center font-atkinson-bold text-[15px] text-brand-white">
              {getModeTitle(mode)}
            </Text>

            <Pressable
              onPress={() => {
                setCurrentView("year");
              }}
              accessibilityRole="button"
              accessibilityLabel="Buka pilihan tahun"
              accessibilityState={{
                selected: currentView === "year",
              }}
              className="mt-3 items-center rounded-xl px-3 py-1"
            >
              <Text
                className={`text-center font-atkinson-bold text-[18px] ${
                  currentView === "year"
                    ? "text-brand-cream"
                    : "text-brand-white"
                }`}
              >
                {selectedDate.getFullYear()}
              </Text>
            </Pressable>

            <Pressable
              onPress={() => {
                setCurrentView(getDefaultView(mode));
              }}
              accessibilityRole="button"
              accessibilityLabel="Kembali ke pilihan periode"
              className="mt-1 items-center rounded-xl px-3 py-1"
            >
              <Text className="text-center font-atkinson-bold text-[25px] leading-8 text-brand-white">
                {getHeaderSummary(mode, selectedDate)}
              </Text>
            </Pressable>
          </View>

          <View className="bg-brand-white p-4">
            {currentView === "calendar" ? (
              <>
                <View className="flex-row items-center justify-between">
                  <NavigationButton
                    direction="previous"
                    disabled={previousMonthDisabled}
                    accessibilityLabel="Bulan sebelumnya"
                    onPress={handlePreviousMonth}
                  />

                  <Pressable
                    onPress={() => {
                      setCurrentView("month");
                    }}
                    accessibilityRole="button"
                    accessibilityLabel="Buka pilihan bulan"
                    className="mx-2 min-h-11 flex-1 items-center justify-center rounded-xl border border-brand-black bg-brand-white px-3 py-2"
                  >
                    <Text className="text-center font-atkinson-bold text-[17px] text-brand-black">
                      {MONTH_NAMES[visibleMonth]} {visibleYear}
                    </Text>

                    <Text className="mt-0.5 text-center font-atkinson text-[11px] text-brand-black">
                      Tekan untuk memilih bulan
                    </Text>
                  </Pressable>

                  <NavigationButton
                    direction="next"
                    disabled={nextMonthDisabled}
                    accessibilityLabel="Bulan berikutnya"
                    onPress={handleNextMonth}
                  />
                </View>

                <View className="mt-3 flex-row border-b border-brand-black pb-1">
                  {WEEKDAY_NAMES.map((weekday) => (
                    <View
                      key={weekday}
                      style={{
                        width: "14.2857%",
                      }}
                      className="items-center py-2"
                    >
                      <Text className="font-atkinson-bold text-[12px] text-brand-black">
                        {weekday}
                      </Text>
                    </View>
                  ))}
                </View>

                <View className="mt-1 flex-row flex-wrap">
                  {calendarGrid.map((cell) => {
                    if (cell.date === null) {
                      return (
                        <View
                          key={cell.key}
                          style={{
                            width: "14.2857%",
                          }}
                          className="h-11"
                        />
                      );
                    }

                    const isSelected = isSameDay(cell.date, selectedDate);

                    const isToday = isSameDay(cell.date, today);

                    const isDisabled = !isDateSelectable(
                      cell.date,
                      normalizedMinimumDate,
                      normalizedMaximumDate,
                    );

                    return (
                      <View
                        key={cell.key}
                        style={{
                          width: "14.2857%",
                        }}
                        className="items-center justify-center py-1"
                      >
                        <Pressable
                          onPress={() => {
                            handleSelectDay(cell.date!);
                          }}
                          disabled={isDisabled}
                          accessibilityRole="button"
                          accessibilityLabel={`Pilih tanggal ${cell.date.getDate()} ${
                            MONTH_NAMES[cell.date.getMonth()]
                          } ${cell.date.getFullYear()}`}
                          accessibilityState={{
                            selected: isSelected,
                            disabled: isDisabled,
                          }}
                          className={`h-10 w-10 items-center justify-center rounded-full ${
                            isSelected
                              ? "bg-brand-black"
                              : isToday
                                ? "border border-brand-black bg-brand-cream"
                                : "bg-brand-white"
                          } ${isDisabled ? "opacity-25" : ""}`}
                        >
                          <Text
                            className={`font-atkinson-bold text-[14px] ${
                              isSelected
                                ? "text-brand-white"
                                : "text-brand-black"
                            }`}
                          >
                            {cell.date.getDate()}
                          </Text>
                        </Pressable>
                      </View>
                    );
                  })}
                </View>
              </>
            ) : null}

            {currentView === "month" ? (
              <>
                <View className="flex-row items-center justify-between">
                  <NavigationButton
                    direction="previous"
                    disabled={previousYearDisabled}
                    accessibilityLabel="Tahun sebelumnya"
                    onPress={handlePreviousYear}
                  />

                  <Pressable
                    onPress={() => {
                      setCurrentView("year");
                    }}
                    accessibilityRole="button"
                    accessibilityLabel="Buka pilihan tahun"
                    className="mx-2 min-h-11 flex-1 items-center justify-center rounded-xl border border-brand-black bg-brand-cream px-3 py-2"
                  >
                    <Text className="font-atkinson-bold text-[20px] text-brand-black">
                      {visibleYear}
                    </Text>

                    <Text className="mt-0.5 text-center font-atkinson text-[11px] text-brand-black">
                      Tekan untuk memilih tahun
                    </Text>
                  </Pressable>

                  <NavigationButton
                    direction="next"
                    disabled={nextYearDisabled}
                    accessibilityLabel="Tahun berikutnya"
                    onPress={handleNextYear}
                  />
                </View>

                <View className="mt-4 flex-row flex-wrap justify-between">
                  {SHORT_MONTH_NAMES.map((monthName, monthIndex) => {
                    const isSelected =
                      selectedDate.getFullYear() === visibleYear &&
                      selectedDate.getMonth() === monthIndex;

                    const isDisabled = !canOpenMonth(
                      visibleYear,
                      monthIndex,
                      normalizedMinimumDate,
                      normalizedMaximumDate,
                    );

                    return (
                      <Pressable
                        key={monthName}
                        onPress={() => {
                          handleSelectMonth(monthIndex);
                        }}
                        disabled={isDisabled}
                        accessibilityRole="button"
                        accessibilityLabel={`Pilih bulan ${
                          MONTH_NAMES[monthIndex]
                        } ${visibleYear}`}
                        accessibilityState={{
                          selected: isSelected,
                          disabled: isDisabled,
                        }}
                        style={{
                          width: "31.5%",
                        }}
                        className={`mb-3 min-h-14 items-center justify-center rounded-xl border border-brand-black px-2 py-3 ${
                          isSelected ? "bg-brand-black" : "bg-brand-white"
                        } ${isDisabled ? "opacity-25" : ""}`}
                      >
                        <Text
                          className={`font-atkinson-bold text-[15px] ${
                            isSelected ? "text-brand-white" : "text-brand-black"
                          }`}
                        >
                          {monthName}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            ) : null}

            {currentView === "year" ? (
              <>
                <View className="flex-row items-center justify-between">
                  <NavigationButton
                    direction="previous"
                    disabled={previousYearPageDisabled}
                    accessibilityLabel="Daftar tahun sebelumnya"
                    onPress={() => {
                      setYearPageStart(previousYearPageStart);
                    }}
                  />

                  <View className="mx-2 flex-1 items-center rounded-xl border border-brand-black bg-brand-cream px-3 py-2">
                    <Text className="font-atkinson-bold text-[17px] text-brand-black">
                      Pilih Tahun
                    </Text>

                    <Text className="mt-0.5 font-atkinson text-[12px] text-brand-black">
                      {yearPageStart} – {yearPageStart + YEAR_PAGE_SIZE - 1}
                    </Text>
                  </View>

                  <NavigationButton
                    direction="next"
                    disabled={nextYearPageDisabled}
                    accessibilityLabel="Daftar tahun berikutnya"
                    onPress={() => {
                      setYearPageStart(nextYearPageStart);
                    }}
                  />
                </View>

                <View className="mt-4 flex-row flex-wrap justify-between">
                  {displayedYears.map((year) => {
                    const isSelected = selectedDate.getFullYear() === year;

                    const isDisabled = !canOpenYear(
                      year,
                      normalizedMinimumDate,
                      normalizedMaximumDate,
                    );

                    return (
                      <Pressable
                        key={year}
                        onPress={() => {
                          handleSelectYear(year);
                        }}
                        disabled={isDisabled}
                        accessibilityRole="button"
                        accessibilityLabel={`Pilih tahun ${year}`}
                        accessibilityState={{
                          selected: isSelected,
                          disabled: isDisabled,
                        }}
                        style={{
                          width: "31.5%",
                        }}
                        className={`mb-3 min-h-14 items-center justify-center rounded-xl border border-brand-black px-2 py-3 ${
                          isSelected ? "bg-brand-black" : "bg-brand-white"
                        } ${isDisabled ? "opacity-25" : ""}`}
                      >
                        <Text
                          className={`font-atkinson-bold text-[15px] ${
                            isSelected ? "text-brand-white" : "text-brand-black"
                          }`}
                        >
                          {year}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            ) : null}

            <View className="mt-5 items-center border-t border-brand-black pt-4">
              <Pressable
                onPress={handleConfirm}
                accessibilityRole="button"
                accessibilityLabel={getConfirmButtonLabel(mode)}
                className="min-h-12 w-full max-w-[260px] items-center justify-center rounded-xl bg-brand-black px-5 py-3"
              >
                <Text className="text-center font-atkinson-bold text-[16px] text-brand-white">
                  {getConfirmButtonLabel(mode)}
                </Text>
              </Pressable>

              <Pressable
                onPress={onCancel}
                accessibilityRole="button"
                accessibilityLabel="Batalkan pemilihan periode"
                className="mt-3 min-h-11 w-full max-w-[260px] items-center justify-center rounded-xl border border-brand-black bg-brand-white px-5 py-2"
              >
                <Text className="text-center font-atkinson-bold text-[15px] text-brand-black">
                  Batal
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}
