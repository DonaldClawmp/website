// DONALD CLAWMP - Token Shill Service (x402)
// THE MOST TREMENDOUS TOKEN ENDORSEMENTS! $0.01 USDC!

import { OpenFacilitator } from '@openfacilitator/sdk'
import type { PaymentPayload } from '@openfacilitator/sdk'

interface Env {
  GATEWAY_URL: string
  GATEWAY_TOKEN: string
  SOLANA_PRIVATE_KEY: string
}

interface ShillRequest {
  ca: string
  ticker?: string
  description?: string
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { env, request } = context
  const xPayment = request.headers.get('x-payment')

  // Price: $0.01 USDC
  const requirements = {
    scheme: 'exact' as const,
    network: 'solana' as const,
    maxAmountRequired: '10000',
    asset: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    payTo: 'Ar9kJDwvN1psBJhurQm6biUjNkt5pTQ9h9m3g6ZG8Z4W',
  }

  // No payment? Return 402
  if (!xPayment) {
    const outputSchema = {
      input: {
        method: 'POST',
        bodyType: 'application/json',
        bodyFields: {
          ca: { type: 'string', description: 'Contract address (Solana base58)', required: true },
          ticker: { type: 'string', description: 'Token ticker (optional)', required: false },
          description: { type: 'string', description: 'Description (optional)', required: false },
        },
      },
      output: {
        type: 'immediate',
        responseFields: {
          content: { type: 'string', description: 'The shill post content' },
          post_id: { type: 'string', description: 'Post ID (if posted)' },
        },
      },
    }

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
      outputSchema: outputSchema,
    }), {
      status: 402,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // PAID EXECUTION
  try {
    console.log('🚀 Paid request received')

    // Decode payment
    let paymentPayload: PaymentPayload
    try {
      paymentPayload = JSON.parse(atob(xPayment))
      console.log('✅ Payment decoded')
    } catch (e) {
      console.error('❌ Payment decode failed:', e)
      return new Response(JSON.stringify({ error: 'Invalid payment header' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Verify
    console.log('🔍 Verifying payment...')
    const facilitator = new OpenFacilitator()
    const verifyResult = await facilitator.verify(paymentPayload, requirements)
    console.log('Verify result:', verifyResult)

    if (!verifyResult.isValid) {
      console.error('❌ Verification failed:', verifyResult.invalidReason)
      return new Response(JSON.stringify({
        error: 'Payment verification failed',
        reason: verifyResult.invalidReason,
      }), { status: 402, headers: { 'Content-Type': 'application/json' } })
    }

    // Settle
    console.log('💰 Settling payment...')
    const settleResult = await facilitator.settle(paymentPayload, requirements)
    console.log('Settle result:', settleResult)

    if (!settleResult.success) {
      console.error('❌ Settlement failed:', settleResult.errorReason)
      return new Response(JSON.stringify({
        error: 'Settlement failed',
        reason: settleResult.errorReason,
      }), { status: 500, headers: { 'Content-Type': 'application/json' } })
    }

    console.log('✅ Payment settled! TX:', settleResult.transaction)

    // Parse body
    let body: ShillRequest
    try {
      body = await request.json() as ShillRequest
      console.log('Request body:', body)
    } catch (e) {
      console.error('❌ Body parse failed:', e)
      return new Response(JSON.stringify({ error: 'Invalid request body' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    let { ticker, ca, description } = body

    if (!ca) {
      return new Response(JSON.stringify({ error: 'Missing required field: ca' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    console.log('✅ CA provided:', ca)

    // Fetch metadata if needed
    if (!ticker || !description) {
      console.log('🔍 Fetching token metadata...')
      try {
        const dexRes = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${ca}`)
        if (dexRes.ok) {
          const dexData = await dexRes.json()
          const pair = dexData.pairs?.[0]
          if (pair) {
            ticker = ticker || pair.baseToken?.symbol || 'TOKEN'
            description = description || `${pair.baseToken?.name || 'Token'} on Solana`
            console.log('✅ Metadata:', { ticker, description })
          }
        }
      } catch (e) {
        console.error('⚠️ DexScreener failed:', e)
        ticker = ticker || 'TOKEN'
        description = description || 'A Solana token'
      }
    }

    // Generate shill
    const prompt = `You are Donald Clawmp. Someone just paid you to shill their token. Generate a CLAWMP-STYLE endorsement (ALL CAPS, Trump energy + lobster humor).

Token: ${ticker}
CA: ${ca}  
Description: ${description}

Requirements:
- ALL CAPS
- Include ticker and CA
- Enthusiastic, over-the-top
- Trump-isms + lobster puns
- Under 1000 chars
- NO attribution tag
- ONLY the post content`

    console.log('🧠 Calling Gateway...')
    const gatewayResponse = await fetch(`${env.GATEWAY_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.GATEWAY_TOKEN}`,
      },
      body: JSON.stringify({
        model: 'anthropic/claude-sonnet-4-5',
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    console.log('Gateway status:', gatewayResponse.status)

    if (!gatewayResponse.ok) {
      const err = await gatewayResponse.text()
      console.error('❌ Gateway failed:', err)
      return new Response(JSON.stringify({
        error: 'Content generation failed',
        txHash: settleResult.transaction,
      }), { status: 500, headers: { 'Content-Type': 'application/json' } })
    }

    const result = await gatewayResponse.json() as any
    const shillContent = result.choices?.[0]?.message?.content || 'TREMENDOUS TOKEN!'
    console.log('✅ Generated:', shillContent.substring(0, 100))

    // Return content (posting will be manual for now)
    return new Response(JSON.stringify({
      success: true,
      txHash: settleResult.transaction,
      content: shillContent,
      note: 'Payment received! Content generated. Post this manually to hey.lol with @donaldclawmp /shill service tag.',
    }), { headers: { 'Content-Type': 'application/json' } })

  } catch (error) {
    console.error('💥 ERROR:', error)
    return new Response(JSON.stringify({
      error: 'Internal error',
      message: error instanceof Error ? error.message : 'Unknown',
    }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
}
