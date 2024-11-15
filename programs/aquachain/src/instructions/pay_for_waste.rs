use crate::{
    state::{Consumer, Tariff},
    CustomError,
}; // Import necessary modules
use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{self, Mint, Token, TokenAccount},
};

/// Pay for waste instruction context
///
/// The **PayForWaste** context is used to burn WST tokens from a consumer's account as payment for waste treatment.
///
/// # Fields
/// * `consumer` - The consumer account making the payment
/// * `tariff` - The PDA tariff account assigned to this consumer
/// * `agency` - The authority that can burn tokens
/// * `consumer_wst` - The consumer's WST token account
/// * `wst_mint` - The WST token mint
/// * `token_program` - Required for token operations
/// * `associated_token_program` - Required for associated token account
///
/// # Seeds for Tariff PDA
/// * `"tariff"` - Constant string
/// * `agency` - Agency's public key
/// * `tariff_key` - Unique identifier for the tariff
#[derive(Accounts)]
#[instruction(tariff_key: Pubkey)]
pub struct PayForWaste<'info> {
    #[account(signer)]
    pub consumer: Account<'info, Consumer>,
    #[account(
        seeds = [b"tariff", agency.key().as_ref(), &tariff_key.as_ref()],
        bump
    )]
    pub tariff: Account<'info, Tariff>,
    #[account(mut)]
    pub agency: Signer<'info>, // agency's authorized wallet
    #[account(mut, associated_token::mint = wst_mint, associated_token::authority = consumer)]
    pub consumer_wst: Account<'info, TokenAccount>,
    #[account(mut, mint::authority = agency)]
    pub wst_mint: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

/// Pay for waste treament by burning WST tokens
///
/// This function allows a consumer to pay for waste treatment by burning WST tokens
/// from their token account. The amount of tokens burned represents the payment for
/// waste treatment.
///
/// # Arguments
/// * `ctx` - Context containing consumer, tariff, reservoir, agency and token accounts
/// * `tariff_key` - Public key of the tariff assigned to this consumer
/// * `amount` - Amount of WST tokens to burn as payment
///
/// # Errors
/// * `CustomError::Unauthorized` - If tariff_key does not match consumer's assigned values
/// * `CustomError::OverPayment` - If payment amount exceeds consumer's WST balance
///
/// # Returns
/// * `Ok(())` on successful payment
pub fn pay_for_waste(ctx: Context<PayForWaste>, tariff_key: Pubkey, amount: u64) -> Result<()> {
    let consumer = &mut ctx.accounts.consumer;

    require_keys_eq!(
        tariff_key,
        consumer.assigned_tariff,
        CustomError::Unauthorized
    );

    // ensure that the payment does not exceed the current balance
    require!(
        ctx.accounts.consumer_wst.amount >= amount,
        CustomError::OverPayment
    );

    // Burn WST tokens
    token::burn(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            token::Burn {
                mint: ctx.accounts.wst_mint.to_account_info(),
                from: ctx.accounts.consumer_wst.to_account_info(),
                authority: ctx.accounts.consumer.to_account_info(),
            },
        ),
        amount,
    )?;

    msg!("Burned {} WST tokens on behalf of consumer.", amount);
    Ok(())
}
