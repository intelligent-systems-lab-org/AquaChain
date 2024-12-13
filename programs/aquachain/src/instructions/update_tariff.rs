use crate::{
    state::{Tariff, TariffType},
    CustomError,
};
use anchor_lang::prelude::*;

/// Update existing **Tariff** account context
///
/// The **Tariff** account to be updated requires a PDA with seeds composed
/// of the agency's public key, and a unique public key used to identify itself.
///
/// # Fields
/// * `tariff` - The PDA account that stores tariff rates and configuration
/// * `agency` - The owner that is authorized to sign operations on its behalf
/// * `system_program` - Required for account operations
///
/// # Seeds
/// * `"tariff"` - Constant string
/// * `agency` - Agency's public key
/// * `tariff_key` - Unique identifier for this tariff
#[derive(Accounts)]
#[instruction(tariff_key: Pubkey)]
pub struct UpdateTariff<'info> {
    #[account(
        mut,
        seeds = [
            b"tariff",
            agency.key().as_ref(),
            &tariff_key.as_ref()
        ],
        bump
    )]
    pub tariff: Account<'info, Tariff>,
    #[account(mut)]
    pub agency: Signer<'info>,
    pub system_program: Program<'info, System>,
}

/// Update water and waste rates for an existing tariff account
///
/// This function updates the water and waste rates for an existing Tariff account.
/// The account must be a PDA derived from the agency's public key and the provided
/// tariff key.
///
/// # Arguments
/// * `ctx` - Context containing the tariff account, agency signer and system program
/// * `tariff_key` - Unique public key identifier for this tariff
/// * `waste_rate` - New waste rate to set (must be greater than 0)
///
/// # Errors
/// * `CustomError::Unauthorized` - If tariff_key doesn't match the account's key
/// * `CustomError::InvalidRate` - If waste_rate is 0
///
/// # Returns
/// * `Ok(())` on successful update
pub fn update_tariff_rates(
    ctx: Context<UpdateTariff>,
    tariff_key: Pubkey,
    waste_rate: u64,
) -> Result<()> {
    let tariff = &mut ctx.accounts.tariff;

    require_keys_eq!(tariff_key, tariff.tariff_key, CustomError::Unauthorized);

    require!(waste_rate > 0, CustomError::InvalidRate);

    tariff.waste_rate = waste_rate;

    msg!("Rates updated.");
    Ok(())
}

/// Update the tariff type for an existing tariff account
///
/// This function updates the tariff type (e.g. UniformIBT, SeasonalIBT) for an existing
/// Tariff account. The account must be a PDA derived from the agency's public key and
/// the provided tariff key.
///
/// # Arguments
/// * `ctx` - Context containing the tariff account, agency signer and system program
/// * `tariff_key` - Unique public key identifier for this tariff
/// * `tariff_type` - New tariff type to set
///
/// # Errors
/// * `CustomError::Unauthorized` - If tariff_key doesn't match the account's key
///
/// # Returns
/// * `Ok(())` on successful update
pub fn update_tariff_type(
    ctx: Context<UpdateTariff>,
    tariff_key: Pubkey,
    tariff_type: TariffType,
) -> Result<()> {
    let tariff = &mut ctx.accounts.tariff;

    require_keys_eq!(tariff_key, tariff.tariff_key, CustomError::Unauthorized);

    tariff.tariff_type = tariff_type;

    msg!("Tariff type updated.");
    Ok(())
}
