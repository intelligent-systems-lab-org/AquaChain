use anchor_lang::prelude::*;

declare_id!("62BMhEVwxxV1RQjd9rxgyhW8ebvyxiDfRDbZRxERw8yC");

mod instructions;
pub mod state;
mod utils;

use instructions::*;
use state::*;

#[program]
pub mod aquachain {
    use super::*;

    pub fn initialize_tariff(
        ctx: Context<InitializeTariff>,
        tariff_key: Pubkey,
        water_rate: u64,
        waste_rate: u64,
        tariff_type: TariffType,
    ) -> Result<()> {
        instructions::initialize_tariff(ctx, tariff_key, water_rate, waste_rate, tariff_type)
    }

    pub fn update_tariff_rates(
        ctx: Context<UpdateTariff>,
        tariff_key: Pubkey,
        water_rate: u64,
        waste_rate: u64,
    ) -> Result<()> {
        instructions::update_tariff_rates(ctx, tariff_key, water_rate, waste_rate)
    }

    pub fn update_tariff_type(
        ctx: Context<UpdateTariff>,
        tariff_key: Pubkey,
        tariff_type: TariffType,
    ) -> Result<()> {
        instructions::update_tariff_type(ctx, tariff_key, tariff_type)
    }

    pub fn initialize_reservoir(
        ctx: Context<InitializeReservoir>,
        reservoir_key: Pubkey,
        current_level: u64,
        capacity: u64,
    ) -> Result<()> {
        instructions::initialize_reservoir(ctx, reservoir_key, current_level, capacity)
    }

    pub fn update_reservoir(
        ctx: Context<UpdateReservoir>,
        reservoir_key: Pubkey,
        current_level: u64,
        capacity: u64,
    ) -> Result<()> {
        instructions::update_reservoir(ctx, reservoir_key, current_level, capacity)
    }

    pub fn register_consumer(
        ctx: Context<RegisterConsumer>,
        tariff_key: Pubkey,
        reservoir_key: Pubkey,
        contracted_capacity: u64,
        block_rate: u64,
    ) -> Result<()> {
        instructions::register_consumer(
            ctx,
            tariff_key,
            reservoir_key,
            contracted_capacity,
            block_rate,
        )
    }

    pub fn update_consumer(
        ctx: Context<UpdateConsumer>,
        tariff_key: Pubkey,
        reservoir_key: Pubkey,
        contracted_capacity: u64,
        block_rate: u64,
    ) -> Result<()> {
        instructions::update_consumer(
            ctx,
            tariff_key,
            reservoir_key,
            contracted_capacity,
            block_rate,
        )
    }

    pub fn update_consumer_tariff(
        ctx: Context<UpdateConsumerTariff>,
        current_tariff_key: Pubkey,
        new_tariff_key: Pubkey,
    ) -> Result<()> {
        instructions::update_consumer_tariff(ctx, current_tariff_key, new_tariff_key)
    }

    pub fn update_consumer_reservoir(
        ctx: Context<UpdateConsumerReservoir>,
        current_reservoir_key: Pubkey,
        new_reservoir_key: Pubkey,
    ) -> Result<()> {
        instructions::update_consumer_reservoir(ctx, current_reservoir_key, new_reservoir_key)
    }

    pub fn use_water(
        ctx: Context<UseWater>,
        tariff_key: Pubkey,
        reservoir_key: Pubkey,
        amount: u64,
    ) -> Result<()> {
        instructions::use_water(ctx, tariff_key, reservoir_key, amount)
    }

    pub fn dispose_waste(
        ctx: Context<DisposeWaste>,
        tariff_key: Pubkey,
        amount: u64,
    ) -> Result<()> {
        instructions::dispose_waste(ctx, tariff_key, amount)
    }

    pub fn pay_for_water(
        ctx: Context<PayForWater>,
        tariff_key: Pubkey,
        reservoir_key: Pubkey,
        amount: u64,
    ) -> Result<()> {
        instructions::pay_for_water(ctx, tariff_key, reservoir_key, amount)
    }

    pub fn pay_for_waste(ctx: Context<PayForWaste>, tariff_key: Pubkey, amount: u64) -> Result<()> {
        instructions::pay_for_waste(ctx, tariff_key, amount)
    }

    pub fn initialize_tokens(
        ctx: Context<InitializeTokens>,
        water_token: Pubkey,
        water_capacity_token: Pubkey,
        waste_token: Pubkey,
        wastewater_capacity_token: Pubkey,
    ) -> Result<()> {
        instructions::initialize_tokens(ctx, water_token, water_capacity_token, waste_token, wastewater_capacity_token)
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
    #[msg("Overpaid: payment exceeds the necessary amount.")]
    OverPayment
}
