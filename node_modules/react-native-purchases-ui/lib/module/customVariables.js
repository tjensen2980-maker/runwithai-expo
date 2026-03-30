/**
 * A value type for custom paywall variables that can be passed to paywalls at runtime.
 *
 * Custom variables allow developers to personalize paywall text with dynamic values.
 * Variables are defined in the RevenueCat dashboard and can be overridden at runtime.
 *
 * @example
 * ```typescript
 * RevenueCatUI.presentPaywall({
 *   customVariables: {
 *     'player_name': CustomVariableValue.string('John'),
 *     'level': CustomVariableValue.number(42),
 *     'is_premium': CustomVariableValue.boolean(true),
 *   },
 * });
 * ```
 *
 * In the paywall text (configured in the dashboard), use the `custom.` prefix:
 * ```
 * Hello {{ custom.player_name }}!
 * ```
 */

/**
 * Factory methods for creating CustomVariableValue instances.
 */
export const CustomVariableValue = {
  /**
   * Creates a string custom variable value.
   * @param value The string value for the custom variable.
   * @returns A CustomVariableValue containing the string.
   */
  string: value => ({
    type: 'string',
    value
  }),
  /**
   * Creates a numeric custom variable value.
   * @param value The numeric value for the custom variable.
   * @returns A CustomVariableValue containing the number.
   */
  number: value => ({
    type: 'number',
    value
  }),
  /**
   * Creates a boolean custom variable value.
   * @param value The boolean value for the custom variable.
   * @returns A CustomVariableValue containing the boolean.
   */
  boolean: value => ({
    type: 'boolean',
    value
  })
};

/**
 * A map of custom variable names to their values.
 */

/**
 * Internal type for custom variables as sent to native bridge.
 * Values preserve their native types (string, number, boolean).
 * @internal
 */

/**
 * Converts CustomVariables to a native-typed map for the bridge.
 * @internal
 * @visibleForTesting
 */
export function convertCustomVariablesToNativeMap(customVariables) {
  if (!customVariables) return null;
  const result = {};
  for (const key of Object.keys(customVariables)) {
    const variable = customVariables[key];
    if (variable) {
      if (variable.type === 'number' && !Number.isFinite(variable.value)) {
        console.warn(`[RevenueCatUI] Custom variable '${key}' has non-finite number value (${variable.value}). Skipping.`);
        continue;
      }
      result[key] = variable.value;
    }
  }
  return result;
}

/**
 * @internal
 * @visibleForTesting
 */
export const convertCustomVariablesToStringMap = convertCustomVariablesToNativeMap;

/**
 * Transforms options to native format, converting CustomVariables to native-typed map.
 * @internal
 * @visibleForTesting
 */
export function transformOptionsForNative(options) {
  if (!options) return undefined;
  const {
    customVariables,
    ...rest
  } = options;
  return {
    ...rest,
    customVariables: convertCustomVariablesToNativeMap(customVariables)
  };
}
//# sourceMappingURL=customVariables.js.map