import { useEffect, useRef } from "react";
import { BackHandler, Platform } from "react-native";

export function useAndroidBackButton(onBack: () => void): void {
  const onBackRef = useRef(onBack);

  useEffect(() => {
    onBackRef.current = onBack;
  }, [onBack]);

  useEffect(() => {
    if (Platform.OS !== "android") {
      return;
    }

    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        onBackRef.current();

        /*
         * true berarti event sudah ditangani
         * oleh aplikasi dan Android tidak
         * langsung menutup aplikasi.
         */
        return true;
      },
    );

    return () => {
      subscription.remove();
    };
  }, []);
}
