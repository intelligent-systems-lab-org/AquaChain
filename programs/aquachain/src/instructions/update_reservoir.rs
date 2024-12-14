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
/// * `current_level` - Current water level in the reservoir (must be > 0 and <= capacity)
/// * `capacity` - Maximum capacity of the reservoir (must be > 0)
/// * `max_allowable_waste` - Maximum waste water that can be processed (must be > 0)
/// * `min_allowable_level` - Minimum required water level (must be > 0 and <= capacity)
/// * `aqc_conversion_factor` - Conversion rate from WasteWaterCapacityToken to AquaCoin (must be > 0)
/// * `aqc_discount_factor` - Discount factor based on AquaCoin holdings (must be > 0)
///
/// # Errors
/// * `CustomError::Unauthorized` - If reservoir_key doesn't match the account's key
/// * `CustomError::InvalidReservoirLevel` - If current_level is 0 or exceeds capacity, or if min_allowable_level is 0 or exceeds capacity
/// * `CustomError::InvalidReservoirCapacity` - If capacity is 0
/// * `CustomError::InvalidAmount` - If max_allowable_waste, aqc_conversion_factor or aqc_discount_factor is 0
///
/// # Returns
/// * `Ok(())` on successful update
pub fn update_reservoir(
    ctx: Context<UpdateReservoir>,
    reservoir_key: Pubkey,
    current_level: u64,
    capacity: u64,
    max_allowable_waste: u64,
    min_allowable_level: u64,
    aqc_conversion_factor: u64,
    aqc_discount_factor: u64,
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
    require!(max_allowable_waste > 0, CustomError::InvalidAmount);
    require!(
        min_allowable_level > 0 && min_allowable_level <= capacity,
        CustomError::InvalidReservoirLevel
    );
    require!(aqc_conversion_factor > 0, CustomError::InvalidAmount);
    require!(aqc_discount_factor > 0, CustomError::InvalidAmount);

    reservoir.current_level = current_level;
    reservoir.capacity = capacity;
    reservoir.max_allowable_waste = max_allowable_waste;
    reservoir.min_allowable_level = min_allowable_level;
    reservoir.aqc_conversion_factor = aqc_conversion_factor;
    reservoir.aqc_discount_factor = aqc_discount_factor;

    msg!("Reservoir data updated.");
    Ok(())
}
