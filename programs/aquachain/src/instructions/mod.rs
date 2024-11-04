pub const DISCRIMINATOR: usize = 8;

mod dispose_water;
mod initialize_tariff;
mod register_consumer;
mod update_aquifer;
mod update_consumer;
mod update_tariff;
mod use_water;

pub use dispose_water::*;
pub use initialize_tariff::*;
pub use register_consumer::*;
pub use update_aquifer::*;
pub use update_consumer::*;
pub use update_tariff::*;
pub use use_water::*;