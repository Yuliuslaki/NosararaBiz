import { useState } from "react";
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

import { completeInitialSetup } from "../../services/setupService";

type InitialSetupScreenProps = {
  onSetupCompleted: () => void;
};

export function InitialSetupScreen({
  onSetupCompleted,
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
    ownerPin.length >= 4 &&
    ownerPinConfirmation.length >= 4;

  const submitIsDisabled = isSubmitting || !requiredFieldsAreFilled;

  function handlePinChange(
    value: string,
    setter: (nextValue: string) => void,
  ): void {
    const numericValue = value.replace(/\D/g, "").slice(0, 6);

    setter(numericValue);
  }

  async function handleSubmit(): Promise<void> {
    if (submitIsDisabled) {
      return;
    }

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
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 40,
          paddingBottom: 48,
        }}
      >
        <View className="w-full max-w-md self-center">
          <Text className="font-atkinson-bold text-[32px] leading-[38px] text-brand-brown">
            Siapkan Nosarara Biz
          </Text>

          <Text className="mt-3 font-atkinson text-[17px] leading-7 text-brand-black">
            Masukkan informasi usaha dan buat akun Owner pertama.
          </Text>

          <View className="mt-7 rounded-3xl bg-brand-white p-6">
            <Text className="font-atkinson-bold text-[22px] text-brand-brown">
              Informasi Usaha
            </Text>

            <Text className="mt-5 font-atkinson-bold text-[16px] text-brand-brown">
              Nama usaha
            </Text>

            <TextInput
              value={businessName}
              onChangeText={setBusinessName}
              editable={!isSubmitting}
              maxLength={100}
              placeholder="Contoh: Saudara Unggas Palu"
              placeholderTextColor="#777777"
              autoCapitalize="words"
              returnKeyType="next"
              className="mt-2 min-h-14 rounded-2xl border-2 border-brand-yellow px-4 py-3 font-atkinson text-[17px] text-brand-black"
            />

            <Text className="mt-5 font-atkinson-bold text-[16px] text-brand-brown">
              Nomor WhatsApp Owner
            </Text>

            <TextInput
              value={ownerWaNumber}
              onChangeText={setOwnerWaNumber}
              editable={!isSubmitting}
              maxLength={20}
              placeholder="Contoh: 081234567890"
              placeholderTextColor="#777777"
              keyboardType="phone-pad"
              returnKeyType="next"
              className="mt-2 min-h-14 rounded-2xl border-2 border-brand-yellow px-4 py-3 font-atkinson text-[17px] text-brand-black"
            />

            <Text className="mt-2 font-atkinson text-[14px] leading-5 text-brand-black">
              Nomor WhatsApp boleh dikosongkan dan dapat diatur kembali nanti.
            </Text>
          </View>

          <View className="mt-5 rounded-3xl bg-brand-white p-6">
            <Text className="font-atkinson-bold text-[22px] text-brand-brown">
              Akun Owner
            </Text>

            <Text className="mt-5 font-atkinson-bold text-[16px] text-brand-brown">
              Nama lengkap Owner
            </Text>

            <TextInput
              value={ownerFullName}
              onChangeText={setOwnerFullName}
              editable={!isSubmitting}
              maxLength={100}
              placeholder="Masukkan nama lengkap"
              placeholderTextColor="#777777"
              autoCapitalize="words"
              returnKeyType="next"
              className="mt-2 min-h-14 rounded-2xl border-2 border-brand-yellow px-4 py-3 font-atkinson text-[17px] text-brand-black"
            />

            <Text className="mt-5 font-atkinson-bold text-[16px] text-brand-brown">
              Username
            </Text>

            <TextInput
              value={ownerUsername}
              onChangeText={(value) => {
                setOwnerUsername(value.toLowerCase().replace(/\s+/g, ""));
              }}
              editable={!isSubmitting}
              maxLength={30}
              placeholder="Contoh: owner"
              placeholderTextColor="#777777"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
              className="mt-2 min-h-14 rounded-2xl border-2 border-brand-yellow px-4 py-3 font-atkinson text-[17px] text-brand-black"
            />

            <Text className="mt-2 font-atkinson text-[14px] leading-5 text-brand-black">
              Gunakan huruf kecil, angka, titik, garis bawah, atau tanda hubung.
            </Text>

            <Text className="mt-5 font-atkinson-bold text-[16px] text-brand-brown">
              PIN Owner
            </Text>

            <TextInput
              value={ownerPin}
              onChangeText={(value) => {
                handlePinChange(value, setOwnerPin);
              }}
              editable={!isSubmitting}
              maxLength={6}
              placeholder="4 sampai 6 angka"
              placeholderTextColor="#777777"
              keyboardType="number-pad"
              secureTextEntry
              className="mt-2 min-h-14 rounded-2xl border-2 border-brand-yellow px-4 py-3 font-atkinson text-[20px] tracking-[6px] text-brand-black"
            />

            <Text className="mt-5 font-atkinson-bold text-[16px] text-brand-brown">
              Ulangi PIN Owner
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
              className="mt-2 min-h-14 rounded-2xl border-2 border-brand-yellow px-4 py-3 font-atkinson text-[20px] tracking-[6px] text-brand-black"
            />

            <Text className="mt-3 font-atkinson text-[14px] leading-5 text-brand-black">
              PIN digunakan untuk login dan menyetujui tindakan penting. PIN
              tidak disimpan sebagai teks biasa.
            </Text>

            {errorMessage ? (
              <View className="mt-5 rounded-2xl border-2 border-brand-orange bg-brand-cream p-4">
                <Text className="font-atkinson-bold text-[16px] text-brand-brown">
                  Pengaturan belum dapat disimpan
                </Text>

                <Text className="mt-2 font-atkinson text-[15px] leading-6 text-brand-black">
                  {errorMessage}
                </Text>
              </View>
            ) : null}

            <Pressable
              onPress={() => {
                void handleSubmit();
              }}
              disabled={submitIsDisabled}
              className={`mt-7 min-h-14 items-center justify-center rounded-2xl bg-brand-orange px-5 py-4 ${
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
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
