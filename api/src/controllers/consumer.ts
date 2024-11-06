import * as anchor from "@coral-xyz/anchor";
import { Request, Response } from "express";
import { Keypair, PublicKey } from "@solana/web3.js";
import { ConsumerRequest } from "../types/consumer";
import {
  wallet,
  program,
  initializeOrFetchATAs,
  getConsumerBalance,
} from "../services/solana";
import { getTariffPDA, fetchTariff } from "./tariff";
import { getReservoirPDA, fetchReservoir } from "./reservoir";
import {
  ensureTokensInitialized,
  authorizeConsumerKeypair,
  authorizeWallet,
} from "../services/middleware";

const consumerRouter = require("express").Router();
consumerRouter.use(ensureTokensInitialized);

// POST endpoint to register a new consumer
consumerRouter.post(
  "/",
  authorizeWallet,
  async (req: Request, res: Response): Promise<any> => {
    try {
      const { tariff_key, reservoir_key, contracted_capacity, block_rate } =
        req.body as ConsumerRequest;

      // Validate required fields and types
      const missingFields = [
        { name: "tariff_key", value: tariff_key, type: "string" },
        { name: "reservoir_key", value: reservoir_key, type: "string" },
        {
          name: "contracted_capacity",
          value: contracted_capacity,
          type: "number",
        },
        { name: "block_rate", value: block_rate, type: "number" },
      ].filter((field) => typeof field.value !== field.type);

      if (missingFields.length > 0) {
        const errors = missingFields.reduce((acc, field) => {
          acc[field.name] = `Should be ${field.type}`;
          return acc;
        }, {} as Record<string, string>);
        return res
          .status(400)
          .json({ error: { msg: "Invalid field types", errors } });
      }

      // Validate tariff_key and reservoir_key
      const tariffPDA = await getTariffPDA(new PublicKey(tariff_key));
      const tariffData = await fetchTariff(tariffPDA);
      if (!tariffData)
        return res.status(404).json({ error: "Tariff not found" });

      const reservoirPDA = await getReservoirPDA(new PublicKey(reservoir_key));
      const reservoirData = await fetchReservoir(reservoirPDA);
      if (!reservoirData)
        return res.status(404).json({ error: "Reservoir not found" });

      // Create consumer account and initialize ATAs
      const consumerKeypair = Keypair.generate();
      const ATAs = await initializeOrFetchATAs(
        consumerKeypair.publicKey,
        req.tokens!
      );
      console.log("ATAs fetched from server.");

      // Register consumer
      await program.methods
        .registerConsumer(
          new PublicKey(tariff_key),
          new PublicKey(reservoir_key),
          new anchor.BN(contracted_capacity),
          new anchor.BN(block_rate)
        )
        .accounts({
          consumer: consumerKeypair.publicKey,
          agency: wallet.publicKey,
          watcMint: req.tokens!.WATC,
        })
        .signers([consumerKeypair])
        .rpc();

      const consumerBalance = await getConsumerBalance(ATAs);

      return res.status(201).json({
        msg: "Consumer registered successfully. Please store your private key securely and do not share it. You will not be able to retrieve this key again.",
        consumer: {
          publicKey: consumerKeypair.publicKey.toString(),
          privateKey: Array.from(consumerKeypair.secretKey), // This is a one-time display
        },
        warning:
          "IMPORTANT: This is the only time your private key will be displayed. Store it securely as it cannot be recovered if lost. Treat this key like a password—do not share it.",
        ...consumerBalance,
      });
    } catch (error) {
      console.error("Error creating consumer:", error);
      res.status(500).json({ error: "Failed to create consumer" });
    }
  }
);

// GET Endpoint to list all consumers
consumerRouter.get("/", async (req: Request, res: Response): Promise<any> => {
  try {
    const { tariff_key, reservoir_key } = req.query;

    const consumers = await program.account.consumer.all();
    const filteredConsumers = consumers.filter((consumer) => {
      const matchesTariff =
        !tariff_key ||
        consumer.account.assignedTariff.toString() === tariff_key;
      const matchesReservoir =
        !reservoir_key ||
        consumer.account.assignedReservoir.toString() === reservoir_key;
      return matchesTariff && matchesReservoir;
    });

    // Use Promise.all to resolve all async operations in map
    const consumerData = await Promise.all(
      filteredConsumers.map(async (consumer) => {
        const ATAs = await initializeOrFetchATAs(
          consumer.publicKey,
          req.tokens!
        );
        const consumerBalance = await getConsumerBalance(ATAs);
        return {
          publicKey: consumer.publicKey.toString(),
          tariff: consumer.account.assignedTariff.toString(),
          reservoir: consumer.account.assignedReservoir.toString(),
          contractedCapacity: consumer.account.contractedCapacity.toString(),
          blockRate: consumer.account.blockRate.toString(),
          ...consumerBalance,
        };
      })
    );

    res.status(200).json({ consumers: consumerData });
  } catch (error) {
    console.error("Error fetching consumers:", error);
    res.status(500).json({ error: "Failed to fetch consumers" });
  }
});

// GET Endpoint to retrieve a specific consumer by pubkey
consumerRouter.get(
  "/:pubkey",
  async (req: Request, res: Response): Promise<any> => {
    try {
      const { pubkey } = req.params;

      const consumerKey = new PublicKey(pubkey);
      const ATAs = await initializeOrFetchATAs(consumerKey, req.tokens!);
      const consumerBalance = await getConsumerBalance(ATAs);

      const consumer = await program.account.consumer.fetch(consumerKey);

      res.status(200).json({
        publicKey: consumerKey.toString(),
        tariff: consumer.assignedTariff.toString(),
        reservoir: consumer.assignedReservoir.toString(),
        contractedCapacity: consumer.contractedCapacity.toString(),
        blockRate: consumer.blockRate.toString(),
        ...consumerBalance,
      });
    } catch (error) {
      console.error("Error fetching consumer:", error);
      res.status(500).json({ error: "Failed to fetch consumer" });
    }
  }
);

// PUT Endpoint to update a consumer's data
consumerRouter.put(
  "/:pubkey",
  authorizeWallet,
  authorizeConsumerKeypair,
  async (req: Request, res: Response): Promise<any> => {
    try {
      const { pubkey } = req.params;
      const { contracted_capacity, block_rate } = req.body;

      // Ensure at least one field is provided for the update
      if (contracted_capacity === undefined && block_rate === undefined) {
        return res.status(400).json({
          error:
            "At least one of `contracted_capacity` or `block_rate` is required for update.",
        });
      }

      const consumerKey = new PublicKey(pubkey);

      // Fetch the consumer's current account data
      const consumerAccount = await program.account.consumer.fetch(consumerKey);
      if (!consumerAccount) {
        return res.status(404).json({ error: "Consumer not found" });
      }

      // Retrieve the current values for assignedTariff and assignedReservoir
      const assignedTariff = consumerAccount.assignedTariff;
      const assignedReservoir = consumerAccount.assignedReservoir;

      // Set values to be updated, defaulting to current values if not provided
      const updatedContractedCapacity =
        contracted_capacity !== undefined
          ? new anchor.BN(contracted_capacity)
          : consumerAccount.contractedCapacity;

      const updatedBlockRate =
        block_rate !== undefined
          ? new anchor.BN(block_rate)
          : consumerAccount.blockRate;

      // Call the updateConsumer instruction to update the consumer's data
      await program.methods
        .updateConsumer(
          assignedTariff,
          assignedReservoir,
          updatedContractedCapacity,
          updatedBlockRate
        )
        .accounts({
          consumer: consumerKey,
          agency: wallet.publicKey,
          watcMint: req.tokens!.WATC,
        })
        .signers([req.consumerKeypair!])
        .rpc();

      res.status(200).json({
        message: "Consumer updated successfully",
        consumer: consumerKey.toString(),
        updatedFields: {
          contractedCapacity: updatedContractedCapacity.toString(),
          blockRate: updatedBlockRate.toString(),
        },
      });
    } catch (error) {
      console.error("Error updating consumer:", error);
      res.status(500).json({ error: "Failed to update consumer" });
    }
  }
);

// PUT endpoint to update a consumer's tariff
consumerRouter.put(
  "/:pubkey/tariff",
  authorizeWallet,
  async (req: Request, res: Response): Promise<any> => {
    try {
      const { pubkey } = req.params;
      const { tariff_key } = req.body;

      if (!tariff_key) {
        return res
          .status(400)
          .json({ error: "tariff_key is required for update" });
      }

      const consumerKey = new PublicKey(pubkey);

      // Fetch the consumer's current account data
      const consumerAccount = await program.account.consumer.fetch(consumerKey);
      if (!consumerAccount) {
        return res.status(404).json({ error: "Consumer not found" });
      }

      // Call the updateConsumerTariff instruction to update the consumer's tariff
      await program.methods
        .updateConsumerTariff(
          consumerAccount.assignedTariff,
          new PublicKey(tariff_key)
        )
        .accounts({
          consumer: consumerKey,
          agency: wallet.publicKey,
        })
        .rpc();

      res.status(200).json({
        message: "Consumer tariff updated successfully",
        consumer: consumerKey.toString(),
        updatedFields: {
          tariff: tariff_key,
        },
      });
    } catch (error) {
      console.error("Error updating consumer tariff:", error);
      res.status(500).json({ error: "Failed to update consumer tariff" });
    }
  }
);

// PUT endpoint to update a consumer's reservoir
consumerRouter.put(
  "/:pubkey/reservoir",
  authorizeWallet,
  async (req: Request, res: Response): Promise<any> => {
    try {
      const { pubkey } = req.params;
      const { reservoir_key } = req.body;

      if (!reservoir_key) {
        return res
          .status(400)
          .json({ error: "reservoir_key is required for update" });
      }

      const consumerKey = new PublicKey(pubkey);

      // Fetch the consumer's current account data
      const consumerAccount = await program.account.consumer.fetch(consumerKey);
      if (!consumerAccount) {
        return res.status(404).json({ error: "Consumer not found" });
      }

      // Call the updateConsumerReservoir instruction to update the consumer's reservoir
      await program.methods
        .updateConsumerReservoir(
          consumerAccount.assignedReservoir,
          new PublicKey(reservoir_key)
        )
        .accounts({
          consumer: consumerKey,
          agency: wallet.publicKey,
        })
        .rpc();

      res.status(200).json({
        message: "Consumer reservoir updated successfully",
        consumer: consumerKey.toString(),
        updatedFields: {
          reservoir: reservoir_key,
        },
      });
    } catch (error) {
      console.error("Error updating consumer reservoir:", error);
      res.status(500).json({ error: "Failed to update consumer reservoir" });
    }
  }
);

export { consumerRouter };
