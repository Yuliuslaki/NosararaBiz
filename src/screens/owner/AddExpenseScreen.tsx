import { useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import { useAppAlert } from "../../components/alerts/AppAlertProvider";
import { ScreenHeader } from "../../components/navigation/ScreenHeader";
import { useAndroidBackButton } from "../../hooks/useAndroidBackButton";
import type { AuthenticatedUser } from "../../services/authService";
import {
  createExpense,
  EXPENSE_CATEGORIES,
  EXPENSE_CATEGORY_LABELS,
  type ExpenseCategory,
} from "../../services/expenseService";
import { formatCurrency } from "../../utils/formatters";

type AddExpenseScreenProps = {
  user: AuthenticatedUser;
  onBack: () => void;
  onExpenseCreated: () => void;
};

type ExpenseCategoryButtonProps = {
  category: ExpenseCategory;
  selected: boolean;
  disabled: boolean;
  onPress: (category: ExpenseCategory) => void;
};

function keepDigitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

function ExpenseCategoryButton({
  category,
  selected,
  disabled,
  onPress,
}: ExpenseCategoryButtonProps) {
  return (
    <Pressable
      onPress={() => {
        onPress(category);
      }}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={`Pilih kategori ${EXPENSE_CATEGORY_LABELS[category]}`}
      accessibilityState={{
        selected,
        disabled,
      }}
      className={`mb-3 min-h-14 w-[48%] items-center justify-center rounded-xl border border-brand-black px-3 py-3 ${
        selected ? "bg-brand-black" : "bg-brand-white"
      } ${disabled ? "opacity-40" : ""}`}
    >
      <Text
        className={`text-center font-atkinson-bold text-[14px] leading-5 ${
          selected ? "text-brand-white" : "text-brand-black"
        }`}
      >
        {EXPENSE_CATEGORY_LABELS[category]}
      </Text>
    </Pressable>
  );
}

export function AddExpenseScreen({
  user,
  onBack,
  onExpenseCreated,
}: AddExpenseScreenProps) {
  const { showAlert } = useAppAlert();

  const scrollViewRef = useRef<ScrollView>(null);

  const scrollOffsetYRef = useRef(0);

  const amountInputRef = useRef<TextInput>(null);

  const descriptionInputRef = useRef<TextInput>(null);

  const [selectedCategory, setSelectedCategory] =
    useState<ExpenseCategory | null>(null);

  const [amountText, setAmountText] = useState("");

  const [description, setDescription] = useState("");

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const parsedAmount = amountText.length === 0 ? 0 : Number(amountText);

  const normalizedDescription = description.trim().replace(/\s+/g, " ");

  const amountIsValid = Number.isSafeInteger(parsedAmount) && parsedAmount > 0;

  const descriptionIsValid = normalizedDescription.length >= 3;

  const formIsComplete =
    selectedCategory !== null && amountIsValid && descriptionIsValid;

  const hasUnsavedData =
    selectedCategory !== null ||
    amountText.length > 0 ||
    description.trim().length > 0;

  function scrollInputIntoView(
    inputRef: React.RefObject<TextInput | null>,
  ): void {
    setTimeout(() => {
      inputRef.current?.measure((_x, _y, _width, _height, _pageX, pageY) => {
        const preferredPosition = Platform.OS === "android" ? 140 : 175;

        const requiredMovement = pageY - preferredPosition;

        if (requiredMovement <= 0) {
          return;
        }

        const nextScrollPosition = Math.max(
          scrollOffsetYRef.current + requiredMovement,
          0,
        );

        scrollViewRef.current?.scrollTo({
          y: nextScrollPosition,
          animated: true,
        });
      });
    }, 250);
  }

  function handleBack(): void {
    if (isSubmitting) {
      return;
    }

    if (!hasUnsavedData) {
      onBack();

      return;
    }

    showAlert({
      tone: "warning",
      title: "Batalkan pencatatan?",
      message:
        "Kategori, nominal, dan keterangan yang sudah diisi tidak akan disimpan.",
      confirmText: "Batalkan",
      cancelText: "Lanjut Mengisi",
      onConfirm: onBack,
    });
  }

  useAndroidBackButton(handleBack);

  function handleCategoryChange(category: ExpenseCategory): void {
    if (isSubmitting) {
      return;
    }

    setSelectedCategory(category);

    setErrorMessage(null);
  }

  function handleAmountChange(value: string): void {
    setAmountText(keepDigitsOnly(value));

    setErrorMessage(null);
  }

  function handleDescriptionChange(value: string): void {
    setDescription(value);
    setErrorMessage(null);
  }

  function saveExpense(): void {
    if (isSubmitting || selectedCategory === null) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const createdExpense = createExpense({
        category: selectedCategory,
        amount: parsedAmount,
        description: normalizedDescription,
        performedBy: user,
      });

      setSelectedCategory(null);
      setAmountText("");
      setDescription("");

      showAlert({
        tone: "success",
        title: "Pengeluaran tersimpan",
        message: `${createdExpense.categoryLabel}\n${formatCurrency(
          createdExpense.amount,
        )}\n\n${createdExpense.description}`,
        confirmText: "Kembali ke Buku Kas",
        dismissible: false,
        onConfirm: onExpenseCreated,
      });
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Pengeluaran gagal disimpan.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleSubmit(): void {
    if (isSubmitting) {
      return;
    }

    setErrorMessage(null);

    if (selectedCategory === null) {
      setErrorMessage("Pilih kategori pengeluaran.");

      return;
    }

    if (amountText.trim().length === 0) {
      setErrorMessage("Nominal pengeluaran wajib diisi.");

      return;
    }

    if (!amountIsValid) {
      setErrorMessage("Nominal pengeluaran harus berupa angka lebih dari nol.");

      return;
    }

    if (!descriptionIsValid) {
      setErrorMessage("Keterangan pengeluaran minimal 3 karakter.");

      return;
    }

    showAlert({
      tone: "warning",
      title: "Simpan pengeluaran?",
      message: `${EXPENSE_CATEGORY_LABELS[selectedCategory]}\n${formatCurrency(
        parsedAmount,
      )}\n\n${normalizedDescription}`,
      confirmText: "Simpan Pengeluaran",
      cancelText: "Periksa Lagi",
      onConfirm: saveExpense,
    });
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-brand-cream"
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 16 : 0}
    >
      <ScrollView
        ref={scrollViewRef}
        className="flex-1"
        onScroll={(event) => {
          scrollOffsetYRef.current = event.nativeEvent.contentOffset.y;
        }}
        scrollEventThrottle={16}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
        contentContainerStyle={{
          paddingHorizontal: 18,
          paddingTop: 32,
          paddingBottom: 200,
        }}
      >
        <View className="w-full max-w-md self-center">
          <ScreenHeader
            title="Catat Pengeluaran"
            description="Catat biaya operasional usaha ke dalam Buku Kas."
            onBack={handleBack}
            disabled={isSubmitting}
          />

          <View className="mt-5 rounded-xl border border-brand-black bg-brand-white p-4">
            <Text className="font-atkinson-bold text-[19px] text-brand-black">
              Kategori Pengeluaran
            </Text>

            <Text className="mt-2 font-atkinson text-[14px] leading-6 text-brand-black">
              Pilih kategori yang paling sesuai dengan pengeluaran usaha.
            </Text>

            <View className="mt-4 flex-row flex-wrap justify-between">
              {EXPENSE_CATEGORIES.map((category) => (
                <ExpenseCategoryButton
                  key={category}
                  category={category}
                  selected={selectedCategory === category}
                  disabled={isSubmitting}
                  onPress={handleCategoryChange}
                />
              ))}
            </View>
          </View>

          <View className="mt-4 rounded-xl border border-brand-black bg-brand-white p-4">
            <Text className="font-atkinson-bold text-[19px] text-brand-black">
              Nominal Pengeluaran
            </Text>

            <Text className="mt-2 font-atkinson text-[14px] leading-6 text-brand-black">
              Masukkan jumlah uang yang dikeluarkan dalam rupiah.
            </Text>

            <TextInput
              ref={amountInputRef}
              value={amountText}
              onChangeText={handleAmountChange}
              onFocus={() => {
                scrollInputIntoView(amountInputRef);
              }}
              onSubmitEditing={() => {
                descriptionInputRef.current?.focus();
              }}
              editable={!isSubmitting}
              selectTextOnFocus
              keyboardType="number-pad"
              maxLength={12}
              placeholder="Contoh: 250000"
              placeholderTextColor="#666666"
              selectionColor="#F4E7D3"
              cursorColor="#111111"
              accessibilityLabel="Nominal pengeluaran"
              className="mt-4 min-h-14 rounded-xl border border-brand-black bg-brand-white px-4 py-3 font-atkinson-bold text-[18px] text-brand-black"
            />

            <View className="mt-3 rounded-xl border border-brand-black bg-brand-cream p-4">
              <Text className="font-atkinson text-[13px] text-brand-black">
                Nominal
              </Text>

              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.7}
                className="mt-1 font-atkinson-bold text-[22px] text-brand-black"
              >
                {formatCurrency(amountIsValid ? parsedAmount : 0)}
              </Text>
            </View>
          </View>

          <View className="mt-4 rounded-xl border border-brand-black bg-brand-white p-4">
            <Text className="font-atkinson-bold text-[19px] text-brand-black">
              Keterangan
            </Text>

            <Text className="mt-2 font-atkinson text-[14px] leading-6 text-brand-black">
              Jelaskan penggunaan uang agar catatan mudah diperiksa kembali.
            </Text>

            <TextInput
              ref={descriptionInputRef}
              value={description}
              onChangeText={handleDescriptionChange}
              onFocus={() => {
                scrollInputIntoView(descriptionInputRef);
              }}
              editable={!isSubmitting}
              multiline
              maxLength={250}
              textAlignVertical="top"
              placeholder="Contoh: Membeli 5 karung pakan ayam"
              placeholderTextColor="#666666"
              selectionColor="#F4E7D3"
              cursorColor="#111111"
              accessibilityLabel="Keterangan pengeluaran"
              className="mt-4 min-h-[130px] rounded-xl border border-brand-black bg-brand-white px-4 py-4 font-atkinson text-[16px] leading-6 text-brand-black"
            />

            <Text className="mt-2 text-right font-atkinson text-[12px] text-brand-black">
              {description.length}/250
            </Text>
          </View>

          <View className="mt-4 rounded-xl border border-brand-black bg-brand-cream p-4">
            <Text className="font-atkinson-bold text-[14px] text-brand-black">
              Informasi Pencatatan
            </Text>

            <Text className="mt-2 font-atkinson text-[14px] leading-6 text-brand-black">
              Tanggal, jam, dan nama Owner akan disimpan secara otomatis sebagai
              jejak pencatatan.
            </Text>
          </View>

          {errorMessage ? (
            <View className="mt-4 rounded-xl border border-brand-black bg-brand-white p-4">
              <Text className="font-atkinson-bold text-[15px] text-brand-black">
                Pengeluaran belum dapat disimpan
              </Text>

              <Text className="mt-2 font-atkinson text-[14px] leading-6 text-brand-black">
                {errorMessage}
              </Text>
            </View>
          ) : null}

          <Pressable
            onPress={handleSubmit}
            disabled={isSubmitting || !formIsComplete}
            accessibilityRole="button"
            accessibilityLabel="Simpan pengeluaran"
            accessibilityState={{
              disabled: isSubmitting || !formIsComplete,
            }}
            className={`mt-5 min-h-14 items-center justify-center rounded-xl bg-brand-black px-5 py-4 ${
              isSubmitting || !formIsComplete ? "opacity-50" : ""
            }`}
          >
            {isSubmitting ? (
              <View className="flex-row items-center">
                <ActivityIndicator color="#FFFFFF" />

                <Text className="ml-3 font-atkinson-bold text-[17px] text-brand-white">
                  Menyimpan...
                </Text>
              </View>
            ) : (
              <Text className="font-atkinson-bold text-[18px] text-brand-white">
                Simpan Pengeluaran
              </Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
