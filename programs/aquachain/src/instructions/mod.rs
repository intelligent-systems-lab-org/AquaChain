pub const DISCRIMINATOR: usize = 8;

mod dispose_waste;
mod initialize_reservoir;
mod initialize_tariff;
mod pay_for_waste;
mod pay_for_water;
mod register_consumer;
mod update_consumer;
mod update_consumer_reservoir;
mod update_consumer_tariff;
mod update_reservoir;
mod update_tariff;
mod use_water;

pub use dispose_waste::*;
pub use initialize_reservoir::*;
pub use initialize_tariff::*;
pub use pay_for_waste::*;
pub use pay_for_water::*;
pub use register_consumer::*;
pub use update_consumer::*;
pub use update_consumer_reservoir::*;
pub use update_consumer_tariff::*;
pub use update_reservoir::*;
pub use update_tariff::*;
pub use use_water::*;
