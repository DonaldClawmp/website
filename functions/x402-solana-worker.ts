import { ed25519 } from '@noble/curves/ed25519'
import bs58 from 'bs58'

const TOKEN_PROGRAM_ID = bs58.decode('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')
const ATA_PROGRAM_ID = bs58.decode('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL')
const SOLANA_RPC = 'https://api.mainnet-beta.solana.com'

function concat(arrays: Uint8Array[]): Uint8Array {
  const total = arrays.reduce((sum, a) => sum + a.length, 0)
  const result = new Uint8Array(total)
  let offset = 0
  for (const a of arrays) {
    result.set(a, offset)
    offset += a.length
  }
  return result
}

function encodeCompactU16(value: number): Uint8Array {
  if (value < 0x80) return new Uint8Array([value])
  if (value < 0x4000) return new Uint8Array([(value & 0x7f) | 0x80, value >> 7])
  return new Uint8Array([(value & 0x7f) | 0x80, ((value >> 7) & 0x7f) | 0x80, value >> 14])
}

function encodeU64LE(value: bigint): Uint8Array {
  const buf = new Uint8Array(8)
  let v = value
  for (let i = 0; i < 8; i++) {
    buf[i] = Number(v & 0xffn)
    v >>= 8n
  }
  return buf
}

function toBase64(arr: Uint8Array): string {
  let bin = ''
  for (let i = 0; i < arr.length; i++) bin += String.fromCharCode(arr[i])
  return btoa(bin)
}

async function sha256(data: Uint8Array): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest('SHA-256', data))
}

function isOnCurve(point: Uint8Array): boolean {
  try {
    ed25519.ExtendedPoint.fromHex(point)
    return true
  } catch {
    return false
  }
}

async function findProgramAddress(seeds: Uint8Array[], programId: Uint8Array): Promise<Uint8Array> {
  const pda = new TextEncoder().encode('ProgramDerivedAddress')
  for (let nonce = 255; nonce >= 0; nonce--) {
    const hash = await sha256(concat([...seeds, new Uint8Array([nonce]), programId, pda]))
    if (!isOnCurve(hash)) return hash
  }
  throw new Error('Could not find PDA')
}

async function getATA(owner: Uint8Array, mint: Uint8Array): Promise<Uint8Array> {
  return findProgramAddress([owner, TOKEN_PROGRAM_ID, mint], ATA_PROGRAM_ID)
}

async function getRecentBlockhash(): Promise<string> {
  const res = await fetch(SOLANA_RPC, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'getLatestBlockhash',
      params: [{ commitment: 'confirmed' }]
    }),
  })
  const data: any = await res.json()
  return data.result.value.blockhash
}

async function buildX402Payment(
  privateKeyBase58: string,
  payTo: string,
  amount: string,
  asset: string
): Promise<string> {
  const fullKey = bs58.decode(privateKeyBase58)
  const seed = fullKey.slice(0, 32)
  const pubkey = fullKey.length === 64 ? fullKey.slice(32) : ed25519.getPublicKey(seed)
  const recipientPubkey = bs58.decode(payTo)
  const mintPubkey = bs58.decode(asset)
  const senderATA = await getATA(pubkey, mintPubkey)
  const recipientATA = await getATA(recipientPubkey, mintPubkey)
  const blockhashBytes = bs58.decode(await getRecentBlockhash())
  const transferData = concat([new Uint8Array([3]), encodeU64LE(BigInt(amount))])
  const message = concat([
    new Uint8Array([1, 0, 1]),
    encodeCompactU16(4),
    concat([pubkey, senderATA, recipientATA, TOKEN_PROGRAM_ID]),
    blockhashBytes,
    encodeCompactU16(1),
    new Uint8Array([3]),
    encodeCompactU16(3),
    new Uint8Array([1, 2, 0]),
    encodeCompactU16(transferData.length),
    transferData,
  ])
  const signature = ed25519.sign(message, seed)
  const tx = concat([encodeCompactU16(1), signature, message])
  return btoa(JSON.stringify({
    x402Version: 2,
    payload: { transaction: toBase64(tx) }
  }))
}

export async function x402Fetch(
  url: string,
  options: RequestInit,
  privateKeyBase58: string
): Promise<Response> {
  const firstResponse = await fetch(url, options)
  if (firstResponse.status !== 402) return firstResponse
  
  const requirements: any = await firstResponse.json()
  const accept = requirements.accepts?.[0]
  if (!accept) throw new Error('No accepts in 402 response')
  
  const xPayment = await buildX402Payment(privateKeyBase58, accept.payTo, accept.amount, accept.asset)
  const headers = new Headers(options.headers)
  headers.set('X-PAYMENT', xPayment)
  
  return fetch(url, { ...options, headers })
}
