use crate::{state::Reservoir, CustomError};
use anchor_lang::prelude::*;

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

pub fn update_reservoir(
    ctx: Context<UpdateReservoir>,
    reservoir_key: Pubkey,
    current_level: f64,
    capacity: f64,
) -> Result<()> {
    let reservoir = &mut ctx.accounts.reservoir;

    require_keys_eq!(
        reservoir_key,
        reservoir.reservoir_key,
        CustomError::Unauthorized
    );

    require!(
        current_level > 0.0 && current_level <= capacity,
        CustomError::InvalidReservoirLevel
    );
    require!(capacity > 0.0, CustomError::InvalidReservoirCapacity);

    reservoir.current_level = current_level;
    reservoir.capacity = capacity;

    msg!("Reservoir levels updated.");
    Ok(())
}
