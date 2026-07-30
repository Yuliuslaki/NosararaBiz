import { useEffect, useState } from "react";
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

import {
  loginWithUsernameAndPin,
  type AuthenticatedUser,
} from "../../services/authService";

type LoginScreenProps = {
  onLoginSuccess: (user: AuthenticatedUser) => void;
};

function formatRemainingLockTime(milliseconds: number): string {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000));

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [lockedUntil, setLockedUntil] = useState<number | null>(null);

  const [currentTime, setCurrentTime] = useState(Date.now());

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
      setErrorMessage("Masa penguncian selesai. Silakan login kembali.");
    }
  }, [currentTime, lockedUntil]);

  const remainingLockTime =
    lockedUntil === null ? 0 : Math.max(0, lockedUntil - currentTime);

  const formIsComplete = username.trim().length > 0 && pin.length >= 4;

  const submitIsDisabled =
    isSubmitting || !formIsComplete || lockedUntil !== null;

  function handlePinChange(value: string): void {
    const numericPin = value.replace(/\D/g, "").slice(0, 6);

    setPin(numericPin);
  }

  async function handleLogin(): Promise<void> {
    if (submitIsDisabled) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const result = await loginWithUsernameAndPin(username, pin);

      if (result.success) {
        setPin("");
        setLockedUntil(null);
        onLoginSuccess(result.user);
        return;
      }

      setErrorMessage(result.message);
      setPin("");

      if (result.reason === "locked") {
        setCurrentTime(Date.now());
        setLockedUntil(result.lockedUntil);
      } else {
        setLockedUntil(null);
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Login gagal dijalankan.",
      );

      setPin("");
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
          flexGrow: 1,
          justifyContent: "center",
          paddingHorizontal: 24,
          paddingVertical: 40,
        }}
      >
        <View className="w-full max-w-md self-center">
          <View className="rounded-3xl bg-brand-white p-7">
            <Text className="text-center font-atkinson-bold text-[32px] leading-[38px] text-brand-brown">
              Nosarara Biz
            </Text>

            <Text className="mt-3 text-center font-atkinson text-[17px] leading-7 text-brand-black">
              Masuk menggunakan akun Owner atau Kasir
            </Text>

            <Text className="mt-7 font-atkinson-bold text-[17px] text-brand-brown">
              Username
            </Text>

            <TextInput
              value={username}
              onChangeText={(value) => {
                setUsername(value.toLowerCase().replace(/\s+/g, ""));

                if (errorMessage !== null) {
                  setErrorMessage(null);
                }
              }}
              editable={!isSubmitting}
              maxLength={30}
              placeholder="Masukkan username"
              placeholderTextColor="#777777"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
              className="mt-2 min-h-14 rounded-2xl border-2 border-brand-yellow px-4 py-3 font-atkinson text-[18px] text-brand-black"
            />

            <Text className="mt-5 font-atkinson-bold text-[17px] text-brand-brown">
              PIN
            </Text>

            <TextInput
              value={pin}
              onChangeText={(value) => {
                handlePinChange(value);

                if (errorMessage !== null) {
                  setErrorMessage(null);
                }
              }}
              editable={!isSubmitting && lockedUntil === null}
              maxLength={6}
              placeholder="Masukkan PIN"
              placeholderTextColor="#777777"
              keyboardType="number-pad"
              secureTextEntry
              className="mt-2 min-h-14 rounded-2xl border-2 border-brand-yellow px-4 py-3 font-atkinson text-[20px] tracking-[6px] text-brand-black"
            />

            {lockedUntil !== null ? (
              <View className="mt-5 rounded-2xl border-2 border-brand-orange bg-brand-cream p-4">
                <Text className="text-center font-atkinson-bold text-[17px] text-brand-brown">
                  Akun dikunci sementara
                </Text>

                <Text className="mt-2 text-center font-atkinson text-[16px] leading-6 text-brand-black">
                  Coba kembali dalam{" "}
                  {formatRemainingLockTime(remainingLockTime)}
                </Text>
              </View>
            ) : null}

            {errorMessage ? (
              <View className="mt-5 rounded-2xl border-2 border-brand-orange bg-brand-cream p-4">
                <Text className="font-atkinson-bold text-[16px] text-brand-brown">
                  Login belum berhasil
                </Text>

                <Text className="mt-2 font-atkinson text-[15px] leading-6 text-brand-black">
                  {errorMessage}
                </Text>
              </View>
            ) : null}

            <Pressable
              onPress={() => {
                void handleLogin();
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
                    Memeriksa akun...
                  </Text>
                </View>
              ) : (
                <Text className="font-atkinson-bold text-[18px] text-brand-white">
                  Masuk
                </Text>
              )}
            </Pressable>

            <Text className="mt-5 text-center font-atkinson text-[14px] leading-5 text-brand-black">
              Setelah lima kali PIN salah, akun dikunci selama lima menit.
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
