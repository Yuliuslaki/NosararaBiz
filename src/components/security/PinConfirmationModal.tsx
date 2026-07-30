import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";

export type PinConfirmationMode = "update-product" | "delete-product";

type PinConfirmationModalProps = {
  visible: boolean;
  mode: PinConfirmationMode;
  productName: string;
  errorMessage?: string | null;
  isSubmitting?: boolean;
  onConfirm: (pin: string) => void;
  onCancel: () => void;
  onPinChanged?: () => void;
};

type ConfirmationAppearance = {
  badgeText: string;
  title: string;
  message: (productName: string) => string;
  confirmText: string;
  headerClassName: string;
  badgeClassName: string;
  borderClassName: string;
  confirmButtonClassName: string;
};

const CONFIRMATION_APPEARANCE: Record<
  PinConfirmationMode,
  ConfirmationAppearance
> = {
  "update-product": {
    badgeText: "EDIT",
    title: "Konfirmasi Perubahan",
    message: (productName) =>
      `Masukkan PIN akun Owner untuk menyimpan perubahan pada produk ${productName}.`,
    confirmText: "Simpan Perubahan",
    headerClassName: "bg-brand-cream",
    badgeClassName: "bg-brand-orange",
    borderClassName: "border-brand-orange",
    confirmButtonClassName: "bg-brand-orange",
  },

  "delete-product": {
    badgeText: "HAPUS",
    title: "Konfirmasi Hapus Produk",
    message: (productName) =>
      `Masukkan PIN akun Owner untuk menonaktifkan produk ${productName}. Riwayat transaksi dan stok tetap disimpan.`,
    confirmText: "Hapus Produk",
    headerClassName: "bg-brand-cream",
    badgeClassName: "bg-brand-brown",
    borderClassName: "border-brand-brown",
    confirmButtonClassName: "bg-brand-brown",
  },
};

function keepDigitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

export function PinConfirmationModal({
  visible,
  mode,
  productName,
  errorMessage = null,
  isSubmitting = false,
  onConfirm,
  onCancel,
  onPinChanged,
}: PinConfirmationModalProps) {
  const [pin, setPin] = useState("");

  const appearance = CONFIRMATION_APPEARANCE[mode];

  const normalizedProductName =
    productName.trim().length > 0 ? productName.trim() : "yang dipilih";

  const pinIsValid = pin.length >= 4 && pin.length <= 6;

  const confirmIsDisabled = isSubmitting || !pinIsValid;

  useEffect(() => {
    setPin("");
  }, [visible, mode]);

  function handlePinChange(nextValue: string): void {
    const nextPin = keepDigitsOnly(nextValue).slice(0, 6);

    setPin(nextPin);
    onPinChanged?.();
  }

  function handleCancel(): void {
    if (isSubmitting) {
      return;
    }

    setPin("");
    onCancel();
  }

  function handleConfirm(): void {
    if (confirmIsDisabled) {
      return;
    }

    onConfirm(pin);
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={handleCancel}
    >
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View className="flex-1 items-center justify-center bg-black/50 px-5">
          <Pressable
            onPress={handleCancel}
            disabled={isSubmitting}
            className="absolute inset-0"
            accessibilityRole="button"
            accessibilityLabel="Tutup konfirmasi PIN"
          />

          <View
            className={`w-full max-w-sm overflow-hidden rounded-[28px] border-2 bg-brand-white ${appearance.borderClassName}`}
          >
            <View
              className={`items-center px-6 pb-5 pt-7 ${appearance.headerClassName}`}
            >
              <View
                className={`h-16 min-w-16 items-center justify-center rounded-full px-3 ${appearance.badgeClassName}`}
              >
                <Text className="font-atkinson-bold text-[15px] tracking-[1px] text-brand-white">
                  {appearance.badgeText}
                </Text>
              </View>

              <Text className="mt-4 text-center font-atkinson-bold text-[22px] leading-7 text-brand-brown">
                {appearance.title}
              </Text>

              <Text className="mt-3 text-center font-atkinson text-[15px] leading-6 text-brand-black">
                {appearance.message(normalizedProductName)}
              </Text>
            </View>

            <View className="px-6 pb-6 pt-5">
              <Text className="text-center font-atkinson-bold text-[15px] text-brand-brown">
                PIN akun yang sedang masuk
              </Text>

              <TextInput
                value={pin}
                onChangeText={handlePinChange}
                editable={!isSubmitting}
                autoFocus
                secureTextEntry
                caretHidden
                keyboardType="number-pad"
                maxLength={6}
                placeholder="••••••"
                placeholderTextColor="#9A9A9A"
                selectionColor="#EC6426"
                returnKeyType="done"
                onSubmitEditing={handleConfirm}
                className="mt-2 min-h-14 rounded-2xl border-2 border-brand-yellow px-4 py-3 text-center font-atkinson-bold text-[22px] tracking-[8px] text-brand-black"
              />

              <Text className="mt-2 text-center font-atkinson text-[13px] leading-5 text-brand-black">
                PIN diperlukan untuk melindungi perubahan data penting.
              </Text>

              {errorMessage ? (
                <View className="mt-4 rounded-2xl border-2 border-brand-orange bg-brand-cream p-4">
                  <Text className="text-center font-atkinson-bold text-[14px] leading-5 text-brand-brown">
                    {errorMessage}
                  </Text>
                </View>
              ) : null}

              <View className="mt-6 flex-row gap-3">
                <Pressable
                  onPress={handleCancel}
                  disabled={isSubmitting}
                  className={`min-h-12 flex-1 items-center justify-center rounded-2xl border-2 border-brand-orange bg-brand-white px-3 py-3 ${
                    isSubmitting ? "opacity-50" : ""
                  }`}
                >
                  <Text className="text-center font-atkinson-bold text-[16px] text-brand-orange">
                    Batal
                  </Text>
                </Pressable>

                <Pressable
                  onPress={handleConfirm}
                  disabled={confirmIsDisabled}
                  className={`min-h-12 flex-1 items-center justify-center rounded-2xl px-3 py-3 ${appearance.confirmButtonClassName} ${
                    confirmIsDisabled ? "opacity-50" : ""
                  }`}
                >
                  {isSubmitting ? (
                    <View className="flex-row items-center justify-center">
                      <ActivityIndicator color="#FFFFFF" size="small" />

                      <Text className="ml-2 text-center font-atkinson-bold text-[15px] text-brand-white">
                        Memeriksa...
                      </Text>
                    </View>
                  ) : (
                    <Text className="text-center font-atkinson-bold text-[15px] leading-5 text-brand-white">
                      {appearance.confirmText}
                    </Text>
                  )}
                </Pressable>
              </View>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
