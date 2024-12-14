use crate::{
    state::{Consumer, Reservoir, Tariff},
    CustomError,
};
use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{self, Mint, Token, TokenAccount},
};

/// Update existing **Consumer** context
///
/// Updates an existing **Consumer** account with new tariff, reservoir, contracted capacity and block rate.
/// Also handles burning existing WATC tokens and minting new ones based on the updated contracted capacity.
///
/// # Fields
/// * `consumer` - The consumer account to be updated (must be signer)
/// * `tariff` - The PDA account containing tariff configuration
/// * `reservoir` - The PDA account containing reservoir configuration  
/// * `agency` - The authority that can sign for minting tokens
/// * `consumer_watc` - The consumer's WATC token account
/// * `consumer_wstc` - The consumer's WSTC token account
/// * `watc_mint` - The WATC token mint
/// * `wstc_mint` - The WSTC token mint
/// * `system_program` - Required for account operations
/// * `token_program` - Required for token operations
/// * `associated_token_program` - Required for associated token operations
///
/// # Seeds for Tariff PDA
/// * `"tariff"` - Constant string
/// * `agency` - Agency's public key  
/// * `tariff_key` - Unique identifier for this tariff
///
/// # Seeds for Reservoir PDA
/// * `"reservoir"` - Constant string
/// * `agency` - Agency's public key
/// * `reservoir_key` - Unique identifier for this reservoir
#[derive(Accounts)]
#[instruction(tariff_key: Pubkey, reservoir_key: Pubkey)]
pub struct UpdateConsumer<'info> {
    #[account(mut, signer)]
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
    #[account(mut, associated_token::mint = wstc_mint,  associated_token::authority = consumer)]
    pub consumer_wstc: Account<'info, TokenAccount>, // Consumer's WasteWaterCapacityToken account
    #[account(mut, mint::authority = agency, mint::decimals = 9)]
    pub watc_mint: Account<'info, Mint>, // Mint for the WaterCapacityToken
    #[account(mut, mint::authority = agency, mint::decimals = 9)]
    pub wstc_mint: Account<'info, Mint>, // Mint for the WasteWaterCapacityToken
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

/// Update contracted capacities of existing consumer account
///
/// Updates an existing consumer's configuration including contracted water and waste capacities.
/// Burns any existing WATC and WSTC tokens and mints new ones based on the updated capacities.
///
/// # Arguments
/// * `ctx` - Context containing consumer account, tariff, reservoir, agency and token accounts
/// * `tariff_key` - Public key identifying the tariff to assign
/// * `reservoir_key` - Public key identifying the reservoir to assign  
/// * `contracted_capacity` - New contracted capacity value (must be > 0)
/// * `contracted_waste_capacity` - New contracted wastewater capacity value (must be > 0)
///
/// # Errors
/// * `CustomError::Unauthorized` - If tariff_key or reservoir_key don't match accounts
/// * `CustomError::InvalidCapacity` - If contracted_capacity or contracted_waste_capacity are 0
///
/// # Returns
/// * `Ok(())` on successful update
pub fn update_consumer(
    ctx: Context<UpdateConsumer>,
    tariff_key: Pubkey,
    reservoir_key: Pubkey,
    contracted_capacity: u64,
    contracted_waste_capacity: u64,
) -> Result<()> {
    let consumer = &mut ctx.accounts.consumer;
    let tariff = &ctx.accounts.tariff;
    let reservoir = &ctx.accounts.reservoir;

    require_keys_eq!(tariff_key, tariff.tariff_key, CustomError::Unauthorized);
    require_keys_eq!(
        reservoir_key,
        reservoir.reservoir_key,
        CustomError::Unauthorized
    );

    // Validation: Ensure capacity and rate are non-zero
    require!(contracted_capacity > 0, CustomError::InvalidCapacity);
    require!(contracted_waste_capacity > 0, CustomError::InvalidCapacity);

    consumer.contracted_capacity = contracted_capacity;
    consumer.contracted_waste_capacity = contracted_waste_capacity;

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
                authority: ctx.accounts.agency.to_account_info(),
                mint: ctx.accounts.watc_mint.to_account_info(),
            },
        ),
        contracted_capacity,
    )?;

    // Burn any existing WSTC tokens from the consumer
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
            ctx.accounts.consumer_wstc.amount,
        )?;
    }

    // Mint WSTC tokens to the consumer based on contracted waste capacity
    token::mint_to(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            token::MintTo {
                to: ctx.accounts.consumer_wstc.to_account_info(),
                authority: ctx.accounts.agency.to_account_info(),
                mint: ctx.accounts.wstc_mint.to_account_info(),
            },
        ),
        contracted_waste_capacity,
    )?;

    msg!("Consumer block rate and consumer capacity updated.");
    Ok(())
}
