use anchor_lang::prelude::*;

/// Represents a water consumer account in the Aquachain system.
///
/// This account stores information about a water consumer's consumption parameters,
/// including their allowed consumption rate, contracted capacity, and their
/// associations with specific tariffs and reservoirs.
///
/// # Fields
/// * `contracted_capacity` - The maximum amount of water allocated to this consumer
/// * `contracted_waste_capacity` - The maximum amount of wastewater the consumer can produce
/// * `assigned_tariff` - Reference to the tariff structure applied to this consumer
/// * `assigned_reservoir` - Reference to the reservoir serving this consumer
///
/// # Example
/// ```ignore
/// let consumer = Consumer {
///     contracted_capacity: 1000,  // Maximum allocation
///     contracted_waste_capacity: 500, // Maximum wastewater allocation
///     assigned_tariff: tariff_pubkey,
///     assigned_reservoir: reservoir_pubkey,
/// };
#[account]
#[derive(InitSpace)]
pub struct Consumer {
    /// The maximum amount of water the consumer is contracted to use.
    /// This represents their total allocation or quota.
    pub contracted_capacity: u64,

    /// The maximum amount of wastewater the consumer is allowed to produce for efficient wastewater disposal.
    /// Consumer can exceed this threshold but is incentivized through pricing to stay below it.
    pub contracted_waste_capacity: u64,

    /// Reference to the tariff structure assigned to this consumer.
    /// Links to a Tariff account that determines the pricing structure.
    pub assigned_tariff: Pubkey,

    /// Reference to the reservoir from which this consumer draws water.
    /// Links to a Reservoir account that supplies water to this consumer.
    pub assigned_reservoir: Pubkey,
}
