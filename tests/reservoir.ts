import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Aquachain } from "../target/types/aquachain";
import { PublicKey, Keypair } from "@solana/web3.js";
import { assert } from "chai";

describe("reservoir", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Aquachain as Program<Aquachain>;
  const connection = provider.connection;
  const wallet = provider.wallet as anchor.Wallet;

  let reservoirPDA: PublicKey;
  let reservoirKey: PublicKey;

  const initialReservoirLevel = 950;
  const initialReservoirCapacity = 1000;

  before(async () => {
    // Initialize accounts
    reservoirKey = Keypair.generate().publicKey;
  
    [reservoirPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("reservoir"), wallet.publicKey.toBuffer(), reservoirKey.toBuffer()],
      program.programId
    );

    // Initialize a reservoir
    await program.methods
      .initializeReservoir(reservoirKey, initialReservoirLevel, initialReservoirCapacity)
      .accounts({
        agency: wallet.publicKey,
      })
      .rpc();
  });

  it("initialization is correct", async () => {
      // Fetch the state account to check if it's initialized correctly
      const stateAccount = await program.account.reservoir.fetch(reservoirPDA);

      // Assert that the water and waste rates are set as expected
      assert.equal(stateAccount.currentLevel, initialReservoirLevel);
      assert.equal(stateAccount.capacity, initialReservoirCapacity);
  });

  it("should update levels on the initialized reservoir", async () => {
    const newReservoirLevel = 650;
    const newReservoirCapacity = 950;

    await program.methods
      .updateReservoir(reservoirKey, newReservoirLevel, newReservoirCapacity)
      .accounts({
        agency: wallet.publicKey
      })
      .rpc();

    // Fetch and assert updated reservoir rates
    const updatedReservoir = await program.account.reservoir.fetch(reservoirPDA);
    assert.equal(updatedReservoir.currentLevel, newReservoirLevel);
    assert.equal(updatedReservoir.capacity, newReservoirCapacity);
  });

  it("should initialize a reservoir with a different ID", async () => {
    let newReservoirKey = Keypair.generate().publicKey;
    const [newReservoirPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("reservoir"), wallet.publicKey.toBuffer(), newReservoirKey.toBuffer()],
      program.programId
    );

    await program.methods
      .initializeReservoir(newReservoirKey, 400, 500)
      .accounts({
        agency: wallet.publicKey,
      })
      .rpc();

    // Fetch and assert the newly created tariff
    const newReservoir = await program.account.reservoir.fetch(newReservoirPDA);

    assert.equal(newReservoir.currentLevel, 400);
    assert.equal(newReservoir.capacity, 500);
    assert.equal(newReservoir.reservoirKey.toBase58(), newReservoirKey.toBase58());
  });
});
