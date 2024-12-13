use anchor_lang::prelude::*;

/// Represents different types of penalties that can be applied to water usage
///
/// # Variants
/// * `Fixed` - A constant penalty amount regardless of usage
/// * `Linear` - A proportional penalty that scales with usage
#[derive(InitSpace, AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, Eq, PartialEq)]
pub enum PenaltyType {
    /// A fixed penalty amount that is applied regardless of usage volume
    Fixed(u64),
    /// A penalty that increases linearly with usage volume based on a rate multiplier
    Linear(u64),
}

/// Represents different types of water tariff structures that can be applied to billing.
///
/// # Variants
/// * `Commercial` - Volumetric tariff structure for commercial consumers with fixed and variable rates
/// * `Household` - Volumetric tariff structure for households with fixed and variable rates
/// * `Lifeline` - Volumetric tariff structure for low-income households with base and excess rates
/// * `SeasonalIBT` - Seasonal Increasing Block Tariff that varies by season with increasing rates
/// * `SeasonalDBT` - Seasonal Decreasing Block Tariff that varies by season with decreasing rates
#[derive(InitSpace, AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, Eq, PartialEq)]
pub enum TariffType {
    /// Volumetric tariff structure for commercial consumers where rates increase with consumption blocks
    Commercial {
        /// Fixed cost covering infrastructure and operational maintenance
        fixed_cost: u64,
        /// Volumetric rate within the contracted limit  
        base_rate: u64,
        /// Volumetric rate for usage exceeding the contracted capacity
        excess_rate: u64,
    },

    /// Volumetric tariff structure for households where rates increase with consumption blocks
    Household {
        /// Fixed cost covering infrastructure and operational maintenance
        fixed_cost: u64,
        /// Volumetric rate within the contracted limit  
        base_rate: u64,
        /// Volumetric rate for usage exceeding the contracted capacity
        excess_rate: u64,
    },

    /// Volumetric tariff structure that is applicable for low-income households
    Lifeline {
        /// Volumetric rate within the contracted limit  
        base_rate: u64,
        /// Volumetric rate for usage exceeding the contracted capacity
        excess_rate: u64,
    },

    /// Seasonal tariff structure where rates increase with consumption blocks
    /// and vary based on the season (e.g., higher in summer)
    ///
    /// # Fields
    /// * `base_rate` - Base volumetric rate for water consumption
    /// * `sensitivity_factor` - Factor adjusting rates based on reservoir levels
    /// * `penalty` - Type of penalty applied during low reservoir conditions     
    SeasonalIBT {
        /// Volumetric rate within the contracted limit  
        base_rate: u64,
        /// A proportionality factor for block rate based on reservoir levels
        sensitivity_factor: u64,
        /// A penalty applied to water usage when reservoir levels are low
        penalty: PenaltyType,
    },

    /// Seasonal tariff structure where rates decrease with consumption blocks
    /// and vary based on the season
    SeasonalDBT {
        /// Volumetric rate within the contracted limit  
        base_rate: u64,
        /// A proportionality factor for block rate based on reservoir levels
        sensitivity_factor: u64,
    },
}

/// Represents a water utility tariff account containing rate information and configuration.
///
/// This account stores the basic rate structure for waste treatment,
/// along with the tariff type and associated public key.
///
/// # Fields
/// * `waste_rate` - Base rate charged per unit of waste treatment
/// * `tariff_type` - The type of tariff structure being applied
/// * `tariff_key` - Public key associated with this tariff configuration
///
/// # Example
/// ```ignore
/// let tariff = Tariff {
///     waste_rate: 50,   // Base rate for waste treatment
///     tariff_type: TariffType::UniformIBT,
///     tariff_key: pubkey,
/// };
/// ```
#[account]
#[derive(InitSpace)]
pub struct Tariff {
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
