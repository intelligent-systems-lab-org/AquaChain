import express, { Express, Request, Response } from "express";
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import dotenv from "dotenv";
import { Keypair, PublicKey } from "@solana/web3.js";
import { Aquachain } from "../../target/types/aquachain";
import idl from "../../target/idl/aquachain.json";

import { TariffRequest, isValidTariffType, convertTariffType, TariffTypeString } from "./types";

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

// Utility to derive the tariff PDA
const getTariffPDA = async (key: PublicKey): Promise<PublicKey> => {
  const [tariffPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("tariff"), wallet.publicKey.toBuffer(), key.toBuffer()],
    program.programId
  );
  return tariffPDA;
};

const authenticateToken = (req: Request, res: Response, next: Function) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token || token !== process.env.API_TOKEN) {
    return res.sendStatus(403); // Forbidden
  }
  next();
};

// POST endpoint to initialize tariff rates
// POST endpoint to initialize tariff rates
app.post("/tariff/create", async (req: Request, res: Response): Promise<any> => {
  try {
    const { water_rate, waste_rate, tariff_type } = req.body as TariffRequest;

    // Validate that `water_rate` and `waste_rate` are numbers
    if (typeof water_rate !== "number" || typeof waste_rate !== "number") {
      return res.status(400).json({
        error: "Both water_rate and waste_rate are required and must be numbers",
      });
    }

    // Validate that `tariff_type` is a valid string
    const defaultType: TariffTypeString = "uniformIbt";
    const chosenTariffType = tariff_type ? tariff_type : defaultType;

    if (!isValidTariffType(chosenTariffType)) {
      return res.status(400).json({
        error: "Invalid tariff_type. Expected one of: 'uniformIbt', 'seasonalIbt', 'seasonalDbt'",
      });
    }

    // Convert string to required TariffType object format
    const convertedTariffType = convertTariffType(chosenTariffType);

    const tariffKey = Keypair.generate().publicKey;
    const tariffPDA = await getTariffPDA(tariffKey);

    await program.methods
      .initializeTariff(
        tariffKey,
        new anchor.BN(water_rate),
        new anchor.BN(waste_rate),
        convertedTariffType
      )
      .accounts({
        agency: wallet.publicKey,
      })
      .rpc();

    res.status(200).json({
      message: "Initialization successful",
      tariff: tariffPDA.toString(),
      key: tariffKey.toString(),
    });
  } catch (error) {
    console.error("Initialization error:", error);
    res.status(500).json({ error: "Failed to create tariff" });
  }
});

// GET endpoint to retrieve tariff rates
// app.get("/initialize", async (req: Request, res: Response): Promise<any> => {
//   try {
//     const tariffPDA = await getTariffPDA();
//     const tariffAccount = await program.account.tariff.fetch(tariffPDA);

//     res.status(200).json({
//       tariffAddress: tariffPDA.toString(),
//       water_rate: tariffAccount.waterRate.toNumber(),
//       waste_rate: tariffAccount.wasteRate.toNumber(),
//     });
//   } catch (error) {
//     console.error("Error fetching tariff account:", error);
//     res.status(500).json({ error: "Failed to fetch tariff account" });
//   }
// });

app.listen(port, () => {
  console.log(`[server]: Server is running at http://localhost:${port}`);
});
