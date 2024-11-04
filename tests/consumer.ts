import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Aquachain } from "../target/types/aquachain";
import { PublicKey, Keypair } from "@solana/web3.js";
import { createMint, getOrCreateAssociatedTokenAccount } from "@solana/spl-token";
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
    watcMint = await createMint(connection, wallet.payer, wallet.publicKey, null, 9);

    // Create token accounts
    consumerWatcAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      wallet.payer,
      watcMint,
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

  it("initialization is correct", async () => {
    // Fetch the consumer account to check if it's initialized correctly
    const consumerAccount = await program.account.consumer.fetch(consumer.publicKey);

    // Assert that the consumer's configuration is expected
    assert.equal(consumerAccount.contractedCapacity.toNumber(), initialContractedCapacity);
    assert.equal(consumerAccount.blockRate, initialBlockRate);

    // Check the balance of WATC tokens in the consumer's account
    const consumerWatcBalance =
      await provider.connection.getTokenAccountBalance(consumerWatcAccount);
    assert.equal(consumerWatcBalance.value.amount, initialContractedCapacity.toString()); // Should match contracted capacity
  });
});
