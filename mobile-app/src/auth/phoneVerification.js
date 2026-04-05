/**
 * Send SMS via Firebase Phone Auth (requires reCAPTCHA on the client — see Login / OTP screens).
 */
import { PhoneAuthProvider } from 'firebase/auth';
import { auth } from '../config/firebase';

/**
 * @param {string} phoneE164 e.g. +919876543210
 * @param {import('react').RefObject} recaptchaVerifierRef ref to FirebaseRecaptchaVerifierModal
 * @returns {Promise<string>} verificationId for PhoneAuthProvider.credential(verificationId, code)
 */
export async function sendPhoneVerificationCode(phoneE164, recaptchaVerifierRef) {
  const verifier = recaptchaVerifierRef?.current;
  if (!verifier) {
    throw new Error('reCAPTCHA is not ready. Please try again.');
  }
  const provider = new PhoneAuthProvider(auth);
  return provider.verifyPhoneNumber(phoneE164, verifier);
}
