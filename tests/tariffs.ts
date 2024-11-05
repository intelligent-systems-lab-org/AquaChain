import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Aquachain } from "../target/types/aquachain";
import { PublicKey, Keypair } from "@solana/web3.js";
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
} from "@solana/spl-token";
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

  const SCALE = 1000;

  const initialWaterRate = 500; // 0.500
  const initialWasteRate = 200; // 0.200

  const initialReservoirLevel = 950000; // 950.000
  const initialReservoirCapacity = 1000000; // 1000.000

  const initialContractedCapacity = 100000; // 100.000
  const initialBlockRate = 800; // 0.800

  beforeEach(async () => {
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
    wtkMint = await createMint(
      connection,
      wallet.payer,
      wallet.publicKey,
      null,
      9
    );
    watcMint = await createMint(
      connection,
      wallet.payer,
      wallet.publicKey,
      null,
      9
    );
    wstMint = await createMint(
      connection,
      wallet.payer,
      wallet.publicKey,
      null,
      9
    );

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

  it("Consumer can dispose waste", async () => {
    const wasteAmount = 10000; // 10.000
    await program.methods
      .disposeWaste(tariffKey, new anchor.BN(wasteAmount))
      .accounts({
        consumer: consumer.publicKey,
        wstMint: wstMint,
        agency: wallet.publicKey,
      })
      .rpc();

    const consumerWstBalance = await connection.getTokenAccountBalance(
      consumerWstAccount
    );

    assert.equal(
      consumerWstBalance.value.amount,
      String((wasteAmount * initialWasteRate) / SCALE)
    );
  });

  it("Consumer can use water within contracted capacity", async () => {
    const waterAmount = 100000; // 100.000
    await program.methods
      .updateTariffType(tariffKey, { uniformIbt: {} })
      .accounts({
        agency: wallet.publicKey,
      })
      .rpc();

    await program.methods
      .useWater(tariffKey, reservoirKey, new anchor.BN(waterAmount))
      .accounts({
        consumer: consumer.publicKey,
        wtkMint: wtkMint,
        watcMint: watcMint,
        agency: wallet.publicKey,
      })
      .signers([consumer])
      .rpc();

    const consumerWtkBalance = await connection.getTokenAccountBalance(
      consumerWtkAccount
    );
    const consumerWatcBalance = await connection.getTokenAccountBalance(
      consumerWatcAccount
    );

    assert.equal(
      consumerWtkBalance.value.amount,
      String((waterAmount * initialWaterRate) / SCALE)
    );
    assert.equal(
      consumerWatcBalance.value.amount,
      String(initialContractedCapacity - waterAmount)
    );
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
      { type: seasonalDbt, name: "Seasonal DBT" },
    ];

    const usageBeyondCapacity = 120000; // Set a water usage above the contracted capacity (120.000)

    tariffTypes.forEach(({ type, name }) => {
      it(`Consumer can use water beyond contracted capacity with ${name} tariff type`, async () => {
        // Set the tariff type
        await program.methods
          .updateTariffType(tariffKey, type)
          .accounts({
            agency: wallet.publicKey,
          })
          .rpc();

        // Use water beyond contracted capacity
        await program.methods
          .useWater(tariffKey, reservoirKey, new anchor.BN(usageBeyondCapacity))
          .accounts({
            consumer: consumer.publicKey,
            wtkMint: wtkMint,
            watcMint: watcMint,
            agency: wallet.publicKey,
          })
          .signers([consumer])
          .rpc();

        // Fetch token balances
        const consumerWtkBalance = await connection.getTokenAccountBalance(
          consumerWtkAccount
        );
        const consumerWatcBalance = await connection.getTokenAccountBalance(
          consumerWatcAccount
        );

        // Expected token calculations based on the tariff type
        let expectedWaterTokenCost: number;
        const extraUsage = usageBeyondCapacity - initialContractedCapacity;
        let baseCost = initialContractedCapacity * initialWaterRate;

        if (name === "Uniform IBT") {
          expectedWaterTokenCost =
            (baseCost + extraUsage * initialBlockRate) / SCALE;
        } else if (name === "Seasonal IBT") {
          const seasonalMultiplier =
            initialReservoirCapacity - initialReservoirLevel;
          expectedWaterTokenCost =
            (baseCost +
              ((extraUsage * initialBlockRate) / SCALE) * seasonalMultiplier) /
            SCALE;
        } else if (name === "Seasonal DBT") {
          const decreasingMultiplier =
            2 * SCALE -
            (initialReservoirLevel * SCALE) / initialReservoirCapacity;
          expectedWaterTokenCost =
            (baseCost +
              ((extraUsage * initialBlockRate) / SCALE) *
                decreasingMultiplier) /
            SCALE;
        } else {
          throw new Error("Unknown tariff type");
        }

        // Assert balances
        assert.equal(
          consumerWtkBalance.value.amount,
          String(expectedWaterTokenCost)
        );
        assert.equal(consumerWatcBalance.value.amount, "0"); // Contracted capacity should be fully depleted
      });
    });
  });
});
