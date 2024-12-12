use anchor_lang::prelude::*;

/// Represents a water reservoir in the Aquachain system.
///
/// This account tracks the current water level and maximum capacity of a reservoir,
/// along with its unique identifier. It's used to monitor and manage water storage
/// facilities within the water management system.
///
/// # Fields
/// * `current_level` - The current amount of water in the reservoir
/// * `capacity` - The maximum amount of water the reservoir can hold
/// * `reservoir_key` - Unique identifier for this reservoir
///
/// # Example
/// ```ignore
/// let reservoir = Reservoir {
///     current_level: 1000,    // Current water level
///     capacity: 5000,         // Maximum capacity
///     reservoir_key: pubkey,  // Unique identifier
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

    /// The unique public key identifying this reservoir in the system.
    /// Used for authentication and reference in transactions.
    pub reservoir_key: Pubkey,
}
