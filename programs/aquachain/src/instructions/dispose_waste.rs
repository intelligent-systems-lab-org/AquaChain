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
    /// Mint of the WasteToken to ensure accounts align on token type
    #[account(mut, mint::authority = agency, mint::decimals = 9)]
    pub wst_mint: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

pub fn dispose_waste(ctx: Context<DisposeWaste>, tariff_key: Pubkey, amount: u64) -> Result<()> {
    let tariff = &ctx.accounts.tariff;

    require_keys_eq!(tariff_key, tariff.tariff_key, CustomError::Unauthorized);

    require!(amount > 0, CustomError::InvalidAmount);

    let amount_fp = FixedPoint::from(amount);
    let waste_rate_fp = FixedPoint::from(tariff.waste_rate);

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

    msg!(
        "Disposed {} units of waste and charged {} WasteTokens.",
        amount,
        total_cost
    );
    Ok(())
}
