use crate::{
    state::{Consumer, Reservoir, Tariff},
    CustomError, DISCRIMINATOR,
};
use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{self, Mint, Token, TokenAccount},
};

/// Initialize **RegisterConsumer** account context
///
/// The **RegisterConsumer** context is used to register a new consumer account with an assigned tariff,
/// reservoir, and initial WATC token allocation based on contracted capacity.
///
/// # Fields
/// * `consumer` - The new consumer account to be initialized
/// * `tariff` - The PDA tariff account assigned to this consumer
/// * `reservoir` - The PDA reservoir account assigned to this consumer  
/// * `agency` - The authority that can register new consumers
/// * `consumer_watc` - The consumer's WATC token account
/// * `watc_mint` - The WATC token mint
/// * `system_program` - Required for account creation
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
    pub tariff: Account<'info, Tariff>, // Tariff assigned to this consumer
    #[account(
        seeds = [
            b"reservoir",
            agency.key().as_ref(),
            &reservoir_key.as_ref()
        ],
        bump
    )]
    pub reservoir: Account<'info, Reservoir>, // Reservoir assigned to this consumer
    #[account(mut)]
    pub agency: Signer<'info>,
    #[account(mut, associated_token::mint = watc_mint,  associated_token::authority = consumer)]
    pub consumer_watc: Account<'info, TokenAccount>, // Consumer's WaterCapacityToken account
    #[account(mut, mint::authority = agency, mint::decimals = 9)]
    pub watc_mint: Account<'info, Mint>, // Mint for the WaterCapacityToken
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

// Register a new consumer with contracted capacity and block rate
/// Register a new consumer with contracted capacity and block rate
///
/// This function registers a new consumer account and initializes it with the provided
/// contracted capacity and block rate. It also mints WATC tokens to the consumer based
/// on their contracted capacity.
///
/// # Arguments
/// * `ctx` - Context containing consumer, tariff, reservoir, agency and token accounts
/// * `tariff_key` - Public key of the tariff assigned to this consumer
/// * `reservoir_key` - Public key of the reservoir assigned to this consumer
/// * `contracted_capacity` - Amount of water capacity contracted by the consumer (must be > 0)
/// * `block_rate` - Rate charged per block of water usage (must be > 0)
///
/// # Errors
/// * `CustomError::InvalidCapacity` - If contracted_capacity is 0
/// * `CustomError::InvalidRate` - If block_rate is 0
///
/// # Returns
/// * `Ok(())` on successful registration
pub fn register_consumer(
    ctx: Context<RegisterConsumer>,
    tariff_key: Pubkey,
    reservoir_key: Pubkey,
    contracted_capacity: u64,
    block_rate: u64,
) -> Result<()> {
    let consumer = &mut ctx.accounts.consumer;

    // Validation: Ensure capacity and rate are non-zero
    require!(contracted_capacity > 0, CustomError::InvalidCapacity);
    require!(block_rate > 0, CustomError::InvalidRate);

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
