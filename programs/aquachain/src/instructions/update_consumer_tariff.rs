use anchor_lang::prelude::*;
use crate::{Consumer, Tariff, CustomError};

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
    pub system_program: Program<'info, System>
}

pub fn update_consumer_tariff(
    ctx: Context<UpdateConsumerTariff>,
    current_tariff_key: Pubkey,
    new_tariff_key: Pubkey,
) -> Result<()> {
    let consumer = &mut ctx.accounts.consumer;
    let new_tariff = &ctx.accounts.new_tariff;

    require_keys_eq!(current_tariff_key, consumer.assigned_tariff, CustomError::Unauthorized);
    require_keys_eq!(new_tariff_key, new_tariff.tariff_key, CustomError::Unauthorized);
    
    // Update the consumer's assigned tariff to the new one
    consumer.assigned_tariff = new_tariff_key;
    
    msg!("Consumer assigned to a new tariff.");
    Ok(())
}
