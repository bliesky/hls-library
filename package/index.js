import crypto from "crypto";
import ecies from "ecies-parity";
import { getCompressedPublicKey } from "./publicKeyConverter.js";
import { fLoader, pLoader } from "./hlshelper.js";

const hlsMain = () => {
  console.log("hls main");
  // hlsOption("aaabbbccc", "aaa", "bbb");
};

const createMediaKey = async (prKey, plKey, address, web3) => {
  let privateKey, publicKey, privateKeyStr, publicKeyStr;
  privateKey = crypto.randomBytes(32);
  publicKey = getCompressedPublicKey(ecies.getPublic(privateKey));

  privateKeyStr = prKey?.length > 0 ? prKey : privateKey.toString("hex");
  publicKeyStr = plKey?.length > 0 ? plKey : publicKey.toString("hex");

  try {
    const signature = await signObjectWithMetamask(
      address,
      web3,
      "Myx",
      "Media Encryption Public Key",
      publicKeyStr
    );
    console.log({ signature });

    localStorage.setItem("player_private_key", privateKeyStr);
    localStorage.setItem("player_public_key", publicKeyStr);
    localStorage.setItem("player_public_key_signature_v2", signature);

    return true;
  } catch (err) {
    console.error(err);
    return false;
  }
};

async function signObjectWithMetamask(
  address,
  web3,
  domain,
  fieldName,
  message
) {
  const msgParams = JSON.stringify({
    types: {
      EIP712Domain: [
        { name: "name", type: "string" },
        { name: "version", type: "string" },
      ],
      Mail: [
        { name: "Address", type: "address" },
        { name: fieldName, type: "string" },
      ],
    },
    primaryType: "Mail",
    domain: {
      name: domain,
      version: "1.0.0-beta",
    },
    message: {
      [fieldName]: message,
      Address: address,
    },
  });

  let params = [address, msgParams];
  let method = "eth_signTypedData_v3";
  const provider = web3.currentProvider;

  return new Promise((resolve, reject) => {
    provider.sendAsync(
      {
        method,
        params,
        from: address,
      },
      function (err, result) {
        if (err) reject("error occurred");
        if (result.error) reject("error occurred");
        resolve(result.result);
      }
    );
  });
}

const hlsPlayerOptions = {
  file: {
    forceAudio: true,
    forceHLS: true,
    hlsOptions: { fLoader, pLoader },
    attributes: { controlsList: "nodownload" },
  },
};
const playerConfiguration = isHLSMedia ? hlsPlayerOptions : {};

const hlsOption = (url, prefix, serviceUrl) => {
  // const isHLSMedia = url.indexOf("ipfs.myx.audio") !== -1; //only for encrypted hls media from Myx IPFS
  const isHLSMedia = url.indexOf(prefix) !== -1; //only for encrypted hls media from Myx IPFS
  const hlsPlayerOptions = {
    file: {
      forceAudio: true,
      forceHLS: true,
      hlsOptions: { fLoader, pLoader },
      attributes: { controlsList: "nodownload" },
    },
  };
  return isHLSMedia ? hlsPlayerOptions : {};
};

export default hlsMain;
