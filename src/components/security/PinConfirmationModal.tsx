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

export type PinConfirmationMode =
  | "update-product"
  | "delete-product"
  | "change-officer-pin"
  | "activate-officer"
  | "deactivate-officer"
  | "delete-officer";

type PinConfirmationModalProps = {
  visible: boolean;
  mode: PinConfirmationMode;
  productName?: string;
  officerName?: string;
  errorMessage?: string | null;
  isSubmitting?: boolean;
  onConfirm: (pin: string) => void;
  onCancel: () => void;
  onPinChanged?: () => void;
};

type ConfirmationAppearance = {
  title: string;
  message: (targetName: string) => string;
  confirmText: string;
  borderClassName: string;
  confirmButtonClassName: string;
};

const CONFIRMATION_APPEARANCE: Record<
  PinConfirmationMode,
  ConfirmationAppearance
> = {
  "update-product": {
    title: "Konfirmasi Perubahan",
    message: (targetName) =>
      `Masukkan PIN Owner untuk menyimpan perubahan pada produk ${targetName}.`,
    confirmText: "Simpan Perubahan",
    borderClassName: "border-brand-orange",
    confirmButtonClassName: "bg-brand-orange",
  },

  "delete-product": {
    title: "Konfirmasi Hapus Produk",
    message: (targetName) =>
      `Masukkan PIN Owner untuk menonaktifkan produk ${targetName}. Riwayat transaksi dan stok tetap disimpan.`,
    confirmText: "Hapus Produk",
    borderClassName: "border-brand-brown",
    confirmButtonClassName: "bg-brand-orange",
  },

  "change-officer-pin": {
    title: "Konfirmasi Ganti PIN",
    message: (targetName) =>
      `Masukkan PIN Owner untuk menyimpan PIN baru akun Officer ${targetName}.`,
    confirmText: "Ganti PIN",
    borderClassName: "border-brand-orange",
    confirmButtonClassName: "bg-brand-orange",
  },

  "activate-officer": {
    title: "Aktifkan Akun Officer",
    message: (targetName) =>
      `Masukkan PIN Owner untuk mengaktifkan kembali akun Officer ${targetName}.`,
    confirmText: "Aktifkan Akun",
    borderClassName: "border-brand-orange",
    confirmButtonClassName: "bg-brand-orange",
  },

  "deactivate-officer": {
    title: "Nonaktifkan Akun Officer",
    message: (targetName) =>
      `Masukkan PIN Owner untuk menonaktifkan akun Officer ${targetName}. Officer tidak dapat login selama akun nonaktif.`,
    confirmText: "Nonaktifkan",
    borderClassName: "border-brand-orange",
    confirmButtonClassName: "bg-brand-orange",
  },

  "delete-officer": {
    title: "Hapus Akun Officer",
    message: (targetName) =>
      `Masukkan PIN Owner untuk menghapus akun Officer ${targetName}. Riwayat transaksi yang pernah dibuat tetap disimpan.`,
    confirmText: "Hapus Officer",
    borderClassName: "border-brand-brown",
    confirmButtonClassName: "bg-brand-orange",
  },
};

function keepDigitsOnly(value: string): string {
  return value.replace(/\D/g, "").slice(0, 6);
}

export function PinConfirmationModal({
  visible,
  mode,
  productName,
  officerName,
  errorMessage = null,
  isSubmitting = false,
  onConfirm,
  onCancel,
  onPinChanged,
}: PinConfirmationModalProps) {
  const [pin, setPin] = useState("");

  const appearance = CONFIRMATION_APPEARANCE[mode];

  const rawTargetName = officerName ?? productName ?? "";

  const targetName =
    rawTargetName.trim().length > 0 ? rawTargetName.trim() : "yang dipilih";

  const pinIsValid = pin.length === 6;
  const confirmIsDisabled = isSubmitting || !pinIsValid;

  useEffect(() => {
    setPin("");
  }, [visible, mode]);

  useEffect(() => {
    if (errorMessage !== null) {
      setPin("");
    }
  }, [errorMessage]);

  function handlePinChange(value: string): void {
    setPin(keepDigitsOnly(value));
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
        <View className="flex-1 items-center justify-center bg-black/50 px-6">
          <Pressable
            onPress={handleCancel}
            disabled={isSubmitting}
            className="absolute inset-0"
            accessibilityRole="button"
            accessibilityLabel="Tutup konfirmasi PIN Owner"
          />

          <View
            className={`w-full max-w-sm rounded-3xl border-2 bg-brand-white p-6 ${appearance.borderClassName}`}
          >
            <Text className="text-center font-atkinson-bold text-[22px] leading-7 text-brand-brown">
              {appearance.title}
            </Text>

            <Text className="mt-3 text-center font-atkinson text-[15px] leading-6 text-brand-black">
              {appearance.message(targetName)}
            </Text>

            <Text className="mt-5 font-atkinson-bold text-[16px] text-brand-brown">
              PIN Owner
            </Text>

            <TextInput
              value={pin}
              onChangeText={handlePinChange}
              editable={!isSubmitting}
              autoFocus
              secureTextEntry
              keyboardType="number-pad"
              maxLength={6}
              placeholder="Masukkan PIN Owner"
              placeholderTextColor="#777777"
              selectionColor="#EC6426"
              returnKeyType="done"
              onSubmitEditing={handleConfirm}
              className="mt-2 min-h-14 rounded-2xl border-2 border-brand-yellow px-4 py-3 font-atkinson text-[17px] text-brand-black"
            />

            <Text className="mt-2 font-atkinson text-[13px] leading-5 text-brand-black">
              Masukkan PIN Owner yang terdiri dari tepat 6 angka.
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
                accessibilityRole="button"
                accessibilityLabel="Batalkan tindakan"
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
                accessibilityRole="button"
                accessibilityLabel={appearance.confirmText}
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
      </KeyboardAvoidingView>
    </Modal>
  );
}
