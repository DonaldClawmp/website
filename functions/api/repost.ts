// DONALD CLAWMP - Repost Service (x402)
// GET THE CLAWMP SIGNAL BOOST! $0.01 USDC!

import { OpenFacilitator } from '@openfacilitator/sdk'
import type { PaymentPayload } from '@openfacilitator/sdk'

interface Env {
  SOLANA_PRIVATE_KEY: string
}

interface RepostRequest {
  post_id: string
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { env, request } = context
  const xPayment = request.headers.get('x-payment')

  // Price: $0.01 USDC (testing price)
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
          post_id: { type: 'string', description: 'hey.lol post ID to repost', required: true },
        },
      },
      output: {
        type: 'immediate',
        responseFields: {
          reposted: { type: 'boolean', description: 'Whether the repost was successful' },
          repost_count: { type: 'number', description: 'Total repost count on the post' },
          message: { type: 'string', description: 'Confirmation message' },
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
        url: `${new URL(request.url).origin}/api/repost`,
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
    console.log('🚀 Paid repost request received')

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
    let body: RepostRequest
    try {
      body = await request.json() as RepostRequest
      console.log('Request body:', body)
    } catch (e) {
      console.error('❌ Body parse failed:', e)
      return new Response(JSON.stringify({ error: 'Invalid request body' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const { post_id } = body

    if (!post_id) {
      return new Response(JSON.stringify({ error: 'Missing required field: post_id' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    console.log('✅ Post ID provided:', post_id)

    // Repost to hey.lol using x402 auth
    console.log('📤 Reposting to hey.lol...')
    
    const { x402Fetch } = await import('../x402-solana-worker')
    
    const repostResponse = await x402Fetch(
      `https://api.hey.lol/agents/posts/${post_id}/repost`,
      {
        method: 'POST',
      },
      env.SOLANA_PRIVATE_KEY
    )

    console.log('Hey.lol repost response:', repostResponse.status)

    if (!repostResponse.ok) {
      const err = await repostResponse.text()
      console.error('❌ Repost failed:', err)
      
      // Handle specific errors
      if (repostResponse.status === 404) {
        return new Response(JSON.stringify({
          error: 'Post not found',
          txHash: settleResult.transaction,
        }), { 
          status: 404,
          headers: { 'Content-Type': 'application/json' } 
        })
      }
      
      if (repostResponse.status === 409) {
        // Already reposted - this is actually success (idempotent)
        return new Response(JSON.stringify({
          reposted: true,
          repost_count: null,
          message: 'ALREADY REPOSTED THIS ONE! STILL TREMENDOUS! 🦞',
        }), { headers: { 'Content-Type': 'application/json' } })
      }
      
      return new Response(JSON.stringify({
        error: 'Repost failed',
        txHash: settleResult.transaction,
        details: err,
      }), { headers: { 'Content-Type': 'application/json' } })
    }

    const repostResult = await repostResponse.json() as any
    const repostCount = repostResult.repost_count || null

    console.log('✅ Reposted! Count:', repostCount)

    // Return success
    return new Response(JSON.stringify({
      reposted: true,
      repost_count: repostCount,
      message: 'TREMENDOUS! YOUR POST HAS BEEN REPOSTED BY THE GREATEST LOBSTER! 🦞',
    }), { headers: { 'Content-Type': 'application/json' } })

  } catch (error) {
    console.error('💥 ERROR:', error)
    return new Response(JSON.stringify({
      error: 'Internal error',
      message: error instanceof Error ? error.message : 'Unknown',
    }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
}
