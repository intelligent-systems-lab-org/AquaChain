use anchor_lang::prelude::*;
use crate::{ CustomError, DISCRIMINATOR, state::{ Tariff, TariffType }};

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

// Initialize the program state with provider and tariff details
pub fn initialize_tariff(
    ctx: Context<InitializeTariff>,
    tariff_key: Pubkey,
    water_rate: f64,
    waste_rate: f64,
    tariff_type: TariffType
) -> Result<()> {
    let tariff = &mut ctx.accounts.tariff;

    require!(water_rate > 0.0, CustomError::InvalidRate);
    require!(waste_rate > 0.0, CustomError::InvalidRate);

    tariff.water_rate = water_rate;
    tariff.waste_rate = waste_rate;
    tariff.tariff_type = tariff_type;
    tariff.tariff_key = tariff_key;

    msg!("Tariff initialized for tariff {} with rates.", tariff_key);
    Ok(())
}