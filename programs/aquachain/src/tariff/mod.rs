use anchor_lang::prelude::*;

#[derive(InitSpace, AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, Eq, PartialEq)]
pub enum TariffType {
    TwoPart,
    SeasonalIncr,
    SeasonalDecr,
    Geographical
}

pub const DISCRIMINATOR: usize = 8;

// Define custom errors
#[error_code]
pub enum CustomError {
    #[msg("Invalid contracted capacity: must be greater than zero.")]
    InvalidCapacity,
    #[msg("Invalid rate: must be greater than zero.")]
    InvalidRate,
    #[msg("Invalid reservoir level: must be greater than zero.")]
    InvalidReservoirLevel
}

// Define the program state and tariff details
#[account]
#[derive(InitSpace)]
pub struct Tariff {
    pub water_rate: u64,
    pub waste_rate: u64,
    pub tariff_type: TariffType,
    pub reservoir_level: u64,
    pub reservoir_capacity: u64
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init, 
        seeds = [b"tariff"],
        bump,
        payer = agency, 
        space = DISCRIMINATOR + Tariff::INIT_SPACE
    )]
    pub tariff: Account<'info, Tariff>,
    #[account(mut)]
    pub agency: Signer<'info>,
    pub system_program: Program<'info, System>
}

#[derive(Accounts)]
pub struct UpdateTariff<'info> {
    #[account(mut, seeds = [b"tariff"], bump)]
    pub tariff: Account<'info, Tariff>,
    #[account(mut)]
    pub agency: Signer<'info>,
    pub system_program: Program<'info, System>
}


// Initialize the program state with provider and tariff details
pub fn initialize(
    ctx: Context<Initialize>,
    water_rate: u64,
    waste_rate: u64,
    tariff_type: TariffType,
    reservoir_level: u64,
    reservoir_capacity: u64
) -> Result<()> {
    let tariff = &mut ctx.accounts.tariff;

    require!(water_rate > 0, CustomError::InvalidRate);
    require!(waste_rate > 0, CustomError::InvalidRate);
    require!(reservoir_level > 0, CustomError::InvalidReservoirLevel);
    require!(reservoir_capacity > 0, CustomError::InvalidReservoirLevel);

    tariff.water_rate = water_rate;
    tariff.waste_rate = waste_rate;
    tariff.tariff_type = tariff_type;
    tariff.reservoir_level = reservoir_level;
    tariff.reservoir_capacity = reservoir_capacity;

    msg!("Aquachain program initialized with rates.");
    Ok(())
}

pub fn update_rates(
    ctx: Context<UpdateTariff>,
    water_rate: u64,
    waste_rate: u64
) -> Result<()> {
    let tariff = &mut ctx.accounts.tariff;

    require!(water_rate > 0, CustomError::InvalidRate);
    require!(waste_rate > 0, CustomError::InvalidRate);

    tariff.water_rate = water_rate;
    tariff.waste_rate = waste_rate;

    msg!("Rates updated.");
    Ok(())
}

pub fn update_tariff_type(
    ctx: Context<UpdateTariff>,
    tariff_type: TariffType
) -> Result<()> {
    let tariff = &mut ctx.accounts.tariff;

    tariff.tariff_type = tariff_type;

    msg!("Tariff type updated.");
    Ok(())
}

pub fn update_reservoir_levels(
    ctx: Context<UpdateTariff>,
    reservoir_level: u64,
    reservoir_capacity: u64
) -> Result<()> {
    let tariff = &mut ctx.accounts.tariff;

    require!(reservoir_level > 0, CustomError::InvalidReservoirLevel);
    require!(reservoir_capacity > 0, CustomError::InvalidReservoirLevel);

    tariff.reservoir_level = reservoir_level;
    tariff.reservoir_capacity = reservoir_capacity;

    msg!("Reservoir levels updated.");
    Ok(())
}

mod tariffs;
pub use tariffs::*;