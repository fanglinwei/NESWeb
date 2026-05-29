use nescore::cart::Cartridge;
use nescore::{Button, Controller, Nes};
use wasm_bindgen::prelude::*;

// ---------------------------------------------------------------------------
// Global emulator state
// In WASM (single-threaded), static mut is safe for !Sync types like Nes
// ---------------------------------------------------------------------------

static mut NES: Option<Nes> = None;
static mut ROM_DATA: Option<Vec<u8>> = None;

/// RGBA framebuffer: 256 × 240 pixels × 4 bytes = 245,760 bytes
const FB_SIZE: usize = 256 * 240 * 4;
static mut FRAMEBUFFER: [u8; FB_SIZE] = [0; FB_SIZE];

static mut AUDIO_BUFFER: Vec<f32> = Vec::new();

// ---------------------------------------------------------------------------
// Helper: convert a u8 bitmask to Button presses
// ---------------------------------------------------------------------------

fn button_from_u8(value: u8) -> Option<Button> {
    match value {
        0 => Some(Button::A),
        1 => Some(Button::B),
        2 => Some(Button::Select),
        3 => Some(Button::Start),
        4 => Some(Button::Up),
        5 => Some(Button::Down),
        6 => Some(Button::Left),
        7 => Some(Button::Right),
        _ => None,
    }
}

/// Apply a controller bitmask to the emulator.
/// Each call to `button_from_u8` / enum constructor produces a fresh value,
/// avoiding move-after-move issues since Button and Controller are not Copy.
fn apply_controller(nes: &mut Nes, state: u8, controller: Controller) {
    match controller {
        Controller::Input1 => {
            for bit in 0..8 {
                if let Some(btn) = button_from_u8(bit) {
                    let pressed = (state >> bit) & 1 == 1;
                    nes.controller_input(Controller::Input1, btn, pressed);
                }
            }
        }
        Controller::Input2 => {
            for bit in 0..8 {
                if let Some(btn) = button_from_u8(bit) {
                    let pressed = (state >> bit) & 1 == 1;
                    nes.controller_input(Controller::Input2, btn, pressed);
                }
            }
        }
    }
}

/// Convert nescore's RGB framebuffer (3 bytes/pixel) to RGBA (4 bytes/pixel)
fn convert_rgb_to_rgba(rgb: &[u8; 256 * 240 * 3], rgba: &mut [u8; FB_SIZE]) {
    for i in 0..(256 * 240) {
        let src = i * 3;
        let dst = i * 4;
        rgba[dst] = rgb[src];
        rgba[dst + 1] = rgb[src + 1];
        rgba[dst + 2] = rgb[src + 2];
        rgba[dst + 3] = 255;
    }
}

/// Re-create the NES instance from the stored ROM data.
/// Used by reset(), save_state(), and load_state().
fn reload_nes(battery_ram: Option<Vec<u8>>) {
    unsafe {
        let rom = ROM_DATA.as_ref().expect("No ROM loaded");
        let cart = Cartridge::from(rom.clone())
            .expect("Failed to parse cartridge from stored ROM");

        let cart = if let Some(sram) = battery_ram {
            cart.add_battery_ram(sram)
        } else {
            cart
        };

        NES = Some(Nes::new().with_cart(cart));
    }
}

// ---------------------------------------------------------------------------
// WASM public API
// ---------------------------------------------------------------------------

#[wasm_bindgen]
pub fn init() {
    unsafe {
        NES = Some(Nes::new());
    }
}

/// Load a ROM from raw bytes.
/// Returns 0 on success, -1 on failure.
#[wasm_bindgen]
pub fn load_rom(data: &[u8]) -> i32 {
    let cart = match Cartridge::from(data.to_vec()) {
        Ok(c) => c,
        Err(_) => return -1,
    };

    unsafe {
        ROM_DATA = Some(data.to_vec());
        NES = Some(Nes::new().with_cart(cart));
    }

    0
}

/// Run one frame.
/// `c1` / `c2` are bitmasks for controller 1 and 2 (bit 0 = A, bit 1 = B, …).
/// Returns a pointer to the RGBA framebuffer in WASM linear memory.
#[wasm_bindgen]
pub fn run_frame(c1: u8, c2: u8) -> *const u8 {
    unsafe {
        if let Some(ref mut nes) = NES {
            apply_controller(nes, c1, Controller::Input1);
            apply_controller(nes, c2, Controller::Input2);

            let (fb, audio) = nes.emulate_frame();
            convert_rgb_to_rgba(&fb, &mut FRAMEBUFFER);
            AUDIO_BUFFER = audio;
        }
    }
    get_framebuffer_ptr()
}

/// Get the CPU program counter (for debugging)
#[wasm_bindgen]
pub fn get_pc() -> u16 {
    unsafe {
        NES.as_ref().map_or(0, |nes| nes.get_program_counter())
    }
}

/// Pointer to the RGBA framebuffer in WASM memory.
#[wasm_bindgen]
pub fn get_framebuffer_ptr() -> *const u8 {
    unsafe { FRAMEBUFFER.as_ptr() }
}

/// Byte length of the framebuffer (always 256 × 240 × 4 = 245,760).
#[wasm_bindgen]
pub fn get_framebuffer_len() -> usize {
    FB_SIZE
}

/// Pointer to the audio sample buffer in WASM memory.
#[wasm_bindgen]
pub fn get_audio_ptr() -> *const f32 {
    unsafe { AUDIO_BUFFER.as_ptr() }
}

/// Number of f32 audio samples produced by the last frame.
#[wasm_bindgen]
pub fn get_audio_len() -> usize {
    unsafe { AUDIO_BUFFER.len() }
}

/// Serialize emulator state (battery-backed RAM).
/// Returns the save data as bytes.
#[wasm_bindgen]
pub fn save_state() -> Vec<u8> {
    unsafe {
        let bat_ram = NES
            .take()
            .map(|nes| nes.eject())
            .unwrap_or_default();

        // Re-create the NES so emulation can continue
        reload_nes(Some(bat_ram.clone()));

        bat_ram
    }
}

/// Load serialized state (battery-backed RAM).
/// Returns 0 on success, -1 if no ROM is loaded.
#[wasm_bindgen]
pub fn load_state(data: Vec<u8>) -> i32 {
    unsafe {
        if ROM_DATA.is_none() {
            return -1;
        }
        // Drop the current NES instance
        let _ = NES.take();
        // Re-create with saved battery RAM
        reload_nes(Some(data));
    }
    0
}

/// Reset the emulator (discards any unsaved progress).
#[wasm_bindgen]
pub fn reset() {
    unsafe {
        let _ = NES.take();
        reload_nes(None);
    }
}
