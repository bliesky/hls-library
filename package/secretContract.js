import {
  EnigmaUtils,
  Secp256k1Pen,
  SigningCosmWasmClient,
  pubkeyToAddress,
  encodeSecp256k1Pubkey,
} from "secretjs";

// Load environment variables
// require('dotenv').config();

const ethUserAddress = "c6b9C1BedaC1C5127d751E1a410CAEc0e856Dfb5";
const customFees = {
  upload: {
    amount: [{ amount: "2000000", denom: "uscrt" }],
    gas: "2000000",
  },
  init: {
    amount: [{ amount: "500000", denom: "uscrt" }],
    gas: "500000",
  },
  exec: {
    amount: [{ amount: "5000000", denom: "uscrt" }],
    gas: "5000000",
  },
  send: {
    amount: [{ amount: "80000", denom: "uscrt" }],
    gas: "80000",
  },
};

let client;

const generateClient = async () => {
  const httpUrl = "https://http-proxy-bykf6.ondigitalocean.app/rest";

  // Use key created in tutorial #2
  const mnemonic =
    "legal grant process meadow cat vapor jacket moment cinnamon wine cat hunt leisure want island home share can poem float joke sun measure odor";

  // A pen is the most basic tool you can think of for signing.
  // This wraps a single keypair and allows for signing.
  const signingPen = await Secp256k1Pen.fromMnemonic(mnemonic);

  // Get the public key
  const pubkey = encodeSecp256k1Pubkey(signingPen.pubkey);

  // get the wallet address
  const accAddress = pubkeyToAddress(pubkey, "secret");

  const txEncryptionSeed = EnigmaUtils.GenerateNewSeed();
  client = new SigningCosmWasmClient(
    httpUrl,
    accAddress,
    (signBytes) => signingPen.sign(signBytes),
    txEncryptionSeed,
    customFees
  );
};

generateClient();

export const queryContract = async (publicKey, data) => {
  const contractAddress = "secret1txc40c6gzplhr42xvqm05mvlee3nguhnn0u9pq";
  // Reencrypt the message using server private key and client public key

  const response = await client.queryContractSmart(contractAddress, {
    Encrypt: {
      address: ethUserAddress, // ethereum address of the user, must be subscribed before
      key_id: "SERVER_KEY_ID", // server key id, static
      user_public_key: publicKey, // user public key, used for reencryption
      data: data, // encrypted message, by the server public key before
    },
  });
  const resp = response.messages.split(" ")[1];
  return resp;
};
