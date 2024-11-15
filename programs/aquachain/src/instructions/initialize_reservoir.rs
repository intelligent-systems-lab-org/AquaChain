use anchor_lang::prelude::*;
use crate::{ CustomError, DISCRIMINATOR, state::Reservoir };

/// Initialize **Reservoir** account context
/// 
/// The **Reservoir** account to be initialized requires a PDA with seeds composed 
/// of the agency's public key, and a unique public key used to identify itself.
/// 
/// # Fields
/// * `reservoir` - The PDA account that will store reservoir levels and configuration
/// * `agency` - The owner that is authorized to sign operations on its behalf
/// * `system_program` - Required for account creation
///
/// # Seeds
/// * `"reservoir"` - Constant string
/// * `agency` - Agency's public key
/// * `reservoir_key` - Unique identifier for this reservoir
#[derive(Accounts)]
#[instruction(reservoir_key: Pubkey)]
pub struct InitializeReservoir<'info> {
    #[account(
        init,
        seeds = [
            b"reservoir",
            agency.key().as_ref(),
            &reservoir_key.as_ref()
        ],
        bump,
        payer = agency, 
        space = DISCRIMINATOR + Reservoir::INIT_SPACE
    )]
    pub reservoir: Account<'info, Reservoir>,
    #[account(mut)]
    pub agency: Signer<'info>,
    pub system_program: Program<'info, System>
}
 
/// Initialize reservoir details
/// 
/// This function initializes a new Reservoir account with the provided levels and configuration.
/// The account is created as a PDA (Program Derived Address) using the agency's public key
/// and a unique reservoir key as seeds.
///
/// # Arguments
/// * `ctx` - Context containing the reservoir account, agency signer and system program
/// * `reservoir_key` - Unique public key identifier for this reservoir
/// * `current_level` - Current water level in the reservoir (must be > 0 and <= capacity)
/// * `capacity` - Maximum capacity of the reservoir (must be > 0)
///
/// # Errors
/// * `CustomError::InvalidReservoirLevel` - If current_level is 0 or exceeds capacity
/// * `CustomError::InvalidReservoirCapacity` - If capacity is 0
///
/// # Returns
/// * `Ok(())` on successful initialization 
pub fn initialize_reservoir(
    ctx: Context<InitializeReservoir>,
    reservoir_key: Pubkey,
    current_level: u64,
    capacity: u64
) -> Result<()> {
    let reservoir = &mut ctx.accounts.reservoir;

    require!(current_level > 0 && current_level <= capacity, CustomError::InvalidReservoirLevel);
    require!(capacity > 0, CustomError::InvalidReservoirCapacity);

    reservoir.reservoir_key = reservoir_key;
    reservoir.current_level = current_level;
    reservoir.capacity = capacity;

    msg!("Reservoir initialized for reservoir {} with rates.", reservoir_key);
    Ok(())
}