use crate::{
    state::{Consumer, Reservoir, Tariff, TariffType},
    utils::FixedPoint,
    CustomError, PenaltyType,
};
use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{self, Mint, Token, TokenAccount},
};

/// Use water instruction context
///
/// The **UseWater** context is used to mint WTK tokens to a consumer's account as payment for water usage.
///
/// # Fields
/// * `consumer` - The consumer account making the payment
/// * `tariff` - The PDA tariff account assigned to this consumer
/// * `reservoir` - The PDA reservoir account assigned to this consumer
/// * `agency` - The authority that can mint tokens
/// * `consumer_wtk` - The consumer's WTK token account
/// * `consumer_watc` - The consumer's WATC token account
/// * `wtk_mint` - The WTK token mint
/// * `watc_mint` - The WATC token mint
/// * `token_program` - Required for token operations
/// * `associated_token_program` - Required for associated token account
///
/// # Seeds for Tariff PDA
/// * `"tariff"` - Constant string
/// * `agency` - Agency's public key
/// * `tariff_key` - Unique identifier for the tariff
///
/// # Seeds for Reservoir PDA
/// * `"reservoir"` - Constant string
/// * `agency` - Agency's public key
/// * `reservoir_key` - Unique identifier for the reservoir
#[derive(Accounts)]
#[instruction(tariff_key: Pubkey, reservoir_key: Pubkey)]
pub struct RedeemAQC<'info> {
    #[account(signer)]
    pub consumer: Account<'info, Consumer>, // Consumer account
    #[account(
        seeds = [
            b"tariff",
            agency.key().as_ref(),
            &tariff_key.as_ref()
        ],
        bump
    )]
    pub tariff: Account<'info, Tariff>, // Tariff assigned to this consumer
    #[account(
        seeds = [
            b"reservoir",
            agency.key().as_ref(),
            &reservoir_key.as_ref()
        ],
        bump
    )]
    pub reservoir: Account<'info, Reservoir>, // Current Reservoir assigned to this consumer
    #[account(mut)]
    pub agency: Signer<'info>, // Authority of the provider
    // Additional accounts for token transfer
    #[account(mut, associated_token::mint = wstc_mint,  associated_token::authority = consumer)]
    pub consumer_wstc: Account<'info, TokenAccount>, // Consumer's WasteWaterCapacityToken account
    #[account(mut, associated_token::mint = aqc_mint,  associated_token::authority = consumer)]
    pub consumer_aqc: Account<'info, TokenAccount>, // Consumer's AquaCoin account
    /// Mint for the WaterToken
    #[account(mut, mint::authority = agency, mint::decimals = 9)]
    pub wstc_mint: Account<'info, Mint>, // Mint for the WasteWaterCapacityToken
    #[account(mut, mint::authority = agency, mint::decimals = 9)]
    pub aqc_mint: Account<'info, Mint>, // Mint for the AquaCoin
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

pub fn redeem_aqc(
    ctx: Context<RedeemAQC>,
    tariff_key: Pubkey,
    reservoir_key: Pubkey
) -> Result<()> {
    let consumer = &mut ctx.accounts.consumer;
    let tariff = &ctx.accounts.tariff;
    let reservoir = &ctx.accounts.reservoir;

    require_keys_eq!(
        tariff_key,
        consumer.assigned_tariff,
        CustomError::Unauthorized
    );
    require_keys_eq!(
        reservoir_key,
        consumer.assigned_reservoir,
        CustomError::Unauthorized
    );

    let consumer_wstc_balance = ctx.accounts.consumer_wstc.amount;
    let aqc_amount = FixedPoint::from(reservoir.aqc_conversion_factor) * FixedPoint::from(consumer_wstc_balance);

    // Burn WSTC tokens
    token::burn(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            token::Burn {
                mint: ctx.accounts.wstc_mint.to_account_info(),
                from: ctx.accounts.consumer_wstc.to_account_info(),
                authority: ctx.accounts.agency.to_account_info(),
            },
        ),
        consumer_wstc_balance,
    )?;

    // Mint AQC tokens
    token::mint_to(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            token::MintTo {
                mint: ctx.accounts.aqc_mint.to_account_info(),
                to: ctx.accounts.consumer_aqc.to_account_info(),
                authority: ctx.accounts.agency.to_account_info(),
            },
        ),
        aqc_amount.into(),
    )?;

    Ok(())
}