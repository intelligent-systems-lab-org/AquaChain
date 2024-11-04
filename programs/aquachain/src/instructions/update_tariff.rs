use anchor_lang::prelude::*;
use crate::{ CustomError, state::{ Tariff, TariffType } };

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
    pub system_program: Program<'info, System>
}

pub fn update_tariff_rates(
    ctx: Context<UpdateTariff>,
    tariff_key: Pubkey,
    water_rate: f64,
    waste_rate: f64
) -> Result<()> {
    let tariff = &mut ctx.accounts.tariff;

    require_keys_eq!(tariff_key, tariff.tariff_key, CustomError::Unauthorized);

    require!(water_rate > 0.0, CustomError::InvalidRate);
    require!(waste_rate > 0.0, CustomError::InvalidRate);

    tariff.water_rate = water_rate;
    tariff.waste_rate = waste_rate;

    msg!("Rates updated.");
    Ok(())
}

pub fn update_tariff_type(
    ctx: Context<UpdateTariff>,
    tariff_key: Pubkey,
    tariff_type: TariffType
) -> Result<()> {
    let tariff = &mut ctx.accounts.tariff;

    require_keys_eq!(tariff_key, tariff.tariff_key, CustomError::Unauthorized);

    tariff.tariff_type = tariff_type;

    msg!("Tariff type updated.");
    Ok(())
}