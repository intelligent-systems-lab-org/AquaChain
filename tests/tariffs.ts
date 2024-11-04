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

  const initialWaterRate = 1/1000;
  const initialWasteRate = 1/100;

  const initialReservoirLevel = 950000;
  const initialReservoirCapacity = 1000000;

  const initialContractedCapacity = 100000;
  const initialBlockRate = 1/500;

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

  // it("Consumer can use water within contracted capacity", async () => {
  //   await program.methods
  //     .useWater(new anchor.BN(50))
  //     .accounts({
  //       consumer: consumer.publicKey,
  //       wtkMint: wtkMint,
  //       watcMint: watcMint,
  //       agency: wallet.publicKey,
  //     })
  //     .signers([consumer])
  //     .rpc();
  // });

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
  });
});
