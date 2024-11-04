use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct Consumer {
    pub block_rate: f64,
    pub contracted_capacity: u64
}