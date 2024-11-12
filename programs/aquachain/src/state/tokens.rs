use anchor_lang::prelude::*;

/// Represents the core token addresses used in the Aquachain system.
/// 
/// This account stores the public keys for the three main tokens:
/// - Water Token (WTK)
/// - Waste Token (WST)
/// - Water Capacity Token (WATC)
#[account]
#[derive(InitSpace)]
pub struct Tokens {
    /// The mint address for the Water Token (WTK),
    /// which represents the basic unit of water consumption
    pub wtk: Pubkey,

    /// The mint address for the Waste Token  (WST),
    /// used for waste treatment
    pub wst: Pubkey,

    /// The mint address for the Water Capacity Token (WATC),
    /// used to represent the consumer's remaining contracted water capacity
    pub watc: Pubkey
}
