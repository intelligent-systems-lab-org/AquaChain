use crate::{state::Tokens, DISCRIMINATOR};
use anchor_lang::prelude::*;

/// Initialize **Tokens** account context
///
/// The **Tokens** account to be initialized requires a PDA whose seeds include the agency's public key.
///
/// # Fields
/// * `tokens` - The PDA account that will store token addresses
/// * `authority` - The owner that is authorized to sign operations on its behalf
/// * `system_program` - Required for account creation
///
/// # Seeds
/// * `"tokens"` - Constant string
/// * `authority` - Authority's public key
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

/// Initialize tokens with provided token addresses
///
/// This function initializes a new Tokens account with the provided token addresses.
/// The account is created as a PDA (Program Derived Address) using the authority's public key
/// as a seed.
///
/// # Arguments
/// * `ctx` - Context containing the tokens account, authority signer and system program
/// * `water_token` - Public key of the water token mint
/// * `water_capacity_token` - Public key of the water capacity token mint
/// * `waste_token` - Public key of the waste token mint
/// * `wastewater_capacity_token` - Public key of the wastewater capacity token mint
/// * `aquacoin` - Public key of the aquacoin mint
///
/// # Returns
/// * `Ok(())` on successful initialization
pub fn initialize_tokens(
    ctx: Context<InitializeTokens>,
    water_token: Pubkey,
    water_capacity_token: Pubkey,
    waste_token: Pubkey,
    wastewater_capacity_token: Pubkey,
    aquacoin: Pubkey,
) -> Result<()> {
    if ctx.accounts.tokens.wtk != Pubkey::default() {
        msg!("Tokens already initialized");
    } else {
        let tokens = &mut ctx.accounts.tokens;
        tokens.wtk = water_token;
        tokens.watc = water_capacity_token;
        tokens.wst = waste_token;
        tokens.wstc = wastewater_capacity_token;
        tokens.aqc = aquacoin;

        msg!(
            "Token mints initialized with WaterToken: {}, WaterCapacityToken: {}, WasteToken: {}, 
            WasteWaterCapacityToken: {}, AquaCoin: {}",
            water_token,
            water_capacity_token,
            waste_token,
            wastewater_capacity_token,
            aquacoin,
        );
    }

    Ok(())
}
