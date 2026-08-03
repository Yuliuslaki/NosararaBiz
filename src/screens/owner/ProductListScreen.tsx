import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import { useAppAlert } from "../../components/alerts/AppAlertProvider";
import { ScreenHeader } from "../../components/navigation/ScreenHeader";
import { PinConfirmationModal } from "../../components/security/PinConfirmationModal";
import { DEFAULT_EGG_RACK_SIZE } from "../../constants/app";
import { useAndroidBackButton } from "../../hooks/useAndroidBackButton";
import type { AuthenticatedUser } from "../../services/authService";
import {
  deactivateProduct,
  getProducts,
  getProductSummary,
  updateProduct,
  type ProductListItem,
  type ProductSummary,
  type UpdateProductInput,
} from "../../services/productService";
import { verifySensitiveActionPin } from "../../services/sensitiveActionService";
import {
  PRODUCT_CATEGORY_LABELS,
  PRODUCT_UNIT_LABELS,
} from "../../types/product";
import { convertEggStockToPieces, formatEggStock } from "../../utils/eggStock";
import { formatCurrency } from "../../utils/formatters";

type ProductListScreenProps = {
  user: AuthenticatedUser;
  onBack: () => void;
  onAddProduct: () => void;
  onOpenStockHistory: () => void;
};

type SummaryCardProps = {
  label: string;
  value: number;
};

type ProductCardProps = {
  product: ProductListItem;
  onEdit: (product: ProductListItem) => void;
  onDelete: (product: ProductListItem) => void;
};

type EditProductForm = {
  pricePerBaseUnit: string;
  pricePerRack: string;
  rackSize: string;
  stockRacks: string;
  stockPieces: string;
  minimumRacks: string;
  minimumPieces: string;
  currentStock: string;
  minimumStock: string;
};

type EditProductModalProps = {
  user: AuthenticatedUser;
  product: ProductListItem | null;
  disabled: boolean;
  onClose: () => void;
  onRequestSave: (input: UpdateProductInput) => void;
};

type PendingPinAction =
  | {
      type: "update";
      product: ProductListItem;
      input: UpdateProductInput;
    }
  | {
      type: "delete";
      product: ProductListItem;
    };

const EMPTY_EDIT_FORM: EditProductForm = {
  pricePerBaseUnit: "",
  pricePerRack: "",
  rackSize: String(DEFAULT_EGG_RACK_SIZE),
  stockRacks: "0",
  stockPieces: "0",
  minimumRacks: "0",
  minimumPieces: "0",
  currentStock: "0",
  minimumStock: "0",
};

function keepDigitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

function parseInteger(value: string, label: string): number {
  const normalizedValue = value.trim();

  if (normalizedValue.length === 0) {
    throw new Error(`${label} wajib diisi.`);
  }

  const parsedValue = Number(normalizedValue);

  if (!Number.isSafeInteger(parsedValue) || parsedValue < 0) {
    throw new Error(`${label} harus berupa bilangan bulat nol atau lebih.`);
  }

  return parsedValue;
}

function getInitialProducts(): ProductListItem[] {
  return getProducts();
}

function getInitialSummary(): ProductSummary {
  return getProductSummary();
}

function formatProductStock(product: ProductListItem): string {
  if (product.category === "eggs" && product.rackSize !== null) {
    return formatEggStock(product.currentStock, product.rackSize);
  }

  return `${product.currentStock} ${PRODUCT_UNIT_LABELS[product.baseUnit]}`;
}

function createEditForm(product: ProductListItem): EditProductForm {
  const rackSize = product.rackSize ?? DEFAULT_EGG_RACK_SIZE;

  if (product.category === "eggs") {
    return {
      pricePerBaseUnit: String(product.pricePerBaseUnit),
      pricePerRack: String(product.pricePerRack ?? 0),
      rackSize: String(rackSize),
      stockRacks: String(Math.floor(product.currentStock / rackSize)),
      stockPieces: String(product.currentStock % rackSize),
      minimumRacks: String(Math.floor(product.minStockThreshold / rackSize)),
      minimumPieces: String(product.minStockThreshold % rackSize),
      currentStock: "0",
      minimumStock: "0",
    };
  }

  return {
    ...EMPTY_EDIT_FORM,
    pricePerBaseUnit: String(product.pricePerBaseUnit),
    currentStock: String(product.currentStock),
    minimumStock: String(product.minStockThreshold),
  };
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

function ProductCard({ product, onEdit, onDelete }: ProductCardProps) {
  return (
    <View className="mb-4 rounded-xl border border-brand-black bg-brand-white p-5">
      <View className="flex-row items-start justify-between">
        <View className="mr-3 flex-1">
          <Text className="font-atkinson-bold text-[18px] leading-6 text-brand-black">
            {product.name}
          </Text>

          <Text className="mt-1 font-atkinson text-[14px] leading-5 text-brand-black">
            {PRODUCT_CATEGORY_LABELS[product.category]}
          </Text>
        </View>

        <View className="rounded-full bg-brand-cream px-3 py-1.5">
          <Text className="font-atkinson-bold text-[12px] text-brand-black">
            {product.isActive ? "Aktif" : "Nonaktif"}
          </Text>
        </View>
      </View>

      <View className="mt-3 rounded-xl bg-brand-cream p-3">
        <Text className="font-atkinson text-[13px] text-brand-black">
          Stok tersedia
        </Text>

        <Text className="mt-1 font-atkinson-bold text-[19px] text-brand-black">
          {formatProductStock(product)}
        </Text>

        {product.isLowStock ? (
          <Text className="mt-2 font-atkinson-bold text-[13px] leading-5 text-brand-black">
            Stok sudah mencapai batas minimum
          </Text>
        ) : null}
      </View>

      <View className="mt-3">
        {product.category === "eggs" ? (
          <>
            <Text className="font-atkinson text-[14px] leading-6 text-brand-black">
              Harga per butir: {formatCurrency(product.pricePerBaseUnit)}
            </Text>

            <Text className="font-atkinson text-[14px] leading-6 text-brand-black">
              Harga per rak:{" "}
              {product.pricePerRack === null
                ? "-"
                : formatCurrency(product.pricePerRack)}
            </Text>
          </>
        ) : (
          <Text className="font-atkinson text-[14px] leading-6 text-brand-black">
            Harga per {PRODUCT_UNIT_LABELS[product.baseUnit].toLowerCase()}:{" "}
            {formatCurrency(product.pricePerBaseUnit)}
          </Text>
        )}
      </View>

      {product.isActive ? (
        <View className="mt-4 flex-row gap-3">
          <Pressable
            onPress={() => {
              onEdit(product);
            }}
            accessibilityRole="button"
            accessibilityLabel={`Edit ${product.name}`}
            className="min-h-14 flex-1 items-center justify-center rounded-xl border border-brand-black bg-brand-white px-3 py-3"
          >
            <Text className="font-atkinson-bold text-[16px] text-brand-black">
              Edit
            </Text>
          </Pressable>

          <Pressable
            onPress={() => {
              onDelete(product);
            }}
            accessibilityRole="button"
            accessibilityLabel={`Nonaktifkan ${product.name}`}
            className="min-h-14 flex-1 items-center justify-center rounded-xl bg-brand-black px-3 py-3"
          >
            <Text className="font-atkinson-bold text-[16px] text-brand-white">
              Nonaktifkan
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

function EditNumericInput({
  value,
  onChangeText,
  placeholder,
  editable,
}: {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  editable: boolean;
}) {
  return (
    <TextInput
      value={value}
      onChangeText={(nextValue) => {
        onChangeText(keepDigitsOnly(nextValue));
      }}
      editable={editable}
      selectTextOnFocus
      keyboardType="number-pad"
      placeholder={placeholder}
      placeholderTextColor="#9A9A9A"
      selectionColor="#F4E7D3"
      cursorColor="#111111"
      className="mt-2 min-h-14 rounded-xl border border-brand-black bg-brand-white px-4 py-3 font-atkinson text-[17px] text-brand-black"
    />
  );
}

function EditProductModal({
  user,
  product,
  disabled,
  onClose,
  onRequestSave,
}: EditProductModalProps) {
  const [form, setForm] = useState<EditProductForm>(EMPTY_EDIT_FORM);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (product !== null) {
      setForm(createEditForm(product));
      setErrorMessage(null);
    }
  }, [product]);

  if (product === null) {
    return null;
  }

  const isEggProduct = product.category === "eggs";

  const unitLabel = PRODUCT_UNIT_LABELS[product.baseUnit].toLowerCase();

  function updateField(field: keyof EditProductForm, value: string): void {
    setForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));

    setErrorMessage(null);
  }

  function handleSave(): void {
    const selectedProduct = product;

    if (selectedProduct === null) {
      return;
    }

    try {
      const pricePerBaseUnit = parseInteger(
        form.pricePerBaseUnit,
        isEggProduct ? "Harga per butir" : `Harga per ${unitLabel}`,
      );

      if (isEggProduct) {
        const rackSize = parseInteger(form.rackSize, "Jumlah butir per rak");

        if (rackSize <= 0) {
          throw new Error("Jumlah butir per rak harus lebih dari nol.");
        }

        const stockRacks = parseInteger(form.stockRacks, "Stok dalam rak");

        const stockPieces = parseInteger(
          form.stockPieces,
          "Sisa stok dalam butir",
        );

        const minimumRacks = parseInteger(
          form.minimumRacks,
          "Batas minimum dalam rak",
        );

        const minimumPieces = parseInteger(
          form.minimumPieces,
          "Sisa batas minimum dalam butir",
        );

        if (stockPieces >= rackSize) {
          throw new Error(
            `Sisa stok dalam butir harus kurang dari ${rackSize}.`,
          );
        }

        if (minimumPieces >= rackSize) {
          throw new Error(
            `Sisa batas minimum dalam butir harus kurang dari ${rackSize}.`,
          );
        }

        onRequestSave({
          productId: selectedProduct.id,
          pricePerBaseUnit,
          pricePerRack: parseInteger(form.pricePerRack, "Harga per rak"),
          currentStock: convertEggStockToPieces(
            stockRacks,
            stockPieces,
            rackSize,
          ),
          minStockThreshold: convertEggStockToPieces(
            minimumRacks,
            minimumPieces,
            rackSize,
          ),
          rackSize,
          performedBy: user,
        });

        return;
      }

      onRequestSave({
        productId: selectedProduct.id,
        pricePerBaseUnit,
        pricePerRack: null,
        currentStock: parseInteger(form.currentStock, "Stok produk"),
        minStockThreshold: parseInteger(
          form.minimumStock,
          "Batas minimum stok",
        ),
        rackSize: null,
        performedBy: user,
      });
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Data produk belum valid.",
      );
    }
  }

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        className="flex-1 bg-brand-cream"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          className="flex-1"
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={
            Platform.OS === "ios" ? "interactive" : "on-drag"
          }
          contentContainerStyle={{
            paddingHorizontal: 18,
            paddingTop: 32,
            paddingBottom: 80,
          }}
        >
          <View className="w-full max-w-md self-center">
            <ScreenHeader
              title="Edit Produk"
              description="Perubahan wajib dikonfirmasi dengan PIN Owner."
              onBack={onClose}
              disabled={disabled}
            />

            <View className="mt-5 rounded-xl border border-brand-black bg-brand-white p-5">
              <Text className="font-atkinson-bold text-[18px] text-brand-black">
                {product.name}
              </Text>

              <Text className="mt-1 font-atkinson text-[14px] text-brand-black">
                {PRODUCT_CATEGORY_LABELS[product.category]}
              </Text>
            </View>

            <View className="mt-4 rounded-xl border border-brand-black bg-brand-white p-5">
              <Text className="font-atkinson-bold text-[18px] text-brand-black">
                Harga
              </Text>

              <Text className="mt-5 font-atkinson-bold text-[15px] text-brand-black">
                {isEggProduct ? "Harga per butir" : `Harga per ${unitLabel}`}
              </Text>

              <EditNumericInput
                value={form.pricePerBaseUnit}
                onChangeText={(value) => {
                  updateField("pricePerBaseUnit", value);
                }}
                placeholder="0"
                editable={!disabled}
              />

              {isEggProduct ? (
                <>
                  <Text className="mt-5 font-atkinson-bold text-[15px] text-brand-black">
                    Harga per rak
                  </Text>

                  <EditNumericInput
                    value={form.pricePerRack}
                    onChangeText={(value) => {
                      updateField("pricePerRack", value);
                    }}
                    placeholder="0"
                    editable={!disabled}
                  />

                  <Text className="mt-5 font-atkinson-bold text-[15px] text-brand-black">
                    Jumlah butir per rak
                  </Text>

                  <EditNumericInput
                    value={form.rackSize}
                    onChangeText={(value) => {
                      updateField("rackSize", value);
                    }}
                    placeholder={String(DEFAULT_EGG_RACK_SIZE)}
                    editable={!disabled}
                  />
                </>
              ) : null}
            </View>

            <View className="mt-4 rounded-xl border border-brand-black bg-brand-white p-5">
              <Text className="font-atkinson-bold text-[18px] text-brand-black">
                Stok Sekarang
              </Text>

              {isEggProduct ? (
                <View className="mt-1 flex-row gap-3">
                  <View className="flex-1">
                    <Text className="mt-5 font-atkinson-bold text-[15px] text-brand-black">
                      Jumlah rak
                    </Text>

                    <EditNumericInput
                      value={form.stockRacks}
                      onChangeText={(value) => {
                        updateField("stockRacks", value);
                      }}
                      placeholder="0"
                      editable={!disabled}
                    />
                  </View>

                  <View className="flex-1">
                    <Text className="mt-5 font-atkinson-bold text-[15px] text-brand-black">
                      Sisa butir
                    </Text>

                    <EditNumericInput
                      value={form.stockPieces}
                      onChangeText={(value) => {
                        updateField("stockPieces", value);
                      }}
                      placeholder="0"
                      editable={!disabled}
                    />
                  </View>
                </View>
              ) : (
                <>
                  <Text className="mt-5 font-atkinson-bold text-[15px] text-brand-black">
                    Jumlah {unitLabel}
                  </Text>

                  <EditNumericInput
                    value={form.currentStock}
                    onChangeText={(value) => {
                      updateField("currentStock", value);
                    }}
                    placeholder="0"
                    editable={!disabled}
                  />
                </>
              )}
            </View>

            <View className="mt-4 rounded-xl border border-brand-black bg-brand-white p-5">
              <Text className="font-atkinson-bold text-[18px] text-brand-black">
                Batas Minimum Stok
              </Text>

              {isEggProduct ? (
                <View className="mt-1 flex-row gap-3">
                  <View className="flex-1">
                    <Text className="mt-5 font-atkinson-bold text-[15px] text-brand-black">
                      Jumlah rak
                    </Text>

                    <EditNumericInput
                      value={form.minimumRacks}
                      onChangeText={(value) => {
                        updateField("minimumRacks", value);
                      }}
                      placeholder="0"
                      editable={!disabled}
                    />
                  </View>

                  <View className="flex-1">
                    <Text className="mt-5 font-atkinson-bold text-[15px] text-brand-black">
                      Sisa butir
                    </Text>

                    <EditNumericInput
                      value={form.minimumPieces}
                      onChangeText={(value) => {
                        updateField("minimumPieces", value);
                      }}
                      placeholder="0"
                      editable={!disabled}
                    />
                  </View>
                </View>
              ) : (
                <>
                  <Text className="mt-5 font-atkinson-bold text-[15px] text-brand-black">
                    Jumlah {unitLabel}
                  </Text>

                  <EditNumericInput
                    value={form.minimumStock}
                    onChangeText={(value) => {
                      updateField("minimumStock", value);
                    }}
                    placeholder="0"
                    editable={!disabled}
                  />
                </>
              )}
            </View>

            {errorMessage ? (
              <View className="mt-4 rounded-xl border border-brand-black bg-brand-white p-4">
                <Text className="font-atkinson-bold text-[15px] text-brand-black">
                  Perubahan belum dapat disimpan
                </Text>

                <Text className="mt-2 font-atkinson text-[14px] leading-6 text-brand-black">
                  {errorMessage}
                </Text>
              </View>
            ) : null}

            <View className="mt-5 flex-row gap-3">
              <Pressable
                onPress={onClose}
                disabled={disabled}
                className={`min-h-14 flex-1 items-center justify-center rounded-xl border border-brand-black bg-brand-white px-4 py-3 ${
                  disabled ? "opacity-50" : ""
                }`}
              >
                <Text className="font-atkinson-bold text-[16px] text-brand-black">
                  Batal
                </Text>
              </Pressable>

              <Pressable
                onPress={handleSave}
                disabled={disabled}
                className={`min-h-14 flex-1 items-center justify-center rounded-xl bg-brand-black px-4 py-3 ${
                  disabled ? "opacity-50" : ""
                }`}
              >
                <Text className="text-center font-atkinson-bold text-[16px] text-brand-white">
                  Simpan Perubahan
                </Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export function ProductListScreen({
  user,
  onBack,
  onAddProduct,
  onOpenStockHistory,
}: ProductListScreenProps) {
  const { showAlert } = useAppAlert();

  useAndroidBackButton(onBack);

  const [products, setProducts] =
    useState<ProductListItem[]>(getInitialProducts);

  const [summary, setSummary] = useState<ProductSummary>(getInitialSummary);

  const [editingProduct, setEditingProduct] = useState<ProductListItem | null>(
    null,
  );

  const [pendingPinAction, setPendingPinAction] =
    useState<PendingPinAction | null>(null);

  const [pinErrorMessage, setPinErrorMessage] = useState<string | null>(null);

  const [isPinSubmitting, setIsPinSubmitting] = useState(false);

  function refreshProducts(): void {
    setProducts(getProducts());
    setSummary(getProductSummary());
  }

  function handleRequestUpdate(input: UpdateProductInput): void {
    if (editingProduct === null) {
      return;
    }

    setPinErrorMessage(null);

    setPendingPinAction({
      type: "update",
      product: editingProduct,
      input,
    });
  }

  function handleRequestDelete(product: ProductListItem): void {
    setPinErrorMessage(null);

    setPendingPinAction({
      type: "delete",
      product,
    });
  }

  function handleClosePinModal(): void {
    if (isPinSubmitting) {
      return;
    }

    setPendingPinAction(null);
    setPinErrorMessage(null);
  }

  async function handleConfirmPin(pin: string): Promise<void> {
    if (pendingPinAction === null) {
      return;
    }

    setIsPinSubmitting(true);
    setPinErrorMessage(null);

    try {
      await verifySensitiveActionPin(user, pin);

      if (pendingPinAction.type === "update") {
        const productName = pendingPinAction.product.name;

        updateProduct(pendingPinAction.input);

        setPendingPinAction(null);
        setEditingProduct(null);

        refreshProducts();

        showAlert({
          tone: "success",
          title: "Produk berhasil diperbarui",
          message: `${productName} telah diperbarui. Perubahan stok juga sudah dicatat ke dalam riwayat stok.`,
          confirmText: "OK",
        });

        return;
      }

      const productName = pendingPinAction.product.name;

      deactivateProduct(pendingPinAction.product.id);

      setPendingPinAction(null);

      refreshProducts();

      showAlert({
        tone: "success",
        title: "Produk berhasil dinonaktifkan",
        message: `${productName} telah dinonaktifkan dari daftar produk. Riwayat transaksi dan stok tetap tersimpan.`,
        confirmText: "OK",
      });
    } catch (error) {
      setPinErrorMessage(
        error instanceof Error
          ? error.message
          : "Tindakan tidak dapat diproses.",
      );
    } finally {
      setIsPinSubmitting(false);
    }
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
            title="Produk dan Stok"
            description="Kelola produk, harga, dan persediaan usaha."
            onBack={onBack}
          />

          <View className="mt-5 rounded-xl border border-brand-black bg-brand-white p-4">
            <Text className="font-atkinson-bold text-[18px] text-brand-black">
              Ringkasan Produk
            </Text>

            <View className="mt-3 flex-row gap-2">
              <SummaryCard label="Semua" value={summary.totalProducts} />

              <SummaryCard label="Aktif" value={summary.activeProducts} />

              <SummaryCard
                label="Stok rendah"
                value={summary.lowStockProducts}
              />
            </View>
          </View>

          <Pressable
            onPress={onAddProduct}
            accessibilityRole="button"
            accessibilityLabel="Tambah produk"
            className="mt-4 min-h-14 items-center justify-center rounded-xl bg-brand-black px-5 py-3"
          >
            <Text className="font-atkinson-bold text-[17px] text-brand-white">
              Tambah Produk
            </Text>
          </Pressable>

          <Pressable
            onPress={onOpenStockHistory}
            accessibilityRole="button"
            accessibilityLabel="Buka riwayat stok"
            className="mt-3 min-h-14 items-center justify-center rounded-xl border border-brand-black bg-brand-white px-5 py-3"
          >
            <Text className="font-atkinson-bold text-[17px] text-brand-black">
              Riwayat Stok
            </Text>
          </Pressable>

          {products.length === 0 ? (
            <View className="mt-4 rounded-xl border border-brand-black bg-brand-white p-5">
              <Text className="text-center font-atkinson-bold text-[20px] text-brand-black">
                Belum ada produk
              </Text>

              <Text className="mt-2 text-center font-atkinson text-[15px] leading-6 text-brand-black">
                Tambahkan produk pertama agar stok dan transaksi penjualan dapat
                mulai dicatat.
              </Text>
            </View>
          ) : (
            <View className="mt-6">
              <Text className="mb-3 font-atkinson-bold text-[20px] text-brand-black">
                Daftar Produk
              </Text>

              {products.map((productItem) => (
                <ProductCard
                  key={productItem.id}
                  product={productItem}
                  onEdit={setEditingProduct}
                  onDelete={handleRequestDelete}
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      <EditProductModal
        user={user}
        product={editingProduct}
        disabled={isPinSubmitting}
        onClose={() => {
          if (!isPinSubmitting) {
            setEditingProduct(null);
          }
        }}
        onRequestSave={handleRequestUpdate}
      />

      <PinConfirmationModal
        visible={pendingPinAction !== null}
        mode={
          pendingPinAction?.type === "delete"
            ? "delete-product"
            : "update-product"
        }
        productName={pendingPinAction?.product.name ?? ""}
        errorMessage={pinErrorMessage}
        isSubmitting={isPinSubmitting}
        onConfirm={(pin) => {
          void handleConfirmPin(pin);
        }}
        onCancel={handleClosePinModal}
        onPinChanged={() => {
          setPinErrorMessage(null);
        }}
      />
    </>
  );
}
