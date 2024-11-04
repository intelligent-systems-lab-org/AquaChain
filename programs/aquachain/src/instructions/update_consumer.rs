use anchor_lang::prelude::*;
use anchor_spl::{associated_token::AssociatedToken, token::{ self, Mint, Token, TokenAccount }};
use crate::{ CustomError, state::{ Consumer, Tariff }};

#[derive(Accounts)]
pub struct UpdateConsumer<'info> {
    #[account(mut)]
    pub consumer: Account<'info, Consumer>,
    #[account(seeds = [b"tariff"], bump)]
    pub tariff: Account<'info, Tariff>,   // Program state with water rate info
    #[account(mut)]
    pub agency: Signer<'info>,
    #[account(mut, associated_token::mint = watc_mint,  associated_token::authority = consumer)]
    pub consumer_watc: Account<'info, TokenAccount>,  // Consumer's WaterCapacityToken account
    #[account(mut, mint::authority = tariff, mint::decimals = 9)]
    pub watc_mint: Account<'info, Mint>,  // Mint for the WaterCapacityToken
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>
}

pub fn update_consumer(
    ctx: Context<UpdateConsumer>,
    contracted_capacity: u64,
    block_rate: f64,
) -> Result<()> {
    let consumer = &mut ctx.accounts.consumer;

    // Validation: Ensure capacity and rate are non-zero
    require!(contracted_capacity > 0, CustomError::InvalidCapacity);
    require!(block_rate > 0.0, CustomError::InvalidRate);

    consumer.block_rate = block_rate;
    consumer.contracted_capacity = contracted_capacity;

    let signer_seeds: &[&[&[u8]]] = &[&[b"tariff", &[ctx.bumps.tariff]]];

    // Burn any existing WATC tokens from the consumer
    if ctx.accounts.consumer_watc.amount > 0 {
        token::burn(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                token::Burn {
                    mint: ctx.accounts.watc_mint.to_account_info(),
                    from: ctx.accounts.consumer_watc.to_account_info(),
                    authority: ctx.accounts.consumer.to_account_info(),
                },
            ),
            ctx.accounts.consumer_watc.amount,
        )?;
    }

    // Mint WATC tokens to the consumer based on contracted capacity
    token::mint_to(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            token::MintTo {
                to: ctx.accounts.consumer_watc.to_account_info(),
                authority: ctx.accounts.tariff.to_account_info(),
                mint: ctx.accounts.watc_mint.to_account_info(),
            },
        )
        .with_signer(signer_seeds),
        contracted_capacity,
    )?;

    msg!("Consumer block rate and consumer capacity updated.");
    Ok(())
}  