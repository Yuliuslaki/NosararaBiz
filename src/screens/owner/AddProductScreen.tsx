import { type ReactNode, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  type LayoutChangeEvent,
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

type FormSectionKey = "category" | "price" | "initialStock" | "minimumStock";

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
      placeholderTextColor="#666666"
      keyboardType="number-pad"
      selectionColor="#F4E7D3"
      cursorColor="#111111"
      style={{
        color: isDefaultValue ? "rgba(17, 17, 17, 0.45)" : "#111111",
      }}
      className={`mt-2 min-h-14 rounded-xl border border-brand-black bg-brand-white px-4 py-3 font-atkinson text-[17px] ${
        editable ? "" : "opacity-50"
      }`}
    />
  );
}

function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <Text className="mt-5 font-atkinson-bold text-[17px] leading-5 text-brand-black">
      {children}
    </Text>
  );
}

function NavigationArrow() {
  return (
    <View
      className="ml-4 h-10 w-8 items-center justify-center"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Text
        className="font-atkinson-bold text-[34px] text-brand-black"
        style={{
          lineHeight: 36,
          includeFontPadding: false,
          textAlign: "center",
          textAlignVertical: "center",
        }}
      >
        ›
      </Text>
    </View>
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
    <View className="mt-4">
      <Pressable
        onPress={onToggle}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel="Pilih kategori produk"
        accessibilityState={{
          expanded: isOpen,
          disabled,
        }}
        className={`min-h-[64px] flex-row items-center rounded-xl border border-brand-black bg-brand-cream px-4 py-3 ${
          disabled ? "opacity-50" : ""
        }`}
      >
        <View className="flex-1">
          <Text className="font-atkinson-bold text-[17px] leading-5 text-brand-black">
            {PRODUCT_CATEGORY_LABELS[value]}
          </Text>

          <Text className="mt-1 font-atkinson text-[14px] leading-5 text-brand-black">
            {CATEGORY_DESCRIPTIONS[value]}
          </Text>
        </View>

        <NavigationArrow />
      </Pressable>

      {isOpen ? (
        <View className="mt-2 overflow-hidden rounded-xl border border-brand-black bg-brand-white">
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
                accessibilityRole="button"
                accessibilityLabel={`Pilih ${PRODUCT_CATEGORY_LABELS[categoryOption]}`}
                accessibilityState={{
                  selected: isSelected,
                  disabled,
                }}
                className={`min-h-[68px] justify-center px-4 py-4 ${
                  !isLastOption ? "border-b border-brand-black" : ""
                } ${isSelected ? "bg-brand-cream" : "bg-brand-white"}`}
              >
                <Text className="font-atkinson-bold text-[16px] leading-5 text-brand-black">
                  {PRODUCT_CATEGORY_LABELS[categoryOption]}
                </Text>

                <Text className="mt-1 font-atkinson text-[14px] leading-5 text-brand-black">
                  {CATEGORY_DESCRIPTIONS[categoryOption]}
                </Text>
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

  const sectionPositionsRef = useRef<Record<FormSectionKey, number>>({
    category: 0,
    price: 0,
    initialStock: 0,
    minimumStock: 0,
  });

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

  function saveSectionPosition(
    section: FormSectionKey,
    event: LayoutChangeEvent,
  ): void {
    sectionPositionsRef.current[section] = event.nativeEvent.layout.y;
  }

  function scrollToSection(section: FormSectionKey): void {
    const delay = Platform.OS === "android" ? 300 : 180;

    setTimeout(() => {
      const sectionY = sectionPositionsRef.current[section];

      scrollViewRef.current?.scrollTo({
        y: Math.max(sectionY - 16, 0),
        animated: true,
      });
    }, delay);
  }

  function scrollToLowerForm(): void {
    setTimeout(
      () => {
        scrollViewRef.current?.scrollToEnd({
          animated: true,
        });
      },
      Platform.OS === "android" ? 300 : 180,
    );
  }

  function handleCategoryToggle(): void {
    scrollToSection("category");

    setIsCategorySelectOpen((currentValue) => !currentValue);
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
        title: "Produk Berhasil Disimpan",
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
        automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
        contentContainerStyle={{
          paddingHorizontal: 18,
          paddingTop: 32,
          paddingBottom: 220,
        }}
      >
        <View className="w-full max-w-md self-center">
          <ScreenHeader
            title="Tambah Produk"
            description="Pilih kategori, masukkan harga, dan tentukan stok awal."
            onBack={onBack}
            disabled={isSubmitting}
          />

          <View
            onLayout={(event) => {
              saveSectionPosition("category", event);
            }}
            className="mt-5 rounded-xl border border-brand-black bg-brand-white p-5"
          >
            <Text className="font-atkinson-bold text-[21px] text-brand-black">
              1. Kategori Produk
            </Text>

            <Text className="mt-2 font-atkinson text-[15px] leading-6 text-brand-black">
              Nama produk akan dibuat otomatis berdasarkan kategori yang
              dipilih.
            </Text>

            <CategorySelect
              value={category}
              isOpen={isCategorySelectOpen}
              disabled={isSubmitting}
              onToggle={handleCategoryToggle}
              onSelect={handleCategoryChange}
            />
          </View>

          <View
            onLayout={(event) => {
              saveSectionPosition("price", event);
            }}
            className="mt-4 rounded-xl border border-brand-black bg-brand-white p-5"
          >
            <Text className="font-atkinson-bold text-[21px] text-brand-black">
              2. Harga Jual
            </Text>

            <FieldLabel>
              {isEggProduct ? "Harga per butir" : `Harga per ${baseUnitLabel}`}
            </FieldLabel>

            <NumericInput
              value={pricePerBaseUnit}
              onChangeText={setPricePerBaseUnit}
              placeholder="Contoh: 2000"
              editable={!isSubmitting}
              onFocus={() => {
                scrollToSection("price");
              }}
            />

            {isEggProduct ? (
              <>
                <FieldLabel>Harga per rak</FieldLabel>

                <NumericInput
                  value={pricePerRack}
                  onChangeText={setPricePerRack}
                  placeholder="Contoh: 55000"
                  editable={!isSubmitting}
                  onFocus={() => {
                    scrollToSection("price");
                  }}
                />

                <FieldLabel>Jumlah butir per rak</FieldLabel>

                <NumericInput
                  value={rackSize}
                  onChangeText={setRackSize}
                  placeholder={String(DEFAULT_EGG_RACK_SIZE)}
                  editable={!isSubmitting}
                  defaultValueOnEmpty={String(DEFAULT_EGG_RACK_SIZE)}
                  onFocus={() => {
                    scrollToSection("price");
                  }}
                />

                <View className="mt-4 rounded-xl border border-brand-black bg-brand-cream p-4">
                  <Text className="font-atkinson text-[14px] leading-5 text-brand-black">
                    Satu rak secara otomatis berisi {rackSize || "0"} butir
                    telur.
                  </Text>
                </View>
              </>
            ) : null}
          </View>

          <View
            onLayout={(event) => {
              saveSectionPosition("initialStock", event);
            }}
            className="mt-4 rounded-xl border border-brand-black bg-brand-white p-5"
          >
            <Text className="font-atkinson-bold text-[21px] text-brand-black">
              3. Stok Awal
            </Text>

            <Text className="mt-2 font-atkinson text-[15px] leading-6 text-brand-black">
              Masukkan jumlah persediaan yang tersedia saat produk dibuat.
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
                    onFocus={() => {
                      scrollToSection("initialStock");
                    }}
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
                    onFocus={() => {
                      scrollToSection("initialStock");
                    }}
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
                  onFocus={() => {
                    scrollToSection("initialStock");
                  }}
                />
              </>
            )}
          </View>

          <View
            onLayout={(event) => {
              saveSectionPosition("minimumStock", event);
            }}
            className="mt-4 rounded-xl border border-brand-black bg-brand-white p-5"
          >
            <Text className="font-atkinson-bold text-[21px] text-brand-black">
              4. Batas Minimum Stok
            </Text>

            <Text className="mt-2 font-atkinson text-[15px] leading-6 text-brand-black">
              Produk akan diberi tanda stok rendah ketika persediaan mencapai
              batas ini.
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
                    onFocus={() => {
                      scrollToSection("minimumStock");
                    }}
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
                    onFocus={() => {
                      scrollToSection("minimumStock");
                    }}
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
                  onFocus={() => {
                    scrollToSection("minimumStock");
                  }}
                />
              </>
            )}
          </View>

          {errorMessage ? (
            <View className="mt-4 rounded-xl border border-brand-black bg-brand-cream p-4">
              <Text className="font-atkinson-bold text-[17px] text-brand-black">
                Produk Belum Dapat Disimpan
              </Text>

              <Text className="mt-2 font-atkinson text-[15px] leading-6 text-brand-black">
                {errorMessage}
              </Text>
            </View>
          ) : null}

          <Pressable
            onPress={handleSubmit}
            disabled={submitIsDisabled}
            accessibilityRole="button"
            accessibilityLabel="Simpan produk"
            accessibilityState={{
              disabled: submitIsDisabled,
            }}
            className={`mt-5 min-h-14 items-center justify-center rounded-xl bg-brand-black px-5 py-4 ${
              submitIsDisabled ? "opacity-40" : ""
            }`}
          >
            {isSubmitting ? (
              <View className="flex-row items-center">
                <ActivityIndicator color="#FFFFFF" />

                <Text className="ml-3 font-atkinson-bold text-[18px] text-brand-white">
                  Menyimpan...
                </Text>
              </View>
            ) : (
              <Text className="font-atkinson-bold text-[18px] text-brand-white">
                Simpan Produk
              </Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
