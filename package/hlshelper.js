import Hls from "hls.js";
import axios from "axios";
// import URL from 'shared/functions/getIPFSBackendURL';
// import OrbitDBClass from 'shared/functions/orbitdb/OrbitDBClass';
import { queryContract } from "./secretContract.js";

import { wbDecrypt, s2a } from "./aes_lib/index.js";
const isUsingContract = true; //hardocded for showcase only process.env.HLS_METHOD_CONTRACT === 'true';

export const getPlayerKey = (socialLogin = false) => {
  let privateKey, publicKey;
  const savedPlayerPrivateKey = localStorage.getItem(
    socialLogin ? "wallet_private_key" : "player_private_key"
  );
  const savedPlayerPublicKey = localStorage.getItem(
    socialLogin ? "wallet_public_key" : "player_public_key"
  );
  const savedPublicKeySignature = localStorage.getItem(
    "player_public_key_signature_v2"
  );
  //console.log( { savedPlayerPrivateKey, savedPlayerPublicKey});
  if (
    savedPlayerPrivateKey &&
    savedPlayerPublicKey &&
    savedPublicKeySignature
  ) {
    privateKey = Buffer.from(savedPlayerPrivateKey, "hex");
    publicKey = Buffer.from(savedPlayerPublicKey, "hex");
    return { privateKey, publicKey, signatureStr: savedPublicKeySignature };
  }

  return false;
};

let db, mediaId;
let previousKeyFile = "",
  keyFileID = 1;

const getDB = async () => {
  await OrbitDBClass.setOrbitDB();
  db = OrbitDBClass.db;
};

// getDB();

function processPlayList(playlist, playListCID) {
  if (isUsingContract) {
    return playlist;
  }
  const publicKeyStr = localStorage.getItem("player_public_key");
  const pub_key_signature = localStorage.getItem(
    "player_public_key_signature_v2"
  );
  const userId = localStorage.getItem("userId");
  const pattern = new RegExp('URI="https://(.*?)/ipfs/(.*?)/', "ig");
  // const playListCID = localStorage.getItem('playlistCID');
  const newURL = `URI="${URL()}/ipfs/getKeyFile/${playListCID}/${userId}/${publicKeyStr}/${pub_key_signature}/`;
  playlist = playlist.replaceAll(pattern, newURL);
  return playlist;
}

const processFragment = (data) => {
  return data;
};

export class pLoader extends Hls.DefaultConfig.loader {
  constructor(config) {
    super(config);
    var load = this.load.bind(this);
    this.load = function (context, config, callbacks) {
      let { type, url } = context;
      keyFileID = 1;
      //console.log(`%c-----Player Consumption Log Information-----`, 'color : blue');
      // console.log("PlayList Loaded", url);
      mediaId = url.split("/").at(-2);
      // db.add({ playlist: url, mediaId, timeStamp: Math.floor(Date.now() / 1000) });
      if (type == "manifest") {
        var onSuccess = callbacks.onSuccess;
        callbacks.onSuccess = function (response, stats, context) {
          // console.log({responseData : response.data});
          response.data = processPlayList(response.data, mediaId);
          onSuccess(response, stats, context, null);
        };
      }
      load(context, config, callbacks);
    };
  }
}

export class fLoader extends Hls.DefaultConfig.loader {
  constructor(config) {
    super(config);
    var load = this.load.bind(this);
    this.load = async (context, config, callbacks) => {
      try {
        const player = getPlayerKey();
        if (!player) return;
        const chunkFileName = context.url.split("/").at(-1);
        const chunkDuration = context.frag.duration.toFixed(0);
        const chunkConsumptionInfo = `${keyFileID++}. Chunk ${chunkFileName} : Duration-${chunkDuration}s \n(${
          context.url
        })`;
        console.log(chunkConsumptionInfo);
        // db.add({consumedChunk: chunkFileName, chunkDuration, mediaId, timeStamp: Math.floor(Date.now() / 1000)})
        if (previousKeyFile != context.frag.levelkey._uri) {
          const body = {
            mediaId,
            chunkName: chunkFileName,
            duration: chunkDuration,
            timeStamp: Math.floor(Date.now() / 1000),
          };
          //const res = await axios.post(`${URL()}/ipfs/logPlayedSeconds`, body);

          previousKeyFile = context.frag.levelkey._uri;
          // console.log({ previousKeyFile });
          const temp = previousKeyFile.split("/");
          const keyFileName = previousKeyFile.split("/").pop();
          const keyConsumptionLog = `Key File ${
            temp[temp.length - 1]
          } \n${previousKeyFile}`;
          console.log(keyConsumptionLog);
          // db.add({ consumedKeyFile: keyFileName, mediaId, timeStamp: Math.floor(Date.now() / 1000)});
          // decrypt here
          let keyData = context.frag.levelkey.key;
          // console.log({ keyData });
          let decryptedArray;
          if (isUsingContract) {
            // When smart contract
            const playerPublicKeyStr = player.publicKey.toString("hex");
            const keyDataStr = Buffer.from(keyData, "hex").toString("hex");
            const encrypted = await queryContract(
              playerPublicKeyStr,
              keyDataStr
            );
            console.log("Decrypting key with Smart Contract", keyDataStr);
            const { decrypted } = await wbDecrypt(encrypted, player.privateKey);
            decryptedArray = Buffer.from(decrypted, "hex");
          } else {
            // When Firebase
            const keyDataStr = Buffer.from(keyData, "hex").toString("hex");
            // console.log({keyDataStr});
            const playerPrivateKeyStr = player.privateKey.toString("hex");
            // console.log({playerPrivateKeyStr});
            const { decrypted } = await wbDecrypt(
              keyDataStr,
              playerPrivateKeyStr
            );
            // console.log({decrypted});
            decryptedArray = s2a(decrypted);
          }
          const newKeyData = [...decryptedArray];
          context.frag.levelkey.key.set(newKeyData, 0);
        }
      } catch (err) {
        console.error("Hls Player", err);
      }

      // if (context.type == 'manifest') {
      var onSuccess = callbacks.onSuccess;
      callbacks.onSuccess = function (response, stats, context) {
        // response.data = processFragment(response.data);
        // console.log("response.data", response.data);
        onSuccess(response, stats, context, null);
      };
      load(context, config, callbacks);
      // };
    };
  }
}
