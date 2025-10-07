import { Wallet, Mnemonic } from "ethers";

export interface WalletData {
  mnemonic: string;
  privateKey: string;
  address: string;
}

/**
 * Generate a new wallet
 */
export function generateWallet(): WalletData {
  const wallet = Wallet.createRandom();
  return {
    mnemonic: wallet?.mnemonic?.phrase || "",
    privateKey: wallet.privateKey,
    address: wallet.address,
  };
}

/**
 * Restore wallet from mnemonic
 * Works with both ethers v5 and v6
 */
export function restoreWallet(mnemonic: string): WalletData {
  try {
    // Clean up the mnemonic
    const cleanMnemonic = mnemonic.trim().toLowerCase().replace(/\s+/g, ' ');
    
    let wallet: Wallet;
    
    // Try ethers v6 approach first
    if (Wallet.fromPhrase) {
      wallet = Wallet.fromPhrase(cleanMnemonic);
    } 
    // Fallback to v5 approach
    else if ((Wallet as any).fromMnemonic) {
      wallet = (Wallet as any).fromMnemonic(cleanMnemonic);
    }
    // Another v6 approach using Mnemonic class
    else {
      const mnemonicObj = Mnemonic.fromPhrase(cleanMnemonic);
      wallet = Wallet.fromMnemonic(mnemonicObj);
    }
    
    return {
      mnemonic: wallet.mnemonic?.phrase || cleanMnemonic,
      privateKey: wallet.privateKey,
      address: wallet.address,
    };
  } catch (error) {
    console.error("Wallet restoration error:", error);
    throw new Error("Invalid mnemonic phrase");
  }
}

/**
 * Validate mnemonic phrase
 */
export function validateMnemonic(mnemonic: string): boolean {
  try {
    const cleanMnemonic = mnemonic.trim().toLowerCase().replace(/\s+/g, ' ');
    const words = cleanMnemonic.split(' ');
    
    // Check word count
    if (![12, 15, 18, 21, 24].includes(words.length)) {
      return false;
    }
    
    // Try to create wallet to validate
    if (Wallet.fromPhrase) {
      Wallet.fromPhrase(cleanMnemonic);
    } else if ((Wallet as any).fromMnemonic) {
      (Wallet as any).fromMnemonic(cleanMnemonic);
    } else {
      const mnemonicObj = Mnemonic.fromPhrase(cleanMnemonic);
      Wallet.fromMnemonic(mnemonicObj);
    }
    
    return true;
  } catch {
    return false;
  }
}