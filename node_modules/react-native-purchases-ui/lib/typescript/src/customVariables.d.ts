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
export type CustomVariableValue = {
    readonly type: 'string';
    readonly value: string;
} | {
    readonly type: 'number';
    readonly value: number;
} | {
    readonly type: 'boolean';
    readonly value: boolean;
};
/**
 * Factory methods for creating CustomVariableValue instances.
 */
export declare const CustomVariableValue: {
    /**
     * Creates a string custom variable value.
     * @param value The string value for the custom variable.
     * @returns A CustomVariableValue containing the string.
     */
    readonly string: (value: string) => CustomVariableValue;
    /**
     * Creates a numeric custom variable value.
     * @param value The numeric value for the custom variable.
     * @returns A CustomVariableValue containing the number.
     */
    readonly number: (value: number) => CustomVariableValue;
    /**
     * Creates a boolean custom variable value.
     * @param value The boolean value for the custom variable.
     * @returns A CustomVariableValue containing the boolean.
     */
    readonly boolean: (value: boolean) => CustomVariableValue;
};
/**
 * A map of custom variable names to their values.
 */
export type CustomVariables = {
    [key: string]: CustomVariableValue;
};
/**
 * Internal type for custom variables as sent to native bridge.
 * Values preserve their native types (string, number, boolean).
 * @internal
 */
export type NativeCustomVariables = {
    [key: string]: string | number | boolean;
};
/**
 * Converts CustomVariables to a native-typed map for the bridge.
 * @internal
 * @visibleForTesting
 */
export declare function convertCustomVariablesToNativeMap(customVariables: CustomVariables | undefined): NativeCustomVariables | null;
/**
 * @internal
 * @visibleForTesting
 */
export declare const convertCustomVariablesToStringMap: typeof convertCustomVariablesToNativeMap;
/**
 * Transforms options to native format, converting CustomVariables to native-typed map.
 * @internal
 * @visibleForTesting
 */
export declare function transformOptionsForNative<T extends {
    customVariables?: CustomVariables;
}>(options: T | undefined): (Omit<T, 'customVariables'> & {
    customVariables?: NativeCustomVariables | null;
}) | undefined;
//# sourceMappingURL=customVariables.d.ts.map