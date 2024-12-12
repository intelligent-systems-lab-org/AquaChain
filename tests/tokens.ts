import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Aquachain } from "../target/types/aquachain";
import { PublicKey } from "@solana/web3.js";
import { createMint } from "@solana/spl-token";
import { assert } from "chai";

describe("tokens", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Aquachain as Program<Aquachain>;
  const connection = provider.connection;
  const wallet = provider.wallet as anchor.Wallet;

  let wtkMint: PublicKey;
  let watcMint: PublicKey;
  let wstMint: PublicKey;
  let wstcMint: PublicKey;
  let aqcMint : PublicKey;

  before(async () => {
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
    wstcMint = await createMint(
      connection,
      wallet.payer,
      wallet.publicKey,
      null,
      9
    );
    aqcMint = await createMint(
      connection,
      wallet.payer,
      wallet.publicKey,
      null,
      9
    );

    // Register tokens
    await program.methods
      .initializeTokens(wtkMint, watcMint, wstMint, wstcMint, aqcMint)
      .accounts({
        authority: wallet.publicKey,
      })
      .rpc();
  });

  it("Tokens are recorded", async () => {
    const [tokensPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("tokens"), wallet.publicKey.toBuffer()],
      program.programId
    );

    const tokens = await program.account.tokens.fetch(tokensPDA);

    assert.equal(tokens.wtk.toString(), wtkMint.toString());
    assert.equal(tokens.watc.toString(), watcMint.toString());
    assert.equal(tokens.wst.toString(), wstMint.toString());
    assert.equal(tokens.wstc.toString(), wstcMint.toString());
    assert.equal(tokens.aqc.toString(), aqcMint.toString());
  });
});
