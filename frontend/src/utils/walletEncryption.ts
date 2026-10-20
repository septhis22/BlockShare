import axios from "axios";
import { BrowserProvider, SigningKey, sha256, toUtf8Bytes } from "ethers";

const API_BASE = "http://localhost:5000/api/auth";
const identityCache = new Map<string, WalletEncryptionIdentity>();
const pendingDerivations = new Map<string, Promise<WalletEncryptionIdentity>>();
let cacheGeneration = 0;

export interface WalletEncryptionIdentity {
  address: string;
  privateKey: string;
  publicKey: string;
}

export function clearWalletEncryptionIdentityCache(): void {
  cacheGeneration += 1;
  identityCache.clear();
  pendingDerivations.clear();
}

export async function deriveWalletEncryptionIdentity(
  token: string,
  expectedAddress?: string
): Promise<WalletEncryptionIdentity> {
  if (!window.ethereum) {
    throw new Error("MetaMask is required to unlock your file-encryption key.");
  }

  const normalizedAddress = expectedAddress?.toLowerCase() ?? "";
  const cacheKey = sha256(toUtf8Bytes(`${token}\n${normalizedAddress}`));
  const cachedIdentity = identityCache.get(cacheKey);
  if (cachedIdentity) return cachedIdentity;

  const pendingDerivation = pendingDerivations.get(cacheKey);
  if (pendingDerivation) return pendingDerivation;

  const generation = cacheGeneration;
  const derivation = deriveIdentityFromWallet(token, expectedAddress);
  pendingDerivations.set(cacheKey, derivation);

  try {
    const identity = await derivation;
    if (generation === cacheGeneration) {
      identityCache.set(cacheKey, identity);
    }
    return identity;
  } finally {
    if (pendingDerivations.get(cacheKey) === derivation) {
      pendingDerivations.delete(cacheKey);
    }
  }
}

async function deriveIdentityFromWallet(
  token: string,
  expectedAddress?: string
): Promise<WalletEncryptionIdentity> {
  const provider = new BrowserProvider(window.ethereum!);
  const signer = await provider.getSigner();
  const address = await signer.getAddress();

  if (expectedAddress && address.toLowerCase() !== expectedAddress.toLowerCase()) {
    throw new Error("The connected MetaMask account changed. Connect the wallet linked to this account.");
  }

  const phraseResponse = await axios.get(`${API_BASE}/key-phrase`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const phrase = phraseResponse.data?.data?.key_phrase;
  if (typeof phrase !== "string" || phrase.length === 0) {
    throw new Error("The server did not return an encryption key phrase.");
  }

  const message = [
    "BlockShare encryption key v1",
    `Wallet: ${address.toLowerCase()}`,
    `Secret phrase: ${phrase}`
  ].join("\n");
  const signature = await signer.signMessage(message);
  const privateKey = sha256(signature);

  // Reject the negligible chance that the SHA-256 digest is not a valid secp256k1 scalar.
  const publicKey = new SigningKey(privateKey).publicKey.slice(4).toLowerCase();
  if (!/^[0-9a-f]{128}$/i.test(publicKey)) {
    throw new Error("Could not derive a valid encryption public key.");
  }

  await axios.post(
    `${API_BASE}/encryption-key`,
    { public_key: publicKey, wallet_address: address },
    { headers: { Authorization: `Bearer ${token}` } }
  );

  return { address, privateKey, publicKey };
}
