use anchor_lang::prelude::*;
use crate::{ CustomError, DISCRIMINATOR, state::{ Tariff, TariffType }};

/// Initialize **Tariff** account context
/// 
/// The **Tariff** account to be initialized requires a PDA with seeds composed 
/// of the agency's public key, and a unique public key used to identify itself.
/// 
/// # Fields
/// * `tariff` - The PDA account that will store tariff rates and configuration
/// * `agency` - The owner that is authorized to sign operations on its behalf
/// * `system_program` - Required for account creation
///
/// # Seeds
/// * `"tariff"` - Constant string
/// * `agency` - Agency's public key
/// * `tariff_key` - Unique identifier for this tariff
#[derive(Accounts)]
#[instruction(tariff_key: Pubkey)]
pub struct InitializeTariff<'info> {
    #[account(
        init,
        seeds = [
            b"tariff",
            agency.key().as_ref(),
            &tariff_key.as_ref()
        ],
        bump,
        payer = agency, 
        space = DISCRIMINATOR + Tariff::INIT_SPACE
    )]
    pub tariff: Account<'info, Tariff>,
    #[account(mut)]
    pub agency: Signer<'info>,
    pub system_program: Program<'info, System>
}

/// Initialize the program state with provider and tariff details
/// 
/// This function initializes a new Tariff account with the provided rates and configuration.
/// The account is created as a PDA (Program Derived Address) using the agency's public key
/// and a unique tariff key as seeds.
///
/// # Arguments
/// * `ctx` - Context containing the tariff account, agency signer and system program
/// * `tariff_key` - Unique public key identifier for this tariff
/// * `water_rate` - Rate charged for water consumption (must be > 0)
/// * `waste_rate` - Rate charged for waste processing (must be > 0) 
/// * `tariff_type` - Type of tariff (e.g. Residential, Commercial, etc)
///
/// # Errors
/// * `CustomError::InvalidRate` - If water_rate or waste_rate is 0
///
/// # Returns
/// * `Ok(())` on successful initialization 
pub fn initialize_tariff(
    ctx: Context<InitializeTariff>,
    tariff_key: Pubkey,
    water_rate: u64,
    waste_rate: u64,
    tariff_type: TariffType
) -> Result<()> {
    let tariff = &mut ctx.accounts.tariff;

    require!(water_rate > 0, CustomError::InvalidRate);
    require!(waste_rate > 0, CustomError::InvalidRate);

    tariff.tariff_key = tariff_key;
    tariff.water_rate = water_rate;
    tariff.waste_rate = waste_rate;
    tariff.tariff_type = tariff_type;


    msg!("Tariff initialized for tariff {} with rates.", tariff_key);
    Ok(())
}