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
        water_rate: f64,
        waste_rate: f64
    ) -> Result<()> {
        instructions::update_tariff_rates(ctx, water_rate, waste_rate)
    }

    pub fn update_tariff_type(
        ctx: Context<UpdateTariff>,
        tariff_type: TariffType
    ) -> Result<()>  {
        instructions::update_tariff_type(ctx, tariff_type)
    }

    pub fn register_consumer(
        ctx: Context<RegisterConsumer>,
        contracted_capacity: u64,
        block_rate: f64,
    ) -> Result<()> {
        instructions::register_consumer(ctx, contracted_capacity, block_rate)
    }

    pub fn dispose_waste(
        ctx: Context<DisposeWaste>,
        amount: f64,
    ) -> Result<()> {
        instructions::dispose_waste(ctx, amount)
    }

    pub fn update_aquifer(
        ctx: Context<UpdateAquifer>,
        current_level: f64,
        capacity: f64
    ) -> Result<()> {
        instructions::update_aquifer(ctx, current_level, capacity)
    }

    pub fn update_consumer(
        ctx: Context<UpdateConsumer>,
        contracted_capacity: u64,
        block_rate: f64,
    ) -> Result<()> {
        instructions::update_consumer(ctx, contracted_capacity, block_rate)
    }

    // pub fn use_water(
    //     ctx: Context<UseWater>,
    //     amount: f64,
    // ) -> Result<()> {
    //     instructions::use_water(ctx, amount)
    // }
}


// Define custom errors
#[error_code]
pub enum CustomError {
    #[msg("Invalid contracted capacity: must be greater than zero.")]
    InvalidCapacity,
    #[msg("Invalid rate: must be greater than zero.")]
    InvalidRate,
    #[msg("Invalid reservoir level: must be greater than zero.")]
    InvalidAquiferLevel,
    #[msg("Invalid amount: must be greater than zero.")]
    InvalidAmount
}
