use anchor_lang::prelude::*;
use crate::{ DISCRIMINATOR, state::Tokens};

#[derive(Accounts)]
pub struct InitializeTokens<'info> {
    #[account(
        init_if_needed,
        payer = authority,
        space = DISCRIMINATOR + Tokens::INIT_SPACE,
        seeds = [b"tokens", authority.key().as_ref()],
        bump
    )]
    pub tokens: Account<'info, Tokens>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

pub fn initialize_tokens(
    ctx: Context<InitializeTokens>,
    water_token: Pubkey,
    water_capacity_token: Pubkey,
    waste_token: Pubkey,
) -> Result<()> {
    if ctx.accounts.tokens.wtk != Pubkey::default() {
        msg!("Tokens already initialized");
    }
    else {
        let tokens = &mut ctx.accounts.tokens;
        tokens.wtk = water_token;
        tokens.watc = water_capacity_token;
        tokens.wst = waste_token;
        
        msg!("Token mints initialized with WaterToken: {}, WaterCapacityToken: {}, WasteToken: {}",
        water_token, water_capacity_token, waste_token);
    }

    Ok(())
}
