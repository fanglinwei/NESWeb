/* tslint:disable */
/* eslint-disable */

/**
 * Number of f32 audio samples produced by the last frame.
 */
export function get_audio_len(): number;

/**
 * Pointer to the audio sample buffer in WASM memory.
 */
export function get_audio_ptr(): number;

/**
 * Byte length of the framebuffer (always 256 × 240 × 4 = 245,760).
 */
export function get_framebuffer_len(): number;

/**
 * Pointer to the RGBA framebuffer in WASM memory.
 */
export function get_framebuffer_ptr(): number;

export function init(): void;

/**
 * Load a ROM from raw bytes.
 * Returns 0 on success, -1 on failure.
 */
export function load_rom(data: Uint8Array): number;

/**
 * Load serialized state (battery-backed RAM).
 * Returns 0 on success, -1 if no ROM is loaded.
 */
export function load_state(data: Uint8Array): number;

/**
 * Reset the emulator (discards any unsaved progress).
 */
export function reset(): void;

/**
 * Run one frame.
 * `c1` / `c2` are bitmasks for controller 1 and 2 (bit 0 = A, bit 1 = B, …).
 * Returns a pointer to the RGBA framebuffer in WASM linear memory.
 */
export function run_frame(c1: number, c2: number): number;

/**
 * Serialize emulator state (battery-backed RAM).
 * Returns the save data as bytes.
 */
export function save_state(): Uint8Array;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly get_audio_len: () => number;
    readonly get_audio_ptr: () => number;
    readonly get_framebuffer_len: () => number;
    readonly get_framebuffer_ptr: () => number;
    readonly init: () => void;
    readonly load_rom: (a: number, b: number) => number;
    readonly load_state: (a: number, b: number) => number;
    readonly reset: () => void;
    readonly run_frame: (a: number, b: number) => number;
    readonly save_state: () => [number, number];
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __wbindgen_malloc: (a: number, b: number) => number;
    readonly __wbindgen_free: (a: number, b: number, c: number) => void;
    readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
