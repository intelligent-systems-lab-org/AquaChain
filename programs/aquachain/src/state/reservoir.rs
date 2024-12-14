use anchor_lang::prelude::*;

/// Represents a water reservoir in the Aquachain system.
///
/// This account tracks the current water level and maximum capacity of a reservoir,
/// along with its unique identifier. It is used to monitor and manage water storage
/// facilities within the water management system.
///
/// # Fields
/// * `current_level` - The current amount of water in the reservoir
/// * `capacity` - The maximum amount of water the reservoir can hold
/// * `max_allowable_waste` - Maximum waste water that can be processed
/// * `min_allowable_level` - Minimum required water level
/// * `aqc_conversion_factor` - Conversion rate from WasteWaterCapacityToken to AquaCoin
/// * `aqc_discount_factor` - Discount factor based on AquaCoin holdings
/// * `reservoir_key` - Unique identifier for this reservoir
///
/// # Example
/// ```ignore
/// let reservoir = Reservoir {
///     current_level: 1000,              // Current water level
///     capacity: 5000,                   // Maximum capacity
///     max_allowable_waste: 1000,        // Maximum waste water capacity
///     min_allowable_level: 500,         // Minimum required level
///     aqc_conversion_factor: 100,       // Conversion factor to AquaCoin
///     aqc_discount_factor: 5,      // Discount factor
///     reservoir_key: pubkey,            // Unique identifier
/// };
/// ```
#[account]
#[derive(InitSpace)]
pub struct Reservoir {
    /// The current water level in the reservoir.
    /// This value must always be less than or equal to the capacity.
    pub current_level: u64,

    /// The maximum amount of water the reservoir can hold.
    /// This value represents the upper limit for current_level.
    pub capacity: u64,

    /// The maximum amount of waste water that can be processed by this reservoir.
    /// Measured in the same units as current_level and capacity.     
    pub max_allowable_waste: u64,

    /// The minimum water level that must be maintained in the reservoir.
    /// Water usage above this level incurs penalties  
    pub min_allowable_level: u64,

    /// Conversion factor of WasteWaterCapacityToken to AquaCoin
    pub aqc_conversion_factor: u64,

    /// Factor to reduce consumer's water tariff based on their AquaCoin holdings
    pub aqc_discount_factor: u64,

    /// The unique public key identifying this reservoir in the system.
    /// Used for authentication and reference in transactions.
    pub reservoir_key: Pubkey,
}
