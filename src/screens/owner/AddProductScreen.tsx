import { type ReactNode, useRef, useState } from "react";
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
import { DEFAULT_EGG_RACK_SIZE } from "../../constants/app";
import { useAndroidBackButton } from "../../hooks/useAndroidBackButton";
import type { AuthenticatedUser } from "../../services/authService";
import {
  createProduct,
  type CreateProductInput,
} from "../../services/productService";
import {
  PRODUCT_CATEGORIES,
  PRODUCT_CATEGORY_LABELS,
  PRODUCT_UNIT_LABELS,
  PRODUCT_UNITS,
  type ProductCategory,
  type ProductUnit,
} from "../../types/product";
import { convertEggStockToPieces } from "../../utils/eggStock";

type AddProductScreenProps = {
  user: AuthenticatedUser;
  onBack: () => void;
  onProductCreated: () => void;
};

type NumericInputProps = {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  editable: boolean;
  defaultValueOnEmpty?: string;
  onFocus?: () => void;
};

type CategorySelectProps = {
  value: ProductCategory;
  isOpen: boolean;
  disabled: boolean;
  onToggle: () => void;
  onSelect: (category: ProductCategory) => void;
};

const SELECTABLE_CATEGORIES = [
  PRODUCT_CATEGORIES.EGGS,
  PRODUCT_CATEGORIES.FERTILIZER,
  PRODUCT_CATEGORIES.CULLED_CHICKEN,
] as const;

const CATEGORY_DESCRIPTIONS: Record<ProductCategory, string> = {
  eggs: "Dijual dalam rak atau butir",
  fertilizer: "Dikelola dalam satuan karung",
  culled_chicken: "Dikelola dalam satuan ekor",
  other: "Produk usaha lainnya",
};

function keepDigitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

function parseRequiredInteger(value: string, label: string): number {
  if (value.trim().length === 0) {
    throw new Error(`${label} wajib diisi.`);
  }

  const parsedValue = Number(value);

  if (!Number.isSafeInteger(parsedValue) || parsedValue < 0) {
    throw new Error(`${label} harus berupa bilangan bulat nol atau lebih.`);
  }

  return parsedValue;
}

function parseIntegerWithDefault(
  value: string,
  label: string,
  defaultValue: number,
): number {
  const normalizedValue = value.trim();

  const parsedValue =
    normalizedValue.length === 0 ? defaultValue : Number(normalizedValue);

  if (!Number.isSafeInteger(parsedValue) || parsedValue < 0) {
    throw new Error(`${label} harus berupa bilangan bulat nol atau lebih.`);
  }

  return parsedValue;
}

function getBaseUnitForCategory(category: ProductCategory): ProductUnit {
  switch (category) {
    case PRODUCT_CATEGORIES.EGGS:
      return PRODUCT_UNITS.PIECE;

    case PRODUCT_CATEGORIES.FERTILIZER:
      return PRODUCT_UNITS.SACK;

    case PRODUCT_CATEGORIES.CULLED_CHICKEN:
      return PRODUCT_UNITS.HEAD;

    default:
      return PRODUCT_UNITS.PIECE;
  }
}

function NumericInput({
  value,
  onChangeText,
  placeholder,
  editable,
  defaultValueOnEmpty,
  onFocus,
}: NumericInputProps) {
  const isDefaultValue =
    defaultValueOnEmpty !== undefined && value === defaultValueOnEmpty;

  function handleFocus(): void {
    if (isDefaultValue) {
      onChangeText("");
    }

    onFocus?.();
  }

  function handleBlur(): void {
    if (defaultValueOnEmpty !== undefined && value.trim() === "") {
      onChangeText(defaultValueOnEmpty);
    }
  }

  return (
    <TextInput
      value={value}
      onChangeText={(nextValue) => {
        onChangeText(keepDigitsOnly(nextValue));
      }}
      onFocus={handleFocus}
      onBlur={handleBlur}
      editable={editable}
      placeholder={placeholder}
      placeholderTextColor="#9A9A9A"
      keyboardType="number-pad"
      selectionColor="#EC6426"
      style={{
        color: isDefaultValue ? "rgba(0, 0, 0, 0.32)" : "#000000",
      }}
      className="mt-2 min-h-12 rounded-2xl border-2 border-brand-yellow px-4 py-3 font-atkinson text-[16px]"
    />
  );
}

function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <Text className="mt-5 font-atkinson-bold text-[15px] leading-5 text-brand-brown">
      {children}
    </Text>
  );
}

function CategorySelect({
  value,
  isOpen,
  disabled,
  onToggle,
  onSelect,
}: CategorySelectProps) {
  return (
    <View className="mt-3">
      <Pressable
        onPress={onToggle}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityState={{
          expanded: isOpen,
          disabled,
        }}
        className="min-h-[62px] flex-row items-center rounded-2xl border-2 border-brand-orange bg-brand-cream px-4 py-3"
      >
        <View className="flex-1">
          <Text className="font-atkinson-bold text-[16px] leading-5 text-brand-brown">
            {PRODUCT_CATEGORY_LABELS[value]}
          </Text>

          <Text className="mt-1 font-atkinson text-[13px] leading-5 text-brand-black">
            {CATEGORY_DESCRIPTIONS[value]}
          </Text>
        </View>

        <Text className="ml-3 font-atkinson-bold text-[19px] text-brand-orange">
          {isOpen ? "⌃" : "⌄"}
        </Text>
      </Pressable>

      {isOpen ? (
        <View className="mt-2 overflow-hidden rounded-2xl border-2 border-brand-yellow bg-brand-white">
          {SELECTABLE_CATEGORIES.map((categoryOption, index) => {
            const isSelected = categoryOption === value;

            const isLastOption = index === SELECTABLE_CATEGORIES.length - 1;

            return (
              <Pressable
                key={categoryOption}
                onPress={() => {
                  onSelect(categoryOption);
                }}
                disabled={disabled}
                className={`flex-row items-center px-4 py-4 ${
                  !isLastOption ? "border-b border-brand-yellow" : ""
                } ${isSelected ? "bg-brand-cream" : "bg-brand-white"}`}
              >
                <View className="flex-1">
                  <Text
                    className={`font-atkinson-bold text-[15px] leading-5 ${
                      isSelected ? "text-brand-orange" : "text-brand-brown"
                    }`}
                  >
                    {PRODUCT_CATEGORY_LABELS[categoryOption]}
                  </Text>

                  <Text className="mt-1 font-atkinson text-[13px] leading-5 text-brand-black">
                    {CATEGORY_DESCRIPTIONS[categoryOption]}
                  </Text>
                </View>

                {isSelected ? (
                  <Text className="ml-3 font-atkinson-bold text-[18px] text-brand-orange">
                    ✓
                  </Text>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

export function AddProductScreen({
  user,
  onBack,
  onProductCreated,
}: AddProductScreenProps) {
  const { showAlert } = useAppAlert();

  const scrollViewRef = useRef<ScrollView>(null);

  const [category, setCategory] = useState<ProductCategory>(
    PRODUCT_CATEGORIES.EGGS,
  );

  const [isCategorySelectOpen, setIsCategorySelectOpen] = useState(false);

  const [pricePerBaseUnit, setPricePerBaseUnit] = useState("");

  const [pricePerRack, setPricePerRack] = useState("");

  const [rackSize, setRackSize] = useState(String(DEFAULT_EGG_RACK_SIZE));

  const [initialRacks, setInitialRacks] = useState("0");

  const [initialPieces, setInitialPieces] = useState("0");

  const [minimumRacks, setMinimumRacks] = useState("0");

  const [minimumPieces, setMinimumPieces] = useState("0");

  const [initialStock, setInitialStock] = useState("0");

  const [minimumStock, setMinimumStock] = useState("0");

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useAndroidBackButton(() => {
    if (!isSubmitting) {
      onBack();
    }
  });

  const isEggProduct = category === PRODUCT_CATEGORIES.EGGS;

  const baseUnit = getBaseUnitForCategory(category);

  const baseUnitLabel = PRODUCT_UNIT_LABELS[baseUnit].toLowerCase();

  const requiredFieldsAreFilled =
    pricePerBaseUnit.length > 0 &&
    (!isEggProduct || (pricePerRack.length > 0 && rackSize.length > 0));

  const submitIsDisabled = isSubmitting || !requiredFieldsAreFilled;

  function scrollToLowerForm(): void {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({
        animated: true,
      });
    }, 250);
  }

  function handleCategoryChange(nextCategory: ProductCategory): void {
    setCategory(nextCategory);
    setIsCategorySelectOpen(false);
    setErrorMessage(null);

    setPricePerBaseUnit("");
    setPricePerRack("");

    setInitialRacks("0");
    setInitialPieces("0");
    setMinimumRacks("0");
    setMinimumPieces("0");

    setInitialStock("0");
    setMinimumStock("0");

    if (nextCategory === PRODUCT_CATEGORIES.EGGS) {
      setRackSize(String(DEFAULT_EGG_RACK_SIZE));
    }
  }

  function buildCreateProductInput(): CreateProductInput {
    const productName = PRODUCT_CATEGORY_LABELS[category];

    const parsedPricePerBaseUnit = parseRequiredInteger(
      pricePerBaseUnit,
      isEggProduct ? "Harga per butir" : `Harga per ${baseUnitLabel}`,
    );

    if (isEggProduct) {
      const parsedRackSize = parseIntegerWithDefault(
        rackSize,
        "Jumlah butir per rak",
        DEFAULT_EGG_RACK_SIZE,
      );

      if (parsedRackSize <= 0) {
        throw new Error("Jumlah butir per rak harus lebih dari nol.");
      }

      const parsedInitialRacks = parseIntegerWithDefault(
        initialRacks,
        "Stok awal dalam rak",
        0,
      );

      const parsedInitialPieces = parseIntegerWithDefault(
        initialPieces,
        "Stok awal dalam butir",
        0,
      );

      const parsedMinimumRacks = parseIntegerWithDefault(
        minimumRacks,
        "Batas minimum dalam rak",
        0,
      );

      const parsedMinimumPieces = parseIntegerWithDefault(
        minimumPieces,
        "Batas minimum dalam butir",
        0,
      );

      if (parsedInitialPieces >= parsedRackSize) {
        throw new Error(
          `Sisa stok awal dalam butir harus kurang dari ${parsedRackSize}.`,
        );
      }

      if (parsedMinimumPieces >= parsedRackSize) {
        throw new Error(
          `Sisa batas minimum dalam butir harus kurang dari ${parsedRackSize}.`,
        );
      }

      return {
        name: productName,
        category,
        baseUnit: PRODUCT_UNITS.PIECE,

        pricePerBaseUnit: parsedPricePerBaseUnit,

        pricePerRack: parseRequiredInteger(pricePerRack, "Harga per rak"),

        initialStock: convertEggStockToPieces(
          parsedInitialRacks,
          parsedInitialPieces,
          parsedRackSize,
        ),

        minStockThreshold: convertEggStockToPieces(
          parsedMinimumRacks,
          parsedMinimumPieces,
          parsedRackSize,
        ),

        rackSize: parsedRackSize,

        performedBy: user,
      };
    }

    return {
      name: productName,
      category,
      baseUnit,

      pricePerBaseUnit: parsedPricePerBaseUnit,

      pricePerRack: null,

      initialStock: parseIntegerWithDefault(initialStock, "Stok awal", 0),

      minStockThreshold: parseIntegerWithDefault(
        minimumStock,
        "Batas minimum stok",
        0,
      ),

      rackSize: null,
      performedBy: user,
    };
  }

  function handleSubmit(): void {
    if (submitIsDisabled) {
      return;
    }

    setIsSubmitting(true);
    setIsCategorySelectOpen(false);
    setErrorMessage(null);

    try {
      const input = buildCreateProductInput();

      createProduct(input);

      showAlert({
        tone: "success",
        title: "Produk berhasil disimpan",
        message: `${input.name} telah ditambahkan ke daftar produk dan stok.`,
        confirmText: "Lihat Daftar Produk",
        dismissible: false,
        onConfirm: onProductCreated,
      });
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Produk gagal disimpan.",
      );

      scrollToLowerForm();
    } finally {
      setIsSubmitting(false);
    }
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
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
        contentContainerStyle={{
          paddingHorizontal: 18,
          paddingTop: 32,
          paddingBottom: 80,
        }}
      >
        <View className="w-full max-w-md self-center">
          <ScreenHeader
            title="Tambah Produk"
            description="Pilih kategori, harga, dan stok awal."
            onBack={onBack}
            disabled={isSubmitting}
          />

          <View className="mt-5 rounded-3xl bg-brand-white p-5">
            <Text className="font-atkinson-bold text-[18px] text-brand-brown">
              Kategori Produk
            </Text>

            <Text className="mt-2 font-atkinson text-[13px] leading-5 text-brand-black">
              Nama produk akan disimpan otomatis sesuai kategori yang dipilih.
            </Text>

            <CategorySelect
              value={category}
              isOpen={isCategorySelectOpen}
              disabled={isSubmitting}
              onToggle={() => {
                setIsCategorySelectOpen((currentValue) => !currentValue);
              }}
              onSelect={handleCategoryChange}
            />
          </View>

          <View className="mt-4 rounded-3xl bg-brand-white p-5">
            <Text className="font-atkinson-bold text-[18px] text-brand-brown">
              Harga
            </Text>

            <FieldLabel>
              {isEggProduct ? "Harga per butir" : `Harga per ${baseUnitLabel}`}
            </FieldLabel>

            <NumericInput
              value={pricePerBaseUnit}
              onChangeText={setPricePerBaseUnit}
              placeholder="Contoh: 2000"
              editable={!isSubmitting}
            />

            {isEggProduct ? (
              <>
                <FieldLabel>Harga per rak</FieldLabel>

                <NumericInput
                  value={pricePerRack}
                  onChangeText={setPricePerRack}
                  placeholder="Contoh: 55000"
                  editable={!isSubmitting}
                />

                <FieldLabel>Jumlah butir per rak</FieldLabel>

                <NumericInput
                  value={rackSize}
                  onChangeText={setRackSize}
                  placeholder={String(DEFAULT_EGG_RACK_SIZE)}
                  editable={!isSubmitting}
                  defaultValueOnEmpty={String(DEFAULT_EGG_RACK_SIZE)}
                />
              </>
            ) : null}
          </View>

          <View className="mt-4 rounded-3xl bg-brand-white p-5">
            <Text className="font-atkinson-bold text-[18px] text-brand-brown">
              Stok Awal
            </Text>

            {isEggProduct ? (
              <View className="mt-1 flex-row gap-3">
                <View className="flex-1">
                  <FieldLabel>Jumlah rak</FieldLabel>

                  <NumericInput
                    value={initialRacks}
                    onChangeText={setInitialRacks}
                    placeholder="0"
                    editable={!isSubmitting}
                    defaultValueOnEmpty="0"
                  />
                </View>

                <View className="flex-1">
                  <FieldLabel>Sisa butir</FieldLabel>

                  <NumericInput
                    value={initialPieces}
                    onChangeText={setInitialPieces}
                    placeholder="0"
                    editable={!isSubmitting}
                    defaultValueOnEmpty="0"
                  />
                </View>
              </View>
            ) : (
              <>
                <FieldLabel>Jumlah {baseUnitLabel}</FieldLabel>

                <NumericInput
                  value={initialStock}
                  onChangeText={setInitialStock}
                  placeholder="0"
                  editable={!isSubmitting}
                  defaultValueOnEmpty="0"
                />
              </>
            )}
          </View>

          <View className="mt-4 rounded-3xl bg-brand-white p-5">
            <Text className="font-atkinson-bold text-[18px] text-brand-brown">
              Batas Minimum Stok
            </Text>

            <Text className="mt-2 font-atkinson text-[13px] leading-5 text-brand-black">
              Produk akan ditandai sebagai stok rendah ketika persediaan
              mencapai batas ini.
            </Text>

            {isEggProduct ? (
              <View className="mt-1 flex-row gap-3">
                <View className="flex-1">
                  <FieldLabel>Jumlah rak</FieldLabel>

                  <NumericInput
                    value={minimumRacks}
                    onChangeText={setMinimumRacks}
                    placeholder="0"
                    editable={!isSubmitting}
                    defaultValueOnEmpty="0"
                    onFocus={scrollToLowerForm}
                  />
                </View>

                <View className="flex-1">
                  <FieldLabel>Sisa butir</FieldLabel>

                  <NumericInput
                    value={minimumPieces}
                    onChangeText={setMinimumPieces}
                    placeholder="0"
                    editable={!isSubmitting}
                    defaultValueOnEmpty="0"
                    onFocus={scrollToLowerForm}
                  />
                </View>
              </View>
            ) : (
              <>
                <FieldLabel>Jumlah {baseUnitLabel}</FieldLabel>

                <NumericInput
                  value={minimumStock}
                  onChangeText={setMinimumStock}
                  placeholder="0"
                  editable={!isSubmitting}
                  defaultValueOnEmpty="0"
                  onFocus={scrollToLowerForm}
                />
              </>
            )}
          </View>

          {errorMessage ? (
            <View className="mt-4 rounded-2xl border-2 border-brand-orange bg-brand-white p-4">
              <Text className="font-atkinson-bold text-[15px] text-brand-brown">
                Produk belum dapat disimpan
              </Text>

              <Text className="mt-2 font-atkinson text-[14px] leading-6 text-brand-black">
                {errorMessage}
              </Text>
            </View>
          ) : null}

          <Pressable
            onPress={handleSubmit}
            disabled={submitIsDisabled}
            className={`mt-5 min-h-12 items-center justify-center rounded-2xl bg-brand-orange px-5 py-3 ${
              submitIsDisabled ? "opacity-50" : ""
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
              <Text className="font-atkinson-bold text-[17px] text-brand-white">
                Simpan Produk
              </Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
