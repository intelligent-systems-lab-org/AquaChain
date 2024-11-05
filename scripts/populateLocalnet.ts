import * as anchor from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { createMint } from "@solana/spl-token";

async function main() {
  const provider = anchor.AnchorProvider.local();
  anchor.setProvider(provider);
  const connection = provider.connection;
  const wallet = provider.wallet as anchor.Wallet;

  console.log("Using wallet:", wallet.publicKey.toString());

  // Create mint accounts for each token
  async function createNewMint(decimals: number): Promise<PublicKey> {
    const mint = await createMint(
      connection,
      wallet.payer,
      wallet.publicKey, // Mint authority
      null, // Freeze authority (optional)
      decimals // Number of decimal places
    );
    console.log(`Created new mint: ${mint.toString()}`);
    return mint;
  }

  const waterTokenMint = await createNewMint(9);
  const waterCapacityTokenMint = await createNewMint(9);
  const wasteTokenMint = await createNewMint(9);

  console.log("WaterToken Mint Address:", waterTokenMint.toString());
  console.log(
    "WaterCapacityToken Mint Address:",
    waterCapacityTokenMint.toString()
  );
  console.log("WasteToken Mint Address:", wasteTokenMint.toString());

  // Here, you can save these mint addresses to a file or database if you want to use them in Express.js
}

main()
  .then(() => console.log("Script completed"))
  .catch(console.error);
