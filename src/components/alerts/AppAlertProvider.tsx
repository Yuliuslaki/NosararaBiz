import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useState,
} from "react";
import { Modal, Pressable, Text, View } from "react-native";

export type AppAlertTone = "success" | "error" | "warning" | "info";

export type AppAlertOptions = {
  title: string;
  message: string;
  tone?: AppAlertTone;
  confirmText?: string;
  cancelText?: string;
  dismissible?: boolean;
  onConfirm?: () => void;
  onCancel?: () => void;
};

type AppAlertContextValue = {
  showAlert: (options: AppAlertOptions) => void;
  hideAlert: () => void;
};

type AppAlertProviderProps = {
  children: ReactNode;
};

type AlertToneAppearance = {
  symbol: string;
  label: string;
};

const AppAlertContext = createContext<AppAlertContextValue | null>(null);

const ALERT_TONE_APPEARANCE: Record<AppAlertTone, AlertToneAppearance> = {
  success: {
    symbol: "✓",
    label: "Berhasil",
  },

  error: {
    symbol: "!",
    label: "Kesalahan",
  },

  warning: {
    symbol: "!",
    label: "Perhatian",
  },

  info: {
    symbol: "i",
    label: "Informasi",
  },
};

export function AppAlertProvider({ children }: AppAlertProviderProps) {
  const [activeAlert, setActiveAlert] = useState<AppAlertOptions | null>(null);

  const showAlert = useCallback((options: AppAlertOptions): void => {
    setActiveAlert(options);
  }, []);

  const hideAlert = useCallback((): void => {
    setActiveAlert(null);
  }, []);

  function handleConfirm(): void {
    if (activeAlert === null) {
      return;
    }

    const onConfirm = activeAlert.onConfirm;

    setActiveAlert(null);

    onConfirm?.();
  }

  function handleCancel(): void {
    if (activeAlert === null) {
      return;
    }

    const onCancel = activeAlert.onCancel;

    setActiveAlert(null);

    onCancel?.();
  }

  function handleBackdropPress(): void {
    if (activeAlert === null || activeAlert.dismissible === false) {
      return;
    }

    handleCancel();
  }

  const tone = activeAlert?.tone ?? "info";

  const toneAppearance = ALERT_TONE_APPEARANCE[tone];

  const confirmText = activeAlert?.confirmText ?? "OK";

  return (
    <AppAlertContext.Provider
      value={{
        showAlert,
        hideAlert,
      }}
    >
      {children}

      {activeAlert ? (
        <Modal
          visible
          transparent
          animationType="fade"
          statusBarTranslucent
          onRequestClose={() => {
            if (activeAlert.dismissible !== false) {
              handleCancel();
            }
          }}
        >
          <View className="flex-1 items-center justify-center bg-black/50 px-5">
            <Pressable
              onPress={handleBackdropPress}
              className="absolute inset-0"
              accessibilityRole="button"
              accessibilityLabel="Tutup pemberitahuan"
            />

            <View className="w-full max-w-sm rounded-xl border border-brand-black bg-brand-white p-6">
              <View className="items-center">
                <View className="h-16 w-16 items-center justify-center rounded-full bg-brand-black">
                  <Text className="font-atkinson-bold text-[32px] leading-10 text-brand-white">
                    {toneAppearance.symbol}
                  </Text>
                </View>

                <Text className="mt-3 font-atkinson-bold text-[14px] uppercase tracking-wide text-brand-black">
                  {toneAppearance.label}
                </Text>

                <Text className="mt-2 text-center font-atkinson-bold text-[23px] leading-7 text-brand-black">
                  {activeAlert.title}
                </Text>
              </View>

              <View className="mt-5 rounded-xl border border-brand-black bg-brand-cream p-4">
                <Text className="text-center font-atkinson text-[16px] leading-6 text-brand-black">
                  {activeAlert.message}
                </Text>
              </View>

              <View
                className={`mt-6 ${
                  activeAlert.cancelText ? "flex-row gap-3" : ""
                }`}
              >
                {activeAlert.cancelText ? (
                  <Pressable
                    onPress={handleCancel}
                    accessibilityRole="button"
                    accessibilityLabel={activeAlert.cancelText}
                    className="min-h-14 flex-1 items-center justify-center rounded-xl border border-brand-black bg-brand-white px-4 py-3"
                  >
                    <Text className="text-center font-atkinson-bold text-[17px] text-brand-black">
                      {activeAlert.cancelText}
                    </Text>
                  </Pressable>
                ) : null}

                <Pressable
                  onPress={handleConfirm}
                  accessibilityRole="button"
                  accessibilityLabel={confirmText}
                  className={`min-h-14 items-center justify-center rounded-xl bg-brand-black px-4 py-3 ${
                    activeAlert.cancelText ? "flex-1" : "w-full"
                  }`}
                >
                  <Text className="text-center font-atkinson-bold text-[17px] text-brand-white">
                    {confirmText}
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      ) : null}
    </AppAlertContext.Provider>
  );
}

export function useAppAlert(): AppAlertContextValue {
  const context = useContext(AppAlertContext);

  if (context === null) {
    throw new Error("useAppAlert harus digunakan di dalam AppAlertProvider.");
  }

  return context;
}
