import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import QRCode from "react-native-qrcode-svg";

import { ScreenHeader } from "../../components/navigation/ScreenHeader";
import { useAndroidBackButton } from "../../hooks/useAndroidBackButton";
import type { QrisPrototypeSession } from "../../services/qrisPrototypeService";
import { PRODUCT_UNIT_LABELS, type ProductUnit } from "../../types/product";
import { formatCurrency } from "../../utils/formatters";

export type QrisPaymentItem = {
  productId: string;
  productName: string;
  saleUnit: ProductUnit;
  quantity: number;
  unitPrice: number;
};

type QrisPaymentScreenProps = {
  session: QrisPrototypeSession;
  items: QrisPaymentItem[];
  isSubmitting: boolean;
  errorMessage: string | null;
  onBack: () => void;
  onSessionExpired: () => void;
  onRegenerate: () => void;
  onSimulatePayment: () => void;
};

function formatRemainingTime(milliseconds: number): string {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000));

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function getStatusLabel(
  session: QrisPrototypeSession,
  hasExpiredByTime: boolean,
): string {
  if (session.status === "expired" || hasExpiredByTime) {
    return "Kedaluwarsa";
  }

  switch (session.status) {
    case "pending":
      return "Menunggu Pembayaran";

    case "paid":
      return "Pembayaran Berhasil";

    case "cancelled":
      return "Dibatalkan";

    default:
      return "Status Tidak Diketahui";
  }
}

export function QrisPaymentScreen({
  session,
  items,
  isSubmitting,
  errorMessage,
  onBack,
  onSessionExpired,
  onRegenerate,
  onSimulatePayment,
}: QrisPaymentScreenProps) {
  const [currentTime, setCurrentTime] = useState(Date.now());

  const expiredSessionIdRef = useRef<string | null>(null);

  useEffect(() => {
    setCurrentTime(Date.now());
    expiredSessionIdRef.current = null;

    const intervalId = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => {
      clearInterval(intervalId);
    };
  }, [session.id]);

  const remainingMilliseconds = Math.max(0, session.expiresAt - currentTime);

  const hasExpiredByTime =
    session.status === "pending" && remainingMilliseconds <= 0;

  const isExpired = session.status === "expired" || hasExpiredByTime;

  const isPending = session.status === "pending" && !isExpired;

  useEffect(() => {
    if (!hasExpiredByTime) {
      return;
    }

    if (expiredSessionIdRef.current === session.id) {
      return;
    }

    expiredSessionIdRef.current = session.id;
    onSessionExpired();
  }, [hasExpiredByTime, onSessionExpired, session.id]);

  const totalQuantity = useMemo(
    () => items.reduce((total, item) => total + item.quantity, 0),
    [items],
  );

  function handleBack(): void {
    if (isSubmitting) {
      return;
    }

    onBack();
  }

  useAndroidBackButton(handleBack);

  return (
    <ScrollView
      className="flex-1 bg-brand-cream"
      contentContainerStyle={{
        paddingHorizontal: 18,
        paddingTop: 32,
        paddingBottom: 56,
      }}
    >
      <View className="w-full max-w-md self-center">
        <ScreenHeader
          title="Pembayaran QRIS"
          description=""
          onBack={handleBack}
          disabled={isSubmitting}
        />

        <View className="mt-5 items-center rounded-3xl bg-brand-white p-5">
          <Text className="font-atkinson text-[14px] text-brand-black">
            Total pembayaran
          </Text>

          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.65}
            className="mt-1 font-atkinson-bold text-[31px] text-brand-orange"
          >
            {formatCurrency(session.totalAmount)}
          </Text>

          <View className="mt-4 rounded-full bg-brand-cream px-4 py-2">
            <Text
              className={`text-center font-atkinson-bold text-[14px] ${
                isExpired ? "text-brand-brown" : "text-brand-orange"
              }`}
            >
              {getStatusLabel(session, hasExpiredByTime)}
            </Text>
          </View>

          <View
            className={`mt-5 rounded-3xl border-2 p-4 ${
              isExpired
                ? "border-gray-300 bg-gray-100 opacity-50"
                : "border-brand-yellow bg-brand-white"
            }`}
          >
            <QRCode
              value={session.payload}
              size={230}
              color="#000000"
              backgroundColor="#FFFFFF"
              quietZone={8}
              ecl="M"
            />
          </View>

          <Text className="mt-4 font-atkinson text-[13px] text-brand-black">
            Nomor referensi
          </Text>

          <Text
            selectable
            className="mt-1 text-center font-atkinson-bold text-[15px] text-brand-brown"
          >
            {session.referenceNumber}
          </Text>

          <View
            className={`mt-5 w-full rounded-2xl p-4 ${
              isExpired ? "bg-gray-200" : "bg-brand-cream"
            }`}
          >
            <Text className="text-center font-atkinson text-[14px] text-brand-black">
              {isExpired
                ? "Kode pembayaran telah kedaluwarsa"
                : "Sisa waktu pembayaran"}
            </Text>

            <Text
              className={`mt-1 text-center font-atkinson-bold text-[30px] ${
                isExpired ? "text-brand-brown" : "text-brand-orange"
              }`}
            >
              {formatRemainingTime(remainingMilliseconds)}
            </Text>
          </View>
        </View>

        {errorMessage ? (
          <View className="mt-4 rounded-2xl border-2 border-brand-orange bg-brand-white p-4">
            <Text className="font-atkinson-bold text-[16px] text-brand-brown">
              Pembayaran belum dapat diproses
            </Text>

            <Text className="mt-2 font-atkinson text-[14px] leading-6 text-brand-black">
              {errorMessage}
            </Text>
          </View>
        ) : null}

        <View className="mt-4 rounded-3xl bg-brand-white p-5">
          <Text className="font-atkinson-bold text-[19px] text-brand-brown">
            Ringkasan Pesanan
          </Text>

          <Text className="mt-1 font-atkinson text-[14px] text-brand-black">
            {items.length} jenis produk dengan total kuantitas {totalQuantity}
          </Text>

          <View className="mt-4">
            {items.map((item) => {
              const unitLabel =
                PRODUCT_UNIT_LABELS[item.saleUnit].toLowerCase();

              return (
                <View
                  key={`${item.productId}:${item.saleUnit}`}
                  className="mb-3 rounded-2xl bg-brand-cream p-4"
                >
                  <View className="flex-row items-start justify-between">
                    <View className="mr-3 flex-1">
                      <Text className="font-atkinson-bold text-[16px] leading-5 text-brand-brown">
                        {item.productName}
                      </Text>

                      <Text className="mt-1 font-atkinson text-[13px] leading-5 text-brand-black">
                        {item.quantity} {unitLabel} ×{" "}
                        {formatCurrency(item.unitPrice)}
                      </Text>
                    </View>

                    <Text
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.7}
                      className="max-w-[135px] font-atkinson-bold text-[15px] text-brand-orange"
                    >
                      {formatCurrency(item.quantity * item.unitPrice)}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {isExpired ? (
          <Pressable
            onPress={onRegenerate}
            disabled={isSubmitting}
            accessibilityRole="button"
            accessibilityLabel="Buat ulang kode QRIS"
            className={`mt-5 min-h-14 items-center justify-center rounded-2xl bg-brand-orange px-5 py-4 ${
              isSubmitting ? "opacity-50" : ""
            }`}
          >
            {isSubmitting ? (
              <View className="flex-row items-center">
                <ActivityIndicator color="#FFFFFF" />

                <Text className="ml-3 font-atkinson-bold text-[17px] text-brand-white">
                  Membuat kode baru...
                </Text>
              </View>
            ) : (
              <Text className="text-center font-atkinson-bold text-[18px] text-brand-white">
                Buat Ulang Kode QR
              </Text>
            )}
          </Pressable>
        ) : null}

        {isPending ? (
          <Pressable
            onPress={onSimulatePayment}
            disabled={isSubmitting}
            accessibilityRole="button"
            accessibilityLabel="Konfirmasi pembayaran QRIS berhasil"
            className={`mt-5 min-h-14 items-center justify-center rounded-2xl bg-brand-orange px-5 py-4 ${
              isSubmitting ? "opacity-50" : ""
            }`}
          >
            {isSubmitting ? (
              <View className="flex-row items-center">
                <ActivityIndicator color="#FFFFFF" />

                <Text className="ml-3 font-atkinson-bold text-[17px] text-brand-white">
                  Memproses pembayaran...
                </Text>
              </View>
            ) : (
              <Text className="text-center font-atkinson-bold text-[18px] text-brand-white">
                Simulasikan Pembayaran Berhasil
              </Text>
            )}
          </Pressable>
        ) : null}

        <Pressable
          onPress={handleBack}
          disabled={isSubmitting}
          accessibilityRole="button"
          accessibilityLabel="Kembali ke keranjang"
          className={`mt-3 min-h-14 items-center justify-center rounded-2xl border border-brand-orange px-5 py-4 ${
            isSubmitting ? "opacity-50" : ""
          }`}
        >
          <Text className="font-atkinson-bold text-[17px] text-brand-brown">
            Kembali ke Keranjang
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
