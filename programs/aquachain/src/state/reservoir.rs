use anchor_lang::prelude::*;

// Reservoir details
#[account]
#[derive(InitSpace)]
pub struct Reservoir {
    pub current_level: u64,
    pub capacity: u64,
    pub reservoir_key: Pubkey,
}
