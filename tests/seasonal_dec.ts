import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SeasonalDec } from "../target/types/seasonal_dec";
import { PublicKey, Keypair } from "@solana/web3.js";
import { createAccount, createMint } from "@solana/spl-token";
import { assert } from "chai";

describe("seasonal_dec", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.SeasonalDec as Program<SeasonalDec>;
  const connection = provider.connection;
  const wallet = provider.wallet as anchor.Wallet;

  let wtkMint: PublicKey;
  let watcMint: PublicKey;
  let wstMint: PublicKey;
  let consumerWtkAccount: PublicKey;
  let consumerWatcAccount: PublicKey;
  let consumerWstAccount: PublicKey;
  let consumer: Keypair;

  before(async () => {
    // Initialize accounts
    const [tariff, _] = PublicKey.findProgramAddressSync(
      [Buffer.from("tariff")],
      program.programId
    );
    consumer = Keypair.generate();

    // Initialize token mints
    wtkMint = await createMint(connection, wallet.payer, tariff, null, 9);
    watcMint = await createMint(connection, wallet.payer, tariff, null, 9);
    wstMint = await createMint(connection, wallet.payer, tariff, null, 9);

    // Create token accounts
    consumerWtkAccount = await createAccount(
      connection,
      wallet.payer,
      wtkMint,
      consumer.publicKey
    );
    consumerWatcAccount = await createAccount(
      connection,
      wallet.payer,
      watcMint,
      consumer.publicKey
    );
    consumerWstAccount = await createAccount(
      connection,
      wallet.payer,
      wstMint,
      consumer.publicKey
    );

    await program.methods
      .initialize(new anchor.BN(2), new anchor.BN(3))
      .accounts({
        agency: wallet.publicKey,
      })
      .rpc();

    // Fetch the state account to check if it's initialized correctly
    const stateAccount = await program.account.tariff.fetch(tariff);

    // Assert that the water and waste rates are set as expected
    assert.equal(stateAccount.waterRate.toNumber(), 2);
    assert.equal(stateAccount.wasteRate.toNumber(), 3);

    await program.methods
      .registerConsumer(new anchor.BN(100), new anchor.BN(5))
      .accounts({
        consumer: consumer.publicKey,
        agency: wallet.publicKey,
        consumerWatc: consumerWatcAccount,
        watcMint: watcMint,
      })
      .signers([consumer])
      .rpc();

    // Fetch the consumer account to check if it's initialized correctly
    const consumerAccount = await program.account.consumer.fetch(
      consumer.publicKey
    );

    // Assert that the consumer's block rate is set as expected
    assert.equal(consumerAccount.blockRate.toNumber(), 5);

    // Check the balance of WATC tokens in the consumer's account
    const consumerWatcBalance =
      await provider.connection.getTokenAccountBalance(consumerWatcAccount);
    assert.equal(consumerWatcBalance.value.amount, "100"); // Should match contracted capacity
  });

  it("Consumer can use water within contracted capacity", async () => {
    await program.methods
      .useWater(new anchor.BN(50), new anchor.BN(60), new anchor.BN(40))
      .accounts({
        consumer: consumer.publicKey,
        consumerWtk: consumerWtkAccount,
        consumerWatc: consumerWatcAccount,
        wtkMint: wtkMint,
        watcMint: watcMint,
        agency: wallet.publicKey,
      })
      .signers([consumer])
      .rpc();
  });

  it("Consumer can dispose waste", async () => {
    await program.methods
      .disposeWaste(new anchor.BN(30))
      .accounts({
        consumer: consumer.publicKey,
        consumerWst: consumerWstAccount,
        wstMint: wstMint,
        agency: wallet.publicKey,
      })
      .rpc();
  });
});
