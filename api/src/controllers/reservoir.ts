import { Request, Response } from "express";
import * as anchor from "@coral-xyz/anchor";
import { Keypair, PublicKey } from "@solana/web3.js";
import { wallet, program, getPDA } from "../services/solana";
import { ReservoirRequest } from "../types/reservoir";
import { authorizeWallet } from "../services/middleware";

const reservoirRouter = require("express").Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Reservoir:
 *       type: object
 *       properties:
 *         reservoir_key:
 *           type: string
 *           description: Public key of the reservoir
 *         current_level:
 *           type: integer
 *           description: Current level of the reservoir
 *           minimum: 0
 *         capacity:
 *           type: integer
 *           description: Capacity of the reservoir
 *           minimum: 0
 *       required:
 *         - reservoir_key
 *         - current_level
 *         - capacity
 *     ReservoirRequest:
 *       type: object
 *       properties:
 *         current_level:
 *           type: integer
 *           description: Current level of the reservoir
 *         capacity:
 *           type: integer
 *           description: Capacity of the reservoir
 *       required:
 *         - current_level
 *         - capacity
 *   securitySchemes:
 *     bearerAuth:
 *       type: apiKey
 *       name: Authorization
 *       in: header
 */

// Utility to derive the PDA
const getReservoirPDA = async (key: PublicKey): Promise<PublicKey> =>
  getPDA("reservoir", key);

// Helper function to fetch a reservoir by its PDA
const fetchReservoir = async (reservoirPDA: PublicKey) => {
  try {
    const reservoirAccount = await program.account.reservoir.fetch(
      reservoirPDA
    );
    return {
      reservoirKey: reservoirAccount.reservoirKey.toString(),
      current_level: reservoirAccount.currentLevel.toNumber(),
      capacity: reservoirAccount.capacity.toNumber(),
    };
  } catch (error) {
    console.error("Failed to fetch reservoir:", error);
    return null;
  }
};


/**
 * @swagger
 * /reservoir:
 *  post:
 *   summary: Initialize a new reservoir
 *   tags: [Reservoirs]
 *   security:
 *     - bearerAuth: []
 *   requestBody:
 *     required: true
 *     content:
 *       application/json:
 *         schema:
 *           $ref: '#/components/schemas/ReservoirRequest'
 *   responses:
 *     200:
 *       description: Reservoir initialized successfully
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               message:
 *                 type: string
 *               reservoir:
 *                 type: string
 *                 description: Public key of the created reservoir PDA
 *               reservoir_key:
 *                 type: string
 *     400:
 *       description: Invalid input data
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               error:
 *                 type: string
 *                 description: Error message
 *                 example: "Both `current_level` and `capacity` of reservoir are required and must be numbers"
 *     500:
 *       description: Internal server error
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               error:
 *                 type: string
 *                 description: Error message
 *                 example: Failed to create reservoir
 */
reservoirRouter.post(
  "/",
  authorizeWallet,
  async (req: Request, res: Response): Promise<any> => {
    try {
      const { current_level, capacity } = req.body as ReservoirRequest;

      // Validate request body
      if (typeof current_level !== "number" || typeof capacity !== "number") {
        return res.status(400).json({
          error:
            "Both `current_level` and `capacity` of reservoir are required and must be numbers",
        });
      }

      const reservoirKey = Keypair.generate().publicKey;
      const reservoirPDA = await getReservoirPDA(reservoirKey);

      await program.methods
        .initializeReservoir(
          reservoirKey,
          new anchor.BN(current_level),
          new anchor.BN(capacity)
        )
        .accounts({
          agency: wallet.publicKey,
        })
        .rpc();

      res.status(200).json({
        message: "Initialization successful",
        reservoir: reservoirPDA.toString(),
        reservoir_key: reservoirKey.toString(),
      });
    } catch (error) {
      console.error("Initialization error:", error);
      res.status(500).json({ error: "Failed to create reservoir" });
    }
  }
);


/**
 * @swagger
 * /reservoir:
 *   get:
 *     summary: Retrieve a list of all reservoirs
 *     tags: [Reservoirs]
 *     responses:
 *       200:
 *         description: A list of reservoirs
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Reservoir'
 *       500:
 *         description: Failed to retrieve reservoirs
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   description: Error message
 *                   example: Failed to retrieve reservoirs
 */
reservoirRouter.get("/", async (req: Request, res: Response): Promise<any> => {
  try {
    // List all reservoirs by iterating through all accounts
    const reservoirs = await program.account.reservoir.all();

    const reservoirList = reservoirs.map((reservoir) => {
      return {
        reservoir_key: reservoir.account.reservoirKey.toString(),
        currentLevel: reservoir.account.currentLevel.toNumber(),
        capacity: reservoir.account.capacity.toNumber(),
      };
    });

    return res.status(200).json(reservoirList);
  } catch (error) {
    console.error("Failed to retrieve reservoirs:", error);
    res.status(500).json({ error: "Failed to retrieve reservoirs" });
  }
});


/**
 * @swagger
 * /reservoir/{pubkey}:
 *   get:
 *     summary: Retrieve a specific reservoir by public key
 *     tags: [Reservoirs]
 *     parameters:
 *       - in: path
 *         name: pubkey
 *         schema:
 *           type: string
 *         required: true
 *         description: Public key of the reservoir PDA
 *     responses:
 *       200:
 *         description: A specific reservoir object
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Reservoir'
 *       404:
 *         description: Reservoir not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   description: Error message
 *                   example: Reservoir not found
 *       500:
 *         description: Failed to retrieve reservoir
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   description: Error message
 *                   example: Failed to retrieve reservoir
 */
reservoirRouter.get(
  "/:pubkey",
  async (req: Request, res: Response): Promise<any> => {
    try {
      const { pubkey } = req.params;

      // Retrieve a specific reservoir by its public key
      const reservoirPDA = await getReservoirPDA(
        new PublicKey(pubkey as string)
      );
      const reservoirData = await fetchReservoir(reservoirPDA);

      if (!reservoirData) {
        return res.status(404).json({ error: "Reservoir not found" });
      }

      return res.status(200).json(reservoirData);
    } catch (error) {
      console.error("Failed to retrieve reservoirs:", error);
      res.status(500).json({ error: "Failed to retrieve reservoirs" });
    }
  }
);


/**
 * @swagger
 * /reservoir/{pubkey}:
 *   put:
 *     summary: Update an existing reservoir by public key
 *     tags: [Reservoirs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: pubkey
 *         schema:
 *           type: string
 *         required: true
 *         description: Public key of the reservoir PDA
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ReservoirRequest'
 *     responses:
 *       200:
 *         description: Reservoir updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Reservoir updated successfully
 *                 reservoir_key:
 *                   type: string
 *       400:
 *         description: Invalid input data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   description: Error message
 *                   example: "Current level of reservoir is required and must be a number"
 *       500:
 *         description: Failed to update reservoir
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   description: Error message
 *                   example: Failed to update reservoir
 */
reservoirRouter.put(
  "/:pubkey",
  authorizeWallet,
  async (req: Request, res: Response): Promise<any> => {
    try {
      const { pubkey } = req.params;

      let reservoirKey: PublicKey;
      try {
        reservoirKey = new PublicKey(pubkey);
        const _ = await getReservoirPDA(reservoirKey); // Validate PDA exists
      } catch (error) {
        return res.status(400).json({ error: "Invalid public key" });
      }

      let { current_level, capacity } = req.body as ReservoirRequest;

      // If `currentLevel` is not provided or not a number, exit
      if (!current_level || typeof current_level !== "number") {
        return res.status(400).json({
          error: "Current level of reservoir is required and must be a number",
        });
      }

      // If `capacity` is not provided, do not change the capacity
      if (!capacity) {
        const reservoirPDA = await getReservoirPDA(reservoirKey);
        const reservoirAccount = await program.account.reservoir.fetch(
          reservoirPDA
        );
        capacity = reservoirAccount.capacity.toNumber();
      }

      // If `capacity` is not a number, exit
      if (typeof capacity !== "number") {
        return res.status(400).json({
          error: "Capacity of reservoir must be a number",
        });
      }

      // Execute the relevant instructions based on provided fields
      await program.methods
        .updateReservoir(
          reservoirKey,
          new anchor.BN(current_level),
          new anchor.BN(capacity)
        )
        .accounts({
          agency: wallet.publicKey,
        })
        .rpc();

      // Send a success response
      res.status(200).json({
        message: "Reservoir updated successfully",
        reservoir_key: reservoirKey.toString(),
      });
    } catch (error) {
      console.error("Failed to update reservoir:", error);
      res.status(500).json({ error: "Failed to update reservoir" });
    }
  }
);

export { reservoirRouter, getReservoirPDA, fetchReservoir };
