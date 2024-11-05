use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct Consumer {
    pub block_rate: f64,
    pub contracted_capacity: u64,
    pub assigned_tariff: Pubkey,
    pub assigned_reservoir: Pubkey,
}
