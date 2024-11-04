use anchor_lang::prelude::*;
use anchor_spl::{associated_token::AssociatedToken, token::{ self, Mint, Token, TokenAccount }};
use crate::{ state::{ Consumer, Tariff, Reservoir }, CustomError, DISCRIMINATOR};

#[derive(Accounts)]
#[instruction(tariff_key: Pubkey, reservoir_key: Pubkey)]
pub struct RegisterConsumer<'info> {
    #[account(init, payer = agency, space = DISCRIMINATOR + Consumer::INIT_SPACE)]
    pub consumer: Account<'info, Consumer>,
    #[account(
        seeds = [
            b"tariff",
            agency.key().as_ref(),
            &tariff_key.as_ref()
        ],
        bump
    )]
    pub tariff: Account<'info, Tariff>,  // Tariff assigned to this consumer
    #[account(
        seeds = [
            b"reservoir",
            agency.key().as_ref(),
            &reservoir_key.as_ref()
        ],
        bump
    )]
    pub reservoir: Account<'info, Reservoir>,  // Reservoir assigned to this consumer
    #[account(mut)]
    pub agency: Signer<'info>,
    #[account(mut, associated_token::mint = watc_mint,  associated_token::authority = consumer)]
    pub consumer_watc: Account<'info, TokenAccount>,  // Consumer's WaterCapacityToken account
    #[account(mut, mint::authority = agency, mint::decimals = 9)]
    pub watc_mint: Account<'info, Mint>,  // Mint for the WaterCapacityToken
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>
}

// Register a new consumer with contracted capacity and block rate
pub fn register_consumer(
    ctx: Context<RegisterConsumer>,
    tariff_key: Pubkey,
    reservoir_key: Pubkey,
    contracted_capacity: u64,
    block_rate: f64,
) -> Result<()> {
    let consumer = &mut ctx.accounts.consumer;

    // Validation: Ensure capacity and rate are non-zero
    require!(contracted_capacity > 0, CustomError::InvalidCapacity);
    require!(block_rate > 0.0, CustomError::InvalidRate);

    consumer.assigned_tariff = tariff_key;
    consumer.assigned_reservoir = reservoir_key;

    consumer.block_rate = block_rate;
    consumer.contracted_capacity = contracted_capacity;

    // Mint WATC tokens to the consumer based on contracted capacity
    token::mint_to(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            token::MintTo {
                to: ctx.accounts.consumer_watc.to_account_info(),
                authority: ctx.accounts.agency.to_account_info(),
                mint: ctx.accounts.watc_mint.to_account_info(),
            },
        ),
        contracted_capacity,
    )?;

    msg!("New consumer registered with contracted capacity and block rate.");
    Ok(())
}