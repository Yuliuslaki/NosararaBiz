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
  accentColor: string;
  backgroundColor: string;
};

const AppAlertContext = createContext<AppAlertContextValue | null>(null);

const ALERT_TONE_APPEARANCE: Record<AppAlertTone, AlertToneAppearance> = {
  success: {
    symbol: "✓",
    accentColor: "#EC6426",
    backgroundColor: "#FDE3CF",
  },

  error: {
    symbol: "!",
    accentColor: "#632713",
    backgroundColor: "#FDE3CF",
  },

  warning: {
    symbol: "!",
    accentColor: "#F8A91F",
    backgroundColor: "#FFF4D6",
  },

  info: {
    symbol: "i",
    accentColor: "#EC6426",
    backgroundColor: "#FDE3CF",
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
              accessibilityLabel="Tutup notifikasi"
            />

            <View
              className="w-full max-w-sm overflow-hidden rounded-[28px] border-2 bg-brand-white"
              style={{
                borderColor: toneAppearance.accentColor,
              }}
            >
              <View
                className="items-center px-6 pb-5 pt-7"
                style={{
                  backgroundColor: toneAppearance.backgroundColor,
                }}
              >
                <View
                  className="h-16 w-16 items-center justify-center rounded-full"
                  style={{
                    backgroundColor: toneAppearance.accentColor,
                  }}
                >
                  <Text className="font-atkinson-bold text-[32px] leading-10 text-brand-white">
                    {toneAppearance.symbol}
                  </Text>
                </View>

                <Text className="mt-4 text-center font-atkinson-bold text-[22px] leading-7 text-brand-brown">
                  {activeAlert.title}
                </Text>
              </View>

              <View className="px-6 pb-6 pt-5">
                <Text className="text-center font-atkinson text-[16px] leading-6 text-brand-black">
                  {activeAlert.message}
                </Text>

                <View
                  className={`mt-6 ${
                    activeAlert.cancelText ? "flex-row gap-3" : ""
                  }`}
                >
                  {activeAlert.cancelText ? (
                    <Pressable
                      onPress={handleCancel}
                      className="min-h-12 flex-1 items-center justify-center rounded-2xl border-2 border-brand-orange bg-brand-white px-4 py-3"
                    >
                      <Text className="text-center font-atkinson-bold text-[16px] text-brand-orange">
                        {activeAlert.cancelText}
                      </Text>
                    </Pressable>
                  ) : null}

                  <Pressable
                    onPress={handleConfirm}
                    className={`min-h-12 items-center justify-center rounded-2xl bg-brand-orange px-4 py-3 ${
                      activeAlert.cancelText ? "flex-1" : "w-full"
                    }`}
                  >
                    <Text className="text-center font-atkinson-bold text-[16px] text-brand-white">
                      {confirmText}
                    </Text>
                  </Pressable>
                </View>
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
