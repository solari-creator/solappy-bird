import { Keypair } from '@solana/web3.js'

// .env'den aldığın key array'i buraya kopyala
const secretArray = 
[238,211,226,149,153,93,75,157,128,96,148,207,79,33,156,93,221,63,110,244,254,58,148,57,88,83,48,158,238,62,117,16,15,130,125,110,61,198,118,178,39,248,35,248,50,138,21,218,89,54,104,41,191,62,3,30,239,30,146,226,29,100,232,110]

const POT_KEYPAIR = Keypair.fromSecretKey(Uint8Array.from(secretArray))

console.log("✅ Public Key:", POT_KEYPAIR.publicKey.toBase58())
