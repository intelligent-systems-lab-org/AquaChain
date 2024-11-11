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
import { bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";

const consumerRouter = require("express").Router();
consumerRouter.use(ensureTokensInitialized);

/**
 * @swagger
 * components:
 *   schemas:
 *     Consumer:
 *       type: object
 *       properties:
 *         consumer_key:
 *           type: string
 *           description: Public key of the consumer
 *         tariff_key:
 *           type: string
 *           description: Public key of the tariff
 *         reservoir_key:
 *           type: string
 *           description: Public key of the reservoir
 *         contracted_capacity:
 *           type: integer
 *           description: Contracted capacity of the consumer
 *           minimum: 0
 *         block_rate:
 *           type: integer
 *           description: Block rate of the consumer
 *           minimum: 0
 *         balance:
 *           type: object
 *           properties:
 *             WTK:
 *               type: string
 *               description: Balance of WaterTokens
 *             WST:
 *               type: string
 *               description: Balance of WasteTokens
 *             WATC:
 *               type: string
 *               description: Balance of WasteCapacityTokens
 *       required:
 *         - consumer_key
 *         - tariff_key
 *         - reservoir_key
 *         - contracted_capacity
 *         - block_rate
 *         - balance
 *     ConsumerRequest:
 *       type: object
 *       properties:
 *         tariff_key:
 *           type: string
 *           description: Public key of the tariff
 *         reservoir_key:
 *           type: string
 *           description: Public key of the reservoir
 *         contracted_capacity:
 *           type: integer
 *           description: Contracted capacity of the consumer
 *         block_rate:
 *           type: integer
 *           description: Block rate of the consumer
 *       required:
 *         - tariff_key
 *         - reservoir_key
 *         - contracted_capacity
 *         - block_rate
 *   securitySchemes:
 *     bearerAuth:
 *       type: apiKey
 *       name: Authorization
 *       in: header
 *     consumerAuth:
 *       type: apiKey
 *       name: Consumer-Authorization
 *       in: header
 */


/**
 * @swagger
 * /consumer:
 *   post:
 *     summary: Register a new consumer
 *     tags: [Consumer]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ConsumerRequest'
 *     responses:
 *       200:
 *         description: Consumer registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 msg:
 *                  type: string
 *                  example: Consumer registered successfully. Please store your private key securely and do not share it. You will not be able to retrieve this key again.
 *                 consumer:
 *                  type: object
 *                  properties:
 *                    publicKey:
 *                      type: string
 *                    privateKey:
 *                      type: string
 *                 warning:
 *                  type: string
 *                  example: "IMPORTANT: This is the only time your private key will be displayed. Store it securely as it cannot be recovered if lost. Treat this key like a password—do not share it."
 *       400:
 *         description: Invalid field types or missing fields
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: object
 *                   properties:
 *                     msg:
 *                       type: string
 *                       example: Invalid or missing field types
 *                     errors:
 *                       type: object
 *                       additionalProperties:
 *                         type: string
 *                         example: Should be `type`
 *       404:
 *         description: Tariff or reservoir not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *             examples:
 *               tariffNotFound:
 *                 value:
 *                   error: "Tariff not found"
 *               reservoirNotFound:
 *                 value:
 *                   error: "Reservoir not found"
 *       500:
 *         description: Failed to register consumer
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Failed to register consumer
 */
consumerRouter.post(
  "/",
  authorizeWallet,
  async (req: Request, res: Response) => {
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
          .json({ error: { msg: "Invalid or missing field types", errors } });
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
      await initializeOrFetchATAs(
        consumerKeypair.publicKey,
        req.tokens!
      );

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

      const secretKey = bs58.encode(consumerKeypair.secretKey);

      return res.status(201).json({
        msg: "Consumer registered successfully. Please store your private key securely and do not share it. You will not be able to retrieve this key again.",
        consumer: {
          publicKey: consumerKeypair.publicKey.toString(),
          privateKey: secretKey, // This is a one-time display
        },
        warning:
          "IMPORTANT: This is the only time your private key will be displayed. Store it securely as it cannot be recovered if lost. Treat this key like a password—do not share it.",
      });
    } catch (error) {
      console.error("Failed to register consumer:", error);
      res.status(500).json({ error: "Failed to register consumer" });
    }
  }
);


/**
 * @swagger
 * /consumer:
 *   get:
 *     summary: Retrieve a list of all consumers
 *     tags: [Consumer]
 *     parameters:
 *       - in: query
 *         name: tariff_key
 *         schema:
 *           type: string
 *         description: Filter consumers by tariff key
 *       - in: query
 *         name: reservoir_key
 *         schema:
 *           type: string
 *         description: Filter consumers by reservoir key
 *     responses:
 *       200:
 *         description: A list of consumers
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 consumers:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Consumer'
 *       500:
 *         description: Failed to fetch consumers
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Failed to fetch consumers
 */
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
          balance: consumerBalance,
        };
      })
    );

    res.status(200).json({ consumers: consumerData });
  } catch (error) {
    console.error("Error fetching consumers:", error);
    res.status(500).json({ error: "Failed to fetch consumers" });
  }
});


/**
 * @swagger
 * /consumer/{pubkey}:
 *   get:
 *     summary: Retrieve a specific consumer by public key
 *     tags: [Consumer]
 *     parameters:
 *       - in: path
 *         name: pubkey
 *         required: true
 *         schema:
 *           type: string
 *         description: Public key of the consumer
 *     responses:
 *       200:
 *         description: Consumer data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Consumer'
 *       500:
 *         description: Failed to fetch consumer
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Failed to fetch consumer
 */
consumerRouter.get(
  "/:pubkey",
  async (req: Request, res: Response) => {
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
        balance: consumerBalance,
      });
    } catch (error) {
      console.error("Error fetching consumer:", error);
      res.status(500).json({ error: "Failed to fetch consumer" });
    }
  }
);


/**
 * @swagger
 * /consumer/{pubkey}:
 *   put:
 *     summary: Update a consumer's data
 *     tags: [Consumer]
 *     security:
 *       - bearerAuth: []
 *         consumerAuth: []
 *     parameters:
 *       - in: path
 *         name: pubkey
 *         required: true
 *         schema:
 *           type: string
 *         description: Public key of the consumer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               contracted_capacity:
 *                 type: number
 *                 description: The new contracted capacity
 *               block_rate:
 *                 type: number
 *                 description: The new block rate
 *     responses:
 *       200:
 *         description: Consumer updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Consumer updated successfully
 *                 consumer:
 *                   type: string
 *                   description: The public key of the updated consumer
 *                 updatedFields:
 *                   type: object
 *                   properties:
 *                     contractedCapacity:
 *                       type: string
 *                       description: The updated contracted capacity
 *                     blockRate:
 *                       type: string
 *                       description: The updated block rate
 *       400:
 *         description: At least one field is required for update
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: At least one of `contracted_capacity` or `block_rate` is required for update.
 *       500:
 *         description: Failed to update consumer
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Failed to update consumer
 */
consumerRouter.put(
  "/:pubkey",
  authorizeWallet,
  authorizeConsumerKeypair,
  async (req: Request, res: Response) => {
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


/**
 * @swagger
 * /consumer/{pubkey}/tariff:
 *   put:
 *     summary: Update a consumer's tariff
 *     tags: [Consumer]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: pubkey
 *         required: true
 *         schema:
 *           type: string
 *         description: Public key of the consumer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               tariff_key:
 *                 type: string
 *                 description: The new tariff key
 *     responses:
 *       200:
 *         description: Consumer tariff updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Consumer tariff updated successfully
 *                 consumer:
 *                   type: string
 *                   description: The public key of the updated consumer
 *                 updatedFields:
 *                   type: object
 *                   properties:
 *                     tariff:
 *                       type: string
 *                       description: The updated tariff key
 *       400:
 *         description: tariff_key is required for update
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: tariff_key is required for update
 *       500:
 *         description: Failed to update consumer tariff
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Failed to update consumer tariff
 */
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


/**
 * @swagger
 * /consumer/{pubkey}/reservoir:
 *   put:
 *     summary: Update a consumer's reservoir
 *     tags: [Consumer]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: pubkey
 *         required: true
 *         schema:
 *           type: string
 *         description: Public key of the consumer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reservoir_key:
 *                 type: string
 *                 description: The new reservoir key
 *     responses:
 *       200:
 *         description: Consumer reservoir updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Consumer reservoir updated successfully
 *                 consumer:
 *                   type: string
 *                   description: The public key of the updated consumer
 *                 updatedFields:
 *                   type: object
 *                   properties:
 *                     reservoir:
 *                       type: string
 *                       description: The updated reservoir key
 *       400:
 *         description: reservoir_key is required for update
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: reservoir_key is required for update
 *       500:
 *         description: Failed to update consumer reservoir
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Failed to update consumer reservoir
 */
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


/**
 * @swagger
 * /consumer/{pubkey}/waste/charge:
 *   post:
 *     summary: Charge for waste treatment
 *     tags: [Consumer]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: pubkey
 *         required: true
 *         schema:
 *           type: string
 *         description: Public key of the consumer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               amount:
 *                 type: integer
 *                 description: The amount of waste to be treated
 *     responses:
 *       200:
 *         description: Waste treatment charged successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Waste disposal charged successfully
 *                 consumer:
 *                   type: string
 *                   description: The public key of the consumer
 *                 amount:
 *                   type: integer
 *                   description: The amount of waste to be treated
 *       400:
 *         description: amount is required for update
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: amount is required for update
 *       500:
 *         description: Failed to charge for waste treatment
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Failed to charge for waste treatment
 */
consumerRouter.post(
  "/:pubkey/waste/charge",
  authorizeWallet,
  async (req: Request, res: Response): Promise<any> => {
    try {
      const { pubkey } = req.params;
      const { amount } = req.body;

      if (!amount) {
        return res.status(400).json({ error: "amount is required for update" });
      }

      const consumerKey = new PublicKey(pubkey);

      // Fetch the consumer's current account data
      const consumerAccount = await program.account.consumer.fetch(consumerKey);
      if (!consumerAccount) {
        return res.status(404).json({ error: "Consumer not found" });
      }

      // Call the disposeWaste instruction to dispose waste
      await program.methods
        .disposeWaste(consumerAccount.assignedTariff, new anchor.BN(amount))
        .accounts({
          consumer: consumerKey,
          wstMint: req.tokens!.WST,
          agency: wallet.publicKey,
        })
        .rpc();

      res.status(200).json({
        message: "Waste treatement charged successfully",
        consumer: consumerKey.toString(),
        amount: amount,
      });
    } catch (error) {
      console.error("Error charging for waste disposal:", error);
      res.status(500).json({ error: "Failed to charge for waste treatment" });
    }
  }
);


/**
 * @swagger
 * /consumer/{pubkey}/water/charge:
 *   post:
 *     summary: Charge for water usage
 *     tags: [Consumer]
 *     security:
 *       - bearerAuth: []
 *         consumerAuth: []
 *     parameters:
 *       - in: path
 *         name: pubkey
 *         required: true
 *         schema:
 *           type: string
 *         description: Public key of the consumer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               amount:
 *                 type: integer
 *                 description: The amount of water to charge
 *     responses:
 *       200:
 *         description: Water usage charged successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Water usage charged successfully
 *                 consumer:
 *                   type: string
 *                   description: The public key of the consumer
 *                 amount:
 *                   type: integer
 *                   description: The amount of water charged
 *       400:
 *         description: amount is required for update
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: amount is required for update
 *       500:
 *         description: Failed to charge for water usage
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Failed to charge for water usage
 */
consumerRouter.post(
  "/:pubkey/water/charge",
  authorizeWallet,
  authorizeConsumerKeypair,
  async (req: Request, res: Response): Promise<any> => {
    try {
      const { pubkey } = req.params;
      const { amount } = req.body;

      if (!amount) {
        return res.status(400).json({ error: "amount is required for update" });
      }

      const consumerKey = new PublicKey(pubkey);

      // Fetch the consumer's current account data
      const consumerAccount = await program.account.consumer.fetch(consumerKey);
      if (!consumerAccount) {
        return res.status(404).json({ error: "Consumer not found" });
      }

      // Call the useWater instruction to charge for water usage
      await program.methods
        .useWater(
          consumerAccount.assignedTariff,
          consumerAccount.assignedReservoir,
          new anchor.BN(amount)
        )
        .accounts({
          consumer: consumerKey,
          wtkMint: req.tokens!.WTK,
          watcMint: req.tokens!.WATC,
          agency: wallet.publicKey,
        })
        .signers([req.consumerKeypair!])
        .rpc();

      res.status(200).json({
        message: "Water usage charged successfully",
        consumer: consumerKey.toString(),
        amount: amount,
      });
    } catch (error) {
      console.error("Error charging for water usage:", error);
      res.status(500).json({ error: "Failed to charge for water usage" });
    }
  }
);


/**
 * @swagger
 * /consumer/{pubkey}/waste/pay:
 *   post:
 *     summary: Pay for waste treatment
 *     tags: [Consumer]
 *     security:
 *       - bearerAuth: []
 *         consumerAuth: []
 *     parameters:
 *       - in: path
 *         name: pubkey
 *         required: true
 *         schema:
 *           type: string
 *         description: Public key of the consumer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               amount:
 *                 type: integer
 *                 description: The amount of waste to be treated
 *     responses:
 *       200:
 *         description: Waste treatment paid successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Waste treatment paid successfully
 *                 consumer:
 *                   type: string
 *                   description: The public key of the consumer
 *                 amount:
 *                   type: integer
 *                   description: The amount of waste to be treated
 *       400:
 *         description: amount is required for update
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: amount is required for update
 *       500:
 *         description: Failed to pay for waste treatment
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Failed to pay for waste treatment
 */
consumerRouter.post(
  "/:pubkey/waste/pay",
  authorizeWallet,
  authorizeConsumerKeypair,
  async (req: Request, res: Response): Promise<any> => {
    try {
      const { pubkey } = req.params;
      const { amount } = req.body;

      if (!amount) {
        return res.status(400).json({ error: "amount is required for update" });
      }

      const consumerKey = new PublicKey(pubkey);

      // Fetch the consumer's current account data
      const consumerAccount = await program.account.consumer.fetch(consumerKey);
      if (!consumerAccount) {
        return res.status(404).json({ error: "Consumer not found" });
      }

      // Call the payForWaste instruction to pay for waste treatment
      await program.methods
        .payForWaste(consumerAccount.assignedTariff, new anchor.BN(amount))
        .accounts({
          consumer: consumerKey,
          wstMint: req.tokens!.WST,
          agency: wallet.publicKey,
        })
        .signers([req.consumerKeypair!])
        .rpc();

      res.status(200).json({
        message: "Waste treatment paid successfully",
        consumer: consumerKey.toString(),
        amount: amount,
      });
    } catch (error) {
      console.error("Error paying for waste treatment:", error);
      res.status(500).json({ error: "Failed to pay for waste treatment" });
    }
  }
);


/**
 * @swagger
 * /consumer/{pubkey}/water/pay:
 *   post:
 *     summary: Pay for water usage
 *     tags: [Consumer]
 *     security:
 *       - bearerAuth: []
 *         consumerAuth: []
 *     parameters:
 *       - in: path
 *         name: pubkey
 *         required: true
 *         schema:
 *           type: string
 *         description: Public key of the consumer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               amount:
 *                 type: integer
 *                 description: The amount of water to pay for
 *     responses:
 *       200:
 *         description: Water paid successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Water paid successfully
 *                 consumer:
 *                   type: string
 *                   description: The public key of the consumer
 *                 amount:
 *                   type: integer
 *                   description: The amount of water paid for
 *       400:
 *         description: amount is required for update
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: amount is required for update
 *       500:
 *         description: Failed to pay for water
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Failed to pay for water
 */
consumerRouter.post(
  "/:pubkey/water/pay",
  authorizeWallet,
  authorizeConsumerKeypair,
  async (req: Request, res: Response): Promise<any> => {
    try {
      const { pubkey } = req.params;
      const { amount } = req.body;

      if (!amount) {
        return res.status(400).json({ error: "amount is required for update" });
      }

      const consumerKey = new PublicKey(pubkey);

      // Fetch the consumer's current account data
      const consumerAccount = await program.account.consumer.fetch(consumerKey);
      if (!consumerAccount) {
        return res.status(404).json({ error: "Consumer not found" });
      }

      // Call the payForWater instruction to pay for water
      await program.methods
        .payForWater(
          consumerAccount.assignedTariff,
          consumerAccount.assignedReservoir,
          new anchor.BN(amount)
        )
        .accounts({
          consumer: consumerKey,
          wtkMint: req.tokens!.WTK,
          agency: wallet.publicKey,
        })
        .signers([req.consumerKeypair!])
        .rpc();

      res.status(200).json({
        message: "Water paid successfully",
        consumer: consumerKey.toString(),
        amount: amount,
      });
    } catch (error) {
      console.error("Error paying for water:", error);
      res.status(500).json({ error: "Failed to pay for water" });
    }
  }
);

export { consumerRouter };
