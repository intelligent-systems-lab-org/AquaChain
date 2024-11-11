use crate::{
    state::{Consumer, Reservoir, Tariff},
    CustomError,
}; // Import necessary modules
use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{self, Mint, Token, TokenAccount},
};

// Add these accounts and instruction for burning tokens on behalf of consumers
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
    pub agency: Signer<'info>, // WASA's or agency's authorized wallet
    #[account(mut, associated_token::mint = wtk_mint, associated_token::authority = consumer)]
    pub consumer_wtk: Account<'info, TokenAccount>,
    #[account(mut, mint::authority = agency)]
    pub wtk_mint: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

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
    require!(ctx.accounts.consumer_wtk.amount >= amount, CustomError::OverPayment);

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
