import { useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import { completeInitialSetup } from "../../services/setupService";

type InitialSetupScreenProps = {
  onSetupCompleted: () => void;
  previewMode?: boolean;
  onBackToLogin?: () => void;
};

function keepPinDigitsOnly(value: string): string {
  return value.replace(/\D/g, "").slice(0, 6);
}

function normalizeUsernameInput(value: string): string {
  return value.toLowerCase().replace(/\s+/g, "").slice(0, 30);
}

export function InitialSetupScreen({
  onSetupCompleted,
  previewMode = false,
  onBackToLogin,
}: InitialSetupScreenProps) {
  const [businessName, setBusinessName] = useState("");
  const [ownerWaNumber, setOwnerWaNumber] = useState("");
  const [ownerFullName, setOwnerFullName] = useState("");
  const [ownerUsername, setOwnerUsername] = useState("");
  const [ownerPin, setOwnerPin] = useState("");
  const [ownerPinConfirmation, setOwnerPinConfirmation] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const requiredFieldsAreFilled =
    businessName.trim().length >= 2 &&
    ownerFullName.trim().length >= 2 &&
    ownerUsername.trim().length >= 3 &&
    ownerPin.length === 6 &&
    ownerPinConfirmation.length === 6;

  const submitIsDisabled =
    previewMode || isSubmitting || !requiredFieldsAreFilled;

  function handleBusinessNameChange(value: string): void {
    setBusinessName(value);
    setErrorMessage(null);
  }

  function handleOwnerWaNumberChange(value: string): void {
    setOwnerWaNumber(value);
    setErrorMessage(null);
  }

  function handleOwnerFullNameChange(value: string): void {
    setOwnerFullName(value);
    setErrorMessage(null);
  }

  function handleOwnerUsernameChange(value: string): void {
    setOwnerUsername(normalizeUsernameInput(value));
    setErrorMessage(null);
  }

  function handlePinChange(
    value: string,
    setter: (nextValue: string) => void,
  ): void {
    setter(keepPinDigitsOnly(value));
    setErrorMessage(null);
  }

  function handleBackToLogin(): void {
    if (isSubmitting) {
      return;
    }

    Keyboard.dismiss();
    onBackToLogin?.();
  }

  async function handleSubmit(): Promise<void> {
    if (submitIsDisabled) {
      return;
    }

    Keyboard.dismiss();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await completeInitialSetup({
        businessName,
        ownerWaNumber,
        ownerFullName,
        ownerUsername,
        ownerPin,
        ownerPinConfirmation,
      });

      onSetupCompleted();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Pengaturan awal gagal disimpan.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-brand-cream"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        className="flex-1"
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 40,
          paddingBottom: 64,
        }}
      >
        <View className="w-full max-w-md self-center">
          {previewMode ? (
            <Pressable
              onPress={handleBackToLogin}
              disabled={isSubmitting}
              accessibilityRole="button"
              accessibilityLabel="Kembali ke halaman login"
              className={`mb-5 min-h-12 self-start justify-center rounded-2xl border-2 border-brand-orange bg-brand-white px-4 py-2 ${
                isSubmitting ? "opacity-50" : ""
              }`}
            >
              <Text className="font-atkinson-bold text-[16px] text-brand-black">
                ← Kembali ke Login
              </Text>
            </Pressable>
          ) : null}

          <Text className="font-atkinson-bold text-[32px] leading-[38px] text-brand-brown">
            {previewMode ? "Pratinjau Pendaftaran" : "Siapkan Nosarara Biz"}
          </Text>

          <Text className="mt-3 font-atkinson text-[17px] leading-7 text-brand-black">
            {previewMode
              ? "Lihat tampilan pendaftaran usaha dan pembuatan akun Owner pertama."
              : "Masukkan informasi usaha dan buat akun Owner pertama."}
          </Text>

          {previewMode ? (
            <View className="mt-5 rounded-2xl border-2 border-brand-orange bg-brand-white p-4">
              <Text className="font-atkinson-bold text-[17px] text-brand-brown">
                Mode Pratinjau
              </Text>

              <Text className="mt-2 font-atkinson text-[14px] leading-6 text-brand-black">
                Data yang dimasukkan pada halaman ini tidak akan disimpan dan
                tidak akan mengubah akun Owner yang sudah terdaftar.
              </Text>
            </View>
          ) : null}

          <View className="mt-7 rounded-3xl bg-brand-white p-5">
            <Text className="font-atkinson-bold text-[21px] text-brand-brown">
              Informasi Usaha
            </Text>

            <Text className="mt-5 font-atkinson-bold text-[16px] text-brand-brown">
              Nama usaha
            </Text>

            <TextInput
              value={businessName}
              onChangeText={handleBusinessNameChange}
              editable={!isSubmitting}
              maxLength={100}
              placeholder="Contoh: Saudara Unggas Palu"
              placeholderTextColor="#777777"
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="next"
              selectionColor="#EC6426"
              className="mt-2 min-h-14 rounded-2xl border-2 border-brand-yellow px-4 py-3 font-atkinson text-[17px] text-brand-black"
            />

            <Text className="mt-2 font-atkinson text-[14px] leading-5 text-brand-black">
              Masukkan nama usaha yang akan digunakan pada aplikasi dan laporan.
            </Text>

            <Text className="mt-5 font-atkinson-bold text-[16px] text-brand-brown">
              Nomor WhatsApp Owner
            </Text>

            <TextInput
              value={ownerWaNumber}
              onChangeText={handleOwnerWaNumberChange}
              editable={!isSubmitting}
              maxLength={20}
              placeholder="Contoh: 081234567890"
              placeholderTextColor="#777777"
              keyboardType="phone-pad"
              returnKeyType="next"
              selectionColor="#EC6426"
              className="mt-2 min-h-14 rounded-2xl border-2 border-brand-yellow px-4 py-3 font-atkinson text-[17px] text-brand-black"
            />

            <Text className="mt-2 font-atkinson text-[14px] leading-5 text-brand-black">
              Nomor WhatsApp boleh dikosongkan dan dapat diatur kembali nanti.
            </Text>
          </View>

          <View className="mt-4 rounded-3xl bg-brand-white p-5">
            <Text className="font-atkinson-bold text-[21px] text-brand-brown">
              Akun Owner
            </Text>

            <Text className="mt-5 font-atkinson-bold text-[16px] text-brand-brown">
              Nama lengkap
            </Text>

            <TextInput
              value={ownerFullName}
              onChangeText={handleOwnerFullNameChange}
              editable={!isSubmitting}
              maxLength={100}
              placeholder="Masukkan nama lengkap"
              placeholderTextColor="#777777"
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="next"
              selectionColor="#EC6426"
              className="mt-2 min-h-14 rounded-2xl border-2 border-brand-yellow px-4 py-3 font-atkinson text-[17px] text-brand-black"
            />

            <Text className="mt-2 font-atkinson text-[14px] leading-5 text-brand-black">
              Gunakan nama asli agar setiap transaksi dan tindakan penting dapat
              diketahui Owner yang melakukannya.
            </Text>

            <Text className="mt-5 font-atkinson-bold text-[16px] text-brand-brown">
              Username
            </Text>

            <TextInput
              value={ownerUsername}
              onChangeText={handleOwnerUsernameChange}
              editable={!isSubmitting}
              maxLength={30}
              placeholder="Contoh: owner"
              placeholderTextColor="#777777"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
              selectionColor="#EC6426"
              className="mt-2 min-h-14 rounded-2xl border-2 border-brand-yellow px-4 py-3 font-atkinson text-[17px] text-brand-black"
            />

            <Text className="mt-2 font-atkinson text-[14px] leading-5 text-brand-black">
              Username terdiri dari 3 sampai 30 karakter. Gunakan huruf kecil,
              angka, titik, garis bawah, atau tanda hubung.
            </Text>
          </View>

          <View className="mt-4 rounded-3xl bg-brand-white p-5">
            <Text className="font-atkinson-bold text-[21px] text-brand-brown">
              PIN Owner
            </Text>

            <Text className="mt-5 font-atkinson-bold text-[16px] text-brand-brown">
              PIN
            </Text>

            <TextInput
              value={ownerPin}
              onChangeText={(value) => {
                handlePinChange(value, setOwnerPin);
              }}
              editable={!isSubmitting}
              maxLength={6}
              placeholder="Masukkan PIN"
              placeholderTextColor="#777777"
              keyboardType="number-pad"
              secureTextEntry
              selectionColor="#EC6426"
              returnKeyType="next"
              className="mt-2 min-h-14 rounded-2xl border-2 border-brand-yellow px-4 py-3 font-atkinson text-[17px] text-brand-black"
            />

            <Text className="mt-2 font-atkinson text-[14px] leading-5 text-brand-black">
              PIN harus terdiri dari tepat 6 angka.
            </Text>

            <Text className="mt-5 font-atkinson-bold text-[16px] text-brand-brown">
              Konfirmasi PIN
            </Text>

            <TextInput
              value={ownerPinConfirmation}
              onChangeText={(value) => {
                handlePinChange(value, setOwnerPinConfirmation);
              }}
              editable={!isSubmitting}
              maxLength={6}
              placeholder="Masukkan kembali PIN"
              placeholderTextColor="#777777"
              keyboardType="number-pad"
              secureTextEntry
              selectionColor="#EC6426"
              returnKeyType="done"
              onSubmitEditing={() => {
                if (!previewMode) {
                  void handleSubmit();
                }
              }}
              className="mt-2 min-h-14 rounded-2xl border-2 border-brand-yellow px-4 py-3 font-atkinson text-[17px] text-brand-black"
            />

            <Text className="mt-2 font-atkinson text-[14px] leading-5 text-brand-black">
              Masukkan PIN yang sama untuk memastikan tidak terjadi kesalahan.
            </Text>

            <View className="mt-4 rounded-2xl bg-brand-cream p-4">
              <Text className="font-atkinson text-[14px] leading-6 text-brand-black">
                PIN digunakan oleh Owner untuk masuk ke aplikasi dan menyetujui
                tindakan penting. PIN tidak disimpan sebagai teks biasa.
              </Text>
            </View>
          </View>

          {!previewMode && errorMessage ? (
            <View className="mt-4 rounded-2xl border-2 border-brand-orange bg-brand-white p-4">
              <Text className="font-atkinson-bold text-[16px] text-brand-brown">
                Pengaturan belum dapat disimpan
              </Text>

              <Text className="mt-2 font-atkinson text-[15px] leading-6 text-brand-black">
                {errorMessage}
              </Text>
            </View>
          ) : null}

          {previewMode ? (
            <>
              <View className="mt-4 rounded-2xl bg-brand-white p-4">
                <Text className="text-center font-atkinson-bold text-[15px] leading-6 text-brand-brown">
                  Penyimpanan dinonaktifkan karena aplikasi sudah memiliki akun
                  Owner.
                </Text>
              </View>

              <Pressable
                onPress={handleBackToLogin}
                disabled={isSubmitting}
                accessibilityRole="button"
                accessibilityLabel="Kembali ke halaman login"
                className={`mt-5 min-h-14 items-center justify-center rounded-2xl bg-brand-orange px-5 py-4 ${
                  isSubmitting ? "opacity-50" : ""
                }`}
              >
                <Text className="text-center font-atkinson-bold text-[18px] text-brand-white">
                  Kembali ke Login
                </Text>
              </Pressable>
            </>
          ) : (
            <Pressable
              onPress={() => {
                void handleSubmit();
              }}
              disabled={submitIsDisabled}
              accessibilityRole="button"
              accessibilityLabel="Simpan pengaturan awal"
              className={`mt-5 min-h-14 items-center justify-center rounded-2xl bg-brand-orange px-5 py-4 ${
                submitIsDisabled ? "opacity-50" : ""
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
                <Text className="text-center font-atkinson-bold text-[18px] text-brand-white">
                  Simpan dan Lanjutkan
                </Text>
              )}
            </Pressable>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
