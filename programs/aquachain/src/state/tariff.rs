use anchor_lang::prelude::*;

#[derive(InitSpace, AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, Eq, PartialEq)]
pub enum TariffType {
    UniformIBT,
    SeasonalIBT,
    SeasonalDBT,
}

// Tariff details
#[account]
#[derive(InitSpace)]
pub struct Tariff {
    pub water_rate: u64,
    pub waste_rate: u64,
    pub tariff_type: TariffType,
    pub tariff_key: Pubkey,
}
