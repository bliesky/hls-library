import Aes from './wbaes-decrypt.js';
import aes_encrypt from './wbaes-encrypt.js';

import ecies from 'ecies-parity';
const options = {
  counter: '1826e4111826e4111826e4111826e411',
  encoding: 'str'
};

export const wbDecrypt = async (encrypted, privateKey) => {
  try {
    const encryptedBuffer = Buffer.from(encrypted, 'hex');
    const privateKeyBuffer = Buffer.from(privateKey, 'hex');
    let ttt = await ecies.decrypt(privateKeyBuffer, encryptedBuffer);
    let aes_plain_re = Aes.decrypt(ttt.toString('utf8'), options);
    return {
      decrypted: aes_plain_re
    };
  } catch (err) {
    console.error(err);
  }
};

export const wbEncrypt = async (aes_plain, publicKey) => {
  try {
    const aes_plain_text = Buffer.from(aes_plain, 'hex').toString('hex');
    var cipher_txt = aes_encrypt.encrypt(aes_plain_text, options);
    let encrypted = await ecies.encrypt(publicKey, Buffer.from(cipher_txt));
    return encrypted;
  } catch (err) {
    console.error(err);
  }
};

export const s2a = Aes.s2a;
