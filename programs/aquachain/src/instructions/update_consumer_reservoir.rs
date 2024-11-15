use crate::{Consumer, CustomError, Reservoir};
use anchor_lang::prelude::*;

/// Update existing **Consumer** reservoir account context
///
/// The **Consumer** account's assigned reservoir will be updated to a new reservoir.
/// Both the current and new reservoirs must be valid PDA accounts owned by the same agency.
///
/// # Fields
/// * `consumer` - The consumer account to be updated
/// * `current_reservoir` - The PDA account of the consumer's current assigned reservoir
/// * `new_reservoir` - The PDA account of the new reservoir to assign
/// * `agency` - The owner that is authorized to sign operations on its behalf
/// * `system_program` - Required for account operations
///
/// # Seeds for reservoir PDAs
/// * `"reservoir"` - Constant string
/// * `agency` - Agency's public key
/// * `reservoir_key` - Unique identifier for the reservoir
#[derive(Accounts)]
#[instruction(current_reservoir_key: Pubkey, new_reservoir_key: Pubkey)]
pub struct UpdateConsumerReservoir<'info> {
    #[account(mut)]
    pub consumer: Account<'info, Consumer>,
    #[account(
        seeds = [
            b"reservoir",
            agency.key().as_ref(),
            &current_reservoir_key.as_ref()
        ],
        bump
    )]
    pub current_reservoir: Account<'info, Reservoir>, // Current Reservoir assigned to this consumer
    #[account(
        seeds = [
            b"reservoir",
            agency.key().as_ref(),
            &new_reservoir_key.as_ref()
        ],
        bump
    )]
    pub new_reservoir: Account<'info, Reservoir>, // New Reservoir to assign to this consumer
    #[account(mut)]
    pub agency: Signer<'info>,
    pub system_program: Program<'info, System>,
}

/// Change the assigned reservoir for an existing consumer
///
/// Updates a consumer's assigned reservoir to a new reservoir account.
/// Both reservoirs must be valid PDA accounts owned by the same agency.
///
/// # Arguments
/// * `ctx` - Context containing the consumer, current reservoir, new reservoir, agency signer and system program
/// * `current_reservoir_key` - Public key of the consumer's current assigned reservoir
/// * `new_reservoir_key` - Public key of the new reservoir to assign
///
/// # Errors
/// * `CustomError::Unauthorized` - If current_reservoir_key doesn't match consumer's assigned reservoir
/// * `CustomError::Unauthorized` - If new_reservoir_key doesn't match the new reservoir account's key
///
/// # Returns
/// * `Ok(())` on successful update
pub fn update_consumer_reservoir(
    ctx: Context<UpdateConsumerReservoir>,
    current_reservoir_key: Pubkey,
    new_reservoir_key: Pubkey,
) -> Result<()> {
    let consumer = &mut ctx.accounts.consumer;
    let new_reservoir = &mut ctx.accounts.new_reservoir;

    require_keys_eq!(
        current_reservoir_key,
        consumer.assigned_reservoir,
        CustomError::Unauthorized
    );
    require_keys_eq!(
        new_reservoir_key,
        new_reservoir.reservoir_key,
        CustomError::Unauthorized
    );

    // Update the consumer's assigned reservoir to the new one
    consumer.assigned_reservoir = new_reservoir_key;

    msg!("Consumer assigned to a new reservoir.");
    Ok(())
}
