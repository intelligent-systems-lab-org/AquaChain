use crate::{Consumer, CustomError, Tariff};
use anchor_lang::prelude::*;

/// Update existing **Consumer** tariff account context
///
/// The **Consumer** account's assigned tariff will be updated to a new tariff.
/// Both the current and new tariffs must be valid PDA accounts owned by the same agency.
///
/// # Fields
/// * `consumer` - The consumer account to be updated
/// * `current_tariff` - The PDA account of the consumer's current assigned tariff
/// * `new_tariff` - The PDA account of the new tariff to assign
/// * `agency` - The owner that is authorized to sign operations on its behalf
/// * `system_program` - Required for account operations
///
/// # Seeds for tariff PDAs
/// * `"tariff"` - Constant string
/// * `agency` - Agency's public key
/// * `tariff_key` - Unique identifier for the tariff
#[derive(Accounts)]
#[instruction(current_tariff_key: Pubkey, new_tariff_key: Pubkey)]
pub struct UpdateConsumerTariff<'info> {
    #[account(mut)]
    pub consumer: Account<'info, Consumer>,
    #[account(
        seeds = [
            b"tariff",
            agency.key().as_ref(),
            &current_tariff_key.as_ref()
        ],
        bump
    )]
    pub current_tariff: Account<'info, Tariff>, // Current Tariff assigned to this consumer
    #[account(
        seeds = [
            b"tariff",
            agency.key().as_ref(),
            &new_tariff_key.as_ref()
        ],
        bump
    )]
    pub new_tariff: Account<'info, Tariff>, // New Tariff to assign to this consumer
    #[account(mut)]
    pub agency: Signer<'info>,
    pub system_program: Program<'info, System>,
}

/// Change the assigned tariff for an existing consumer
///
/// Updates a consumer's assigned tariff to a new tariff account
/// Both tariffs must be valid PDA accounts owned by the same agency
///
/// # Arguments
/// * `ctx` - Context containing the consumer, current tariff, new tariff, agency signer and system program
/// * `current_tariff_key` - Public key of the consumer's current assigned tariff
/// * `new_tariff_key` - Public key of the new tariff to assign
///
/// # Errors
/// * `CustomError::Unauthorized` - If current_tariff_key doesn't match consumer's assigned tariff
/// * `CustomError::Unauthorized` - If new_tariff_key doesn't match the new tariff account's key
///
/// # Returns
/// * `Ok(())` on successful update
pub fn update_consumer_tariff(
    ctx: Context<UpdateConsumerTariff>,
    current_tariff_key: Pubkey,
    new_tariff_key: Pubkey,
) -> Result<()> {
    let consumer = &mut ctx.accounts.consumer;
    let new_tariff = &ctx.accounts.new_tariff;

    require_keys_eq!(
        current_tariff_key,
        consumer.assigned_tariff,
        CustomError::Unauthorized
    );
    require_keys_eq!(
        new_tariff_key,
        new_tariff.tariff_key,
        CustomError::Unauthorized
    );

    // Update the consumer's assigned tariff to the new one
    consumer.assigned_tariff = new_tariff_key;

    msg!("Consumer assigned to a new tariff.");
    Ok(())
}
