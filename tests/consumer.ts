import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Aquachain } from "../target/types/aquachain";
import { PublicKey, Keypair } from "@solana/web3.js";
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
} from "@solana/spl-token";
import { assert } from "chai";

describe("consumer", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Aquachain as Program<Aquachain>;
  const connection = provider.connection;
  const wallet = provider.wallet as anchor.Wallet;

  let watcMint: PublicKey;
  let consumerWatcAccount: PublicKey;
  let tariffPDA: PublicKey;
  let tariffKey: PublicKey;
  let reservoirPDA: PublicKey;
  let reservoirKey: PublicKey;
  let consumer: Keypair;

  const initialWaterRate = 500; // 0.500
  const initialWasteRate = 200; // 0.200

  const initialReservoirLevel = 950000; // 950.000
  const initialReservoirCapacity = 1000000; // 1000.000

  const initialContractedCapacity = 100000; // 100.000
  const initialBlockRate = 800; // 0.800

  before(async () => {
    // Initialize accounts
    tariffKey = Keypair.generate().publicKey;
    reservoirKey = Keypair.generate().publicKey;

    [tariffPDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("tariff"),
        wallet.publicKey.toBuffer(),
        tariffKey.toBuffer(),
      ],
      program.programId
    );

    [reservoirPDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("reservoir"),
        wallet.publicKey.toBuffer(),
        reservoirKey.toBuffer(),
      ],
      program.programId
    );

    consumer = Keypair.generate();

    // Initialize token mints
    watcMint = await createMint(
      connection,
      wallet.payer,
      wallet.publicKey,
      null,
      9
    );

    // Create token accounts
    consumerWatcAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      wallet.payer,
      watcMint,
      consumer.publicKey
    ).then((account) => account.address);

    // Initialize a tariff
    await program.methods
      .initializeTariff(
        tariffKey,
        new anchor.BN(initialWaterRate),
        new anchor.BN(initialWasteRate),
        { uniformIbt: {} }
      )
      .accounts({
        agency: wallet.publicKey,
      })
      .rpc();

    // Initialize a reservoir
    await program.methods
      .initializeReservoir(
        reservoirKey,
        new anchor.BN(initialReservoirLevel),
        new anchor.BN(initialReservoirCapacity)
      )
      .accounts({
        agency: wallet.publicKey,
      })
      .rpc();

    await program.methods
      .registerConsumer(
        tariffKey,
        reservoirKey,
        new anchor.BN(initialContractedCapacity),
        new anchor.BN(initialBlockRate)
      )
      .accounts({
        consumer: consumer.publicKey,
        agency: wallet.publicKey,
        watcMint: watcMint,
      })
      .signers([consumer])
      .rpc();
  });

  it("initialization is correct", async () => {
    // Fetch the consumer account to check if it's initialized correctly
    const consumerAccount = await program.account.consumer.fetch(
      consumer.publicKey
    );

    // Assert that the consumer's configuration is expected
    assert.equal(
      consumerAccount.contractedCapacity.toNumber(),
      initialContractedCapacity
    );
    assert.equal(consumerAccount.blockRate.toNumber(), initialBlockRate);

    // Check the balance of WATC tokens in the consumer's account
    const consumerWatcBalance =
      await provider.connection.getTokenAccountBalance(consumerWatcAccount);
    assert.equal(
      consumerWatcBalance.value.amount,
      initialContractedCapacity.toString()
    ); // Should match contracted capacity
  });

  it("should update rates on the initialized consumer", async () => {
    let newContractedCapacity = 200000; // 200.000
    let newBlockRate = 1000; // 1.000

    await program.methods
      .updateConsumer(
        tariffKey,
        reservoirKey,
        new anchor.BN(newContractedCapacity),
        new anchor.BN(newBlockRate)
      )
      .accounts({
        consumer: consumer.publicKey,
        agency: wallet.publicKey,
        watcMint: watcMint,
      })
      .signers([consumer])
      .rpc();

    // Assert that the consumer's configuration is expected
    const consumerAccount = await program.account.consumer.fetch(
      consumer.publicKey
    );
    assert.equal(
      consumerAccount.contractedCapacity.toNumber(),
      newContractedCapacity
    );
    assert.equal(consumerAccount.blockRate.toNumber(), newBlockRate);

    // Check the balance of WATC tokens in the consumer's account
    const consumerWatcBalance =
      await provider.connection.getTokenAccountBalance(consumerWatcAccount);
    assert.equal(
      consumerWatcBalance.value.amount,
      newContractedCapacity.toString()
    );
  });

  it("should update consumer's assigned tariff", async () => {
    // Test values for new tariff
    const newWaterRate = 20; // 0.020
    const newWasteRate = 10; // 0.010

    const newTariffKey = Keypair.generate().publicKey;
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
        new anchor.BN(newWaterRate),
        new anchor.BN(newWasteRate),
        { uniformIbt: {} }
      )
      .accounts({
        agency: wallet.publicKey,
      })
      .rpc();

    await program.methods
      .updateConsumerTariff(tariffKey, newTariffKey)
      .accounts({
        consumer: consumer.publicKey,
        agency: wallet.publicKey,
      })
      .rpc();

    const consumerAccount = await program.account.consumer.fetch(
      consumer.publicKey
    );
    assert.equal(
      consumerAccount.assignedTariff.toBase58(),
      newTariffKey.toBase58()
    );

    const [consumerTariffPDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("tariff"),
        wallet.publicKey.toBuffer(),
        consumerAccount.assignedTariff.toBuffer(),
      ],
      program.programId
    );

    // Verify that the consumer is now affected by the new tariff rates
    const updatedTariff = await program.account.tariff.fetch(newTariffPDA);
    const consumerTariff = await program.account.tariff.fetch(
      consumerTariffPDA
    );
    assert.equal(
      updatedTariff.waterRate.toNumber(),
      consumerTariff.waterRate.toNumber()
    );
    assert.equal(
      updatedTariff.wasteRate.toNumber(),
      consumerTariff.wasteRate.toNumber()
    );
  });

  it("should update consumer's assigned reservoir", async () => {
    // Test values for new tariff reservoir
    const newReservoirLevel = 800000; // 800.000
    const newReservoirCapacity = 900000; // 900.000

    const newReservoirKey = Keypair.generate().publicKey;
    const [newReservoirPDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("reservoir"),
        wallet.publicKey.toBuffer(),
        newReservoirKey.toBuffer(),
      ],
      program.programId
    );

    await program.methods
      .initializeReservoir(
        newReservoirKey,
        new anchor.BN(newReservoirLevel),
        new anchor.BN(newReservoirCapacity)
      )
      .accounts({
        agency: wallet.publicKey,
      })
      .rpc();

    await program.methods
      .updateConsumerReservoir(reservoirKey, newReservoirKey)
      .accounts({
        consumer: consumer.publicKey,
        agency: wallet.publicKey,
      })
      .rpc();

    const consumerAccount = await program.account.consumer.fetch(
      consumer.publicKey
    );
    assert.equal(
      consumerAccount.assignedReservoir.toBase58(),
      newReservoirKey.toBase58()
    );

    const [consumerReservoirPDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("reservoir"),
        wallet.publicKey.toBuffer(),
        consumerAccount.assignedReservoir.toBuffer(),
      ],
      program.programId
    );

    // Verify that the consumer is now affected by the new reservoir rates
    const updatedReservoir = await program.account.reservoir.fetch(
      newReservoirPDA
    );
    const consumerReservoir = await program.account.reservoir.fetch(
      consumerReservoirPDA
    );
    assert.equal(
      updatedReservoir.currentLevel.toNumber(),
      consumerReservoir.currentLevel.toNumber()
    );
    assert.equal(
      updatedReservoir.capacity.toNumber(),
      consumerReservoir.capacity.toNumber()
    );
  });
});
