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
  },

  "delete-product": {
    title: "Konfirmasi Nonaktifkan Produk",
    message: (targetName) =>
      `Masukkan PIN Owner untuk menonaktifkan produk ${targetName}. Riwayat transaksi dan stok tetap disimpan.`,
    confirmText: "Nonaktifkan Produk",
  },

  "change-officer-pin": {
    title: "Konfirmasi Ganti PIN",
    message: (targetName) =>
      `Masukkan PIN Owner untuk menyimpan PIN baru akun Officer ${targetName}.`,
    confirmText: "Ganti PIN",
  },

  "activate-officer": {
    title: "Aktifkan Akun Officer",
    message: (targetName) =>
      `Masukkan PIN Owner untuk mengaktifkan kembali akun Officer ${targetName}.`,
    confirmText: "Aktifkan Akun",
  },

  "deactivate-officer": {
    title: "Nonaktifkan Akun Officer",
    message: (targetName) =>
      `Masukkan PIN Owner untuk menonaktifkan akun Officer ${targetName}. Officer tidak dapat login selama akun nonaktif.`,
    confirmText: "Nonaktifkan",
  },

  "delete-officer": {
    title: "Hapus Akun Officer",
    message: (targetName) =>
      `Masukkan PIN Owner untuk menghapus akun Officer ${targetName}. Riwayat transaksi yang pernah dibuat tetap disimpan.`,
    confirmText: "Hapus Officer",
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

          <View className="w-full max-w-sm rounded-xl border border-brand-black bg-brand-white p-6">
            <View className="items-center">
              <View className="h-16 w-16 items-center justify-center rounded-full bg-brand-black">
                <Text className="font-atkinson-bold text-[30px] text-brand-white">
                  !
                </Text>
              </View>

              <Text className="mt-4 text-center font-atkinson-bold text-[23px] leading-7 text-brand-black">
                {appearance.title}
              </Text>
            </View>

            <View className="mt-4 rounded-xl border border-brand-black bg-brand-cream p-4">
              <Text className="text-center font-atkinson text-[16px] leading-6 text-brand-black">
                {appearance.message(targetName)}
              </Text>
            </View>

            <Text className="mt-5 font-atkinson-bold text-[17px] text-brand-black">
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
              placeholder="Masukkan 6 angka PIN"
              placeholderTextColor="#666666"
              selectionColor="#F4E7D3"
              cursorColor="#111111"
              returnKeyType="done"
              accessibilityLabel="PIN Owner enam angka"
              onSubmitEditing={handleConfirm}
              className={`mt-2 min-h-14 rounded-xl border border-brand-black bg-brand-white px-4 py-3 font-atkinson text-[18px] text-brand-black ${
                isSubmitting ? "opacity-50" : ""
              }`}
            />

            <Text className="mt-2 font-atkinson text-[14px] leading-5 text-brand-black">
              PIN harus terdiri dari tepat 6 angka.
            </Text>

            {errorMessage ? (
              <View className="mt-4 rounded-xl border border-brand-black bg-brand-cream p-4">
                <Text className="text-center font-atkinson-bold text-[15px] leading-5 text-brand-black">
                  {errorMessage}
                </Text>
              </View>
            ) : null}

            <View className="mt-6 gap-3">
              <Pressable
                onPress={handleConfirm}
                disabled={confirmIsDisabled}
                accessibilityRole="button"
                accessibilityLabel={appearance.confirmText}
                accessibilityState={{
                  disabled: confirmIsDisabled,
                }}
                className={`min-h-14 items-center justify-center rounded-xl bg-brand-black px-4 py-3 ${
                  confirmIsDisabled ? "opacity-40" : ""
                }`}
              >
                {isSubmitting ? (
                  <View className="flex-row items-center justify-center">
                    <ActivityIndicator color="#FFFFFF" size="small" />

                    <Text className="ml-2 text-center font-atkinson-bold text-[16px] text-brand-white">
                      Memeriksa...
                    </Text>
                  </View>
                ) : (
                  <Text className="text-center font-atkinson-bold text-[17px] leading-5 text-brand-white">
                    {appearance.confirmText}
                  </Text>
                )}
              </Pressable>

              <Pressable
                onPress={handleCancel}
                disabled={isSubmitting}
                accessibilityRole="button"
                accessibilityLabel="Batalkan tindakan"
                accessibilityState={{
                  disabled: isSubmitting,
                }}
                className={`min-h-14 items-center justify-center rounded-xl border border-brand-black bg-brand-white px-4 py-3 ${
                  isSubmitting ? "opacity-40" : ""
                }`}
              >
                <Text className="text-center font-atkinson-bold text-[17px] text-brand-black">
                  Batal
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
