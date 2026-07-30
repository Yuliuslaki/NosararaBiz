import { createPinSecurity, verifyPin } from "./pinSecurity";

export type PinSecurityTestResult = {
  passed: boolean;
  correctPinAccepted: boolean;
  wrongPinRejected: boolean;
  hashFormatValid: boolean;
  saltFormatValid: boolean;
  differentSaltProduced: boolean;
  differentHashProduced: boolean;
  createDurationMs: number;
  correctVerificationDurationMs: number;
  wrongVerificationDurationMs: number;
};

export async function runPinSecurityTest(): Promise<PinSecurityTestResult> {
  const correctPin = "4826";
  const wrongPin = "4827";

  const createStartedAt = Date.now();

  const firstSecurity = await createPinSecurity(correctPin);

  const createDurationMs = Date.now() - createStartedAt;

  const secondSecurity = await createPinSecurity(correctPin);

  const correctVerificationStartedAt = Date.now();

  const correctPinAccepted = await verifyPin(
    correctPin,
    firstSecurity.pinHash,
    firstSecurity.pinSalt,
  );

  const correctVerificationDurationMs =
    Date.now() - correctVerificationStartedAt;

  const wrongVerificationStartedAt = Date.now();

  const wrongPinAccepted = await verifyPin(
    wrongPin,
    firstSecurity.pinHash,
    firstSecurity.pinSalt,
  );

  const wrongVerificationDurationMs = Date.now() - wrongVerificationStartedAt;

  const wrongPinRejected = !wrongPinAccepted;

  const hashFormatValid = /^hmac-sha256\$[0-9a-f]{64}$/i.test(
    firstSecurity.pinHash,
  );

  const saltFormatValid = /^[0-9a-f]{32}$/i.test(firstSecurity.pinSalt);

  const differentSaltProduced =
    firstSecurity.pinSalt !== secondSecurity.pinSalt;

  const differentHashProduced =
    firstSecurity.pinHash !== secondSecurity.pinHash;

  return {
    passed:
      correctPinAccepted &&
      wrongPinRejected &&
      hashFormatValid &&
      saltFormatValid &&
      differentSaltProduced &&
      differentHashProduced,

    correctPinAccepted,
    wrongPinRejected,
    hashFormatValid,
    saltFormatValid,
    differentSaltProduced,
    differentHashProduced,
    createDurationMs,
    correctVerificationDurationMs,
    wrongVerificationDurationMs,
  };
}
