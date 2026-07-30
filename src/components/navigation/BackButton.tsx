import { Pressable, View } from "react-native";

type BackButtonProps = {
  onPress: () => void;
  disabled?: boolean;
};

const ARROW_COLOR = "#EC6426";

function BackArrowIcon() {
  return (
    <View
      pointerEvents="none"
      style={{
        width: 22,
        height: 18,
        position: "relative",
      }}
    >
      {/* Garis utama panah */}
      <View
        style={{
          position: "absolute",
          left: 2,
          top: 7.75,
          width: 18,
          height: 2.5,
          borderRadius: 999,
          backgroundColor: ARROW_COLOR,
        }}
      />

      {/* Garis panah bagian atas */}
      <View
        style={{
          position: "absolute",
          left: 1,
          top: 4,
          width: 10,
          height: 2.5,
          borderRadius: 999,
          backgroundColor: ARROW_COLOR,
          transform: [
            {
              rotate: "-45deg",
            },
          ],
        }}
      />

      {/* Garis panah bagian bawah */}
      <View
        style={{
          position: "absolute",
          left: 1,
          top: 11,
          width: 10,
          height: 2.5,
          borderRadius: 999,
          backgroundColor: ARROW_COLOR,
          transform: [
            {
              rotate: "45deg",
            },
          ],
        }}
      />
    </View>
  );
}

export function BackButton({ onPress, disabled = false }: BackButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel="Kembali"
      accessibilityState={{
        disabled,
      }}
      hitSlop={{
        top: 8,
        right: 8,
        bottom: 8,
        left: 8,
      }}
      android_ripple={{
        color: "rgba(236, 100, 38, 0.14)",
      }}
      className={`h-11 w-11 items-center justify-center overflow-hidden rounded-xl border-2 border-brand-orange bg-brand-white ${
        disabled ? "opacity-40" : ""
      }`}
    >
      <BackArrowIcon />
    </Pressable>
  );
}
