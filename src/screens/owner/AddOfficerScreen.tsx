import { useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
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
import { useAndroidBackButton } from "../../hooks/useAndroidBackButton";
import type { AuthenticatedUser } from "../../services/authService";
import { createOfficer } from "../../services/officerService";

type AddOfficerScreenProps = {
  user: AuthenticatedUser;
  onBack: () => void;
  onOfficerCreated: () => void;
};

function keepPinDigitsOnly(value: string): string {
  return value.replace(/\D/g, "").slice(0, 6);
}

function normalizeUsernameInput(value: string): string {
  return value.toLowerCase().replace(/\s+/g, "").slice(0, 30);
}

export function AddOfficerScreen({
  user,
  onBack,
  onOfficerCreated,
}: AddOfficerScreenProps) {
  const { showAlert } = useAppAlert();

  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [pinConfirmation, setPinConfirmation] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [pinMismatchAlertVisible, setPinMismatchAlertVisible] = useState(false);

  function handleBack(): void {
    if (isSubmitting || pinMismatchAlertVisible) {
      return;
    }

    onBack();
  }

  useAndroidBackButton(handleBack);

  const requiredFieldsAreFilled =
    fullName.trim().length >= 2 &&
    username.trim().length >= 3 &&
    pin.length === 6 &&
    pinConfirmation.length === 6;

  const submitIsDisabled = isSubmitting || !requiredFieldsAreFilled;

  function handleFullNameChange(value: string): void {
    setFullName(value);
    setErrorMessage(null);
  }

  function handleUsernameChange(value: string): void {
    setUsername(normalizeUsernameInput(value));
    setErrorMessage(null);
  }

  function handlePinChange(
    value: string,
    setter: (nextValue: string) => void,
  ): void {
    setter(keepPinDigitsOnly(value));
    setErrorMessage(null);
  }

  function closePinMismatchAlert(): void {
    setPinMismatchAlertVisible(false);
  }

  async function handleSubmit(): Promise<void> {
    if (submitIsDisabled) {
      return;
    }

    if (pin !== pinConfirmation) {
      Keyboard.dismiss();

      setPinConfirmation("");
      setErrorMessage(null);
      setPinMismatchAlertVisible(true);

      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const createdOfficer = await createOfficer({
        fullName,
        username,
        pin,
        pinConfirmation,
        performedBy: user,
      });

      setFullName("");
      setUsername("");
      setPin("");
      setPinConfirmation("");

      showAlert({
        tone: "success",
        title: "Officer berhasil ditambahkan",
        message: `Akun ${createdOfficer.fullName} berhasil dibuat dan sudah dapat digunakan untuk masuk ke aplikasi.`,
        confirmText: "OK",
      });

      onOfficerCreated();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Akun Officer belum dapat dibuat.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <KeyboardAvoidingView
        className="flex-1 bg-brand-cream"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
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
            paddingBottom: 64,
          }}
        >
          <View className="w-full max-w-md self-center">
            <ScreenHeader
              title="Tambah Officer"
              description="Buat akun untuk petugas yang menangani transaksi penjualan."
              onBack={handleBack}
              disabled={isSubmitting}
            />

            <View className="mt-5 rounded-3xl bg-brand-white p-5">
              <Text className="font-atkinson-bold text-[21px] text-brand-brown">
                Identitas Officer
              </Text>

              <Text className="mt-5 font-atkinson-bold text-[16px] text-brand-brown">
                Nama lengkap
              </Text>

              <TextInput
                value={fullName}
                onChangeText={handleFullNameChange}
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
                Gunakan nama asli agar setiap transaksi dapat diketahui petugas
                yang mencatatnya.
              </Text>

              <Text className="mt-5 font-atkinson-bold text-[16px] text-brand-brown">
                Username
              </Text>

              <TextInput
                value={username}
                onChangeText={handleUsernameChange}
                editable={!isSubmitting}
                maxLength={30}
                placeholder="Contoh: aida"
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
                Keamanan Akun
              </Text>

              <Text className="mt-5 font-atkinson-bold text-[16px] text-brand-brown">
                PIN
              </Text>

              <TextInput
                value={pin}
                onChangeText={(value) => {
                  handlePinChange(value, setPin);
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
                value={pinConfirmation}
                onChangeText={(value) => {
                  handlePinChange(value, setPinConfirmation);
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
                  void handleSubmit();
                }}
                className="mt-2 min-h-14 rounded-2xl border-2 border-brand-yellow px-4 py-3 font-atkinson text-[17px] text-brand-black"
              />

              <Text className="mt-2 font-atkinson text-[14px] leading-5 text-brand-black">
                Masukkan PIN yang sama untuk memastikan tidak terjadi kesalahan.
              </Text>

              <View className="mt-4 rounded-2xl bg-brand-cream p-4">
                <Text className="font-atkinson text-[14px] leading-6 text-brand-black">
                  PIN digunakan oleh Officer untuk masuk ke aplikasi. PIN tidak
                  disimpan sebagai teks biasa dan hanya dapat diganti oleh
                  Owner.
                </Text>
              </View>
            </View>

            {errorMessage ? (
              <View className="mt-4 rounded-2xl border-2 border-brand-orange bg-brand-white p-4">
                <Text className="font-atkinson-bold text-[16px] text-brand-brown">
                  Officer belum dapat ditambahkan
                </Text>

                <Text className="mt-2 font-atkinson text-[15px] leading-6 text-brand-black">
                  {errorMessage}
                </Text>
              </View>
            ) : null}

            <View className="mt-5 flex-row gap-3">
              <Pressable
                onPress={handleBack}
                disabled={isSubmitting}
                accessibilityRole="button"
                accessibilityLabel="Batal menambah Officer"
                className={`min-h-14 flex-1 items-center justify-center rounded-2xl border-2 border-brand-orange bg-brand-white px-4 py-3 ${
                  isSubmitting ? "opacity-50" : ""
                }`}
              >
                <Text className="font-atkinson-bold text-[17px] text-brand-orange">
                  Batal
                </Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  void handleSubmit();
                }}
                disabled={submitIsDisabled}
                accessibilityRole="button"
                accessibilityLabel="Simpan akun Officer"
                className={`min-h-14 flex-1 items-center justify-center rounded-2xl bg-brand-orange px-4 py-3 ${
                  submitIsDisabled ? "opacity-50" : ""
                }`}
              >
                {isSubmitting ? (
                  <View className="flex-row items-center">
                    <ActivityIndicator color="#FFFFFF" />

                    <Text className="ml-2 font-atkinson-bold text-[16px] text-brand-white">
                      Menyimpan...
                    </Text>
                  </View>
                ) : (
                  <Text className="text-center font-atkinson-bold text-[17px] text-brand-white">
                    Simpan Officer
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={pinMismatchAlertVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={closePinMismatchAlert}
      >
        <View className="flex-1 items-center justify-center bg-black/50 px-6">
          <Pressable
            onPress={closePinMismatchAlert}
            className="absolute inset-0"
            accessibilityRole="button"
            accessibilityLabel="Tutup peringatan konfirmasi PIN"
          />

          <View className="w-full max-w-sm rounded-3xl border-2 border-brand-orange bg-brand-white p-6">
            <Text className="text-center font-atkinson-bold text-[22px] leading-7 text-brand-brown">
              Konfirmasi PIN Tidak Sesuai
            </Text>

            <Text className="mt-3 text-center font-atkinson text-[15px] leading-6 text-brand-black">
              PIN dan konfirmasi PIN harus sama. Masukkan kembali konfirmasi PIN
              dengan benar.
            </Text>

            <Pressable
              onPress={closePinMismatchAlert}
              accessibilityRole="button"
              accessibilityLabel="Masukkan kembali konfirmasi PIN"
              className="mt-6 min-h-12 items-center justify-center rounded-2xl bg-brand-orange px-5 py-3"
            >
              <Text className="font-atkinson-bold text-[17px] text-brand-white">
                Coba Lagi
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}
