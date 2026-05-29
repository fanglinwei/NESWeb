/* tslint:disable */
/* eslint-disable */
export const memory: WebAssembly.Memory;
export const get_audio_len: () => number;
export const get_audio_ptr: () => number;
export const get_framebuffer_len: () => number;
export const get_framebuffer_ptr: () => number;
export const init: () => void;
export const load_rom: (a: number, b: number) => number;
export const load_state: (a: number, b: number) => number;
export const reset: () => void;
export const run_frame: (a: number, b: number) => number;
export const save_state: () => [number, number];
export const __wbindgen_externrefs: WebAssembly.Table;
export const __wbindgen_malloc: (a: number, b: number) => number;
export const __wbindgen_free: (a: number, b: number, c: number) => void;
export const __wbindgen_start: () => void;
