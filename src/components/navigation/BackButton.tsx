import { Pressable, Text, View } from "react-native";

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
      hitSlop={{
        top: 8,
        right: 8,
        bottom: 8,
        left: 8,
      }}
      android_ripple={{
        color: "rgba(17, 17, 17, 0.12)",
      }}
      className={`min-h-12 self-start items-center justify-center rounded-xl border border-brand-black bg-brand-white px-4 py-3 ${
        disabled ? "opacity-40" : ""
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
          Kembali
        </Text>
      </View>
    </Pressable>
  );
}
