import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Aquachain } from "../target/types/aquachain";
import { PublicKey, Keypair } from "@solana/web3.js";
import { createMint, getOrCreateAssociatedTokenAccount } from "@solana/spl-token";
import { assert } from "chai";

describe("tariffs", () => {
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
  let reservoirPDA: PublicKey;
  let reservoirKey: PublicKey;
  let consumer: Keypair;

  const initialWaterRate = 5;
  const initialWasteRate = 2;

  const initialReservoirLevel = 9500;
  const initialReservoirCapacity = 10000;

  const initialContractedCapacity = 1000;
  const initialBlockRate = 8;

  before(async () => {
    // Initialize accounts
    tariffKey = Keypair.generate().publicKey;
    reservoirKey = Keypair.generate().publicKey;
  
    [tariffPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("tariff"), wallet.publicKey.toBuffer(), tariffKey.toBuffer()],
      program.programId
    );

    [reservoirPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("reservoir"), wallet.publicKey.toBuffer(), reservoirKey.toBuffer()],
      program.programId
    );

    consumer = Keypair.generate();

    // Initialize token mints
    wtkMint = await createMint(connection, wallet.payer, wallet.publicKey, null, 9);
    watcMint = await createMint(connection, wallet.payer, wallet.publicKey, null, 9);
    wstMint = await createMint(connection, wallet.payer, wallet.publicKey, null, 9);

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
      .initializeTariff(tariffKey, initialWaterRate, initialWasteRate, { uniformIbt: {} })
      .accounts({
        agency: wallet.publicKey,
      })
      .rpc();

    // Initialize a reservoir
    await program.methods
    .initializeReservoir(reservoirKey, initialReservoirLevel, initialReservoirCapacity)
    .accounts({
      agency: wallet.publicKey,
    })
    .rpc();

    await program.methods
      .registerConsumer(tariffKey, reservoirKey, new anchor.BN(initialContractedCapacity), initialBlockRate)
      .accounts({
        consumer: consumer.publicKey,
        agency: wallet.publicKey,
        watcMint: watcMint,
      })
      .signers([consumer])
      .rpc();
  });

  it("Consumer can use water within contracted capacity", async () => {
    let waterAmount = 100;
    await program.methods
      .updateTariffType(tariffKey, { uniformIbt: {} })
      .accounts({
        agency: wallet.publicKey
      })
      .rpc();

    await program.methods
      .useWater(tariffKey, reservoirKey, waterAmount)
      .accounts({
        consumer: consumer.publicKey,
        wtkMint: wtkMint,
        watcMint: watcMint,
        agency: wallet.publicKey,
      })
      .signers([consumer])
      .rpc();

    const consumerWtkBalance = await connection.getTokenAccountBalance(consumerWtkAccount);
    const consumerWatcBalance = await connection.getTokenAccountBalance(consumerWatcAccount);

    assert.equal(consumerWtkBalance.value.amount, String(Math.ceil(waterAmount * initialWaterRate)));
    assert.equal(consumerWatcBalance.value.amount, String(initialContractedCapacity-waterAmount));
  });

  it("Consumer can dispose waste", async () => {
    let wasteAmount = 1000;
    await program.methods
      .disposeWaste(tariffKey, wasteAmount)
      .accounts({
        consumer: consumer.publicKey,
        wstMint: wstMint,
        agency: wallet.publicKey,
      })
      .rpc();

    const consumerWstBalance = await connection.getTokenAccountBalance(consumerWstAccount);

    assert.equal(consumerWstBalance.value.amount, String(Math.ceil(wasteAmount * initialWasteRate)));
  });

  describe("Tariff types for usage beyond contracted capacity", () => {
    // Define the specific enum objects for each tariff type
    const uniformIbt = { uniformIbt: {} };
    const seasonalIbt = { seasonalIbt: {} };
    const seasonalDbt = { seasonalDbt: {} };

    // Define an array of tariff types with explicit names
    const tariffTypes = [
      { type: uniformIbt, name: "Uniform IBT" },
      { type: seasonalIbt, name: "Seasonal IBT" },
      { type: seasonalDbt, name: "Seasonal DBT" }
    ];
  
    const usageBeyondCapacity = 1200; // Set a water usage above the contracted capacity (1000)
  
    tariffTypes.forEach(({ type, name }) => {
      it(`Consumer can use water beyond contracted capacity with ${name} tariff type`, async () => {
        // Set the tariff type
        await program.methods
          .updateTariffType(tariffKey, type)
          .accounts({
            agency: wallet.publicKey
          })
          .rpc();
  
        // Use water beyond contracted capacity
        await program.methods
          .useWater(tariffKey, reservoirKey, usageBeyondCapacity)
          .accounts({
            consumer: consumer.publicKey,
            wtkMint: wtkMint,
            watcMint: watcMint,
            agency: wallet.publicKey,
          })
          .signers([consumer])
          .rpc();
  
        // Fetch token balances
        const consumerWtkBalance = await connection.getTokenAccountBalance(consumerWtkAccount);
        const consumerWatcBalance = await connection.getTokenAccountBalance(consumerWatcAccount);
  
        // Expected token calculations based on the tariff type
        let expectedWaterTokenCost: number;
        const extraUsage = usageBeyondCapacity - initialContractedCapacity;
  
        if (name === "Uniform IBT") {
          expectedWaterTokenCost = initialContractedCapacity * initialWaterRate + extraUsage * initialBlockRate;
        } else if (name === "Seasonal IBT") {
          const seasonalMultiplier = initialReservoirCapacity - initialReservoirLevel;
          expectedWaterTokenCost = usageBeyondCapacity * (initialWaterRate + initialBlockRate * seasonalMultiplier);
        } else if (name === "Seasonal DBT") {
          const decreasingMultiplier = 1 - (initialReservoirLevel / initialReservoirCapacity);
          expectedWaterTokenCost = usageBeyondCapacity * (initialWaterRate - initialBlockRate * decreasingMultiplier);
        } else {
          throw new Error("Unknown tariff type");
        }
  
        // Assert balances
        assert.equal(consumerWtkBalance.value.amount, String(Math.ceil(expectedWaterTokenCost)));
        assert.equal(consumerWatcBalance.value.amount, "0"); // Contracted capacity should be fully depleted
      });
    });
  });
});
