// Copyright (C) Corioders <corioders@gmail.com> - All Rights Reserved
// Unauthorized copying of this file, via any medium is strictly prohibited
// Proprietary and confidential
// Written by Wiktor Jurkiewicz <watjurk@gmail.com> and Artur Mucowski <artur@mucowski.pl>, July 2025

/**
 * Represents a value that can be safely converted to a JSON string.
 * This includes primitives, arrays of JSON values, and objects with string
 * keys and JSON values.
 */
export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

export type AssertJsonValue<T> = T extends JsonValue ? T : T extends Record<string, any> ? { [K in keyof T]: AssertJsonValue<T[K]> } : never;
