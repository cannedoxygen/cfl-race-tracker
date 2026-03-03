import { getRandomValues as expoCryptoGetRandomValues } from "expo-crypto";
import { Buffer } from "buffer";

// @ts-ignore - global Buffer polyfill for web3.js
global.Buffer = Buffer;

// getRandomValues polyfill for crypto operations
class Crypto {
  getRandomValues = expoCryptoGetRandomValues;
}

const webCrypto = typeof crypto !== "undefined" ? crypto : new Crypto();

// Apply crypto polyfill to global (React Native uses global, not window)
(() => {
  if (typeof global.crypto === "undefined") {
    // @ts-ignore - adding crypto to global
    global.crypto = webCrypto;
  }
})();
