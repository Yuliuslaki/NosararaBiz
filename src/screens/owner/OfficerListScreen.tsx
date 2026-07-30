import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import { useAppAlert } from "../../components/alerts/AppAlertProvider";
import { ScreenHeader } from "../../components/navigation/ScreenHeader";
import {
  PinConfirmationModal,
  type PinConfirmationMode,
} from "../../components/security/PinConfirmationModal";
import { useAndroidBackButton } from "../../hooks/useAndroidBackButton";
import type { AuthenticatedUser } from "../../services/authService";
import {
  changeOfficerPin,
  deleteOfficer,
  getOfficerAccounts,
  setOfficerActive,
  updateOfficerIdentity,
  type OfficerAccount,
} from "../../services/officerService";

type OfficerListScreenProps = {
  user: AuthenticatedUser;
  onBack: () => void;
  onAddOfficer: () => void;
};

type OfficerSummary = {
  totalOfficers: number;
  activeOfficers: number;
  inactiveOfficers: number;
};

type SummaryCardProps = {
  label: string;
  value: number;
};

type OfficerCardProps = {
  officer: OfficerAccount;
  disabled: boolean;
  menuIsOpen: boolean;
  onToggleMenu: (officerId: string) => void;
  onEdit: (officer: OfficerAccount) => void;
  onChangePin: (officer: OfficerAccount) => void;
  onToggleActive: (officer: OfficerAccount) => void;
  onDelete: (officer: OfficerAccount) => void;
};

type PendingOfficerAction = "change-pin" | "toggle-active" | "delete" | null;

type OfficerConfirmationMode = Extract<
  PinConfirmationMode,
  | "change-officer-pin"
  | "activate-officer"
  | "deactivate-officer"
  | "delete-officer"
>;

const EMPTY_SUMMARY: OfficerSummary = {
  totalOfficers: 0,
  activeOfficers: 0,
  inactiveOfficers: 0,
};

function createOfficerSummary(officers: OfficerAccount[]): OfficerSummary {
  const activeOfficers = officers.filter((officer) => officer.isActive).length;

  return {
    totalOfficers: officers.length,
    activeOfficers,
    inactiveOfficers: officers.length - activeOfficers,
  };
}

function formatDateTime(timestamp: number | null): string {
  if (timestamp === null) {
    return "Belum pernah masuk";
  }

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

function keepPinDigitsOnly(value: string): string {
  return value.replace(/\D/g, "").slice(0, 6);
}

function normalizeUsernameInput(value: string): string {
  return value.toLowerCase().replace(/\s+/g, "").slice(0, 30);
}

function SummaryCard({ label, value }: SummaryCardProps) {
  return (
    <View className="h-[108px] flex-1 justify-between rounded-2xl bg-brand-cream px-3 py-3">
      <Text
        numberOfLines={2}
        className="min-h-[32px] font-atkinson text-[12px] leading-4 text-brand-black"
      >
        {label}
      </Text>

      <Text className="font-atkinson-bold text-[18px] leading-5 text-brand-brown">
        {value}
      </Text>
    </View>
  );
}

function OfficerCard({
  officer,
  disabled,
  menuIsOpen,
  onToggleMenu,
  onEdit,
  onChangePin,
  onToggleActive,
  onDelete,
}: OfficerCardProps) {
  return (
    <View className="mb-4 rounded-3xl border-2 border-brand-yellow bg-brand-white p-4">
      <View className="flex-row items-start justify-between">
        <View className="mr-3 flex-1">
          <Text className="font-atkinson-bold text-[18px] leading-6 text-brand-brown">
            {officer.fullName}
          </Text>

          <Text className="mt-1 font-atkinson text-[14px] leading-5 text-brand-black">
            @{officer.username}
          </Text>
        </View>

        <View
          className={`rounded-full px-3 py-1.5 ${
            officer.isActive ? "bg-brand-cream" : "bg-gray-200"
          }`}
        >
          <Text className="font-atkinson-bold text-[12px] text-brand-brown">
            {officer.isActive ? "Aktif" : "Nonaktif"}
          </Text>
        </View>
      </View>

      <View className="mt-4 rounded-2xl bg-brand-cream p-3">
        <Text className="font-atkinson text-[13px] text-brand-black">
          Peran akun
        </Text>

        <Text className="mt-1 font-atkinson-bold text-[17px] text-brand-brown">
          Officer
        </Text>
      </View>

      <View className="mt-3">
        <Text className="font-atkinson text-[14px] leading-6 text-brand-black">
          Terakhir masuk: {formatDateTime(officer.lastLoginAt)}
        </Text>

        <Text className="font-atkinson text-[14px] leading-6 text-brand-black">
          Dibuat: {formatDateTime(officer.createdAt)}
        </Text>
      </View>

      <Pressable
        onPress={() => {
          onToggleMenu(officer.id);
        }}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={`Kelola akun ${officer.fullName}`}
        accessibilityState={{
          expanded: menuIsOpen,
        }}
        className={`mt-4 min-h-12 flex-row items-center justify-between rounded-2xl border-2 border-brand-orange bg-brand-white px-4 py-3 ${
          disabled ? "opacity-50" : ""
        }`}
      >
        <Text className="font-atkinson-bold text-[16px] text-brand-orange">
          Kelola Akun
        </Text>

        <Text className="font-atkinson-bold text-[22px] leading-6 text-brand-orange">
          {menuIsOpen ? "⌃" : "⌄"}
        </Text>
      </Pressable>

      {menuIsOpen ? (
        <View className="mt-2 rounded-2xl border-2 border-brand-yellow bg-brand-white p-2">
          <Pressable
            onPress={() => {
              onEdit(officer);
            }}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel={`Edit identitas ${officer.fullName}`}
            className={`min-h-12 justify-center rounded-xl border border-brand-yellow bg-brand-white px-4 py-3 ${
              disabled ? "opacity-50" : ""
            }`}
          >
            <Text className="font-atkinson-bold text-[15px] text-brand-brown">
              Edit Identitas
            </Text>

            <Text className="mt-1 font-atkinson text-[13px] leading-5 text-brand-black">
              Ubah nama lengkap dan username.
            </Text>
          </Pressable>

          <Pressable
            onPress={() => {
              onChangePin(officer);
            }}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel={`Ganti PIN ${officer.fullName}`}
            className={`mt-2 min-h-12 justify-center rounded-xl border border-brand-yellow bg-brand-white px-4 py-3 ${
              disabled ? "opacity-50" : ""
            }`}
          >
            <Text className="font-atkinson-bold text-[15px] text-brand-brown">
              Ganti PIN
            </Text>

            <Text className="mt-1 font-atkinson text-[13px] leading-5 text-brand-black">
              Buat PIN baru untuk akun Officer.
            </Text>
          </Pressable>

          <Pressable
            onPress={() => {
              onToggleActive(officer);
            }}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel={
              officer.isActive
                ? `Nonaktifkan ${officer.fullName}`
                : `Aktifkan ${officer.fullName}`
            }
            className={`mt-2 min-h-12 justify-center rounded-xl border border-brand-yellow bg-brand-white px-4 py-3 ${
              disabled ? "opacity-50" : ""
            }`}
          >
            <Text className="font-atkinson-bold text-[15px] text-brand-brown">
              {officer.isActive ? "Nonaktifkan Akun" : "Aktifkan Akun"}
            </Text>

            <Text className="mt-1 font-atkinson text-[13px] leading-5 text-brand-black">
              {officer.isActive
                ? "Officer tidak dapat login selama akun dinonaktifkan."
                : "Izinkan Officer menggunakan akun kembali."}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => {
              onDelete(officer);
            }}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel={`Hapus ${officer.fullName}`}
            className={`mt-2 min-h-12 justify-center rounded-xl border border-brand-yellow bg-brand-white px-4 py-3 ${
              disabled ? "opacity-50" : ""
            }`}
          >
            <Text className="font-atkinson-bold text-[15px] text-brand-brown">
              Hapus Officer
            </Text>

            <Text className="mt-1 font-atkinson text-[13px] leading-5 text-brand-black">
              Hapus akun tanpa menghapus riwayat transaksi.
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

export function OfficerListScreen({
  user,
  onBack,
  onAddOfficer,
}: OfficerListScreenProps) {
  const { showAlert } = useAppAlert();

  const [officers, setOfficers] = useState<OfficerAccount[]>([]);
  const [summary, setSummary] = useState<OfficerSummary>(EMPTY_SUMMARY);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [openOfficerMenuId, setOpenOfficerMenuId] = useState<string | null>(
    null,
  );

  const [selectedOfficer, setSelectedOfficer] = useState<OfficerAccount | null>(
    null,
  );

  const [identityModalVisible, setIdentityModalVisible] = useState(false);
  const [identityFullName, setIdentityFullName] = useState("");
  const [identityUsername, setIdentityUsername] = useState("");
  const [identityError, setIdentityError] = useState<string | null>(null);

  const [pinEditorVisible, setPinEditorVisible] = useState(false);
  const [newOfficerPin, setNewOfficerPin] = useState("");
  const [newOfficerPinConfirmation, setNewOfficerPinConfirmation] =
    useState("");
  const [pinEditorError, setPinEditorError] = useState<string | null>(null);

  const [confirmationVisible, setConfirmationVisible] = useState(false);
  const [confirmationMode, setConfirmationMode] =
    useState<OfficerConfirmationMode>("deactivate-officer");
  const [pendingAction, setPendingAction] =
    useState<PendingOfficerAction>(null);
  const [confirmationError, setConfirmationError] = useState<string | null>(
    null,
  );

  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadOfficers = useCallback((): void => {
    try {
      const officerAccounts = getOfficerAccounts(user);

      setOfficers(officerAccounts);
      setSummary(createOfficerSummary(officerAccounts));
      setErrorMessage(null);
      setOpenOfficerMenuId(null);
    } catch (error) {
      setOfficers([]);
      setSummary(EMPTY_SUMMARY);
      setOpenOfficerMenuId(null);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Daftar Officer tidak dapat dimuat.",
      );
    }
  }, [user]);

  useEffect(() => {
    loadOfficers();

    const appStateSubscription = AppState.addEventListener(
      "change",
      (nextAppState) => {
        if (nextAppState === "active") {
          loadOfficers();
        }
      },
    );

    return () => {
      appStateSubscription.remove();
    };
  }, [loadOfficers]);

  function toggleOfficerMenu(officerId: string): void {
    if (isSubmitting) {
      return;
    }

    setOpenOfficerMenuId((currentOfficerId) =>
      currentOfficerId === officerId ? null : officerId,
    );
  }

  function resetSelectedOfficer(): void {
    setSelectedOfficer(null);
    setOpenOfficerMenuId(null);

    setIdentityFullName("");
    setIdentityUsername("");
    setIdentityError(null);

    setNewOfficerPin("");
    setNewOfficerPinConfirmation("");
    setPinEditorError(null);

    setPendingAction(null);
    setConfirmationError(null);
  }

  function closeIdentityModal(): void {
    if (isSubmitting) {
      return;
    }

    setIdentityModalVisible(false);
    resetSelectedOfficer();
  }

  function closePinEditor(): void {
    if (isSubmitting) {
      return;
    }

    setPinEditorVisible(false);
    resetSelectedOfficer();
  }

  function closeConfirmation(): void {
    if (isSubmitting) {
      return;
    }

    setConfirmationVisible(false);
    resetSelectedOfficer();
  }

  function handleBack(): void {
    if (isSubmitting) {
      return;
    }

    if (confirmationVisible) {
      closeConfirmation();
      return;
    }

    if (pinEditorVisible) {
      closePinEditor();
      return;
    }

    if (identityModalVisible) {
      closeIdentityModal();
      return;
    }

    if (openOfficerMenuId !== null) {
      setOpenOfficerMenuId(null);
      return;
    }

    onBack();
  }

  useAndroidBackButton(handleBack);

  function handleAddOfficer(): void {
    if (isSubmitting) {
      return;
    }

    setOpenOfficerMenuId(null);
    onAddOfficer();
  }

  function openIdentityEditor(officer: OfficerAccount): void {
    setOpenOfficerMenuId(null);
    setSelectedOfficer(officer);
    setIdentityFullName(officer.fullName);
    setIdentityUsername(officer.username);
    setIdentityError(null);
    setIdentityModalVisible(true);
  }

  function openPinEditor(officer: OfficerAccount): void {
    setOpenOfficerMenuId(null);
    setSelectedOfficer(officer);
    setNewOfficerPin("");
    setNewOfficerPinConfirmation("");
    setPinEditorError(null);
    setPinEditorVisible(true);
  }

  function openStatusConfirmation(officer: OfficerAccount): void {
    setOpenOfficerMenuId(null);
    setSelectedOfficer(officer);
    setPendingAction("toggle-active");

    setConfirmationMode(
      officer.isActive ? "deactivate-officer" : "activate-officer",
    );

    setConfirmationError(null);
    setConfirmationVisible(true);
  }

  function openDeleteConfirmation(officer: OfficerAccount): void {
    setOpenOfficerMenuId(null);
    setSelectedOfficer(officer);
    setPendingAction("delete");
    setConfirmationMode("delete-officer");
    setConfirmationError(null);
    setConfirmationVisible(true);
  }

  async function handleSaveIdentity(): Promise<void> {
    if (
      selectedOfficer === null ||
      identityFullName.trim().length < 2 ||
      identityUsername.trim().length < 3 ||
      isSubmitting
    ) {
      return;
    }

    Keyboard.dismiss();
    setIsSubmitting(true);
    setIdentityError(null);

    try {
      const updatedOfficer = updateOfficerIdentity({
        officerId: selectedOfficer.id,
        fullName: identityFullName,
        username: identityUsername,
        performedBy: user,
      });

      setIdentityModalVisible(false);
      resetSelectedOfficer();
      loadOfficers();

      showAlert({
        tone: "success",
        title: "Identitas Officer diperbarui",
        message: `Data akun ${updatedOfficer.fullName} berhasil diperbarui.`,
        confirmText: "OK",
      });
    } catch (error) {
      setIdentityError(
        error instanceof Error
          ? error.message
          : "Identitas Officer belum dapat diperbarui.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function continueToPinConfirmation(): void {
    if (
      selectedOfficer === null ||
      newOfficerPin.length !== 6 ||
      newOfficerPinConfirmation.length !== 6
    ) {
      return;
    }

    if (newOfficerPin !== newOfficerPinConfirmation) {
      setNewOfficerPinConfirmation("");
      setPinEditorError("PIN baru dan konfirmasi PIN harus sama.");

      return;
    }

    Keyboard.dismiss();
    setPinEditorError(null);
    setPinEditorVisible(false);
    setPendingAction("change-pin");
    setConfirmationMode("change-officer-pin");
    setConfirmationError(null);
    setConfirmationVisible(true);
  }

  async function handleOwnerPinConfirmation(ownerPin: string): Promise<void> {
    if (selectedOfficer === null || pendingAction === null || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setConfirmationError(null);

    try {
      if (pendingAction === "change-pin") {
        await changeOfficerPin({
          officerId: selectedOfficer.id,
          pin: newOfficerPin,
          pinConfirmation: newOfficerPinConfirmation,
          ownerPin,
          performedBy: user,
        });

        setConfirmationVisible(false);
        resetSelectedOfficer();
        loadOfficers();

        showAlert({
          tone: "success",
          title: "PIN Officer berhasil diganti",
          message: `PIN akun ${selectedOfficer.fullName} berhasil diperbarui.`,
          confirmText: "OK",
        });

        return;
      }

      if (pendingAction === "toggle-active") {
        const newActiveStatus = !selectedOfficer.isActive;

        await setOfficerActive({
          officerId: selectedOfficer.id,
          isActive: newActiveStatus,
          ownerPin,
          performedBy: user,
        });

        setConfirmationVisible(false);
        resetSelectedOfficer();
        loadOfficers();

        showAlert({
          tone: "success",
          title: newActiveStatus
            ? "Akun Officer diaktifkan"
            : "Akun Officer dinonaktifkan",
          message: newActiveStatus
            ? `Akun ${selectedOfficer.fullName} sudah dapat digunakan kembali.`
            : `Akun ${selectedOfficer.fullName} tidak dapat digunakan untuk login selama berstatus nonaktif.`,
          confirmText: "OK",
        });

        return;
      }

      if (pendingAction === "delete") {
        await deleteOfficer({
          officerId: selectedOfficer.id,
          ownerPin,
          performedBy: user,
        });

        setConfirmationVisible(false);
        resetSelectedOfficer();
        loadOfficers();

        showAlert({
          tone: "success",
          title: "Akun Officer dihapus",
          message: `Akun ${selectedOfficer.fullName} berhasil dihapus. Riwayat transaksi tetap disimpan.`,
          confirmText: "OK",
        });
      }
    } catch (error) {
      setConfirmationError(
        error instanceof Error
          ? error.message
          : "Tindakan belum dapat diselesaikan.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const identityFormIsComplete =
    identityFullName.trim().length >= 2 && identityUsername.trim().length >= 3;

  const identitySubmitIsDisabled = isSubmitting || !identityFormIsComplete;

  const pinFormIsComplete =
    newOfficerPin.length === 6 && newOfficerPinConfirmation.length === 6;

  const pinContinueIsDisabled = isSubmitting || !pinFormIsComplete;

  return (
    <>
      <ScrollView
        className="flex-1 bg-brand-cream"
        contentContainerStyle={{
          paddingHorizontal: 18,
          paddingTop: 32,
          paddingBottom: 48,
        }}
      >
        <View className="w-full max-w-md self-center">
          <ScreenHeader
            title="Kelola Officer"
            description="Kelola akun petugas yang menangani transaksi penjualan."
            onBack={handleBack}
            disabled={isSubmitting}
          />

          <View className="mt-5 rounded-3xl bg-brand-white p-4">
            <Text className="font-atkinson-bold text-[18px] text-brand-brown">
              Ringkasan Officer
            </Text>

            <View className="mt-3 flex-row gap-2">
              <SummaryCard label="Semua" value={summary.totalOfficers} />

              <SummaryCard label="Aktif" value={summary.activeOfficers} />

              <SummaryCard label="Nonaktif" value={summary.inactiveOfficers} />
            </View>
          </View>

          <Pressable
            onPress={handleAddOfficer}
            disabled={isSubmitting}
            accessibilityRole="button"
            accessibilityLabel="Tambah Officer"
            className={`mt-4 min-h-12 items-center justify-center rounded-2xl bg-brand-orange px-5 py-3 ${
              isSubmitting ? "opacity-50" : ""
            }`}
          >
            <Text className="font-atkinson-bold text-[17px] text-brand-white">
              Tambah Officer
            </Text>
          </Pressable>

          {errorMessage ? (
            <View className="mt-4 rounded-3xl border-2 border-brand-orange bg-brand-white p-5">
              <Text className="font-atkinson-bold text-[18px] text-brand-brown">
                Daftar Officer belum dapat dimuat
              </Text>

              <Text className="mt-2 font-atkinson text-[15px] leading-6 text-brand-black">
                {errorMessage}
              </Text>

              <Pressable
                onPress={loadOfficers}
                accessibilityRole="button"
                accessibilityLabel="Muat ulang daftar Officer"
                className="mt-4 min-h-12 items-center justify-center rounded-2xl border-2 border-brand-orange bg-brand-white px-4 py-3"
              >
                <Text className="font-atkinson-bold text-[16px] text-brand-orange">
                  Muat Ulang
                </Text>
              </Pressable>
            </View>
          ) : officers.length === 0 ? (
            <View className="mt-4 rounded-3xl border-2 border-brand-yellow bg-brand-white p-5">
              <Text className="text-center font-atkinson-bold text-[20px] text-brand-brown">
                Belum ada Officer
              </Text>

              <Text className="mt-2 text-center font-atkinson text-[15px] leading-6 text-brand-black">
                Tambahkan akun Officer pertama agar petugas dapat masuk dan
                mencatat transaksi penjualan.
              </Text>
            </View>
          ) : (
            <View className="mt-6">
              <Text className="mb-3 font-atkinson-bold text-[20px] text-brand-brown">
                Daftar Officer
              </Text>

              {officers.map((officer) => (
                <OfficerCard
                  key={officer.id}
                  officer={officer}
                  disabled={isSubmitting}
                  menuIsOpen={openOfficerMenuId === officer.id}
                  onToggleMenu={toggleOfficerMenu}
                  onEdit={openIdentityEditor}
                  onChangePin={openPinEditor}
                  onToggleActive={openStatusConfirmation}
                  onDelete={openDeleteConfirmation}
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      <Modal
        visible={identityModalVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={closeIdentityModal}
      >
        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View className="flex-1 items-center justify-center bg-black/50 px-6">
            <Pressable
              onPress={closeIdentityModal}
              disabled={isSubmitting}
              className="absolute inset-0"
              accessibilityRole="button"
              accessibilityLabel="Tutup edit identitas Officer"
            />

            <View className="w-full max-w-sm rounded-3xl border-2 border-brand-orange bg-brand-white p-6">
              <Text className="text-center font-atkinson-bold text-[22px] text-brand-brown">
                Edit Identitas Officer
              </Text>

              <Text className="mt-5 font-atkinson-bold text-[16px] text-brand-brown">
                Nama lengkap
              </Text>

              <TextInput
                value={identityFullName}
                onChangeText={(value) => {
                  setIdentityFullName(value);
                  setIdentityError(null);
                }}
                editable={!isSubmitting}
                maxLength={100}
                placeholder="Masukkan nama lengkap"
                placeholderTextColor="#777777"
                autoCapitalize="words"
                autoCorrect={false}
                selectionColor="#EC6426"
                className="mt-2 min-h-14 rounded-2xl border-2 border-brand-yellow px-4 py-3 font-atkinson text-[17px] text-brand-black"
              />

              <Text className="mt-5 font-atkinson-bold text-[16px] text-brand-brown">
                Username
              </Text>

              <TextInput
                value={identityUsername}
                onChangeText={(value) => {
                  setIdentityUsername(normalizeUsernameInput(value));
                  setIdentityError(null);
                }}
                editable={!isSubmitting}
                maxLength={30}
                placeholder="Masukkan username"
                placeholderTextColor="#777777"
                autoCapitalize="none"
                autoCorrect={false}
                selectionColor="#EC6426"
                className="mt-2 min-h-14 rounded-2xl border-2 border-brand-yellow px-4 py-3 font-atkinson text-[17px] text-brand-black"
              />

              {identityError ? (
                <View className="mt-4 rounded-2xl border-2 border-brand-orange bg-brand-cream p-4">
                  <Text className="text-center font-atkinson-bold text-[14px] leading-5 text-brand-brown">
                    {identityError}
                  </Text>
                </View>
              ) : null}

              <View className="mt-6 flex-row gap-3">
                <Pressable
                  onPress={closeIdentityModal}
                  disabled={isSubmitting}
                  className={`min-h-12 flex-1 items-center justify-center rounded-2xl border-2 border-brand-orange bg-brand-white px-3 py-3 ${
                    isSubmitting ? "opacity-50" : ""
                  }`}
                >
                  <Text className="font-atkinson-bold text-[16px] text-brand-orange">
                    Batal
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => {
                    void handleSaveIdentity();
                  }}
                  disabled={identitySubmitIsDisabled}
                  className={`min-h-12 flex-1 items-center justify-center rounded-2xl bg-brand-orange px-3 py-3 ${
                    identitySubmitIsDisabled ? "opacity-50" : ""
                  }`}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text className="font-atkinson-bold text-[16px] text-brand-white">
                      Simpan
                    </Text>
                  )}
                </Pressable>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={pinEditorVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={closePinEditor}
      >
        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View className="flex-1 items-center justify-center bg-black/50 px-6">
            <Pressable
              onPress={closePinEditor}
              disabled={isSubmitting}
              className="absolute inset-0"
              accessibilityRole="button"
              accessibilityLabel="Tutup perubahan PIN Officer"
            />

            <View className="w-full max-w-sm rounded-3xl border-2 border-brand-orange bg-brand-white p-6">
              <Text className="text-center font-atkinson-bold text-[22px] text-brand-brown">
                Ganti PIN Officer
              </Text>

              <Text className="mt-3 text-center font-atkinson text-[15px] leading-6 text-brand-black">
                Masukkan PIN baru untuk akun{" "}
                {selectedOfficer?.fullName ?? "Officer"}.
              </Text>

              <Text className="mt-5 font-atkinson-bold text-[16px] text-brand-brown">
                PIN baru
              </Text>

              <TextInput
                value={newOfficerPin}
                onChangeText={(value) => {
                  setNewOfficerPin(keepPinDigitsOnly(value));
                  setPinEditorError(null);
                }}
                editable={!isSubmitting}
                maxLength={6}
                placeholder="Masukkan PIN baru"
                placeholderTextColor="#777777"
                keyboardType="number-pad"
                secureTextEntry
                selectionColor="#EC6426"
                className="mt-2 min-h-14 rounded-2xl border-2 border-brand-yellow px-4 py-3 font-atkinson text-[17px] text-brand-black"
              />

              <Text className="mt-5 font-atkinson-bold text-[16px] text-brand-brown">
                Konfirmasi PIN baru
              </Text>

              <TextInput
                value={newOfficerPinConfirmation}
                onChangeText={(value) => {
                  setNewOfficerPinConfirmation(keepPinDigitsOnly(value));
                  setPinEditorError(null);
                }}
                editable={!isSubmitting}
                maxLength={6}
                placeholder="Masukkan kembali PIN baru"
                placeholderTextColor="#777777"
                keyboardType="number-pad"
                secureTextEntry
                selectionColor="#EC6426"
                returnKeyType="done"
                onSubmitEditing={continueToPinConfirmation}
                className="mt-2 min-h-14 rounded-2xl border-2 border-brand-yellow px-4 py-3 font-atkinson text-[17px] text-brand-black"
              />

              <Text className="mt-2 font-atkinson text-[13px] leading-5 text-brand-black">
                PIN harus terdiri dari tepat 6 angka.
              </Text>

              {pinEditorError ? (
                <View className="mt-4 rounded-2xl border-2 border-brand-orange bg-brand-cream p-4">
                  <Text className="text-center font-atkinson-bold text-[14px] leading-5 text-brand-brown">
                    {pinEditorError}
                  </Text>
                </View>
              ) : null}

              <View className="mt-6 flex-row gap-3">
                <Pressable
                  onPress={closePinEditor}
                  disabled={isSubmitting}
                  className={`min-h-12 flex-1 items-center justify-center rounded-2xl border-2 border-brand-orange bg-brand-white px-3 py-3 ${
                    isSubmitting ? "opacity-50" : ""
                  }`}
                >
                  <Text className="font-atkinson-bold text-[16px] text-brand-orange">
                    Batal
                  </Text>
                </Pressable>

                <Pressable
                  onPress={continueToPinConfirmation}
                  disabled={pinContinueIsDisabled}
                  className={`min-h-12 flex-1 items-center justify-center rounded-2xl bg-brand-orange px-3 py-3 ${
                    pinContinueIsDisabled ? "opacity-50" : ""
                  }`}
                >
                  <Text className="font-atkinson-bold text-[16px] text-brand-white">
                    Lanjut
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <PinConfirmationModal
        visible={confirmationVisible}
        mode={confirmationMode}
        officerName={selectedOfficer?.fullName}
        errorMessage={confirmationError}
        isSubmitting={isSubmitting}
        onConfirm={(ownerPin) => {
          void handleOwnerPinConfirmation(ownerPin);
        }}
        onCancel={closeConfirmation}
        onPinChanged={() => {
          setConfirmationError(null);
        }}
      />
    </>
  );
}
