use anchor_lang::prelude::*;
use anchor_spl::{associated_token::AssociatedToken, token::{ self, Mint, Token, TokenAccount }};
use crate::{ CustomError, state::{Consumer, Tariff} };

#[derive(Accounts)]
pub struct DisposeWaste<'info> {
    #[account(seeds = [b"tariff"], bump)]
    pub tariff: Account<'info, Tariff>,   // Program state with water rate info
    pub consumer: Account<'info, Consumer>, // Consumer account
    #[account(mut)]
    pub agency: Signer<'info>,

    // Token account for the consumer to send WST from
    #[account(mut, associated_token::mint = wst_mint,  associated_token::authority = consumer)]
    pub consumer_wst: Account<'info, TokenAccount>,

    #[account(mut, mint::authority = tariff, mint::decimals = 9)]
    /// Mint of the WasteToken to ensure accounts align on token type
    pub wst_mint: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

pub fn dispose_waste(
    ctx: Context<DisposeWaste>,
    amount: f64,
) -> Result<()> {
    let tariff = &ctx.accounts.tariff;

    require!(amount > 0.0, CustomError::InvalidAmount);

    // Calculate the total cost based on the waste rate
    let total_cost = amount * tariff.waste_rate;

    let signer_seeds: &[&[&[u8]]] = &[&[b"tariff", &[ctx.bumps.tariff]]];
    // Mint WST tokens to the consumer's account for waste disposal
    token::mint_to(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            token::MintTo {
                to: ctx.accounts.consumer_wst.to_account_info(),
                authority: ctx.accounts.tariff.to_account_info(),
                mint: ctx.accounts.wst_mint.to_account_info(),
            },
        )
        .with_signer(signer_seeds),
        total_cost as u64,
    )?;

    msg!("Disposed {} units of waste and paid {} WasteTokens.", amount, total_cost);
    Ok(())
}