import { useEffect, useState } from "react";
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

import {
  loginWithUsernameAndPin,
  type AuthenticatedUser,
} from "../../services/authService";

type LoginScreenProps = {
  onLoginSuccess: (user: AuthenticatedUser) => void;
  onOpenRegistrationPreview: () => void;
};

type LoginAlertState = {
  title: string;
  message: string;
  confirmText: string;
  remainingAttempts?: number;
  lockedUntil?: number;
};

function formatRemainingLockTime(milliseconds: number): string {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000));

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function LoginScreen({
  onLoginSuccess,
  onOpenRegistrationPreview,
}: LoginScreenProps) {
  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState(Date.now());

  const [loginAlert, setLoginAlert] = useState<LoginAlertState | null>(null);

  useEffect(() => {
    if (lockedUntil === null) {
      return;
    }

    const intervalId = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => {
      clearInterval(intervalId);
    };
  }, [lockedUntil]);

  useEffect(() => {
    if (lockedUntil !== null && currentTime >= lockedUntil) {
      setLockedUntil(null);
      setPin("");

      Keyboard.dismiss();

      setLoginAlert({
        title: "Akun Dapat Digunakan Kembali",
        message:
          "Masa penguncian telah selesai. Silakan masukkan PIN dan coba login kembali.",
        confirmText: "Mengerti",
      });
    }
  }, [currentTime, lockedUntil]);

  const remainingLockTime =
    lockedUntil === null ? 0 : Math.max(0, lockedUntil - currentTime);

  const alertRemainingLockTime =
    loginAlert?.lockedUntil === undefined
      ? 0
      : Math.max(0, loginAlert.lockedUntil - currentTime);

  const formIsComplete = username.trim().length > 0 && pin.length === 6;

  const submitIsDisabled =
    isSubmitting || !formIsComplete || lockedUntil !== null;

  function showLoginAlert(alert: LoginAlertState): void {
    Keyboard.dismiss();
    setLoginAlert(alert);
  }

  function closeLoginAlert(): void {
    setLoginAlert(null);
  }

  function handleUsernameChange(value: string): void {
    const normalizedUsername = value
      .toLowerCase()
      .replace(/\s+/g, "")
      .slice(0, 30);

    setUsername(normalizedUsername);
  }

  function handlePinChange(value: string): void {
    const numericPin = value.replace(/\D/g, "").slice(0, 6);

    setPin(numericPin);
  }

  function handleOpenRegistration(): void {
    if (isSubmitting) {
      return;
    }

    Keyboard.dismiss();
    setLoginAlert(null);
    onOpenRegistrationPreview();
  }

  async function handleLogin(): Promise<void> {
    if (submitIsDisabled) {
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await loginWithUsernameAndPin(username, pin);

      if (result.success) {
        setPin("");
        setLockedUntil(null);
        setLoginAlert(null);

        onLoginSuccess(result.user);

        return;
      }

      setPin("");

      if (result.reason === "locked") {
        setCurrentTime(Date.now());
        setLockedUntil(result.lockedUntil);

        showLoginAlert({
          title: "Akun Dikunci Sementara",
          message:
            "Batas percobaan login telah tercapai. Tunggu sampai masa penguncian selesai.",
          confirmText: "Mengerti",
          remainingAttempts: 0,
          lockedUntil: result.lockedUntil,
        });

        return;
      }

      setLockedUntil(null);

      if (result.reason === "inactive") {
        showLoginAlert({
          title: "Akun Tidak Aktif",
          message: result.message,
          confirmText: "Mengerti",
        });

        return;
      }

      showLoginAlert({
        title: "Username atau PIN Tidak Sesuai",
        message:
          "Periksa kembali username dan PIN yang dimasukkan, kemudian coba lagi.",
        confirmText: "Coba Lagi",
        remainingAttempts: result.remainingAttempts,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Login gagal dijalankan.";

      setPin("");

      showLoginAlert({
        title: "Terjadi Kesalahan",
        message,
        confirmText: "Mengerti",
      });
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
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: "center",
            paddingHorizontal: 22,
            paddingVertical: 36,
          }}
        >
          <View className="w-full max-w-md self-center">
            <View className="border-b border-brand-black pb-5">
              <Text className="font-atkinson-bold text-[34px] leading-[40px] text-brand-black">
                Nosarara Biz
              </Text>

              <Text className="mt-2 font-atkinson text-[17px] leading-6 text-brand-black">
                Masuk untuk mengelola usaha Anda.
              </Text>
            </View>

            <View className="mt-6 rounded-xl border border-brand-black bg-brand-white p-5">
              <Text className="font-atkinson-bold text-[18px] text-brand-black">
                Username
              </Text>

              <TextInput
                value={username}
                onChangeText={handleUsernameChange}
                editable={!isSubmitting && lockedUntil === null}
                maxLength={30}
                placeholder="Masukkan username"
                placeholderTextColor="#666666"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
                selectionColor="#F4E7D3"
                accessibilityLabel="Username"
                className="mt-2 min-h-14 rounded-xl border border-brand-black bg-brand-white px-4 py-3 font-atkinson text-[18px] text-brand-black"
              />

              <Text className="mt-2 font-atkinson text-[14px] leading-5 text-brand-black">
                Gunakan username yang telah terdaftar.
              </Text>

              <Text className="mt-6 font-atkinson-bold text-[18px] text-brand-black">
                PIN
              </Text>

              <TextInput
                value={pin}
                onChangeText={handlePinChange}
                editable={!isSubmitting && lockedUntil === null}
                maxLength={6}
                placeholder="Masukkan 6 angka PIN"
                placeholderTextColor="#666666"
                keyboardType="number-pad"
                secureTextEntry
                selectionColor="#F4E7D3"
                returnKeyType="done"
                accessibilityLabel="PIN enam angka"
                onSubmitEditing={() => {
                  void handleLogin();
                }}
                className="mt-2 min-h-14 rounded-xl border border-brand-black bg-brand-white px-4 py-3 font-atkinson text-[18px] text-brand-black"
              />

              <Text className="mt-2 font-atkinson text-[14px] leading-5 text-brand-black">
                PIN harus terdiri dari tepat 6 angka.
              </Text>

              {lockedUntil !== null ? (
                <View className="mt-5 rounded-xl border border-brand-black bg-brand-cream p-4">
                  <Text className="text-center font-atkinson-bold text-[17px] text-brand-black">
                    Akun dikunci sementara
                  </Text>

                  <Text className="mt-2 text-center font-atkinson text-[14px] text-brand-black">
                    Coba kembali setelah
                  </Text>

                  <Text className="mt-1 text-center font-atkinson-bold text-[30px] text-brand-black">
                    {formatRemainingLockTime(remainingLockTime)}
                  </Text>
                </View>
              ) : null}

              <Pressable
                onPress={() => {
                  void handleLogin();
                }}
                disabled={submitIsDisabled}
                accessibilityRole="button"
                accessibilityLabel="Masuk ke aplikasi"
                accessibilityState={{
                  disabled: submitIsDisabled,
                }}
                className={`mt-7 min-h-14 items-center justify-center rounded-xl bg-brand-black px-5 py-4 ${
                  submitIsDisabled ? "opacity-40" : ""
                }`}
              >
                {isSubmitting ? (
                  <View className="flex-row items-center">
                    <ActivityIndicator color="#FFFFFF" />

                    <Text className="ml-3 font-atkinson-bold text-[18px] text-brand-white">
                      Memeriksa akun...
                    </Text>
                  </View>
                ) : (
                  <Text className="font-atkinson-bold text-[18px] text-brand-white">
                    Masuk
                  </Text>
                )}
              </Pressable>

              <Text className="mt-4 text-center font-atkinson text-[14px] leading-5 text-brand-black">
                Akun akan dikunci selama lima menit setelah lima kali PIN salah.
              </Text>
            </View>

            <View className="mt-5">
              <Text className="text-center font-atkinson text-[15px] leading-6 text-brand-black">
                Belum memiliki akun Owner?
              </Text>

              <Pressable
                onPress={handleOpenRegistration}
                disabled={isSubmitting}
                accessibilityRole="button"
                accessibilityLabel="Lihat halaman pendaftaran"
                accessibilityState={{
                  disabled: isSubmitting,
                }}
                className={`mt-3 min-h-14 items-center justify-center rounded-xl border border-brand-black bg-brand-white px-5 py-4 ${
                  isSubmitting ? "opacity-40" : ""
                }`}
              >
                <Text className="text-center font-atkinson-bold text-[17px] text-brand-black">
                  Lihat Halaman Pendaftaran
                </Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={loginAlert !== null}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={closeLoginAlert}
      >
        <View className="flex-1 items-center justify-center bg-black/50 px-6">
          <Pressable
            onPress={closeLoginAlert}
            className="absolute inset-0"
            accessibilityRole="button"
            accessibilityLabel="Tutup pemberitahuan login"
          />

          {loginAlert ? (
            <View className="w-full max-w-sm rounded-xl border border-brand-black bg-brand-white p-6">
              <Text className="text-center font-atkinson-bold text-[23px] leading-7 text-brand-black">
                {loginAlert.title}
              </Text>

              <Text className="mt-3 text-center font-atkinson text-[16px] leading-6 text-brand-black">
                {loginAlert.message}
              </Text>

              {loginAlert.remainingAttempts !== undefined ? (
                <View className="mt-4 rounded-xl border border-brand-black bg-brand-cream p-4">
                  <Text className="text-center font-atkinson text-[14px] text-brand-black">
                    Sisa percobaan sebelum akun dikunci
                  </Text>

                  <Text className="mt-1 text-center font-atkinson-bold text-[26px] text-brand-black">
                    {loginAlert.remainingAttempts} kali
                  </Text>
                </View>
              ) : null}

              {loginAlert.lockedUntil !== undefined ? (
                <View className="mt-4 rounded-xl border border-brand-black bg-brand-cream p-4">
                  <Text className="text-center font-atkinson text-[14px] text-brand-black">
                    Sisa waktu tunggu
                  </Text>

                  <Text className="mt-1 text-center font-atkinson-bold text-[30px] text-brand-black">
                    {formatRemainingLockTime(alertRemainingLockTime)}
                  </Text>
                </View>
              ) : null}

              <Pressable
                onPress={closeLoginAlert}
                accessibilityRole="button"
                accessibilityLabel={loginAlert.confirmText}
                className="mt-6 min-h-14 items-center justify-center rounded-xl bg-brand-black px-5 py-4"
              >
                <Text className="font-atkinson-bold text-[17px] text-brand-white">
                  {loginAlert.confirmText}
                </Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      </Modal>
    </>
  );
}
