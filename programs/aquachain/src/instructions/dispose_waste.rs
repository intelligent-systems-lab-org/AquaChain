use crate::{
    state::{Consumer, Tariff},
    utils::FixedPoint,
    CustomError,
};
use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{self, Mint, Token, TokenAccount},
};

/// Dispose waste instruction context
///
/// The **DisposeWaste** context is used to mint WST tokens to a consumer's account as payment for waste treatment.
///
/// # Fields
/// * `consumer` - The consumer account making the payment
/// * `tariff` - The PDA tariff account assigned to this consumer
/// * `agency` - The authority that can mint tokens
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
pub struct DisposeWaste<'info> {
    #[account(
        seeds = [
            b"tariff",
            agency.key().as_ref(),
            &tariff_key.as_ref()
        ],
        bump
    )]
    pub tariff: Account<'info, Tariff>, // Tariff assigned to this consumer
    pub consumer: Account<'info, Consumer>, // Consumer account
    #[account(mut)]
    pub agency: Signer<'info>,

    // Token account for the consumer to send WST from
    #[account(mut, associated_token::mint = wst_mint,  associated_token::authority = consumer)]
    pub consumer_wst: Account<'info, TokenAccount>,
    #[account(mut, associated_token::mint = wstc_mint,  associated_token::authority = consumer)]
    pub consumer_wstc: Account<'info, TokenAccount>, // Consumer's WasteWaterCapacityToken account
    /// Mint of the WasteToken to ensure accounts align on token type
    #[account(mut, mint::authority = agency, mint::decimals = 9)]
    pub wst_mint: Account<'info, Mint>,
    #[account(mut, mint::authority = agency, mint::decimals = 9)]
    pub wstc_mint: Account<'info, Mint>, // Mint for the WasteWaterCapacityToken
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

/// Charge consumer for waste treatment by minting WST tokens
///
/// This function charges a consumer for their waste disposal by minting WST tokens
/// to their token account. The amount of tokens minted represents the payment for
/// waste treatment based on the waste rate in the tariff.
///
/// # Arguments
/// * `ctx` - Context containing consumer, tariff, agency and token accounts
/// * `tariff_key` - Public key of the tariff assigned to this consumer
/// * `amount` - Amount of waste units disposed, used to calculate WST tokens to mint
///
/// # Errors
/// * `CustomError::Unauthorized` - If tariff_key does not match consumer's assigned value
/// * `CustomError::InvalidAmount` - If amount is zero
///
/// # Returns
/// * `Ok(())` on successful payment
pub fn dispose_waste(ctx: Context<DisposeWaste>, tariff_key: Pubkey, amount: u64) -> Result<()> {
    let tariff = &ctx.accounts.tariff;

    require_keys_eq!(tariff_key, tariff.tariff_key, CustomError::Unauthorized);

    require!(amount > 0, CustomError::InvalidAmount);

    let amount_fp = FixedPoint::from(amount);
    let waste_rate_fp = FixedPoint::from(tariff.waste_rate);
    let consumer_wstc_balance = FixedPoint::from(ctx.accounts.consumer_wstc.amount);

    // Calculate the total cost based on the waste rate
    let total_cost = amount_fp * waste_rate_fp;

    // Mint WST tokens to the consumer's account for waste disposal
    token::mint_to(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            token::MintTo {
                to: ctx.accounts.consumer_wst.to_account_info(),
                authority: ctx.accounts.agency.to_account_info(),
                mint: ctx.accounts.wst_mint.to_account_info(),
            },
        ),
        total_cost.into(),
    )?;

        // Deduct WSTC tokens
        if ctx.accounts.consumer_wstc.amount > 0 {
            token::burn(
                CpiContext::new(
                    ctx.accounts.token_program.to_account_info(),
                    token::Burn {
                        mint: ctx.accounts.wstc_mint.to_account_info(),
                        from: ctx.accounts.consumer_wstc.to_account_info(),
                        authority: ctx.accounts.consumer.to_account_info(),
                    },
                ),
                if consumer_wstc_balance >= amount_fp {
                    amount
                } else {
                    consumer_wstc_balance.into()
                },
            )?;
        }

    msg!(
        "Disposed {} units of waste and charged {} WasteTokens.",
        amount,
        total_cost
    );
    Ok(())
}
