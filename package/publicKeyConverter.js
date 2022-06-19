import bigInt from "big-integer";

function pad_with_zeroes(number, length) {
  var retval = "" + number;
  while (retval.length < length) {
    retval = "0" + retval;
  }
  return retval;
}

// Consts for secp256k1 curve. Adjust accordingly
// https://en.bitcoin.it/wiki/Secp256k1
const prime = new bigInt(
    "fffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2f",
    16
  ),
  pIdent = prime.add(1).divide(4);

/**
 * Point decompress secp256k1 curve
 * @param {string} Compressed representation in hex string
 * @return {string} Uncompressed representation in hex string
 */
export const getDeCompressedPublicKey = (comp) => {
  var signY = new Number(comp[1]) - 2;
  var x = new bigInt(comp.substring(2), 16);
  // y mod p = +-(x^3 + 7)^((p+1)/4) mod p
  var y = x.modPow(3, prime).add(7).mod(prime).modPow(pIdent, prime);
  // If the parity doesn't match it's the *other* root
  if (y.mod(2).toJSNumber() !== signY) {
    // y = prime - y
    y = prime.subtract(y);
  }
  return (
    "04" +
    pad_with_zeroes(x.toString(16), 64) +
    pad_with_zeroes(y.toString(16), 64)
  );
};
export const getCompressedPublicKey = (publicKey) => {
  const ECPointCompress = (x, y) => {
    //console.log( x.length, y.length );
    const out = new Uint8Array(x.length + 1);

    out[0] = 2 + (y[y.length - 1] & 1);
    //console.log( { out });
    out.set(x, 1);

    return Buffer.from(out);
  };
  const array = new Uint8Array(publicKey);
  //console.log({ array });
  //console.log({ x: array.slice(1, 33), y: array.slice(33, 65)});
  const result = ECPointCompress(array.slice(1, 33), array.slice(33, 65));
  //console.log({ result });
  return result;
};
