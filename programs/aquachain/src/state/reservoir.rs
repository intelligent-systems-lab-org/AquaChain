use anchor_lang::prelude::*;

// Reservoir details
#[account]
#[derive(InitSpace)]
pub struct Reservoir {
    pub current_level: f64,
    pub capacity: f64,
    pub reservoir_key: Pubkey,
}
