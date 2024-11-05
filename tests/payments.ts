import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Aquachain } from "../target/types/aquachain";
import { PublicKey, Keypair } from "@solana/web3.js";
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
} from "@solana/spl-token";
import { assert } from "chai";

describe("payments", () => {
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
  let tariffKey: PublicKey;
  let reservoirKey: PublicKey;
  let consumer: Keypair;

  const SCALE = 1000;

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

  it("Consumer can pay for waste treatment", async () => {
    const wasteAmount = 10000; // 10.000
    await program.methods
      .disposeWaste(tariffKey, new anchor.BN(wasteAmount))
      .accounts({
        consumer: consumer.publicKey,
        wstMint: wstMint,
        agency: wallet.publicKey,
      })
      .rpc();

    await program.methods
      .payForWaste(
        tariffKey,
        new anchor.BN((wasteAmount * initialWasteRate) / SCALE)
      )
      .accounts({
        consumer: consumer.publicKey,
        wstMint: wstMint,
        agency: wallet.publicKey,
      })
      .signers([consumer])
      .rpc();

    const consumerWstBalance = await connection.getTokenAccountBalance(
      consumerWstAccount
    );

    assert.equal(consumerWstBalance.value.amount, "0");
  });

  it("Consumer can pay for water usage", async () => {
    const waterAmount = 100000; // 100.000

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

    await program.methods
      .payForWater(
        tariffKey,
        reservoirKey,
        new anchor.BN((waterAmount * initialWaterRate) / SCALE)
      )
      .accounts({
        consumer: consumer.publicKey,
        wtkMint: wtkMint,
        agency: wallet.publicKey,
      })
      .signers([consumer])
      .rpc();

    const consumerWtkBalance = await connection.getTokenAccountBalance(
      consumerWtkAccount
    );
    assert.equal(consumerWtkBalance.value.amount, "0");
  });
});
