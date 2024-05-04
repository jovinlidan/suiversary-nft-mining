import { Ed25519Keypair } from "@mysten/sui.js/keypairs/ed25519";
import { decodeSuiPrivateKey } from "@mysten/sui.js/cryptography";

const uint8ArrayToHex = (arr: Uint8Array) => {
  return arr.reduce(
    (str, byte) => str + byte.toString(16).padStart(2, "0"),
    ""
  );
};

export const generateWallet = (secretKey?: string) => {
  // generate wallet
  const keypair = (() => {
    if (secretKey)
      return Ed25519Keypair.fromSecretKey(
        decodeSuiPrivateKey(secretKey).secretKey
      );
    return new Ed25519Keypair();
  })();
  const address = keypair.toSuiAddress();
  const privateKey = uint8ArrayToHex(
    decodeSuiPrivateKey(keypair.getSecretKey()).secretKey
  );

  return {
    address,
    privateKey,
  };
};
