use anchor_lang::prelude::*;

/// Represents different types of water tariff structures that can be applied to billing.
///
/// # Variants
/// * `UniformIBT` - Uniform Increasing Block Tariff where rates increase with consumption
/// * `SeasonalIBT` - Seasonal Increasing Block Tariff that varies by season with increasing rates
/// * `SeasonalDBT` - Seasonal Decreasing Block Tariff that varies by season with decreasing rates
#[derive(InitSpace, AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, Eq, PartialEq)]
pub enum TariffType {
    /// Standard tariff structure where rates increase with consumption blocks,
    /// applied uniformly throughout the year
    UniformIBT,

    /// Seasonal tariff structure where rates increase with consumption blocks
    /// and vary based on the season (e.g., higher in summer)
    SeasonalIBT,

    /// Seasonal tariff structure where rates decrease with consumption blocks
    /// and vary based on the season
    SeasonalDBT,
}

/// Represents a water utility tariff account containing rate information and configuration.
///
/// This account stores the basic rate structure for both water usage and waste treatment,
/// along with the tariff type and associated public key.
///
/// # Fields
/// * `water_rate` - Base rate charged per unit of water consumption
/// * `waste_rate` - Base rate charged per unit of waste treatment
/// * `tariff_type` - The type of tariff structure being applied
/// * `tariff_key` - Public key associated with this tariff configuration
///
/// # Example
/// ```ignore
/// let tariff = Tariff {
///     water_rate: 100,  // Base rate for water usage
///     waste_rate: 50,   // Base rate for waste treatment
///     tariff_type: TariffType::UniformIBT,
///     tariff_key: pubkey,
/// };
/// ```
#[account]
#[derive(InitSpace)]
pub struct Tariff {
    /// Base rate charged per unit of water consumption.
    /// The actual rate may vary based on the tariff type and consumption level.
    pub water_rate: u64,

    /// Base rate charged per unit of waste that requires treatment.
    /// This may be adjusted based on the type and volume of waste.
    pub waste_rate: u64,

    /// Specifies the type of tariff structure to be applied,
    /// determining how rates change with consumption and seasons.
    pub tariff_type: TariffType,

    /// The public key associated with this tariff account,
    /// used for identification and authorization.
    pub tariff_key: Pubkey,
}
