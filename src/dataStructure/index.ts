// Copyright (C) Corioders <corioders@gmail.com> - All Rights Reserved
// Unauthorized copying of this file, via any medium is strictly prohibited
// Proprietary and confidential
// Written by Wiktor Jurkiewicz <watjurk@gmail.com> and Artur Mucowski <artur@mucowski.pl>, June 2025

export type TypedSymbol<_T> = symbol & { __tagTypedSymbol: _T };
export function newTypedSymbol<T>(name: string): TypedSymbol<T> {
	return Symbol(name) as TypedSymbol<T>;
}

export class TypedSymbolMap {
	private readonly _storage: Map<symbol, unknown>;
	constructor() {
		this._storage = new Map();
	}

	setEntry<T>(key: TypedSymbol<T>, value: T): Error | null {
		if (this._storage.has(key)) {
			return new Error(`Symbol ${String(key)} already exists`);
		}
		this._storage.set(key, value);

		return null;
	}

	getEntry<T>(key: TypedSymbol<T>): T | null {
		if (!this._storage.has(key)) {
			return null;
		}

		return this._storage.get(key) as T;
	}

	copy(): TypedSymbolMap {
		const copy = new TypedSymbolMap();
		for (const [key, value] of this._storage) {
			copy.setEntry(key as TypedSymbol<unknown>, value);
		}

		return copy;
	}
}
