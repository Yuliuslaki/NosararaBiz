import { Pressable, Text } from "react-native";

type BackButtonProps = {
  onPress: () => void;
  disabled?: boolean;
};

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
      hitSlop={12}
      android_ripple={{
        color: "rgba(236, 100, 38, 0.16)",
        borderless: true,
      }}
      className={`h-11 w-11 items-center justify-center ${
        disabled ? "opacity-40" : ""
      }`}
    >
      <Text className="font-atkinson-bold text-[30px] leading-9 text-brand-orange">
        ←
      </Text>
    </Pressable>
  );
}
