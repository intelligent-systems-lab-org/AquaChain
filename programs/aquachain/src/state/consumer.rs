use anchor_lang::prelude::*;

/// Represents a water consumer account in the Aquachain system.
///
/// This account stores information about a water consumer's consumption parameters,
/// including their allowed consumption rate, contracted capacity, and their
/// associations with specific tariffs and reservoirs.
///
/// # Fields
/// * `block_rate` - The rate at which the consumer is charged beyond their contracted capacity
/// * `contracted_capacity` - The maximum amount of water allocated to this consumer
/// * `assigned_tariff` - Reference to the tariff structure applied to this consumer
/// * `assigned_reservoir` - Reference to the reservoir serving this consumer
///
/// # Example
/// ```ignore
/// let consumer = Consumer {
///     block_rate: 100,           // rate charged beyond contracted capacity
///     contracted_capacity: 1000,  // Maximum allocation
///     assigned_tariff: tariff_pubkey,
///     assigned_reservoir: reservoir_pubkey,
/// };
/// ```
#[account]
#[derive(InitSpace)]
pub struct Consumer {
    /// The rate at which the consumer is charged beyond their contracted capacity.
    /// Represents the maximum flow rate or consumption rate per time unit.
    pub block_rate: u64,

    /// The maximum amount of water the consumer is contracted to use.
    /// This represents their total allocation or quota.
    pub contracted_capacity: u64,

    /// Reference to the tariff structure assigned to this consumer.
    /// Links to a Tariff account that determines the pricing structure.
    pub assigned_tariff: Pubkey,

    /// Reference to the reservoir from which this consumer draws water.
    /// Links to a Reservoir account that supplies water to this consumer.
    pub assigned_reservoir: Pubkey,
}
