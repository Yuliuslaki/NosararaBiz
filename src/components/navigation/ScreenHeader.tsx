import { Text, View } from "react-native";

import { BackButton } from "./BackButton";

type ScreenHeaderProps = {
  title: string;
  description: string;
  onBack: () => void;
  disabled?: boolean;
};

export function ScreenHeader({
  title,
  description,
  onBack,
  disabled = false,
}: ScreenHeaderProps) {
  return (
    <View className="flex-row items-start">
      <View className="mt-2">
        <BackButton onPress={onBack} disabled={disabled} />
      </View>

      <View className="ml-3 flex-1 pt-2">
        <Text className="font-atkinson-bold text-[25px] leading-[30px] text-brand-brown">
          {title}
        </Text>

        <Text className="mt-1 font-atkinson text-[14px] leading-5 text-brand-black">
          {description}
        </Text>
      </View>
    </View>
  );
}
