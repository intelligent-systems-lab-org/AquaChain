import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Aquachain } from "../target/types/aquachain";
import { PublicKey, Keypair } from "@solana/web3.js";
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
} from "@solana/spl-token";
import { assert } from "chai";

describe("tariff", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Aquachain as Program<Aquachain>;
  const connection = provider.connection;
  const wallet = provider.wallet as anchor.Wallet;

  let wtkMint: PublicKey;
  let watcMint: PublicKey;
  let wstMint: PublicKey;
  let consumerWtkAccount: PublicKey;
  let consumerWatcAccount: PublicKey;
  let consumerWstAccount: PublicKey;
  let tariffPDA: PublicKey;
  let tariffKey: PublicKey;
  let consumer: Keypair;

  const initialFixedRate = 100000 // 100.000
  const initialWaterRate = 2000; // 2.000
  const initialWasteRate = 3000; // 3.000
  const initialExcessRate = 4000; // 4.000

  before(async () => {
    // Initialize accounts
    tariffKey = Keypair.generate().publicKey;

    [tariffPDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("tariff"),
        wallet.publicKey.toBuffer(),
        tariffKey.toBuffer(),
      ],
      program.programId
    );
    consumer = Keypair.generate();

    // Initialize token mints
    wtkMint = await createMint(connection, wallet.payer, tariffPDA, null, 9);
    watcMint = await createMint(connection, wallet.payer, tariffPDA, null, 9);
    wstMint = await createMint(connection, wallet.payer, tariffPDA, null, 9);

    // Create token accounts
    consumerWtkAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      wallet.payer,
      wtkMint,
      consumer.publicKey
    ).then((account) => account.address);

    consumerWatcAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      wallet.payer,
      watcMint,
      consumer.publicKey
    ).then((account) => account.address);

    consumerWstAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      wallet.payer,
      wstMint,
      consumer.publicKey
    ).then((account) => account.address);

    // Initialize a tariff
    await program.methods
      .initializeTariff(
        tariffKey,
        new anchor.BN(initialWasteRate),
        {
          commercial: {
            fixedCost: new anchor.BN(initialFixedRate),
            baseRate: new anchor.BN(initialWaterRate),
            excessRate: new anchor.BN(initialExcessRate),
          }
        }
      )
      .accounts({
        agency: wallet.publicKey,
      })
      .rpc();
  });

  it("initialization is correct", async () => {
    // Fetch the state account to check if it's initialized correctly
    const stateAccount = await program.account.tariff.fetch(tariffPDA);

    // Assert that the water and waste rates are set as expected
    assert.equal(stateAccount.tariffType.commercial.baseRate.toNumber(), initialWaterRate);
    assert.equal(stateAccount.tariffType.commercial.fixedCost.toNumber(), initialFixedRate);
    assert.equal(stateAccount.tariffType.commercial.excessRate.toNumber(), initialExcessRate);
    assert.equal(stateAccount.wasteRate.toNumber(), initialWasteRate);
  });

  it("should update rates on the initialized tariff", async () => {
    const newWasteRate = 7000; // 7.000

    await program.methods
      .updateTariffRates(
        tariffKey,
        new anchor.BN(newWasteRate)
      )
      .accounts({
        agency: wallet.publicKey,
      })
      .rpc();

    // Fetch and assert updated tariff rates
    const updatedTariff = await program.account.tariff.fetch(tariffPDA);
    assert.equal(updatedTariff.wasteRate.toNumber(), newWasteRate);
  });

  it("should update tariff type on the initialized tariff", async () => {
    const sensitivityFactor = 1000;
    const penalty = 2000;

    await program.methods
      .updateTariffType(tariffKey, {
        seasonalIbt:
        {
          baseRate: new anchor.BN(initialWaterRate),
          sensitivityFactor: new anchor.BN(sensitivityFactor), // 1.000
          penalty: { linear: { 0: new anchor.BN(penalty) } },
        }
      })
      .accounts({
        agency: wallet.publicKey,
      })
      .rpc();

    // Fetch and assert updated tariff type
    const updatedTariffType = await program.account.tariff.fetch(tariffPDA);
    assert.equal(updatedTariffType.tariffType.seasonalIbt.baseRate.toNumber(), initialWaterRate);
    assert.equal(updatedTariffType.tariffType.seasonalIbt.sensitivityFactor.toNumber(), sensitivityFactor);
    assert.equal(updatedTariffType.tariffType.seasonalIbt.penalty.linear[0].toNumber(), penalty);
  });

  it("should initialize a tariff with a different ID", async () => {
    let newTariffKey = Keypair.generate().publicKey;
    const [newTariffPDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("tariff"),
        wallet.publicKey.toBuffer(),
        newTariffKey.toBuffer(),
      ],
      program.programId
    );

    await program.methods
      .initializeTariff(
        newTariffKey,
        new anchor.BN(5000),
        {
          lifeline:
          {
            baseRate: new anchor.BN(initialWaterRate),
            excessRate: new anchor.BN(initialExcessRate),
          }
        }
      )
      .accounts({
        agency: wallet.publicKey,
      })
      .rpc();

    // Fetch and assert the newly created tariff
    const newTariff = await program.account.tariff.fetch(newTariffPDA);
    assert.equal(newTariff.wasteRate.toNumber(), 5000);
    assert.equal(newTariff.tariffType.lifeline.baseRate.toNumber(), initialWaterRate);
    assert.equal(newTariff.tariffType.lifeline.excessRate.toNumber(), initialExcessRate);
    assert.equal(newTariff.tariffKey.toBase58(), newTariffKey.toBase58());
  });
});
