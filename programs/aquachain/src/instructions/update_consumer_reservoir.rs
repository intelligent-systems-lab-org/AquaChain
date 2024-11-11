use crate::{Consumer, CustomError, Reservoir};
use anchor_lang::prelude::*;

#[derive(Accounts)]
#[instruction(current_reservoir_key: Pubkey, new_reservoir_key: Pubkey)]
pub struct UpdateConsumerReservoir<'info> {
    #[account(mut)]
    pub consumer: Account<'info, Consumer>,
    #[account(
        seeds = [
            b"reservoir",
            agency.key().as_ref(),
            &current_reservoir_key.as_ref()
        ],
        bump
    )]
    pub current_reservoir: Account<'info, Reservoir>, // Current Reservoir assigned to this consumer
    #[account(
        seeds = [
            b"reservoir",
            agency.key().as_ref(),
            &new_reservoir_key.as_ref()
        ],
        bump
    )]
    pub new_reservoir: Account<'info, Reservoir>, // New Reservoir to assign to this consumer
    #[account(mut)]
    pub agency: Signer<'info>,
    pub system_program: Program<'info, System>,
}

pub fn update_consumer_reservoir(
    ctx: Context<UpdateConsumerReservoir>,
    current_reservoir_key: Pubkey,
    new_reservoir_key: Pubkey,
) -> Result<()> {
    let consumer = &mut ctx.accounts.consumer;
    let new_reservoir = &mut ctx.accounts.new_reservoir;

    require_keys_eq!(
        current_reservoir_key,
        consumer.assigned_reservoir,
        CustomError::Unauthorized
    );
    require_keys_eq!(
        new_reservoir_key,
        new_reservoir.reservoir_key,
        CustomError::Unauthorized
    );

    // Update the consumer's assigned reservoir to the new one
    consumer.assigned_reservoir = new_reservoir_key;

    msg!("Consumer assigned to a new reservoir.");
    Ok(())
}
