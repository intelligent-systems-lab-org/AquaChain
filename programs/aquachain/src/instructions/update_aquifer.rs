use anchor_lang::prelude::*;
use crate::{ CustomError, state::Aquifer };

#[derive(Accounts)]
pub struct UpdateAquifer<'info> {
    #[account(mut)]
    pub aquifer: Account<'info, Aquifer>,
    #[account(mut)]
    pub agency: Signer<'info>,
    pub system_program: Program<'info, System>
}


pub fn update_aquifer(
    ctx: Context<UpdateAquifer>,
    current_level: f64,
    capacity: f64
) -> Result<()> {
    let aquifer = &mut ctx.accounts.aquifer;

    require!(current_level > 0.0, CustomError::InvalidAquiferLevel);
    require!(capacity > 0.0, CustomError::InvalidAquiferLevel);

    aquifer.current_level = current_level;
    aquifer.capacity = capacity;

    msg!(" levels updated.");
    Ok(())
}