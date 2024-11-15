use crate::{
    state::{Consumer, Reservoir, Tariff},
    CustomError,
}; // Import necessary modules
use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{self, Mint, Token, TokenAccount},
};

/// Pay for water instruction context
///
/// The **PayForWater** context is used to burn WTK tokens from a consumer's account as payment for water usage.
///
/// # Fields
/// * `consumer` - The consumer account making the payment
/// * `tariff` - The PDA tariff account assigned to this consumer
/// * `reservoir` - The PDA reservoir account assigned to this consumer
/// * `agency` - The authority that can burn tokens
/// * `consumer_wtk` - The consumer's WTK token account
/// * `wtk_mint` - The WTK token mint
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
pub struct PayForWater<'info> {
    #[account(signer)]
    pub consumer: Account<'info, Consumer>,
    #[account(
        seeds = [b"tariff", agency.key().as_ref(), &tariff_key.as_ref()],
        bump
    )]
    pub tariff: Account<'info, Tariff>,
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
    pub agency: Signer<'info>, // agency's authorized wallet
    #[account(mut, associated_token::mint = wtk_mint, associated_token::authority = consumer)]
    pub consumer_wtk: Account<'info, TokenAccount>,
    #[account(mut, mint::authority = agency)]
    pub wtk_mint: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

/// Pay for water consumption by burning WTK tokens
///
/// This function allows a consumer to pay for their water usage by burning WTK tokens
/// from their token account. The amount of tokens burned represents the payment for
/// water consumption.
///
/// # Arguments
/// * `ctx` - Context containing consumer, tariff, reservoir, agency and token accounts
/// * `tariff_key` - Public key of the tariff assigned to this consumer
/// * `reservoir_key` - Public key of the reservoir assigned to this consumer
/// * `amount` - Amount of WTK tokens to burn as payment
///
/// # Errors
/// * `CustomError::Unauthorized` - If tariff_key or reservoir_key do not match consumer's assigned values
/// * `CustomError::OverPayment` - If payment amount exceeds consumer's WTK balance
///
/// # Returns
/// * `Ok(())` on successful payment
pub fn pay_for_water(
    ctx: Context<PayForWater>,
    tariff_key: Pubkey,
    reservoir_key: Pubkey,
    amount: u64,
) -> Result<()> {
    let consumer = &mut ctx.accounts.consumer;

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

    // ensure that the payment does not exceed the current balance
    require!(
        ctx.accounts.consumer_wtk.amount >= amount,
        CustomError::OverPayment
    );

    // Burn WTK tokens
    token::burn(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            token::Burn {
                mint: ctx.accounts.wtk_mint.to_account_info(),
                from: ctx.accounts.consumer_wtk.to_account_info(),
                authority: ctx.accounts.consumer.to_account_info(),
            },
        ),
        amount,
    )?;

    msg!("Burned {} WTK tokens on behalf of consumer.", amount);
    Ok(())
}
