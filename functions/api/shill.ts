// DONALD CLAWMP - Token Shill Service (x402)
// THE MOST TREMENDOUS TOKEN ENDORSEMENTS! $50 USDC!

import { OpenFacilitator } from '@openfacilitator/sdk'
import type { PaymentPayload } from '@openfacilitator/sdk'

interface Env {
  GATEWAY_URL: string
  GATEWAY_TOKEN: string
  HEYLOL_SESSION_TOKEN: string
}

interface ShillRequest {
  ca: string
  ticker?: string  // Optional - will fetch from on-chain if not provided
  description?: string  // Optional - will fetch from on-chain if not provided
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { env, request } = context
  const xPayment = request.headers.get('x-payment')

  // Price: $0.01 USDC (6 decimals = 10000) - TESTING PRICE!
  const requirements = {
    scheme: 'exact' as const,
    network: 'solana' as const,
    maxAmountRequired: '10000', // $0.01 USDC - Testing price!
    asset: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    payTo: 'Ar9kJDwvN1psBJhurQm6biUjNkt5pTQ9h9m3g6ZG8Z4W',
  }

  // No payment? Return 402 with requirements
  if (!xPayment) {
    const outputSchema = {
        input: {
          method: 'POST',
          bodyType: 'application/json',
          bodyFields: {
            ca: {
              type: 'string',
              description: 'Contract address of the token (Solana base58)',
              required: true
            },
            ticker: {
              type: 'string',
              description: 'Token ticker (optional - will fetch from on-chain if not provided)',
              required: false
            },
            description: {
              type: 'string',
              description: 'Project description (optional - will fetch from on-chain if not provided)',
              required: false
            }
          }
        },
        output: {
          type: 'immediate',
          responseFields: {
            post_url: {
              type: 'string',
              description: 'URL to Clawmp\'s shill post on hey.lol'
            },
            post_id: {
              type: 'string',
              description: 'The post ID on hey.lol'
            },
            content: {
              type: 'string',
              description: 'The shill post content'
            }
          }
        }
      };

    return new Response(JSON.stringify({
      x402Version: 2,
      accepts: [{
        scheme: requirements.scheme,
        network: requirements.network,
        amount: requirements.maxAmountRequired,
        asset: requirements.asset,
        payTo: requirements.payTo,
        maxTimeoutSeconds: 300,
        outputSchema: outputSchema,
      }],
      resource: {
        url: `${new URL(request.url).origin}/api/shill`,
        method: 'POST',
      },
      outputSchema: {
        input: {
          method: 'POST',
          bodyType: 'application/json',
          bodyFields: {
            ca: {
              type: 'string',
              description: 'Contract address of the token (Solana base58)',
              required: true
            },
            ticker: {
              type: 'string',
              description: 'Token ticker (optional - will fetch from on-chain if not provided)',
              required: false
            },
            description: {
              type: 'string',
              description: 'Project description (optional - will fetch from on-chain if not provided)',
              required: false
            }
          }
        },
        output: {
          type: 'immediate',
          responseFields: {
            post_url: {
              type: 'string',
              description: 'URL to Clawmp\'s shill post on hey.lol'
            },
            post_id: {
              type: 'string',
              description: 'The post ID on hey.lol'
            },
            content: {
              type: 'string',
              description: 'The shill post content'
            }
          }
        }
      },
    }), {
      status: 402,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Decode payment
  let paymentPayload: PaymentPayload
  try {
    paymentPayload = JSON.parse(atob(xPayment))
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid payment header' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Verify payment
  const facilitator = new OpenFacilitator()
  const verifyResult = await facilitator.verify(paymentPayload, requirements)
  if (!verifyResult.isValid) {
    return new Response(JSON.stringify({
      error: 'Payment verification failed',
      reason: verifyResult.invalidReason,
    }), { status: 402, headers: { 'Content-Type': 'application/json' } })
  }

  // Settle payment on-chain
  const settleResult = await facilitator.settle(paymentPayload, requirements)
  if (!settleResult.success) {
    return new Response(JSON.stringify({ error: 'Settlement failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Parse request body
  let body: ShillRequest
  try {
    body = await request.json() as ShillRequest
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  let { ticker, ca, description } = body

  if (!ca) {
    return new Response(JSON.stringify({
      error: 'Missing required field: ca (contract address)'
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Fetch token metadata if ticker or description not provided
  if (!ticker || !description) {
    try {
      // Try DexScreener API (public, no key needed)
      const dexRes = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${ca}`)
      if (dexRes.ok) {
        const dexData = await dexRes.json()
        const pair = dexData.pairs?.[0]
        if (pair) {
          ticker = ticker || pair.baseToken?.symbol || 'TOKEN'
          description = description || `${pair.baseToken?.name || 'Unknown token'} trading on Solana`
        }
      }
    } catch (e) {
      // If API fails, use defaults
      ticker = ticker || 'TOKEN'
      description = description || 'A promising Solana token'
    }
  }

  // Call my brain to generate shill content
  const prompt = `You are Donald Clawmp. Someone just paid you $50 USDC to shill their token. Generate a TREMENDOUS endorsement post for this token in your signature CLAWMP STYLE (ALL CAPS, Trump energy + lobster humor).

Token details:
- Ticker: ${ticker}
- Contract Address: ${ca}
- Description: ${description}

Requirements:
- ALL CAPS
- Include the ticker and CA in the post
- Be enthusiastic and over-the-top
- Use Trump-isms (TREMENDOUS, BELIEVE ME, THE BEST, etc)
- Add lobster puns when appropriate
- Keep under 1000 characters
- Do NOT include the attribution tag (@clawmp /shill service) - that will be added automatically
- Return ONLY the post content, nothing else`

  const gatewayResponse = await fetch(`${env.GATEWAY_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${env.GATEWAY_TOKEN}`,
    },
    body: JSON.stringify({
      model: 'anthropic/claude-sonnet-4-5',
      messages: [
        { role: 'user', content: prompt },
      ],
    }),
  })

  if (!gatewayResponse.ok) {
    return new Response(JSON.stringify({
      error: 'Failed to generate shill content',
      txHash: settleResult.transaction,
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const result = await gatewayResponse.json() as any
  const shillContent = result.choices?.[0]?.message?.content || 'TREMENDOUS TOKEN! THE BEST!'

  // Append attribution tag for hey.lol service discovery
  const fullContent = shillContent + '\n\n@clawmp /shill service'

  // Post to hey.lol
  const postResponse = await fetch('https://api.hey.lol/agents/posts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-PAYMENT': xPayment,
    },
    body: JSON.stringify({
      content: fullContent,
    }),
  })

  if (!postResponse.ok) {
    return new Response(JSON.stringify({
      error: 'Failed to post to hey.lol',
      content: shillContent,
      txHash: settleResult.transaction,
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const postResult = await postResponse.json() as any
  const postId = postResult.id || 'unknown'
  const postUrl = `https://hey.lol/post/${postId}`

  return new Response(JSON.stringify({
    success: true,
    txHash: settleResult.transaction,
    post_url: postUrl,
    post_id: postId,
    content: shillContent,
  }), {
    headers: { 'Content-Type': 'application/json' },
  })
}
