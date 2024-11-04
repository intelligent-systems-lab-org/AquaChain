use anchor_lang::prelude::*;

// Aquifer details
#[account]
#[derive(InitSpace)]
pub struct Aquifer {
    pub current_level: f64,
    pub capacity: f64
}