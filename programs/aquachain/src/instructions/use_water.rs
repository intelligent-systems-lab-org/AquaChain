use crate::{
    state::{Consumer, Reservoir, Tariff, TariffType},
    utils::FixedPoint,
    CustomError,
};
use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{self, Mint, Token, TokenAccount},
};

/// Use water instruction context
///
/// The **UseWater** context is used to mint WTK tokens to a consumer's account as payment for water usage.
///
/// # Fields
/// * `consumer` - The consumer account making the payment
/// * `tariff` - The PDA tariff account assigned to this consumer
/// * `reservoir` - The PDA reservoir account assigned to this consumer
/// * `agency` - The authority that can mint tokens
/// * `consumer_wtk` - The consumer's WTK token account
/// * `consumer_watc` - The consumer's WATC token account
/// * `wtk_mint` - The WTK token mint
/// * `watc_mint` - The WATC token mint
/// * `token_program` - Required for token operations
/// * `associated_token_program` - Required for associated token account
///
/// # Seeds for Tariff PDA
/// * `"tariff"` - Constant string
/// * `agency` - Agency's public key
/// * `tariff_key` - Unique identifier for the tariff
///
/// # Seeds for Reservoir PDA
/// * `"reservoir"` - Constant string
/// * `agency` - Agency's public key
/// * `reservoir_key` - Unique identifier for the reservoir
#[derive(Accounts)]
#[instruction(tariff_key: Pubkey, reservoir_key: Pubkey)]
pub struct UseWater<'info> {
    #[account(signer)]
    pub consumer: Account<'info, Consumer>, // Consumer account
    #[account(
        seeds = [
            b"tariff",
            agency.key().as_ref(),
            &tariff_key.as_ref()
        ],
        bump
    )]
    pub tariff: Account<'info, Tariff>, // Tariff assigned to this consumer
    #[account(
        seeds = [
            b"reservoir",
            agency.key().as_ref(),
            &reservoir_key.as_ref()
        ],
        bump
    )]
    pub reservoir: Account<'info, Reservoir>, // Current Reservoir assigned to this consumer
    #[account(mut)]
    pub agency: Signer<'info>, // Authority of the provider

    // Token account for the consumer to send WTK from
    #[account(mut, associated_token::mint = wtk_mint,  associated_token::authority = consumer)]
    pub consumer_wtk: Account<'info, TokenAccount>,

    // Additional accounts for token transfer
    #[account(mut, associated_token::mint = watc_mint,  associated_token::authority = consumer)]
    pub consumer_watc: Account<'info, TokenAccount>, // Consumer's WaterCapacityToken account
    #[account(mut,  mint::authority = agency, mint::decimals = 9)]
    /// Mint of the WaterToken to ensure accounts align on token type
    pub wtk_mint: Account<'info, Mint>,
    #[account(mut, mint::authority = agency, mint::decimals = 9)]
    pub watc_mint: Account<'info, Mint>, // Mint for the WaterCapacityToken
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

/// Charge consumer for water consumption by minting WTK tokens
///
/// This function charges a consumer for their water usage by minting WTK tokens
/// to their token account. The amount of tokens minted represents the payment for
/// water consumption. WATC tokens are burned in proportion to water usage.
///
/// # Arguments
/// * `ctx` - Context containing consumer, tariff, reservoir, agency and token accounts
/// * `tariff_key` - Public key of the tariff assigned to this consumer
/// * `reservoir_key` - Public key of the reservoir assigned to this consumer
/// * `amount` - Amount of water units consumed, used to calculate WTK tokens to mint
///
/// # Errors
/// * `CustomError::Unauthorized` - If tariff_key or reservoir_key do not match consumer's assigned values
/// * `CustomError::InvalidAmount` - If amount is zero
///
/// # Returns
/// * `Ok(())` on successful payment
pub fn use_water(
    ctx: Context<UseWater>,
    tariff_key: Pubkey,
    reservoir_key: Pubkey,
    amount: u64,
) -> Result<()> {
    let consumer = &mut ctx.accounts.consumer;
    let tariff = &ctx.accounts.tariff;
    let reservoir = &ctx.accounts.reservoir;

    require!(amount > 0, CustomError::InvalidAmount);

    require_keys_eq!(
        tariff_key,
        consumer.assigned_tariff,
        CustomError::Unauthorized
    );
    require_keys_eq!(
        reservoir_key,
        consumer.assigned_reservoir,
        CustomError::Unauthorized
    );

    // Apply block rate or standard rate based on the consumer's contracted capacity
    let amount_fp = FixedPoint::from(amount);
    let water_rate_fp = FixedPoint::from(tariff.water_rate);
    let block_rate_fp = FixedPoint::from(consumer.block_rate);
    let consumer_watc_balance = FixedPoint::from(ctx.accounts.consumer_watc.amount);

    let (level, level_max) = (
        FixedPoint::from(reservoir.current_level),
        FixedPoint::from(reservoir.capacity),
    );

    let total_cost = calculate_total_cost(
        consumer_watc_balance,
        amount_fp,
        water_rate_fp,
        tariff.tariff_type,
        block_rate_fp,
        level_max,
        level,
    );

    // Mint WTK tokens to the consumer for the usage cost
    token::mint_to(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            token::MintTo {
                to: ctx.accounts.consumer_wtk.to_account_info(),
                authority: ctx.accounts.agency.to_account_info(),
                mint: ctx.accounts.wtk_mint.to_account_info(),
            },
        ),
        total_cost,
    )?;

    // Deduct WATC tokens
    if ctx.accounts.consumer_watc.amount > 0 {
        token::burn(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                token::Burn {
                    mint: ctx.accounts.watc_mint.to_account_info(),
                    from: ctx.accounts.consumer_watc.to_account_info(),
                    authority: ctx.accounts.consumer.to_account_info(),
                },
            ),
            if consumer_watc_balance >= amount_fp {
                amount
            } else {
                consumer_watc_balance.into()
            },
        )?;
    }

    msg!(
        "Consumer used {} units of water, charged: {}.",
        amount,
        total_cost
    );
    Ok(())
}

fn calculate_total_cost(
    consumer_watc_balance: FixedPoint,
    amount_fp: FixedPoint,
    water_rate_fp: FixedPoint,
    tariff_type: TariffType,
    block_rate_fp: FixedPoint,
    level_max: FixedPoint,
    level: FixedPoint,
) -> u64 {
    let total_cost: u64 = if consumer_watc_balance >= amount_fp {
        // Simple case: standard rate
        (amount_fp * water_rate_fp).into()
    } else {
        let base_cost = consumer_watc_balance * water_rate_fp;
        let excess = amount_fp - consumer_watc_balance;
        // Cases above contracted capacity
        let extra_cost = match tariff_type {
            TariffType::UniformIBT => excess * block_rate_fp,
            TariffType::SeasonalIBT => excess * block_rate_fp * (level_max - level),
            TariffType::SeasonalDBT => {
                excess
                    * block_rate_fp
                    * (FixedPoint::one() + FixedPoint::one() - (level / level_max))
            }
        };
        (base_cost + extra_cost).into()
    };
    total_cost
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::utils::FixedPoint;

    #[test]
    fn test_total_cost_under_cap() {
        let consumer_watc_balance = FixedPoint::from(100000);
        let amount_fp = FixedPoint::from(100000);
        let water_rate_fp = FixedPoint::from(500);
        let block_rate_fp = FixedPoint::from(800);
        let level_max = FixedPoint::from(1000000);
        let level = FixedPoint::from(950000);

        let total_cost = calculate_total_cost(
            consumer_watc_balance,
            amount_fp,
            water_rate_fp,
            TariffType::UniformIBT,
            block_rate_fp,
            level_max,
            level,
        );

        assert_eq!(total_cost, 50000);
    }

    #[test]
    fn test_total_cost_ibt() {
        let consumer_watc_balance = FixedPoint::from(100000);
        let amount_fp = FixedPoint::from(120000);
        let water_rate_fp = FixedPoint::from(500);
        let block_rate_fp = FixedPoint::from(800);
        let level_max = FixedPoint::from(1000000);
        let level = FixedPoint::from(950000);

        let total_cost = calculate_total_cost(
            consumer_watc_balance,
            amount_fp,
            water_rate_fp,
            TariffType::UniformIBT,
            block_rate_fp,
            level_max,
            level,
        );
        assert_eq!(total_cost, 66000);
    }

    #[test]
    fn test_total_cost_seasonal_ibt() {
        let consumer_watc_balance = FixedPoint::from(100000);
        let amount_fp = FixedPoint::from(120000);
        let water_rate_fp = FixedPoint::from(500);
        let block_rate_fp = FixedPoint::from(800);
        let level_max = FixedPoint::from(1000000);
        let level = FixedPoint::from(950000);

        let total_cost = calculate_total_cost(
            consumer_watc_balance,
            amount_fp,
            water_rate_fp,
            TariffType::SeasonalIBT,
            block_rate_fp,
            level_max,
            level,
        );
        assert_eq!(total_cost, 850000);
    }

    #[test]
    fn test_total_cost_seasonal_dbt() {
        let consumer_watc_balance = FixedPoint::from(100000);
        let amount_fp = FixedPoint::from(120000);
        let water_rate_fp = FixedPoint::from(500);
        let block_rate_fp = FixedPoint::from(800);
        let level_max = FixedPoint::from(1000000);
        let level = FixedPoint::from(950000);

        let total_cost = calculate_total_cost(
            consumer_watc_balance,
            amount_fp,
            water_rate_fp,
            TariffType::SeasonalDBT,
            block_rate_fp,
            level_max,
            level,
        );
        assert_eq!(total_cost, 66800);
    }
}
