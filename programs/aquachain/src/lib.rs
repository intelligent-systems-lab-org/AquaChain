use anchor_lang::prelude::*;

declare_id!("8UK2jLDiWAHWEBS234LAnrnA9q7dGivV85NXhqobntYf");

#[program]
pub mod aquachain {
    pub use super::tariff::*; 
    pub use super::consumer::*;
}

mod tariff;
mod consumer;
