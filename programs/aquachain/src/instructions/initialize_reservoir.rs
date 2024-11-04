use anchor_lang::prelude::*;
use crate::{ CustomError, DISCRIMINATOR, state::Reservoir };

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

// Initialize aquifer details
pub fn initialize_reservoir(
    ctx: Context<InitializeReservoir>,
    reservoir_key: Pubkey,
    current_level: f64,
    capacity: f64
) -> Result<()> {
    let reservoir = &mut ctx.accounts.reservoir;

    require!(current_level > 0.0 && current_level <= capacity, CustomError::InvalidReservoirLevel);
    require!(capacity > 0.0, CustomError::InvalidReservoirCapacity);

    reservoir.reservoir_key = reservoir_key;
    reservoir.current_level = current_level;
    reservoir.capacity = capacity;

    msg!("Reservoir initialized for reservoir {} with rates.", reservoir_key);
    Ok(())
}