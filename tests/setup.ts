/**
 * Setup global para testes.
 * Substitui window.localStorage por uma implementação mock controlável.
 */
import { vi } from "vitest";

const localStorageStore: Record<string, string> = {};

const localStorageMock = {
	getItem: vi.fn((key: string): string | null => {
		return localStorageStore[key] ?? null;
	}),
	setItem: vi.fn((key: string, value: string): void => {
		localStorageStore[key] = value;
	}),
	removeItem: vi.fn((key: string): void => {
		delete localStorageStore[key];
	}),
	clear: vi.fn((): void => {
		for (const key in localStorageStore) {
			delete localStorageStore[key];
		}
	}),
	get length(): number {
		return Object.keys(localStorageStore).length;
	},
	key: vi.fn((index: number): string | null => {
		const keys = Object.keys(localStorageStore);
		return keys[index] ?? null;
	}),
};

Object.defineProperty(globalThis, "localStorage", {
	value: localStorageMock,
	writable: true,
	configurable: true,
});

// window pode não existir em ambiente node puro
if (typeof globalThis.window === "undefined") {
	(globalThis as Record<string, unknown>).window = globalThis;
}

Object.defineProperty(globalThis.window, "localStorage", {
	value: localStorageMock,
	writable: true,
	configurable: true,
});

export { localStorageStore, localStorageMock };
