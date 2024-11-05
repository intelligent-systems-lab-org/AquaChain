use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct Tokens {
    pub wtk: Pubkey,
    pub wst: Pubkey,
    pub watc: Pubkey
}