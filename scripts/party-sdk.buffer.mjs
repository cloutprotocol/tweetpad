// Buffer for the browser bundle: @solana/web3.js and the SDK expect it as a global
import { Buffer } from 'buffer';
export { Buffer };
globalThis.Buffer = globalThis.Buffer || Buffer;
