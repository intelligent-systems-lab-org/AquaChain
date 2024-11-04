use anchor_lang::prelude::*;

declare_id!("8UK2jLDiWAHWEBS234LAnrnA9q7dGivV85NXhqobntYf");

mod instructions;
pub mod state;

use instructions::*;
use state::*;

#[program]
pub mod aquachain {
    use super::*;

    pub fn initialize_tariff(
        ctx: Context<InitializeTariff>,
        tariff_key: Pubkey,
        water_rate: f64,
        waste_rate: f64,
        tariff_type: TariffType,
    ) -> Result<()> {
        instructions::initialize_tariff(ctx, tariff_key, water_rate, waste_rate, tariff_type)
    }

    pub fn update_tariff_rates(
        ctx: Context<UpdateTariff>,
        tariff_key: Pubkey,
        water_rate: f64,
        waste_rate: f64
    ) -> Result<()> {
        instructions::update_tariff_rates(ctx, tariff_key, water_rate, waste_rate)
    }

    pub fn update_tariff_type(
        ctx: Context<UpdateTariff>,
        tariff_key: Pubkey,
        tariff_type: TariffType
    ) -> Result<()>  {
        instructions::update_tariff_type(ctx, tariff_key, tariff_type)
    }

    pub fn initialize_reservoir(
        ctx: Context<InitializeReservoir>,
        reservoir_key: Pubkey,
        current_level: f64,
        capacity: f64
    ) -> Result<()> {
        instructions::initialize_reservoir(ctx, reservoir_key, current_level, capacity)
    }

    pub fn update_reservoir(
        ctx: Context<UpdateReservoir>,
        reservoir_key: Pubkey,
        current_level: f64,
        capacity: f64
    ) -> Result<()> {
        instructions::update_reservoir(ctx, reservoir_key, current_level, capacity)
    }
}


// Define custom errors
#[error_code]
pub enum CustomError {
    #[msg("Invalid contracted capacity: must be greater than zero.")]
    InvalidCapacity,
    #[msg("Invalid rate: must be greater than zero.")]
    InvalidRate,
    #[msg("Invalid reservoir level: must be greater than zero and not exceed capacity.")]
    InvalidReservoirLevel,
    #[msg("Invalid reservoir capacity: must be greater than zero.")]
    InvalidReservoirCapacity,
    #[msg("Invalid amount: must be greater than zero.")]
    InvalidAmount,
    #[msg("Unauthorized: only the owner can perform this action.")]
    Unauthorized,
}