// use anchor_lang::prelude::*;
// use anchor_spl::{associated_token::AssociatedToken, token::{ self, Mint, Token, TokenAccount }};
// use crate::{ CustomError, state::{ Consumer, Tariff, TariffType }};

// #[derive(Accounts)]
// pub struct UseWater<'info> {
//     #[account(seeds = [b"tariff"], bump)]
//     pub tariff: Account<'info, Tariff>,   // Program state with water rate info
//     #[account(signer)]
//     pub consumer: Account<'info, Consumer>, // Consumer account
//     #[account(mut)]
//     pub agency: Signer<'info>,    // Authority of the provider

//     // Token account for the consumer to send WTK from
//     #[account(mut, associated_token::mint = wtk_mint,  associated_token::authority = consumer)]
//     pub consumer_wtk: Account<'info, TokenAccount>,

//     // Additional accounts for token transfer
//     #[account(mut, associated_token::mint = watc_mint,  associated_token::authority = consumer)]
//     pub consumer_watc: Account<'info, TokenAccount>,  // Consumer's WaterCapacityToken account
//     #[account(mut,  mint::authority = tariff, mint::decimals = 9)]
//     /// Mint of the WaterToken to ensure accounts align on token type
//     pub wtk_mint: Account<'info, Mint>,
//     #[account(mut, mint::authority = tariff, mint::decimals = 9)]
//     pub watc_mint: Account<'info, Mint>,  // Mint for the WaterCapacityToken
//     pub token_program: Program<'info, Token>,
//     pub associated_token_program: Program<'info, AssociatedToken>,
// }


// pub fn use_water(
//     ctx: Context<UseWater>,
//     amount: f64,
// ) -> Result<()> {
//     let consumer = &mut ctx.accounts.consumer;
//     let tariff = &ctx.accounts.tariff;

//     require!(amount > 0.0, CustomError::InvalidAmount);

//     // Apply block rate or standard rate based on the consumer's contracted capacity
//     let consumer_watc_balance = ctx.accounts.consumer_watc.amount as f64;
//     let threshold = consumer.contracted_capacity as f64;

//     let (level, level_max) = (tariff.reservoir_level, tariff.reservoir_capacity);

//     let total_cost = if consumer_watc_balance >= amount {
//         amount * tariff.water_rate
//     } else {
//         match tariff.tariff_type {
//             TariffType::UniformIBT => {
//                 amount * tariff.water_rate * threshold + consumer.block_rate * (amount - threshold)
//             },
//             TariffType::SeasonalIBT => {
//                 amount * (tariff.water_rate + consumer.block_rate * (level_max - level))
//             },
//             TariffType::SeasonalDBT => {
//                 amount * (tariff.water_rate - consumer.block_rate * (1.0 - (level / level_max)))
//             }
//         }
        
//     };

//     let signer_seeds: &[&[&[u8]]] = &[&[b"tariff", &[ctx.bumps.tariff]]];
//     // Mint WTK tokens to the consumer for the usage cost
//     token::mint_to(
//         CpiContext::new(
//             ctx.accounts.token_program.to_account_info(),
//             token::MintTo {
//                 to: ctx.accounts.consumer_wtk.to_account_info(),
//                 authority: ctx.accounts.tariff.to_account_info(),
//                 mint: ctx.accounts.wtk_mint.to_account_info(),
//             },
//         )
//         .with_signer(signer_seeds),
//         total_cost as u64,
//     )?;

//     // Deduct WATC tokens if within capacity
//     if consumer_watc_balance >= amount {
//         token::burn(
//             CpiContext::new(
//                 ctx.accounts.token_program.to_account_info(),
//                 token::Burn {
//                     mint: ctx.accounts.watc_mint.to_account_info(),
//                     from: ctx.accounts.consumer_watc.to_account_info(),
//                     authority: ctx.accounts.consumer.to_account_info(),
//                 },
//             ),
//             amount as u64,
//         )?;
//     }
//     msg!("Consumer used {} units of water, charged: {}.", amount, total_cost);
//     Ok(())
// }