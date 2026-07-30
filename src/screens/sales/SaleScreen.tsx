import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
  getProducts,
  type ProductListItem,
} from "../../services/productService";
import {
  createSaleTransaction,
  type SalePaymentMethod,
} from "../../services/salesService";
import {
  PRODUCT_UNIT_LABELS,
  type ProductCategory,
  type ProductUnit,
} from "../../types/product";
import { formatEggStock } from "../../utils/eggStock";
import { formatCurrency } from "../../utils/formatters";

type SaleScreenProps = {
  user: AuthenticatedUser;
  onBack: () => void;
};

type SaleOption = {
  saleUnit: ProductUnit;
  unitPrice: number;
  quantityInBaseUnit: number;
};

type SaleCartItem = {
  productId: string;
  productName: string;
  productCategory: ProductCategory;
  saleUnit: ProductUnit;
  quantity: number;
  unitPrice: number;
  quantityInBaseUnitPerItem: number;
  rackSize: number | null;
};

type ProductSaleCardProps = {
  product: ProductListItem;
  requiredStock: number;
  disabled: boolean;
  onAdd: (
    product: ProductListItem,
    option: SaleOption,
  ) => void;
};

type CartItemCardProps = {
  item: SaleCartItem;
  maximumQuantity: number;
  disabled: boolean;
  onQuantityChange: (
    quantity: number,
  ) => void;
  onQuantityFocus: (
    pageY: number,
  ) => void;
  onRemove: () => void;
};

function keepDigitsOnly(
  value: string,
): string {
  return value.replace(/\D/g, "");
}

function getSaleOptions(
  product: ProductListItem,
): SaleOption[] {
  if (product.category === "eggs") {
    const options: SaleOption[] = [];

    if (
      product.pricePerRack !== null &&
      product.rackSize !== null &&
      product.rackSize > 0
    ) {
      options.push({
        saleUnit: "rack",
        unitPrice:
          product.pricePerRack,
        quantityInBaseUnit:
          product.rackSize,
      });
    }

    options.push({
      saleUnit: "piece",
      unitPrice:
        product.pricePerBaseUnit,
      quantityInBaseUnit: 1,
    });

    return options;
  }

  return [
    {
      saleUnit: product.baseUnit,
      unitPrice:
        product.pricePerBaseUnit,
      quantityInBaseUnit: 1,
    },
  ];
}

function formatStock(
  product: ProductListItem,
  stock: number,
): string {
  if (
    product.category === "eggs" &&
    product.rackSize !== null &&
    product.rackSize > 0
  ) {
    return formatEggStock(
      stock,
      product.rackSize,
    );
  }

  const unitLabel =
    PRODUCT_UNIT_LABELS[
      product.baseUnit
    ].toLowerCase();

  return `${stock} ${unitLabel}`;
}

function getCartItemSubtotal(
  item: SaleCartItem,
): number {
  return (
    item.quantity *
    item.unitPrice
  );
}

function getRequiredStockForProduct(
  cartItems: SaleCartItem[],
  productId: string,
): number {
  return cartItems
    .filter(
      (item) =>
        item.productId ===
        productId,
    )
    .reduce(
      (total, item) =>
        total +
        item.quantity *
          item.quantityInBaseUnitPerItem,
      0,
    );
}

function getMaximumQuantityForCartItem(
  item: SaleCartItem,
  product: ProductListItem,
  cartItems: SaleCartItem[],
): number {
  const requiredStockForProduct =
    getRequiredStockForProduct(
      cartItems,
      item.productId,
    );

  const currentItemStock =
    item.quantity *
    item.quantityInBaseUnitPerItem;

  const stockUsedByOtherUnits =
    requiredStockForProduct -
    currentItemStock;

  const availableStockForItem =
    product.currentStock -
    stockUsedByOtherUnits;

  const maximumQuantity =
    Math.floor(
      availableStockForItem /
        item.quantityInBaseUnitPerItem,
    );

  return Math.max(
    maximumQuantity,
    1,
  );
}

function ProductSaleCard({
  product,
  requiredStock,
  disabled,
  onAdd,
}: ProductSaleCardProps) {
  const options =
    getSaleOptions(product);

  const remainingStock =
    Math.max(
      product.currentStock -
        requiredStock,
      0,
    );

  const stockIsEmpty =
    remainingStock <= 0;

  return (
    <View className="mb-4 rounded-3xl border-2 border-brand-yellow bg-brand-white p-4">
      <View className="flex-row items-start justify-between">
        <View className="mr-3 flex-1">
          <Text className="font-atkinson-bold text-[18px] leading-6 text-brand-brown">
            {product.name}
          </Text>

          <Text className="mt-1 font-atkinson text-[14px] leading-5 text-brand-black">
            Stok tersedia:{" "}
            {formatStock(
              product,
              remainingStock,
            )}
          </Text>
        </View>

        <View
          className={`rounded-full px-3 py-1.5 ${
            stockIsEmpty
              ? "bg-gray-200"
              : "bg-brand-cream"
          }`}
        >
          <Text className="font-atkinson-bold text-[12px] text-brand-brown">
            {stockIsEmpty
              ? "Habis"
              : "Tersedia"}
          </Text>
        </View>
      </View>

      <View className="mt-4 gap-3">
        {options.map((option) => {
          const canAdd =
            remainingStock >=
            option.quantityInBaseUnit;

          const unitLabel =
            PRODUCT_UNIT_LABELS[
              option.saleUnit
            ];

          return (
            <Pressable
              key={option.saleUnit}
              onPress={() => {
                onAdd(
                  product,
                  option,
                );
              }}
              disabled={
                disabled || !canAdd
              }
              accessibilityRole="button"
              accessibilityLabel={`Tambah satu ${unitLabel.toLowerCase()} ${product.name}`}
              className={`min-h-12 flex-row items-center justify-between rounded-2xl border-2 border-brand-orange bg-brand-white px-4 py-3 ${
                disabled || !canAdd
                  ? "opacity-40"
                  : ""
              }`}
            >
              <Text className="font-atkinson-bold text-[15px] text-brand-orange">
                + 1 {unitLabel}
              </Text>

              <Text className="font-atkinson-bold text-[15px] text-brand-brown">
                {formatCurrency(
                  option.unitPrice,
                )}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function CartItemCard({
  item,
  maximumQuantity,
  disabled,
  onQuantityChange,
  onQuantityFocus,
  onRemove,
}: CartItemCardProps) {
  const quantityInputRef =
    useRef<TextInput>(null);

  const [
    quantityText,
    setQuantityText,
  ] = useState(
    String(item.quantity),
  );

  const parsedQuantity =
    quantityText.length === 0
      ? 0
      : Number(quantityText);

  const quantityIsAboveMaximum =
    Number.isSafeInteger(
      parsedQuantity,
    ) &&
    parsedQuantity >
      maximumQuantity;

  const unitLabel =
    PRODUCT_UNIT_LABELS[
      item.saleUnit
    ];

  useEffect(() => {
    setQuantityText(
      String(item.quantity),
    );
  }, [item.quantity]);

  function handleQuantityFocus(): void {
    setTimeout(() => {
      quantityInputRef.current?.measure(
        (
          _x,
          _y,
          _width,
          _height,
          _pageX,
          pageY,
        ) => {
          onQuantityFocus(pageY);
        },
      );
    }, 250);
  }

  function handleQuantityTextChange(
    value: string,
  ): void {
    const digits =
      keepDigitsOnly(value);

    setQuantityText(digits);

    if (digits.length === 0) {
      return;
    }

    const nextQuantity =
      Number(digits);

    if (
      !Number.isSafeInteger(
        nextQuantity,
      ) ||
      nextQuantity <= 0 ||
      nextQuantity >
        maximumQuantity
    ) {
      return;
    }

    onQuantityChange(
      nextQuantity,
    );
  }

  function handleQuantityBlur(): void {
    if (
      quantityText.length === 0 ||
      !Number.isSafeInteger(
        parsedQuantity,
      ) ||
      parsedQuantity <= 0
    ) {
      setQuantityText(
        String(item.quantity),
      );

      return;
    }

    if (
      parsedQuantity >
      maximumQuantity
    ) {
      setQuantityText(
        String(maximumQuantity),
      );

      onQuantityChange(
        maximumQuantity,
      );

      return;
    }

    const normalizedQuantity =
      Math.floor(parsedQuantity);

    setQuantityText(
      String(normalizedQuantity),
    );

    onQuantityChange(
      normalizedQuantity,
    );
  }

  return (
    <View className="mb-3 rounded-2xl border-2 border-brand-yellow bg-brand-white p-4">
      <View className="flex-row items-start justify-between">
        <View className="mr-3 flex-1">
          <Text className="font-atkinson-bold text-[17px] leading-6 text-brand-brown">
            {item.productName}
          </Text>

          <Text className="mt-1 font-atkinson text-[14px] leading-5 text-brand-black">
            {formatCurrency(
              item.unitPrice,
            )}{" "}
            per{" "}
            {unitLabel.toLowerCase()}
          </Text>
        </View>

        <Pressable
          onPress={onRemove}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityLabel={`Hapus ${item.productName} dari keranjang`}
          className={`rounded-xl border-2 border-brand-brown px-3 py-2 ${
            disabled
              ? "opacity-40"
              : ""
          }`}
        >
          <Text className="font-atkinson-bold text-[13px] text-brand-brown">
            Hapus
          </Text>
        </Pressable>
      </View>

      <View className="mt-4 rounded-2xl bg-brand-cream p-4">
        <Text className="font-atkinson-bold text-[14px] text-brand-brown">
          Jumlah pembelian
        </Text>

        <View className="mt-2 flex-row items-center">
          <TextInput
            ref={quantityInputRef}
            value={quantityText}
            onChangeText={
              handleQuantityTextChange
            }
            onFocus={
              handleQuantityFocus
            }
            onBlur={
              handleQuantityBlur
            }
            editable={!disabled}
            selectTextOnFocus
            keyboardType="number-pad"
            maxLength={9}
            placeholder="1"
            placeholderTextColor="#9A9A9A"
            selectionColor="#EC6426"
            accessibilityLabel={`Jumlah pembelian ${item.productName}`}
            className={`min-h-12 flex-1 rounded-2xl border-2 bg-brand-white px-4 py-3 font-atkinson-bold text-[18px] text-brand-brown ${
              quantityIsAboveMaximum
                ? "border-brand-brown"
                : "border-brand-orange"
            }`}
          />

          <View className="ml-3 min-w-[72px]">
            <Text className="font-atkinson-bold text-[16px] text-brand-brown">
              {unitLabel}
            </Text>
          </View>
        </View>

        {quantityIsAboveMaximum ? (
          <Text className="mt-2 font-atkinson-bold text-[13px] leading-5 text-brand-brown">
            Jumlah maksimal adalah{" "}
            {maximumQuantity}{" "}
            {unitLabel.toLowerCase()}.
          </Text>
        ) : (
          <Text className="mt-2 font-atkinson text-[13px] leading-5 text-brand-black">
            Maksimal{" "}
            {maximumQuantity}{" "}
            {unitLabel.toLowerCase()}{" "}
            sesuai stok tersedia.
          </Text>
        )}
      </View>

      <View className="mt-3 flex-row items-center justify-between rounded-2xl border border-brand-yellow bg-brand-white px-4 py-3">
        <Text className="font-atkinson-bold text-[14px] text-brand-brown">
          Subtotal
        </Text>

        <Text className="font-atkinson-bold text-[18px] text-brand-orange">
          {formatCurrency(
            getCartItemSubtotal(
              item,
            ),
          )}
        </Text>
      </View>
    </View>
  );
}

export function SaleScreen({
  user,
  onBack,
}: SaleScreenProps) {
  const { showAlert } =
    useAppAlert();

  const scrollViewRef =
    useRef<ScrollView>(null);

  const scrollOffsetYRef =
    useRef(0);

  const paymentInputRef =
    useRef<TextInput>(null);

  const [
    products,
    setProducts,
  ] = useState<ProductListItem[]>(
    [],
  );

  const [
    cartItems,
    setCartItems,
  ] = useState<SaleCartItem[]>(
    [],
  );

  const [
    paymentMethod,
    setPaymentMethod,
  ] =
    useState<SalePaymentMethod>(
      "cash",
    );

  const [
    amountPaid,
    setAmountPaid,
  ] = useState("");

  const [
    errorMessage,
    setErrorMessage,
  ] = useState<string | null>(
    null,
  );

  const [
    isSubmitting,
    setIsSubmitting,
  ] = useState(false);

  const activeProducts =
    useMemo(
      () =>
        products.filter(
          (product) =>
            product.isActive,
        ),
      [products],
    );

  const totalAmount =
    useMemo(
      () =>
        cartItems.reduce(
          (total, item) =>
            total +
            getCartItemSubtotal(
              item,
            ),
          0,
        ),
      [cartItems],
    );

  const parsedAmountPaid =
    amountPaid.length === 0
      ? 0
      : Number(amountPaid);

  const changePreview =
    paymentMethod === "cash" &&
    Number.isSafeInteger(
      parsedAmountPaid,
    ) &&
    parsedAmountPaid >=
      totalAmount
      ? parsedAmountPaid -
        totalAmount
      : 0;

  useEffect(() => {
    try {
      setProducts(
        getProducts(),
      );

      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Daftar produk tidak dapat dimuat.",
      );
    }
  }, []);

  function scrollFocusedInputIntoView(
    pageY: number,
  ): void {
    const preferredInputPosition =
      Platform.OS === "android"
        ? 150
        : 180;

    const requiredMovement =
      pageY -
      preferredInputPosition;

    if (requiredMovement <= 0) {
      return;
    }

    const nextScrollPosition =
      Math.max(
        scrollOffsetYRef.current +
          requiredMovement,
        0,
      );

    scrollViewRef.current?.scrollTo({
      y: nextScrollPosition,
      animated: true,
    });
  }

  function handlePaymentInputFocus(): void {
    setTimeout(() => {
      paymentInputRef.current?.measure(
        (
          _x,
          _y,
          _width,
          _height,
          _pageX,
          pageY,
        ) => {
          scrollFocusedInputIntoView(
            pageY,
          );
        },
      );
    }, 250);
  }

  function handleBack(): void {
    if (isSubmitting) {
      return;
    }

    if (cartItems.length === 0) {
      onBack();

      return;
    }

    showAlert({
      tone: "warning",
      title:
        "Batalkan transaksi?",
      message:
        "Produk yang sudah dipilih akan dikeluarkan dari keranjang.",
      confirmText:
        "Batalkan Transaksi",
      cancelText: "Lanjutkan",
      onConfirm: onBack,
    });
  }

  useAndroidBackButton(
    handleBack,
  );

  function addProductToCart(
    product: ProductListItem,
    option: SaleOption,
  ): void {
    const requiredStock =
      getRequiredStockForProduct(
        cartItems,
        product.id,
      );

    const nextRequiredStock =
      requiredStock +
      option.quantityInBaseUnit;

    if (
      nextRequiredStock >
      product.currentStock
    ) {
      showAlert({
        tone: "warning",
        title:
          "Stok tidak mencukupi",
        message: `Sisa stok ${product.name} hanya ${formatStock(
          product,
          Math.max(
            product.currentStock -
              requiredStock,
            0,
          ),
        )}.`,
        confirmText: "OK",
      });

      return;
    }

    setCartItems(
      (currentItems) => {
        const itemIndex =
          currentItems.findIndex(
            (item) =>
              item.productId ===
                product.id &&
              item.saleUnit ===
                option.saleUnit,
          );

        if (itemIndex < 0) {
          return [
            ...currentItems,
            {
              productId:
                product.id,
              productName:
                product.name,
              productCategory:
                product.category,
              saleUnit:
                option.saleUnit,
              quantity: 1,
              unitPrice:
                option.unitPrice,
              quantityInBaseUnitPerItem:
                option.quantityInBaseUnit,
              rackSize:
                product.rackSize,
            },
          ];
        }

        return currentItems.map(
          (item, index) =>
            index === itemIndex
              ? {
                  ...item,
                  quantity:
                    item.quantity +
                    1,
                }
              : item,
        );
      },
    );

    setErrorMessage(null);
  }

  function changeCartItemQuantity(
    selectedItem: SaleCartItem,
    quantity: number,
  ): void {
    if (
      !Number.isSafeInteger(
        quantity,
      ) ||
      quantity <= 0
    ) {
      return;
    }

    const product =
      products.find(
        (productItem) =>
          productItem.id ===
          selectedItem.productId,
      );

    if (!product) {
      setErrorMessage(
        "Produk tidak ditemukan.",
      );

      return;
    }

    const requiredStockForProduct =
      getRequiredStockForProduct(
        cartItems,
        selectedItem.productId,
      );

    const selectedItemStock =
      selectedItem.quantity *
      selectedItem.quantityInBaseUnitPerItem;

    const stockUsedByOtherUnits =
      requiredStockForProduct -
      selectedItemStock;

    const nextRequiredStock =
      stockUsedByOtherUnits +
      quantity *
        selectedItem.quantityInBaseUnitPerItem;

    if (
      nextRequiredStock >
      product.currentStock
    ) {
      setErrorMessage(
        `Jumlah ${selectedItem.productName} melebihi stok yang tersedia.`,
      );

      return;
    }

    setCartItems(
      (currentItems) =>
        currentItems.map((item) => {
          const isSelected =
            item.productId ===
              selectedItem.productId &&
            item.saleUnit ===
              selectedItem.saleUnit;

          if (!isSelected) {
            return item;
          }

          return {
            ...item,
            quantity,
          };
        }),
    );

    setErrorMessage(null);
  }

  function removeCartItem(
    selectedItem: SaleCartItem,
  ): void {
    setCartItems(
      (currentItems) =>
        currentItems.filter(
          (item) =>
            !(
              item.productId ===
                selectedItem.productId &&
              item.saleUnit ===
                selectedItem.saleUnit
            ),
        ),
    );

    setErrorMessage(null);
  }

  function handlePaymentMethodChange(
    nextPaymentMethod: SalePaymentMethod,
  ): void {
    if (isSubmitting) {
      return;
    }

    setPaymentMethod(
      nextPaymentMethod,
    );

    setAmountPaid("");
    setErrorMessage(null);
  }

  function handleSubmit(): void {
    if (isSubmitting) {
      return;
    }

    setErrorMessage(null);

    if (cartItems.length === 0) {
      setErrorMessage(
        "Pilih minimal satu produk sebelum menyimpan transaksi.",
      );

      return;
    }

    if (totalAmount <= 0) {
      setErrorMessage(
        "Total transaksi harus lebih dari nol.",
      );

      return;
    }

    let finalAmountPaid =
      totalAmount;

    if (
      paymentMethod === "cash"
    ) {
      if (
        amountPaid.trim().length ===
        0
      ) {
        setErrorMessage(
          "Jumlah uang yang diterima wajib diisi.",
        );

        return;
      }

      if (
        !Number.isSafeInteger(
          parsedAmountPaid,
        ) ||
        parsedAmountPaid < 0
      ) {
        setErrorMessage(
          "Jumlah uang yang diterima tidak valid.",
        );

        return;
      }

      if (
        parsedAmountPaid <
        totalAmount
      ) {
        setErrorMessage(
          "Jumlah uang yang diterima belum mencukupi total transaksi.",
        );

        return;
      }

      finalAmountPaid =
        parsedAmountPaid;
    }

    setIsSubmitting(true);

    try {
      const createdTransaction =
        createSaleTransaction({
          paymentMethod,
          amountPaid:
            finalAmountPaid,
          items: cartItems.map(
            (item) => ({
              productId:
                item.productId,
              saleUnit:
                item.saleUnit,
              quantity:
                item.quantity,
            }),
          ),
          performedBy: user,
        });

      setProducts(
        getProducts(),
      );

      setCartItems([]);
      setAmountPaid("");
      setPaymentMethod("cash");
      setErrorMessage(null);

      const paymentLabel =
        createdTransaction.paymentMethod ===
        "cash"
          ? "Tunai"
          : "QRIS";

      const changeMessage =
        createdTransaction.changeAmount >
        0
          ? `\nKembalian: ${formatCurrency(
              createdTransaction.changeAmount,
            )}`
          : "";

      showAlert({
        tone: "success",
        title:
          "Transaksi berhasil",
        message: `${createdTransaction.transactionNumber}\nMetode: ${paymentLabel}\nTotal: ${formatCurrency(
          createdTransaction.totalAmount,
        )}${changeMessage}`,
        confirmText: "Selesai",
        dismissible: false,
      });
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Transaksi gagal disimpan.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-brand-cream"
      behavior={
        Platform.OS === "ios"
          ? "padding"
          : "height"
      }
      keyboardVerticalOffset={
        Platform.OS === "ios"
          ? 16
          : 0
      }
    >
      <ScrollView
        ref={scrollViewRef}
        className="flex-1"
        onScroll={(event) => {
          scrollOffsetYRef.current =
            event.nativeEvent.contentOffset.y;
        }}
        scrollEventThrottle={16}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={
          Platform.OS === "ios"
            ? "interactive"
            : "on-drag"
        }
        contentContainerStyle={{
          paddingHorizontal: 18,
          paddingTop: 32,
          paddingBottom: 180,
        }}
      >
        <View className="w-full max-w-md self-center">
          <ScreenHeader
            title="Transaksi Penjualan"
            description="Pilih produk, jumlah, dan metode pembayaran."
            onBack={handleBack}
            disabled={isSubmitting}
          />

          <View className="mt-5 rounded-3xl bg-brand-white p-4">
            <Text className="font-atkinson-bold text-[19px] text-brand-brown">
              Pilih Produk
            </Text>

            <Text className="mt-2 font-atkinson text-[14px] leading-5 text-brand-black">
              Tekan satuan produk untuk
              memasukkannya ke dalam
              keranjang.
            </Text>
          </View>

          <View className="mt-4">
            {activeProducts.length ===
            0 ? (
              <View className="rounded-3xl border-2 border-brand-yellow bg-brand-white p-5">
                <Text className="text-center font-atkinson-bold text-[19px] text-brand-brown">
                  Belum ada produk aktif
                </Text>

                <Text className="mt-2 text-center font-atkinson text-[14px] leading-6 text-brand-black">
                  Tambahkan produk terlebih
                  dahulu melalui menu Produk
                  dan Stok.
                </Text>
              </View>
            ) : (
              activeProducts.map(
                (product) => (
                  <ProductSaleCard
                    key={product.id}
                    product={product}
                    requiredStock={getRequiredStockForProduct(
                      cartItems,
                      product.id,
                    )}
                    disabled={
                      isSubmitting
                    }
                    onAdd={
                      addProductToCart
                    }
                  />
                ),
              )
            )}
          </View>

          <View className="mt-2 rounded-3xl bg-brand-white p-4">
            <Text className="font-atkinson-bold text-[19px] text-brand-brown">
              Keranjang
            </Text>

            {cartItems.length === 0 ? (
              <View className="mt-3 rounded-2xl bg-brand-cream p-4">
                <Text className="text-center font-atkinson text-[14px] leading-6 text-brand-black">
                  Belum ada produk yang
                  dipilih.
                </Text>
              </View>
            ) : (
              <View className="mt-4">
                {cartItems.map(
                  (item) => {
                    const product =
                      products.find(
                        (
                          productItem,
                        ) =>
                          productItem.id ===
                          item.productId,
                      );

                    const maximumQuantity =
                      product === undefined
                        ? item.quantity
                        : getMaximumQuantityForCartItem(
                            item,
                            product,
                            cartItems,
                          );

                    return (
                      <CartItemCard
                        key={`${item.productId}:${item.saleUnit}`}
                        item={item}
                        maximumQuantity={
                          maximumQuantity
                        }
                        disabled={
                          isSubmitting
                        }
                        onQuantityFocus={
                          scrollFocusedInputIntoView
                        }
                        onQuantityChange={(
                          quantity,
                        ) => {
                          changeCartItemQuantity(
                            item,
                            quantity,
                          );
                        }}
                        onRemove={() => {
                          removeCartItem(
                            item,
                          );
                        }}
                      />
                    );
                  },
                )}
              </View>
            )}

            <View className="mt-3 flex-row items-center justify-between rounded-2xl bg-brand-cream p-4">
              <Text className="font-atkinson-bold text-[17px] text-brand-brown">
                Total
              </Text>

              <Text className="font-atkinson-bold text-[21px] text-brand-orange">
                {formatCurrency(
                  totalAmount,
                )}
              </Text>
            </View>
          </View>

          <View className="mt-4 rounded-3xl bg-brand-white p-4">
            <Text className="font-atkinson-bold text-[19px] text-brand-brown">
              Metode Pembayaran
            </Text>

            <View className="mt-4 flex-row gap-3">
              <Pressable
                onPress={() => {
                  handlePaymentMethodChange(
                    "cash",
                  );
                }}
                disabled={isSubmitting}
                accessibilityRole="button"
                accessibilityState={{
                  selected:
                    paymentMethod ===
                    "cash",
                  disabled:
                    isSubmitting,
                }}
                className={`min-h-12 flex-1 items-center justify-center rounded-2xl border-2 px-4 py-3 ${
                  paymentMethod ===
                  "cash"
                    ? "border-brand-orange bg-brand-cream"
                    : "border-brand-yellow bg-brand-white"
                } ${
                  isSubmitting
                    ? "opacity-40"
                    : ""
                }`}
              >
                <Text
                  className={`font-atkinson-bold text-[16px] ${
                    paymentMethod ===
                    "cash"
                      ? "text-brand-orange"
                      : "text-brand-brown"
                  }`}
                >
                  Tunai
                </Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  handlePaymentMethodChange(
                    "qris",
                  );
                }}
                disabled={isSubmitting}
                accessibilityRole="button"
                accessibilityState={{
                  selected:
                    paymentMethod ===
                    "qris",
                  disabled:
                    isSubmitting,
                }}
                className={`min-h-12 flex-1 items-center justify-center rounded-2xl border-2 px-4 py-3 ${
                  paymentMethod ===
                  "qris"
                    ? "border-brand-orange bg-brand-cream"
                    : "border-brand-yellow bg-brand-white"
                } ${
                  isSubmitting
                    ? "opacity-40"
                    : ""
                }`}
              >
                <Text
                  className={`font-atkinson-bold text-[16px] ${
                    paymentMethod ===
                    "qris"
                      ? "text-brand-orange"
                      : "text-brand-brown"
                  }`}
                >
                  QRIS
                </Text>
              </Pressable>
            </View>

            {paymentMethod === "cash" ? (
              <>
                <Text className="mt-5 font-atkinson-bold text-[15px] text-brand-brown">
                  Uang diterima
                </Text>

                <TextInput
                  ref={paymentInputRef}
                  value={amountPaid}
                  onChangeText={(
                    value,
                  ) => {
                    setAmountPaid(
                      keepDigitsOnly(
                        value,
                      ),
                    );

                    setErrorMessage(null);
                  }}
                  onFocus={
                    handlePaymentInputFocus
                  }
                  editable={
                    !isSubmitting
                  }
                  selectTextOnFocus
                  keyboardType="number-pad"
                  maxLength={12}
                  placeholder="Contoh: 100000"
                  placeholderTextColor="#9A9A9A"
                  selectionColor="#EC6426"
                  className="mt-2 min-h-12 rounded-2xl border-2 border-brand-yellow px-4 py-3 font-atkinson text-[16px] text-brand-black"
                />

                <View className="mt-3 flex-row items-center justify-between rounded-2xl bg-brand-cream p-4">
                  <Text className="font-atkinson-bold text-[15px] text-brand-brown">
                    Kembalian
                  </Text>

                  <Text className="font-atkinson-bold text-[18px] text-brand-orange">
                    {formatCurrency(
                      changePreview,
                    )}
                  </Text>
                </View>
              </>
            ) : (
              <View className="mt-4 rounded-2xl bg-brand-cream p-4">
                <Text className="font-atkinson text-[14px] leading-6 text-brand-black">
                  Pembayaran QRIS harus
                  sama dengan total
                  transaksi.
                </Text>

                <Text className="mt-2 font-atkinson-bold text-[18px] text-brand-orange">
                  {formatCurrency(
                    totalAmount,
                  )}
                </Text>
              </View>
            )}
          </View>

          {errorMessage ? (
            <View className="mt-4 rounded-2xl border-2 border-brand-orange bg-brand-white p-4">
              <Text className="font-atkinson-bold text-[15px] text-brand-brown">
                Transaksi belum dapat
                disimpan
              </Text>

              <Text className="mt-2 font-atkinson text-[14px] leading-6 text-brand-black">
                {errorMessage}
              </Text>
            </View>
          ) : null}

          <Pressable
            onPress={handleSubmit}
            disabled={
              isSubmitting ||
              cartItems.length === 0
            }
            accessibilityRole="button"
            accessibilityLabel="Simpan transaksi penjualan"
            className={`mt-5 min-h-14 items-center justify-center rounded-2xl bg-brand-orange px-5 py-4 ${
              isSubmitting ||
              cartItems.length === 0
                ? "opacity-50"
                : ""
            }`}
          >
            {isSubmitting ? (
              <View className="flex-row items-center">
                <ActivityIndicator
                  color="#FFFFFF"
                />

                <Text className="ml-3 font-atkinson-bold text-[17px] text-brand-white">
                  Menyimpan...
                </Text>
              </View>
            ) : (
              <Text className="font-atkinson-bold text-[18px] text-brand-white">
                Simpan Transaksi
              </Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}