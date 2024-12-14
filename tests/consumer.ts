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
  let wstcMint: PublicKey;
  let consumerWatcAccount: PublicKey;
  let consumerWstcAccount: PublicKey;
  let tariffPDA: PublicKey;
  let tariffKey: PublicKey;
  let reservoirPDA: PublicKey;
  let reservoirKey: PublicKey;
  let consumer: Keypair;

  const initialFixedRate = 100000 // 100.000
  const initialWaterRate = 2000; // 2.000
  const initialWasteRate = 3000; // 3.000
  const initialExcessRate = 4000; // 4.000


  const initialReservoirLevel = 950000; // 950.000
  const initialReservoirCapacity = 1000000; // 1000.000
  const initialMaxWaste = 400; // 0.4
  const initialMinLevel = 200; // 0.2
  const initialAQCConversionRate = 10; // 0.01
  const initialAQCDiscountRate = 5; // 0.05

  const initialContractedCapacity = 100000; // 100.000
  const initialContractedWasteCapacity = 20000; // 20.00

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

    wstcMint = await createMint(
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

    consumerWstcAccount = await getOrCreateAssociatedTokenAccount(
        connection,
        wallet.payer,
        wstcMint,
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

    // Initialize a reservoir
    await program.methods
      .initializeReservoir(
        reservoirKey,
        new anchor.BN(initialReservoirLevel),
        new anchor.BN(initialReservoirCapacity),
        new anchor.BN(initialMaxWaste),
        new anchor.BN(initialMinLevel),
        new anchor.BN(initialAQCConversionRate),
        new anchor.BN(initialAQCDiscountRate)
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
        new anchor.BN(initialContractedWasteCapacity)
      )
      .accounts({
        consumer: consumer.publicKey,
        agency: wallet.publicKey,
        watcMint: watcMint,
        wstcMint: wstcMint,
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
    assert.equal(consumerAccount.contractedWasteCapacity.toNumber(), initialContractedWasteCapacity);

    // Check the balance of WATC tokens in the consumer's account
    const consumerWatcBalance =
      await provider.connection.getTokenAccountBalance(consumerWatcAccount);
    assert.equal(
      consumerWatcBalance.value.amount,
      initialContractedCapacity.toString()
    ); // Should match contracted capacity

    // Check the balance of WSTC tokens in the consumer's account
    const consumerWstcBalance =
      await provider.connection.getTokenAccountBalance(consumerWstcAccount);
    assert.equal(
        consumerWstcBalance.value.amount,
        initialContractedWasteCapacity.toString()
    );
  });

  it("should update rates on the initialized consumer", async () => {
    let newContractedCapacity = 200000; // 200.000
    let newWasteCapacity = 1000; // 1.000

    await program.methods
      .updateConsumer(
        tariffKey,
        reservoirKey,
        new anchor.BN(newContractedCapacity),
        new anchor.BN(newWasteCapacity)
      )
      .accounts({
        consumer: consumer.publicKey,
        agency: wallet.publicKey,
        watcMint: watcMint,
        wstcMint: wstcMint,
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
    assert.equal(consumerAccount.contractedWasteCapacity.toNumber(), newWasteCapacity);

    // Check the balance of WATC tokens in the consumer's account
    const consumerWatcBalance =
      await provider.connection.getTokenAccountBalance(consumerWatcAccount);
    assert.equal(
      consumerWatcBalance.value.amount,
      newContractedCapacity.toString()
    );

    // Check the balance of WSTC tokens in the consumer's account
    const consumerWstcBalance =
    await provider.connection.getTokenAccountBalance(consumerWstcAccount);
    assert.equal(
        consumerWstcBalance.value.amount,
        newWasteCapacity.toString()
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
        new anchor.BN(newWasteRate),
        {
          commercial: {
            fixedCost: new anchor.BN(initialFixedRate),
            baseRate: new anchor.BN(newWaterRate),
            excessRate: new anchor.BN(initialExcessRate),
          }
        }
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
      updatedTariff.tariffType.commercial.baseRate.toNumber(),
      consumerTariff.tariffType.commercial.baseRate.toNumber()
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
        new anchor.BN(newReservoirCapacity),
        new anchor.BN(initialMaxWaste),
        new anchor.BN(initialMinLevel),
        new anchor.BN(initialAQCConversionRate),
        new anchor.BN(initialAQCDiscountRate)
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
