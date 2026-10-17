/**
 * @erp/core: Pure business logic layer.
 *
 * Rules:
 * - Runtime agnostic (No window, document, localStorage, navigator).
 * - Framework agnostic (No React, no React Native, no Expo).
 * - All math calculations strictly use integer minor units (paise).
 */

export const CORE_VERSION = '1.0.0';

/**
 * Rounds a number to the nearest integer using standard half-up rounding away from zero.
 * Preserves mathematical sign.
 */
export function roundHalfUp(value: number): number {
  return Math.sign(value) * Math.round(Math.abs(value));
}
