import "./global.css";

import { useEffect, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { Pressable, Text, View } from "react-native";

import { AppAlertProvider } from "./src/components/alerts/AppAlertProvider";
import { DatabaseMigrationGate } from "./src/components/DatabaseMigrationGate";
import { InitialSetupScreen } from "./src/screens/auth/InitialSetupScreen";
import { LoginScreen } from "./src/screens/auth/LoginScreen";
import { AddExpenseScreen } from "./src/screens/owner/AddExpenseScreen";
import { AddProductScreen } from "./src/screens/owner/AddProductScreen";
import { CashBookScreen } from "./src/screens/owner/CashBookScreen";
import { OwnerHomeScreen } from "./src/screens/owner/OwnerHomeScreen";
import { ProductListScreen } from "./src/screens/owner/ProductListScreen";
import { StockHistoryScreen } from "./src/screens/owner/StockHistoryScreen";
import { TransactionHistoryScreen } from "./src/screens/owner/TransactionHistoryScreen";
import { SaleScreen } from "./src/screens/sales/SaleScreen";
import type { AuthenticatedUser } from "./src/services/authService";
import {
  getInitialSetupState,
  type InitialSetupState,
} from "./src/services/setupService";
import { USER_ROLES } from "./src/types/user";

SplashScreen.preventAutoHideAsync().catch(() => {
  // Splash screen mungkin sudah ditangani sistem.
});

type OwnerScreen =
  | "home"
  | "sales"
  | "products"
  | "add-product"
  | "stock-history"
  | "transaction-history"
  | "cash-book"
  | "add-expense";

function AppContent() {
  const [setupState, setSetupState] = useState<InitialSetupState>(() =>
    getInitialSetupState(),
  );

  const [authenticatedUser, setAuthenticatedUser] =
    useState<AuthenticatedUser | null>(null);

  const [ownerScreen, setOwnerScreen] = useState<OwnerScreen>("home");

  function handleSetupCompleted(): void {
    setSetupState(getInitialSetupState());

    setAuthenticatedUser(null);
    setOwnerScreen("home");
  }

  function handleLoginSuccess(user: AuthenticatedUser): void {
    setAuthenticatedUser(user);
    setOwnerScreen("home");
  }

  function handleLogout(): void {
    setAuthenticatedUser(null);
    setOwnerScreen("home");
  }

  function handleOpenSales(): void {
    setOwnerScreen("sales");
  }

  function handleOpenProducts(): void {
    setOwnerScreen("products");
  }

  function handleOpenAddProduct(): void {
    setOwnerScreen("add-product");
  }

  function handleOpenStockHistory(): void {
    setOwnerScreen("stock-history");
  }

  function handleOpenTransactionHistory(): void {
    setOwnerScreen("transaction-history");
  }

  function handleOpenCashBook(): void {
    setOwnerScreen("cash-book");
  }

  function handleOpenAddExpense(): void {
    setOwnerScreen("add-expense");
  }

  function handleBackToOwnerHome(): void {
    setOwnerScreen("home");
  }

  function handleBackToProducts(): void {
    setOwnerScreen("products");
  }

  function handleBackToCashBook(): void {
    setOwnerScreen("cash-book");
  }

  function handleProductCreated(): void {
    setOwnerScreen("products");
  }

  function handleExpenseCreated(): void {
    setOwnerScreen("cash-book");
  }

  if (setupState.isInconsistent) {
    return (
      <View className="flex-1 items-center justify-center bg-brand-cream px-6">
        <StatusBar style="dark" />

        <View className="w-full max-w-md rounded-3xl bg-brand-white p-7">
          <Text className="text-center font-atkinson-bold text-[26px] leading-8 text-brand-brown">
            Data pengaturan tidak konsisten
          </Text>

          <Text className="mt-4 text-center font-atkinson text-[16px] leading-7 text-brand-black">
            Konfigurasi usaha dan akun Owner tidak sesuai. Jangan membuat akun
            baru sebelum data diperiksa.
          </Text>

          <View className="mt-5 rounded-2xl border-2 border-brand-yellow bg-brand-cream p-4">
            <Text className="text-center font-atkinson text-[15px] leading-6 text-brand-brown">
              Status ini mencegah aplikasi mengganti akun atau kunci keamanan
              secara tidak sengaja.
            </Text>
          </View>
        </View>
      </View>
    );
  }

  if (setupState.isRequired) {
    return (
      <>
        <StatusBar style="dark" />

        <InitialSetupScreen onSetupCompleted={handleSetupCompleted} />
      </>
    );
  }

  if (authenticatedUser === null) {
    return (
      <>
        <StatusBar style="dark" />

        <LoginScreen onLoginSuccess={handleLoginSuccess} />
      </>
    );
  }

  if (authenticatedUser.role === USER_ROLES.OWNER) {
    if (ownerScreen === "sales") {
      return (
        <>
          <StatusBar style="dark" />

          <SaleScreen user={authenticatedUser} onBack={handleBackToOwnerHome} />
        </>
      );
    }

    if (ownerScreen === "products") {
      return (
        <>
          <StatusBar style="dark" />

          <ProductListScreen
            user={authenticatedUser}
            onBack={handleBackToOwnerHome}
            onAddProduct={handleOpenAddProduct}
            onOpenStockHistory={handleOpenStockHistory}
          />
        </>
      );
    }

    if (ownerScreen === "add-product") {
      return (
        <>
          <StatusBar style="dark" />

          <AddProductScreen
            user={authenticatedUser}
            onBack={handleBackToProducts}
            onProductCreated={handleProductCreated}
          />
        </>
      );
    }

    if (ownerScreen === "stock-history") {
      return (
        <>
          <StatusBar style="dark" />

          <StockHistoryScreen onBack={handleBackToProducts} />
        </>
      );
    }

    if (ownerScreen === "transaction-history") {
      return (
        <>
          <StatusBar style="dark" />

          <TransactionHistoryScreen onBack={handleBackToOwnerHome} />
        </>
      );
    }

    if (ownerScreen === "cash-book") {
      return (
        <>
          <StatusBar style="dark" />

          <CashBookScreen
            onBack={handleBackToOwnerHome}
            onAddExpense={handleOpenAddExpense}
          />
        </>
      );
    }

    if (ownerScreen === "add-expense") {
      return (
        <>
          <StatusBar style="dark" />

          <AddExpenseScreen
            user={authenticatedUser}
            onBack={handleBackToCashBook}
            onExpenseCreated={handleExpenseCreated}
          />
        </>
      );
    }

    return (
      <>
        <StatusBar style="dark" />

        <OwnerHomeScreen
          user={authenticatedUser}
          onOpenSales={handleOpenSales}
          onOpenProducts={handleOpenProducts}
          onOpenTransactionHistory={handleOpenTransactionHistory}
          onOpenCashBook={handleOpenCashBook}
          onLogout={handleLogout}
        />
      </>
    );
  }

  return (
    <View className="flex-1 items-center justify-center bg-brand-cream px-6">
      <StatusBar style="dark" />

      <View className="w-full max-w-md rounded-3xl bg-brand-white p-7">
        <Text className="text-center font-atkinson-bold text-[28px] text-brand-brown">
          Dashboard Officer
        </Text>

        <Text className="mt-4 text-center font-atkinson text-[17px] leading-7 text-brand-black">
          Selamat datang, {authenticatedUser.fullName}.
        </Text>

        <Text className="mt-3 text-center font-atkinson text-[15px] leading-6 text-brand-black">
          Dashboard Officer akan dibuat setelah fitur Owner dasar selesai.
        </Text>

        <Pressable
          onPress={handleLogout}
          accessibilityRole="button"
          accessibilityLabel="Keluar dari akun"
          className="mt-7 min-h-14 items-center justify-center rounded-2xl border-2 border-brand-orange px-5 py-4"
        >
          <Text className="font-atkinson-bold text-[18px] text-brand-orange">
            Keluar dari Akun
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    "AtkinsonHyperlegible-Regular": require("./assets/fonts/AtkinsonHyperlegible-Regular.ttf"),

    "AtkinsonHyperlegible-Bold": require("./assets/fonts/AtkinsonHyperlegible-Bold.ttf"),
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync().catch(() => {
        // Splash screen mungkin sudah ditutup.
      });
    }
  }, [fontsLoaded, fontError]);

  if (fontError) {
    throw fontError;
  }

  if (!fontsLoaded) {
    return null;
  }

  return (
    <DatabaseMigrationGate>
      <AppAlertProvider>
        <AppContent />
      </AppAlertProvider>
    </DatabaseMigrationGate>
  );
}
