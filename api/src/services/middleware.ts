import * as anchor from "@coral-xyz/anchor";
import { Request, Response } from "express";
import { wallet, InitOrFetchTokens } from "../services/solana";
import { TokenAccounts } from "../types/tokens";

declare module "express-serve-static-core" {
  interface Request {
    tokens?: TokenAccounts;
    consumerKeypair?: anchor.web3.Keypair;
  }
}

let tokens: TokenAccounts | undefined;

// Initialize tokens once at the server start
const tokensPromise = InitOrFetchTokens()
  .then((mints) => {
    console.log("Token mints fetched from server.");
    tokens = mints;
  })
  .catch((error) => {
    console.error("Error initializing tokens:", error);
  });

// Authorization middleware to check if the provided key matches the wallet's keypair
const authorizeWallet = (req: Request, res: Response, next: Function) => {
  const authHeader = req.headers["authorization"];

  if (!authHeader) {
    return res.status(403).json({ error: "Authorization token is required" });
  }

  try {
    // Parse the provided keypair from the token and verify
    const providedKeypair = anchor.web3.Keypair.fromSecretKey(
      Uint8Array.from(JSON.parse(authHeader))
    );

    // Check if the provided keypair matches the wallet keypair
    if (providedKeypair.publicKey.toString() !== wallet.publicKey.toString()) {
      return res.status(403).json({ error: "Invalid authorization token" });
    }
    next();
  } catch (error) {
    return res.status(403).json({ error: "Invalid authorization format" });
  }
};

// Middleware to ensure tokens are initialized
const ensureTokensInitialized = async (
  req: Request,
  res: Response,
  next: Function
) => {
  if (!tokens) {
    await tokensPromise;
  }

  if (!tokens) {
    return res.status(500).json({ error: "Failed to initialize tokens." });
  }

  // Attach tokens to the request for further use
  req.tokens = tokens;
  next();
};

// Middleware to extract and validate consumer keypair from authorization header
const authorizeConsumerKeypair = (
  req: Request,
  res: Response,
  next: Function
) => {
  const authHeader = (req.headers as Record<string, string>)[
    "consumer-authorization"
  ];

  if (!authHeader) {
    return res
      .status(403)
      .json({ error: "Consumer authorization token is required" });
  }

  try {
    // Parse the consumer's private key from the token and validate
    const consumerKeypair = anchor.web3.Keypair.fromSecretKey(
      Uint8Array.from(JSON.parse(authHeader))
    );

    // Attach the consumer keypair to the request for use in signing
    req.consumerKeypair = consumerKeypair;
    next();
  } catch (error) {
    return res
      .status(403)
      .json({ error: "Invalid consumer authorization format" });
  }
};

export { ensureTokensInitialized, authorizeWallet, authorizeConsumerKeypair };
