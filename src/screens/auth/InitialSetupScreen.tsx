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
          paddingTop: 36,
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
              accessibilityState={{
                disabled: isSubmitting,
              }}
              className={`min-h-12 self-start items-center justify-center rounded-xl border border-brand-black bg-brand-white px-4 py-3 ${
                isSubmitting ? "opacity-40" : ""
              }`}
            >
              <View className="flex-row items-center justify-center">
                <Text
                  style={{
                    transform: [{ translateY: -2 }],
                  }}
                  className="mr-2 font-atkinson-bold text-[22px] leading-6 text-brand-black"
                >
                  {"<"}
                </Text>

                <Text className="font-atkinson-bold text-[16px] text-brand-black">
                  Kembali ke Login
                </Text>
              </View>
            </Pressable>
          ) : null}

          <View
            className={`${previewMode ? "mt-6" : ""} border-b border-brand-black pb-5`}
          >
            <Text className="font-atkinson-bold text-[32px] leading-[38px] text-brand-black">
              {previewMode ? "Pratinjau Pendaftaran" : "Siapkan Nosarara Biz"}
            </Text>

            <Text className="mt-3 font-atkinson text-[17px] leading-7 text-brand-black">
              {previewMode
                ? "Lihat formulir pendaftaran usaha dan akun Owner."
                : "Isi data usaha dan buat akun Owner pertama."}
            </Text>
          </View>

          {previewMode ? (
            <View className="mt-5 rounded-xl border border-brand-black bg-brand-white p-4">
              <Text className="font-atkinson-bold text-[18px] text-brand-black">
                Mode Pratinjau
              </Text>

              <Text className="mt-2 font-atkinson text-[15px] leading-6 text-brand-black">
                Data pada halaman ini tidak akan disimpan dan tidak akan
                mengubah akun Owner yang sudah terdaftar.
              </Text>
            </View>
          ) : null}

          <View className="mt-6 rounded-xl border border-brand-black bg-brand-white p-5">
            <Text className="font-atkinson-bold text-[22px] text-brand-black">
              1. Informasi Usaha
            </Text>

            <Text className="mt-5 font-atkinson-bold text-[17px] text-brand-black">
              Nama Usaha
            </Text>

            <TextInput
              value={businessName}
              onChangeText={handleBusinessNameChange}
              editable={!isSubmitting}
              maxLength={100}
              placeholder="Contoh: Saudara Unggas Palu"
              placeholderTextColor="#666666"
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="next"
              selectionColor="#F4E7D3"
              accessibilityLabel="Nama usaha"
              className="mt-2 min-h-14 rounded-xl border border-brand-black bg-brand-white px-4 py-3 font-atkinson text-[17px] text-brand-black"
            />

            <Text className="mt-2 font-atkinson text-[14px] leading-5 text-brand-black">
              Nama ini akan tampil pada aplikasi dan laporan.
            </Text>

            <Text className="mt-6 font-atkinson-bold text-[17px] text-brand-black">
              Nomor WhatsApp Owner
            </Text>

            <TextInput
              value={ownerWaNumber}
              onChangeText={handleOwnerWaNumberChange}
              editable={!isSubmitting}
              maxLength={20}
              placeholder="Contoh: 081234567890"
              placeholderTextColor="#666666"
              keyboardType="phone-pad"
              returnKeyType="next"
              selectionColor="#F4E7D3"
              accessibilityLabel="Nomor WhatsApp Owner"
              className="mt-2 min-h-14 rounded-xl border border-brand-black bg-brand-white px-4 py-3 font-atkinson text-[17px] text-brand-black"
            />

            <Text className="mt-2 font-atkinson text-[14px] leading-5 text-brand-black">
              Boleh dikosongkan dan dapat diatur kembali nanti.
            </Text>
          </View>

          <View className="mt-4 rounded-xl border border-brand-black bg-brand-white p-5">
            <Text className="font-atkinson-bold text-[22px] text-brand-black">
              2. Akun Owner
            </Text>

            <Text className="mt-5 font-atkinson-bold text-[17px] text-brand-black">
              Nama Lengkap
            </Text>

            <TextInput
              value={ownerFullName}
              onChangeText={handleOwnerFullNameChange}
              editable={!isSubmitting}
              maxLength={100}
              placeholder="Masukkan nama lengkap"
              placeholderTextColor="#666666"
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="next"
              selectionColor="#F4E7D3"
              accessibilityLabel="Nama lengkap Owner"
              className="mt-2 min-h-14 rounded-xl border border-brand-black bg-brand-white px-4 py-3 font-atkinson text-[17px] text-brand-black"
            />

            <Text className="mt-2 font-atkinson text-[14px] leading-5 text-brand-black">
              Gunakan nama asli agar aktivitas usaha mudah dikenali.
            </Text>

            <Text className="mt-6 font-atkinson-bold text-[17px] text-brand-black">
              Username
            </Text>

            <TextInput
              value={ownerUsername}
              onChangeText={handleOwnerUsernameChange}
              editable={!isSubmitting}
              maxLength={30}
              placeholder="Contoh: owner"
              placeholderTextColor="#666666"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
              selectionColor="#F4E7D3"
              accessibilityLabel="Username Owner"
              className="mt-2 min-h-14 rounded-xl border border-brand-black bg-brand-white px-4 py-3 font-atkinson text-[17px] text-brand-black"
            />

            <Text className="mt-2 font-atkinson text-[14px] leading-5 text-brand-black">
              Gunakan 3 sampai 30 karakter tanpa spasi.
            </Text>
          </View>

          <View className="mt-4 rounded-xl border border-brand-black bg-brand-white p-5">
            <Text className="font-atkinson-bold text-[22px] text-brand-black">
              3. PIN Owner
            </Text>

            <Text className="mt-5 font-atkinson-bold text-[17px] text-brand-black">
              PIN
            </Text>

            <TextInput
              value={ownerPin}
              onChangeText={(value) => {
                handlePinChange(value, setOwnerPin);
              }}
              editable={!isSubmitting}
              maxLength={6}
              placeholder="Masukkan 6 angka PIN"
              placeholderTextColor="#666666"
              keyboardType="number-pad"
              secureTextEntry
              selectionColor="#F4E7D3"
              returnKeyType="next"
              accessibilityLabel="PIN Owner"
              className="mt-2 min-h-14 rounded-xl border border-brand-black bg-brand-white px-4 py-3 font-atkinson text-[17px] text-brand-black"
            />

            <Text className="mt-2 font-atkinson text-[14px] leading-5 text-brand-black">
              PIN harus terdiri dari tepat 6 angka.
            </Text>

            <Text className="mt-6 font-atkinson-bold text-[17px] text-brand-black">
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
              placeholderTextColor="#666666"
              keyboardType="number-pad"
              secureTextEntry
              selectionColor="#F4E7D3"
              returnKeyType="done"
              accessibilityLabel="Konfirmasi PIN Owner"
              onSubmitEditing={() => {
                if (!previewMode) {
                  void handleSubmit();
                }
              }}
              className="mt-2 min-h-14 rounded-xl border border-brand-black bg-brand-white px-4 py-3 font-atkinson text-[17px] text-brand-black"
            />

            <Text className="mt-2 font-atkinson text-[14px] leading-5 text-brand-black">
              Masukkan PIN yang sama untuk memastikan tidak ada kesalahan.
            </Text>

            <View className="mt-5 rounded-xl border border-brand-black bg-brand-cream p-4">
              <Text className="font-atkinson text-[15px] leading-6 text-brand-black">
                Simpan PIN dengan aman. PIN digunakan untuk masuk ke aplikasi
                dan menyetujui tindakan penting.
              </Text>
            </View>
          </View>

          {!previewMode && errorMessage ? (
            <View className="mt-4 rounded-xl border border-brand-black bg-brand-white p-4">
              <Text className="font-atkinson-bold text-[17px] text-brand-black">
                Pengaturan Belum Dapat Disimpan
              </Text>

              <Text className="mt-2 font-atkinson text-[15px] leading-6 text-brand-black">
                {errorMessage}
              </Text>
            </View>
          ) : null}

          {previewMode ? (
            <>
              <View className="mt-4 rounded-xl border border-brand-black bg-brand-cream p-4">
                <Text className="text-center font-atkinson-bold text-[15px] leading-6 text-brand-black">
                  Tombol penyimpanan dinonaktifkan karena akun Owner sudah
                  tersedia.
                </Text>
              </View>

              <Pressable
                onPress={handleBackToLogin}
                disabled={isSubmitting}
                accessibilityRole="button"
                accessibilityLabel="Kembali ke halaman login"
                accessibilityState={{
                  disabled: isSubmitting,
                }}
                className={`mt-5 min-h-14 items-center justify-center rounded-xl bg-brand-black px-5 py-4 ${
                  isSubmitting ? "opacity-40" : ""
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
