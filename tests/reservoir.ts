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

  const initialReservoirLevel = 950; // 0.95
  const initialReservoirCapacity = 1000; // 1.00

  before(async () => {
    // Initialize accounts
    reservoirKey = Keypair.generate().publicKey;

    [reservoirPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("reservoir"), wallet.publicKey.toBuffer(), reservoirKey.toBuffer()],
      program.programId
    );

    // Initialize a reservoir
    await program.methods
      .initializeReservoir(reservoirKey, new anchor.BN(initialReservoirLevel), new anchor.BN(initialReservoirCapacity))
      .accounts({
        agency: wallet.publicKey,
      })
      .rpc();
  });

  it("initialization is correct", async () => {
    // Fetch the state account to check if it's initialized correctly
    const stateAccount = await program.account.reservoir.fetch(reservoirPDA);

    // Assert that the water and waste rates are set as expected
    assert.equal(stateAccount.currentLevel.toNumber(), initialReservoirLevel);
    assert.equal(stateAccount.capacity.toNumber(), initialReservoirCapacity);
  });

  it("should update levels on the initialized reservoir", async () => {
    const newReservoirLevel = 650; // 0.65
    const newReservoirCapacity = 950; // 0.95

    await program.methods
      .updateReservoir(reservoirKey, new anchor.BN(newReservoirLevel), new anchor.BN(newReservoirCapacity))
      .accounts({
        agency: wallet.publicKey
      })
      .rpc();

    // Fetch and assert updated reservoir rates
    const updatedReservoir = await program.account.reservoir.fetch(reservoirPDA);
    assert.equal(updatedReservoir.currentLevel.toNumber(), newReservoirLevel);
    assert.equal(updatedReservoir.capacity.toNumber(), newReservoirCapacity);
  });

  it("should initialize a reservoir with a different ID", async () => {
    let newReservoirKey = Keypair.generate().publicKey;
    const [newReservoirPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("reservoir"), wallet.publicKey.toBuffer(), newReservoirKey.toBuffer()],
      program.programId
    );

    await program.methods
      .initializeReservoir(newReservoirKey, new anchor.BN(400), new anchor.BN(500))
      .accounts({
        agency: wallet.publicKey,
      })
      .rpc();

    // Fetch and assert the newly created tariff
    const newReservoir = await program.account.reservoir.fetch(newReservoirPDA);

    assert.equal(newReservoir.currentLevel.toNumber(), 400);
    assert.equal(newReservoir.capacity.toNumber(), 500);
    assert.equal(newReservoir.reservoirKey.toBase58(), newReservoirKey.toBase58());
  });
});
