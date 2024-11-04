import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Aquachain } from "../target/types/aquachain";
import { PublicKey, Keypair } from "@solana/web3.js";
import { createMint, getOrCreateAssociatedTokenAccount } from "@solana/spl-token";
import { assert } from "chai";

describe("aquachain", () => {
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

  const initialWaterRate = 2.0;
  const initialWasteRate = 3.0;

  before(async () => {
    // Initialize accounts
    tariffKey = Keypair.generate().publicKey;
  
    [tariffPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("tariff"), wallet.publicKey.toBuffer(), tariffKey.toBuffer()],
      program.programId
    );
    console.log("Tariff PDA:", tariffPDA.toBase58());
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
      .initializeTariff(tariffKey, initialWaterRate, initialWasteRate, { uniformIbt: {} })
      .accounts({
        agency: wallet.publicKey,
      })
      .rpc();

    // await program.methods
    //   .registerConsumer(new anchor.BN(100), new anchor.BN(5))
    //   .accounts({
    //     consumer: consumer.publicKey,
    //     agency: wallet.publicKey,
    //     watcMint: watcMint,
    //   })
    //   .signers([consumer])
    //   .rpc();

    // // Fetch the consumer account to check if it's initialized correctly
    // const consumerAccount = await program.account.consumer.fetch(
    //   consumer.publicKey
    // );

    // // Assert that the consumer's block rate is set as expected
    // assert.equal(consumerAccount.blockRate.toNumber(), 5);

    // // Check the balance of WATC tokens in the consumer's account
    // const consumerWatcBalance =
    //   await provider.connection.getTokenAccountBalance(consumerWatcAccount);
    // assert.equal(consumerWatcBalance.value.amount, "100"); // Should match contracted capacity
  });

  // it("Tariff can update rates", async () => {
  //   await program.methods
  //     .updateRates(new anchor.BN(3), new anchor.BN(4))
  //     .accounts({
  //       agency: wallet.publicKey,
  //     })
  //     .rpc();

  //   const [tariff, _] = PublicKey.findProgramAddressSync(
  //     [Buffer.from("tariff")],
  //     program.programId
  //   );

  //   const stateAccount = await program.account.tariff.fetch(tariff);

  //   // Assert that the water and waste rates are updated as expected
  //   assert.equal(stateAccount.waterRate.toNumber(), 3);
  //   assert.equal(stateAccount.wasteRate.toNumber(), 4);
  // })

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

  // it("Consumer can dispose waste", async () => {
  //   await program.methods
  //     .disposeWaste(new anchor.BN(30))
  //     .accounts({
  //       consumer: consumer.publicKey,
  //       wstMint: wstMint,
  //       agency: wallet.publicKey,
  //     })
  //     .rpc();
  // });

  it("initialization is correct", async () => {
      // Fetch the state account to check if it's initialized correctly
      const stateAccount = await program.account.tariff.fetch(tariffPDA);

      // Assert that the water and waste rates are set as expected
      assert.equal(stateAccount.waterRate, 2);
      assert.equal(stateAccount.wasteRate, 3);
  });

  it("should update rates on the initialized tariff", async () => {
    const newWaterRate = 6.0;
    const newWasteRate = 7.0;

    await program.methods
      .updateTariffRates(newWaterRate, newWasteRate)
      .accounts({
        agency: wallet.publicKey,
        tariff: tariffPDA,
      })
      .rpc();

    // Fetch and assert updated tariff rates
    const updatedTariff = await program.account.tariff.fetch(tariffPDA);
    assert.equal(updatedTariff.waterRate, newWaterRate);
    assert.equal(updatedTariff.wasteRate, newWasteRate);
  });

  it("should update tariff type on the initialized tariff", async () => {
    await program.methods
      .updateTariffType({ seasonalDbt: {} })
      .accounts({
        agency: wallet.publicKey,
        tariff: tariffPDA,
      })
      .rpc();

    // Fetch and assert updated tariff type
    const updatedTariffType = await program.account.tariff.fetch(tariffPDA);
    assert.deepEqual(updatedTariffType.tariffType, { seasonalDbt: {} });
  });

  it("should initialize a tariff with a different ID", async () => {
    let newTariffKey = Keypair.generate().publicKey;
    const [newTariffPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("tariff"), wallet.publicKey.toBuffer(), newTariffKey.toBuffer()],
      program.programId
    );

    await program.methods
      .initializeTariff(newTariffKey, 4.0, 5.0, { seasonalIbt: {} })
      .accounts({
        agency: wallet.publicKey,
      })
      .rpc();

    // Fetch and assert the newly created tariff
    const newTariff = await program.account.tariff.fetch(newTariffPDA);
    assert.equal(newTariff.waterRate, 4.0);
    assert.equal(newTariff.wasteRate, 5.0);
    assert.deepEqual(newTariff.tariffType, { seasonalIbt: {} });
    assert.equal(newTariff.tariffKey.toBase58(), newTariffKey.toBase58());
  });
});
