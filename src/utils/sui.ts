import { Ed25519Keypair } from "@mysten/sui.js/keypairs/ed25519";
import { decodeSuiPrivateKey } from "@mysten/sui.js/cryptography";

export const generateWallet = (secretKey?: string) => {
  // generate wallet
  const keypair = (() => {
    if (secretKey)
      return Ed25519Keypair.fromSecretKey(
        decodeSuiPrivateKey(secretKey).secretKey
      );
    return new Ed25519Keypair();
  })();
  //   const keypair = new Ed25519Keypair();
  // const bytes = keypair.getPublicKey().toBase64();

  // const publicKey = new Ed25519PublicKey(bytes);

  //   const address = publicKey.toSuiAddress();
  const address = keypair.toSuiAddress();
  const privateKey = keypair.getSecretKey();
  //    keypair.getSecretKey
  // const privateKey = decodeSuiPrivateKey(keypair.getSecretKey()).;

  return {
    address,
    privateKey,
  };
};
