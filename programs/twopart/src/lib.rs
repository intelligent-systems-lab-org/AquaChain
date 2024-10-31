use anchor_lang::prelude::*;
use anchor_spl::token::{ self, Mint, TokenAccount, Token };

declare_id!("8Pq7ktrXscMpnabgCLXzqyv1iv2wWy8mTg8JSYYW4oFa");

const DISCRIMINATOR: usize = 8;

// Define custom errors
#[error_code]
pub enum CustomError {
    #[msg("Invalid contracted capacity: must be greater than zero.")]
    InvalidCapacity,
    #[msg("Invalid block rate: must be greater than zero.")]
    InvalidRate,
}

#[program]
pub mod twopart {
    use super::*;

    // Initialize the program state with provider and tariff details
    pub fn initialize(
        ctx: Context<Initialize>,
        water_rate: u64,
        waste_rate: u64
    ) -> Result<()> {
        let tariff = &mut ctx.accounts.tariff;
        tariff.water_rate = water_rate;
        tariff.waste_rate = waste_rate;

        msg!("Aquachain program initialized with rates.");
        Ok(())
    }

    // Register a new consumer with contracted capacity and block rate
    pub fn register_consumer(
        ctx: Context<RegisterConsumer>,
        contracted_capacity: u64,
        block_rate: u64,
    ) -> Result<()> {
        let consumer = &mut ctx.accounts.consumer;

        // Validation: Ensure capacity and rate are non-zero
        require!(contracted_capacity > 0, CustomError::InvalidCapacity);
        require!(block_rate > 0, CustomError::InvalidRate);

        consumer.block_rate = block_rate;
        let signer_seeds: &[&[&[u8]]] = &[&[b"tariff", &[ctx.bumps.tariff]]];

        // Mint WATC tokens to the consumer based on contracted capacity
        token::mint_to(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                token::MintTo {
                    to: ctx.accounts.consumer_watc.to_account_info(),
                    authority: ctx.accounts.tariff.to_account_info(),
                    mint: ctx.accounts.watc_mint.to_account_info(),
                },
            )
            .with_signer(signer_seeds),
            contracted_capacity,
        )?;

        msg!("New consumer registered with contracted capacity and block rate.");
        Ok(())
    }

    pub fn use_water(
        ctx: Context<UseWater>,
        amount: u64,
    ) -> Result<()> {
        let consumer = &mut ctx.accounts.consumer;
        let tariff = &ctx.accounts.tariff;

        // Apply block rate or standard rate based on the consumer's contracted capacity
        let consumer_watc_balance = ctx.accounts.consumer_watc.amount;
        let rate = if consumer_watc_balance >= amount {
            tariff.water_rate
        } else {
            consumer.block_rate
        };

        let total_cost = amount * rate;

        let signer_seeds: &[&[&[u8]]] = &[&[b"tariff", &[ctx.bumps.tariff]]];
        // Mint WTK tokens to the consumer for the usage cost
        token::mint_to(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                token::MintTo {
                    to: ctx.accounts.consumer_wtk.to_account_info(),
                    authority: ctx.accounts.tariff.to_account_info(),
                    mint: ctx.accounts.wtk_mint.to_account_info(),
                },
            )
            .with_signer(signer_seeds),
            total_cost,
        )?;

        // Deduct WATC tokens if within capacity
        if consumer_watc_balance >= amount {
            token::burn(
                CpiContext::new(
                    ctx.accounts.token_program.to_account_info(),
                    token::Burn {
                        mint: ctx.accounts.watc_mint.to_account_info(),
                        from: ctx.accounts.consumer_watc.to_account_info(),
                        authority: ctx.accounts.consumer.to_account_info(),
                    },
                ),
                amount,
            )?;
        }
        msg!("Consumer used {} units of water, charged at rate: {}.", amount, rate);
        Ok(())
    }

    pub fn dispose_waste(
        ctx: Context<DisposeWaste>,
        amount: u64,
    ) -> Result<()> {
        let tariff = &ctx.accounts.tariff;

        // Calculate the total cost based on the waste rate
        let total_cost = amount * tariff.waste_rate;

        let signer_seeds: &[&[&[u8]]] = &[&[b"tariff", &[ctx.bumps.tariff]]];
        // Mint WST tokens to the consumer's account for waste disposal
        token::mint_to(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                token::MintTo {
                    to: ctx.accounts.consumer_wst.to_account_info(),
                    authority: ctx.accounts.tariff.to_account_info(),
                    mint: ctx.accounts.wst_mint.to_account_info(),
                },
            )
            .with_signer(signer_seeds),
            total_cost,
        )?;

        msg!("Disposed {} units of waste and paid {} WasteTokens.", amount, total_cost);
        Ok(())
    }

}

// Define the program state and tariff details
#[account]
#[derive(InitSpace)]
pub struct Tariff {
    pub water_rate: u64,
    pub waste_rate: u64,
}

// Define the consumer structure
#[account]
#[derive(InitSpace)]
pub struct Consumer {
    pub block_rate: u64
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init, 
        seeds = [b"tariff"],
        bump,
        payer = agency, 
        space = DISCRIMINATOR + Tariff::INIT_SPACE
    )]
    pub tariff: Account<'info, Tariff>,
    #[account(mut)]
    pub agency: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RegisterConsumer<'info> {
    #[account(init, payer = agency, space = DISCRIMINATOR + Consumer::INIT_SPACE)]
    pub consumer: Account<'info, Consumer>,
    #[account(seeds = [b"tariff"], bump)]
    pub tariff: Account<'info, Tariff>,   // Program state with water rate info
    #[account(mut)]
    pub agency: Signer<'info>,
    #[account(mut, token::authority = consumer, token::mint = watc_mint)]
    pub consumer_watc: Account<'info, TokenAccount>,  // Consumer's WaterCapacityToken account
    #[account(mut, mint::authority = tariff, mint::decimals = 9)]
    pub watc_mint: Account<'info, Mint>,  // Mint for the WaterCapacityToken
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct UseWater<'info> {
    #[account(seeds = [b"tariff"], bump)]
    pub tariff: Account<'info, Tariff>,   // Program state with water rate info
    #[account(mut, signer)]
    pub consumer: Account<'info, Consumer>, // Consumer account
    #[account(mut)]
    pub agency: Signer<'info>,    // Authority of the provider

    // Token account for the consumer to send WTK from
    #[account(mut, token::authority = consumer, token::mint = wtk_mint)]
    pub consumer_wtk: Account<'info, TokenAccount>,

    // Additional accounts for token transfer
    #[account(mut, token::authority = consumer, token::mint = watc_mint)]
    pub consumer_watc: Account<'info, TokenAccount>,  // Consumer's WaterCapacityToken account
    #[account(mut,  mint::authority = tariff, mint::decimals = 9)]
    /// Mint of the WaterToken to ensure accounts align on token type
    pub wtk_mint: Account<'info, Mint>,
    #[account(mut, mint::authority = tariff, mint::decimals = 9)]
    pub watc_mint: Account<'info, Mint>,  // Mint for the WaterCapacityToken
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct DisposeWaste<'info> {
    #[account(seeds = [b"tariff"], bump)]
    pub tariff: Account<'info, Tariff>,   // Program state with water rate info
    #[account(mut)]
    pub consumer: Account<'info, Consumer>, // Consumer account
    #[account(mut)]
    pub agency: Signer<'info>,

    // Token account for the consumer to send WST from
    #[account(
        mut,
        token::authority = consumer,
        token::mint = wst_mint
    )]
    pub consumer_wst: Account<'info, TokenAccount>,

    #[account(
        mut, 
        mint::authority = tariff, 
        mint::decimals = 9
    )]
    /// Mint of the WasteToken to ensure accounts align on token type
    pub wst_mint: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,
}