import express, { Express, Request, Response } from "express";
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import dotenv from "dotenv";
import { Keypair, PublicKey } from "@solana/web3.js";
import { Aquachain } from "../../target/types/aquachain";
import idl from "../../target/idl/aquachain.json";

import { TariffRequest, isValidTariffType, convertStringToTariffType, convertTariffTypeToString, TariffTypeString } from "./types/tariff";

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

// Helper function to fetch a tariff by its PDA
const fetchTariff = async (tariffPDA: PublicKey) => {
  try {
    const tariffAccount = await program.account.tariff.fetch(tariffPDA);
    return {
      tariffkey: tariffAccount.tariffKey.toString(),
      water_rate: tariffAccount.waterRate.toNumber(),
      waste_rate: tariffAccount.wasteRate.toNumber(),
      tariff_type: convertTariffTypeToString(tariffAccount.tariffType),
    };
  } catch (error) {
    console.error("Failed to fetch tariff:", error);
    return null;
  }
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
    const convertedTariffType = convertStringToTariffType(chosenTariffType);

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

// GET endpoint to retrieve a specific tariff by pubkey or list all tariffs
app.get("/tariff", async (req: Request, res: Response): Promise<any> => {
  try {
    const { pubkey } = req.query;

    if (pubkey) {
      // Retrieve a specific tariff by its public key
      const tariffPDA = await getTariffPDA(new PublicKey(pubkey as string));
      const tariffData = await fetchTariff(tariffPDA);

      if (!tariffData) {
        return res.status(404).json({ error: "Tariff not found" });
      }

      return res.status(200).json(tariffData);
    } else {
      // List all tariffs by iterating through all accounts
      const tariffs = await program.account.tariff.all();

      const tariffList = tariffs.map((tariff) => {
        return {
          tariffKey: tariff.account.tariffKey.toString(),
          water_rate: tariff.account.waterRate.toNumber(),
          waste_rate: tariff.account.wasteRate.toNumber(),
          tariff_type: convertTariffTypeToString(tariff.account.tariffType),
        };
      });

      return res.status(200).json(tariffList);
    }
  } catch (error) {
    console.error("Failed to retrieve tariffs:", error);
    res.status(500).json({ error: "Failed to retrieve tariffs" });
  }
});

app.listen(port, () => {
  console.log(`[server]: Server is running at http://localhost:${port}`);
});
