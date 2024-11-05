import { Request, Response } from "express";
import * as anchor from "@coral-xyz/anchor";
import { Keypair, PublicKey } from "@solana/web3.js";
import { wallet, program } from "../services/solana";
import { 
    TariffRequest, 
    isValidTariffType, 
    convertStringToTariffType, 
    convertTariffTypeToString, 
    TariffTypeString 
} from "../types/tariff";


const tariffRouter = require('express').Router();


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

// POST endpoint to initialize tariff
tariffRouter.post("/", async (req: Request, res: Response): Promise<any> => {
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
tariffRouter.get("/", async (req: Request, res: Response): Promise<any> => {
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

tariffRouter.put("/", async (req: Request, res: Response): Promise<any> => {
    try {
        const { pubkey } = req.query;

        // Check for valid pubkey
        if (!pubkey) {
            return res.status(400).json({ error: "Public key is required for updating tariff" });
        }

        let tariffKey: PublicKey;
        try {
            tariffKey = new PublicKey(pubkey as string);
            const _ = await getTariffPDA(tariffKey); // Validate PDA exists
        } catch (error) {
            return res.status(400).json({ error: "Invalid public key" });
        }

        const { water_rate, waste_rate, tariff_type } = req.body as TariffRequest;

        // Validate `water_rate` and `waste_rate` are numbers, if provided
        if ((water_rate && typeof water_rate !== "number") || (waste_rate && typeof waste_rate !== "number")) {
            return res.status(400).json({
                error: "Both water_rate and waste_rate, if provided, must be numbers",
            });
        }

        // Validate `tariff_type` if provided
        if (tariff_type && !isValidTariffType(tariff_type)) {
            return res.status(400).json({
                error: "Invalid tariff_type. Expected one of: 'uniformIbt', 'seasonalIbt', 'seasonalDbt'",
            });
        }

        // Check if any valid field was provided, if not return error
        if (!(water_rate && waste_rate) && !tariff_type) {
            return res.status(400).json({
                error: "At least water_rate and waste_rate, or tariff_type must be provided",
            });
        }

        // Execute the relevant instructions based on provided fields
        if (water_rate || waste_rate) {
            await program.methods
                .updateTariffRates(
                    tariffKey,
                    new anchor.BN(water_rate),
                    new anchor.BN(waste_rate)
                )
                .accounts({
                    agency: wallet.publicKey,
                })
                .rpc();
        }

        if (tariff_type) {
            const convertedTariffType = convertStringToTariffType(tariff_type);
            await program.methods
                .updateTariffType(
                    tariffKey,
                    convertedTariffType
                )
                .accounts({
                    agency: wallet.publicKey,
                })
                .rpc();
        }

        // Send a success response
        res.status(200).json({
            message: "Tariff updated successfully",
            tariff_key: tariffKey.toString(),
        });
    } catch (error) {
        console.error("Failed to update tariff:", error);
        res.status(500).json({ error: "Failed to update tariff" });
    }
});


module.exports = tariffRouter;