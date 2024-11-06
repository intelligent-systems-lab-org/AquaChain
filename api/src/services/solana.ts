import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
} from "@solana/spl-token";
import { Aquachain } from "../../../target/types/aquachain";
import idl from "../../../target/idl/aquachain.json";
import dotenv from "dotenv";
import { TokenAccounts } from "../types/tokens";

dotenv.config();

const TOKEN_SEED = "tokens";

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

// Helper function to create a new mint
const createNewMint = async (): Promise<PublicKey> => {
  return await createMint(connection, wallet.payer, wallet.publicKey, null, 9);
};

// Function to initialize or fetch tokens and return mint addresses
const InitOrFetchTokens = async (): Promise<TokenAccounts> => {
  const tokensPDA = PublicKey.findProgramAddressSync(
    [Buffer.from(TOKEN_SEED)],
    program.programId
  );

  try {
    const tokenAccount = await program.account.tokens.fetch(tokensPDA[0]);
    return {
      WTK: tokenAccount.wtk,
      WATC: tokenAccount.watc,
      WST: tokenAccount.wst,
    };
  } catch (err) {
    console.log("No TokenMints account found, creating new mints...");

    // Create new mints and initialize the account if not found
    const waterTokenMint = await createNewMint();
    const waterCapacityTokenMint = await createNewMint();
    const wasteTokenMint = await createNewMint();

    await program.methods
      .initializeTokens(waterTokenMint, waterCapacityTokenMint, wasteTokenMint)
      .accounts({
        authority: wallet.publicKey,
      })
      .rpc();

    return {
      WTK: waterTokenMint,
      WATC: waterCapacityTokenMint,
      WST: wasteTokenMint,
    };
  }
};

const initializeOrFetchATAs = async (
  consumer: PublicKey,
  mints: TokenAccounts
): Promise<TokenAccounts> => {
  const accounts: Partial<TokenAccounts> = {};

  // Helper function to initialize or fetch a token account
  const fetchOrCreateAccount = async (
    mint: PublicKey,
    key: keyof TokenAccounts
  ) => {
    try {
      const tokenAccount = await getOrCreateAssociatedTokenAccount(
        connection,
        wallet.payer,
        mint,
        consumer
      );
      console.log(`Consumer ${key} token account fetched from server.`);
      accounts[key] = tokenAccount.address;
    } catch (error) {
      console.error(`Error initializing ${key} token account:`, error);
    }
  };

  // Fetch or create each token account
  await Promise.all([
    fetchOrCreateAccount(mints.WTK, "WTK"),
    fetchOrCreateAccount(mints.WATC, "WATC"),
    fetchOrCreateAccount(mints.WST, "WST"),
  ]);

  // Ensure all accounts are created, otherwise throw an error
  if (!accounts.WTK || !accounts.WATC || !accounts.WST) {
    throw new Error("Failed to initialize one or more token accounts.");
  }

  return accounts as TokenAccounts;
};

const getConsumerBalance = async (consumerATA: TokenAccounts) => {
  let balance: Partial<{ WTK: string; WATC: string; WST: string }> = {};
  try {
    balance.WTK = (
      await connection.getTokenAccountBalance(consumerATA.WTK)
    ).value.amount;
    balance.WATC = (
      await connection.getTokenAccountBalance(consumerATA.WATC)
    ).value.amount;
    balance.WST = (
      await connection.getTokenAccountBalance(consumerATA.WST)
    ).value.amount;
  } catch (error) {
    console.error("Error fetching consumer balance:", error);
  }
  return balance as { WTK: string; WATC: string; WST: string };
};

export {
  connection,
  wallet,
  program,
  getPDA,
  InitOrFetchTokens,
  initializeOrFetchATAs,
  getConsumerBalance,
};
