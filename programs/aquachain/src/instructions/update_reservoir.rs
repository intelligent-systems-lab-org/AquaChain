use crate::{state::Reservoir, CustomError};
use anchor_lang::prelude::*;

/// Update existing **Reservoir** account context
///
/// The **Reservoir** account to be updated requires a PDA with seeds composed
/// of the agency's public key, and a unique public key used to identify itself.
///
/// # Fields
/// * `reservoir` - The PDA account that stores reservoir levels and configuration
/// * `agency` - The owner that is authorized to sign operations on its behalf
/// * `system_program` - Required for account operations
///
/// # Seeds
/// * `"reservoir"` - Constant string
/// * `agency` - Agency's public key
/// * `reservoir_key` - Unique identifier for this reservoir
#[derive(Accounts)]
#[instruction(reservoir_key: Pubkey)]
pub struct UpdateReservoir<'info> {
    #[account(
        mut,
        seeds = [
            b"reservoir",
            agency.key().as_ref(),
            &reservoir_key.as_ref()
        ],
        bump
    )]
    pub reservoir: Account<'info, Reservoir>,
    #[account(mut)]
    pub agency: Signer<'info>,
    pub system_program: Program<'info, System>,
}

/// Update reservoir levels and capacity
///
/// This function updates the current level and capacity for an existing Reservoir account.
/// The account must be a PDA derived from the agency's public key and the provided
/// reservoir key.
///
/// # Arguments
/// * `ctx` - Context containing the reservoir account, agency signer and system program
/// * `reservoir_key` - Unique public key identifier for this reservoir
/// * `current_level` - New current water level to set (must be greater than 0 and less than capacity)
/// * `capacity` - New maximum capacity to set (must be greater than 0)
///
/// # Errors
/// * `CustomError::Unauthorized` - If reservoir_key doesn't match the account's key
/// * `CustomError::InvalidReservoirLevel` - If current_level is 0 or greater than capacity
/// * `CustomError::InvalidReservoirCapacity` - If capacity is 0
///
/// # Returns
/// * `Ok(())` on successful update
pub fn update_reservoir(
    ctx: Context<UpdateReservoir>,
    reservoir_key: Pubkey,
    current_level: u64,
    capacity: u64,
) -> Result<()> {
    let reservoir = &mut ctx.accounts.reservoir;

    require_keys_eq!(
        reservoir_key,
        reservoir.reservoir_key,
        CustomError::Unauthorized
    );

    require!(
        current_level > 0 && current_level <= capacity,
        CustomError::InvalidReservoirLevel
    );
    require!(capacity > 0, CustomError::InvalidReservoirCapacity);

    reservoir.current_level = current_level;
    reservoir.capacity = capacity;

    msg!("Reservoir levels updated.");
    Ok(())
}
