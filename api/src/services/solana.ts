import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { Aquachain } from "../../../target/types/aquachain";
import idl from "../../../target/idl/aquachain.json";
import dotenv from "dotenv";

dotenv.config();

// Parse the wallet keypair from the environment variable
const walletKeypair = anchor.web3.Keypair.fromSecretKey(
  Uint8Array.from(JSON.parse(process.env.WALLET_KEYPAIR!))
);

// Set up Anchor provider using environment configuration
const provider = new anchor.AnchorProvider(
  new anchor.web3.Connection(
    process.env.ANCHOR_PROVIDER_URL || "http://127.0.0.1:8899"
  ),
  new anchor.Wallet(walletKeypair),
  { commitment: "confirmed" }
);
anchor.setProvider(provider);

const connection = provider.connection;
const wallet = provider.wallet as anchor.Wallet;

const program = new Program<Aquachain>(idl as Aquachain, provider);

// Utility to derive the PDA
const getPDA = async (seed: String, key: PublicKey): Promise<PublicKey> => {
  const [PDA] = PublicKey.findProgramAddressSync(
    [Buffer.from(seed), wallet.publicKey.toBuffer(), key.toBuffer()],
    program.programId
  );
  return PDA;
};

export { connection, wallet, program, getPDA };
