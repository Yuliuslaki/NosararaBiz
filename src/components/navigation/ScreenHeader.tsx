import { Text, View } from "react-native";

import { BackButton } from "./BackButton";

type ScreenHeaderProps = {
  title: string;
  description?: string;
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
    <View>
      <BackButton onPress={onBack} disabled={disabled} />

      <View className="mt-5 border-b border-brand-black pb-4">
        <Text className="font-atkinson-bold text-[28px] leading-[34px] text-brand-black">
          {title}
        </Text>

        {description ? (
          <Text className="mt-2 font-atkinson text-[16px] leading-6 text-brand-black">
            {description}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
