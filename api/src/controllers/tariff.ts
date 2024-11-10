import { Request, Response } from "express";
import * as anchor from "@coral-xyz/anchor";
import { Keypair, PublicKey } from "@solana/web3.js";
import { wallet, program, getPDA } from "../services/solana";
import {
  TariffRequest,
  isValidTariffType,
  convertStringToTariffType,
  convertTariffTypeToString,
  TariffTypeString,
} from "../types/tariff";
import { authorizeWallet } from "../services/middleware";

const tariffRouter = require("express").Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Tariff:
 *       type: object
 *       properties:
 *         tariff_key:
 *           type: string
 *           description: Public key of the tariff
 *         water_rate:
 *           type: integer
 *           description: Rate for water usage
 *         waste_rate:
 *           type: integer
 *           description: Rate for waste treatment
 *         tariff_type:
 *           type: string
 *           description: Type of tariff (e.g., uniformIbt, seasonalIbt, seasonalDbt)
 *       required:
 *         - tariff_key
 *         - water_rate
 *         - waste_rate
 *         - tariff_type
 *     TariffRequest:
 *       type: object
 *       properties:
 *         water_rate:
 *           type: integer
 *           description: Rate for water usage
 *         waste_rate:
 *           type: integer
 *           description: Rate for waste treatment
 *         tariff_type:
 *           type: string
 *           description: Type of tariff (e.g., uniformIbt, seasonalIbt, seasonalDbt)
 *       required:
 *         - water_rate
 *         - waste_rate
 *         - tariff_type
 */

// Utility to derive the tariff PDA
const getTariffPDA = async (key: PublicKey): Promise<PublicKey> =>
  getPDA("tariff", key);

// Helper function to fetch a tariff by its PDA
const fetchTariff = async (tariffPDA: PublicKey) => {
  try {
    const tariffAccount = await program.account.tariff.fetch(tariffPDA);
    return {
      tariff_key: tariffAccount.tariffKey.toString(),
      water_rate: tariffAccount.waterRate.toNumber(),
      waste_rate: tariffAccount.wasteRate.toNumber(),
      tariff_type: convertTariffTypeToString(tariffAccount.tariffType),
    };
  } catch (error) {
    console.error("Failed to fetch tariff:", error);
    return null;
  }
};

/**
 * @swagger
 * /tariff:
 *   post:
 *     summary: Initialize a new tariff
 *     tags: [Tariffs]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TariffRequest'
 *     responses:
 *       200:
 *         description: Tariff initialized successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 tariff:
 *                   type: string
 *                   description: Public key of the created tariff PDA
 *                 tariff_key:
 *                   type: string
 *       400:
 *         description: Invalid input data
 *       500:
 *         description: Internal server error
 */
tariffRouter.post(
  "/",
  authorizeWallet,
  async (req: Request, res: Response): Promise<any> => {
    try {
      const { water_rate, waste_rate, tariff_type } = req.body as TariffRequest;

      // Validate that `water_rate` and `waste_rate` are numbers
      if (typeof water_rate !== "number" || typeof waste_rate !== "number") {
        return res.status(400).json({
          error:
            "Both water_rate and waste_rate are required and must be numbers",
        });
      }

      // Validate that `tariff_type` is a valid string
      const defaultType: TariffTypeString = "uniformIbt";
      const chosenTariffType = tariff_type ? tariff_type : defaultType;

      if (!isValidTariffType(chosenTariffType)) {
        return res.status(400).json({
          error:
            "Invalid tariff_type. Expected one of: 'uniformIbt', 'seasonalIbt', 'seasonalDbt'",
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
        tariff_key: tariffKey.toString(),
      });
    } catch (error) {
      console.error("Initialization error:", error);
      res.status(500).json({ error: "Failed to create tariff" });
    }
  }
);

/**
 * @swagger
 * /tariff:
 *   get:
 *     summary: Retrieve a list of all tariffs
 *     tags: [Tariffs]
 *     responses:
 *       200:
 *         description: A list of tariffs
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Tariff'
 *       500:
 *         description: Failed to retrieve tariffs
 */
tariffRouter.get("/", async (req: Request, res: Response): Promise<any> => {
  try {
    const tariffs = await program.account.tariff.all();
    const tariffList = tariffs.map((tariff) => ({
      tariff_key: tariff.account.tariffKey.toString(),
      water_rate: tariff.account.waterRate.toNumber(),
      waste_rate: tariff.account.wasteRate.toNumber(),
      tariff_type: convertTariffTypeToString(tariff.account.tariffType),
    }));

    return res.status(200).json(tariffList);
  } catch (error) {
    console.error("Failed to retrieve tariffs:", error);
    res.status(500).json({ error: "Failed to retrieve tariffs" });
  }
});

/**
 * @swagger
 * /tariff/{pubkey}:
 *   get:
 *     summary: Retrieve a specific tariff by public key
 *     tags: [Tariffs]
 *     parameters:
 *       - in: path
 *         name: pubkey
 *         schema:
 *           type: string
 *         required: true
 *         description: Public key of the tariff PDA
 *     responses:
 *       200:
 *         description: A specific tariff object
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Tariff'
 *       404:
 *         description: Tariff not found
 *       500:
 *         description: Failed to retrieve tariff
 */
tariffRouter.get(
  "/:pubkey",
  async (req: Request, res: Response): Promise<any> => {
    try {
      const { pubkey } = req.params;
      const tariffPDA = await getTariffPDA(new PublicKey(pubkey));
      const tariffData = await fetchTariff(tariffPDA);

      if (!tariffData) {
        return res.status(404).json({ error: "Tariff not found" });
      }

      return res.status(200).json(tariffData);
    } catch (error) {
      console.error("Failed to retrieve tariff:", error);
      res.status(500).json({ error: "Failed to retrieve tariff" });
    }
  }
);

/**
 * @swagger
 * /tariff/{pubkey}:
 *   put:
 *     summary: Update an existing tariff by public key
 *     tags: [Tariffs]
 *     parameters:
 *       - in: path
 *         name: pubkey
 *         schema:
 *           type: string
 *         required: true
 *         description: Public key of the tariff PDA
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TariffRequest'
 *     responses:
 *       200:
 *         description: Tariff updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Tariff updated successfully
 *                 tariff_key:
 *                   type: string
 *       400:
 *         description: Invalid input data
 *       500:
 *         description: Failed to update tariff
 */
tariffRouter.put(
  "/:pubkey",
  authorizeWallet,
  async (req: Request, res: Response): Promise<any> => {
    try {
      const { pubkey } = req.params;

      let tariffKey: PublicKey;
      try {
        tariffKey = new PublicKey(pubkey);
        const _ = await getTariffPDA(tariffKey); // Validate PDA exists
      } catch (error) {
        return res.status(400).json({ error: "Invalid public key" });
      }

      const { water_rate, waste_rate, tariff_type } = req.body as TariffRequest;

      // Validate `water_rate` and `waste_rate` are numbers, if provided
      if (
        (water_rate && typeof water_rate !== "number") ||
        (waste_rate && typeof waste_rate !== "number")
      ) {
        return res.status(400).json({
          error: "Both water_rate and waste_rate, if provided, must be numbers",
        });
      }

      // Validate `tariff_type` if provided
      if (tariff_type && !isValidTariffType(tariff_type)) {
        return res.status(400).json({
          error:
            "Invalid tariff_type. Expected one of: 'uniformIbt', 'seasonalIbt', 'seasonalDbt'",
        });
      }

      // Check if any valid field was provided, if not return error
      if (!(water_rate && waste_rate) && !tariff_type) {
        return res.status(400).json({
          error:
            "At least water_rate and waste_rate, or tariff_type must be provided",
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
          .updateTariffType(tariffKey, convertedTariffType)
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
  }
);

export { tariffRouter, getTariffPDA, fetchTariff };
