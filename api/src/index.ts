import express, { Express, Request, Response } from "express";
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import dotenv from "dotenv";
import { PublicKey } from "@solana/web3.js";
import { Twopart } from "../../target/types/twopart";
import idl from "../../target/idl/twopart.json";

dotenv.config();

const app: Express = express();
app.use(express.json()); // Middleware to parse JSON bodies
const port = process.env.PORT || 3000;

// Configure Solana and Anchor
// Parse the wallet keypair from the environment variable
const walletKeypair = anchor.web3.Keypair.fromSecretKey(
  Uint8Array.from(JSON.parse(process.env.WALLET_KEYPAIR!))
);

// Set up Anchor provider using environment configuration
const provider = new anchor.AnchorProvider(
  new anchor.web3.Connection(process.env.ANCHOR_PROVIDER_URL || "http://127.0.0.1:8899"),
  new anchor.Wallet(walletKeypair),
  { commitment: "confirmed" }
);
anchor.setProvider(provider);

const connection = provider.connection;
const wallet = provider.wallet as anchor.Wallet;

const program = new Program<Twopart>(idl as Twopart, provider);

// Utility to derive the tariff PDA
const getTariffPDA = async (): Promise<PublicKey> => {
  const [tariffPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("tariff")],
    program.programId
  );
  return tariffPDA;
};

// POST endpoint to initialize tariff rates
app.post("/initialize", async (req: Request, res: Response): Promise<any> => {
  try {
    const { water_rate, waste_rate } = req.body;

    if (!water_rate || !waste_rate) {
      return res.status(400).json({ error: "Both water_rate and waste_rate are required" });
    }

    const tariffPDA = await getTariffPDA();

    await program.methods
      .initialize(new anchor.BN(water_rate), new anchor.BN(waste_rate))
      .accounts({
        agency: wallet.publicKey,
      })
      .rpc();

    res.status(200).json({ message: "Initialization successful", tariff: tariffPDA.toString() });
  } catch (error) {
    console.error("Initialization error:", error);
    res.status(500).json({ error: "Failed to initialize tariff rates" });
  }
});

// GET endpoint to retrieve tariff rates
app.get("/initialize", async (req: Request, res: Response): Promise<any> => {
  try {
    const tariffPDA = await getTariffPDA();
    const tariffAccount = await program.account.tariff.fetch(tariffPDA);

    res.status(200).json({
      tariffAddress: tariffPDA.toString(),
      water_rate: tariffAccount.waterRate.toNumber(),
      waste_rate: tariffAccount.wasteRate.toNumber(),
    });
  } catch (error) {
    console.error("Error fetching tariff account:", error);
    res.status(500).json({ error: "Failed to fetch tariff account" });
  }
});


app.listen(port, () => {
  console.log(`[server]: Server is running at http://localhost:${port}`);
});