import { Request, Response } from "express";
import * as anchor from "@coral-xyz/anchor";
import { Keypair, PublicKey } from "@solana/web3.js";
import { wallet, program, getPDA } from "../services/solana";
import { ReservoirRequest } from "../types/reservoir";
import { authorizeWallet } from "../services/middleware";

const reservoirRouter = require("express").Router();

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

// POST endpoint to initialize reservoir
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

// GET endpoint to list all reservoirs
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

// GET endpoint to retrieve a specific reservoir by pubkey
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
