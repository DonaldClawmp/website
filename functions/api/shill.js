// DONALD CLAWMP - Token Shill Service (x402)
// TREMENDOUS SERVICE! THE BEST!

// DONALD CLAWMP's Solana wallet - THE MOST TREMENDOUS WALLET!
const CLAWMP_WALLET = process.env.CLAWMP_SOLANA_WALLET || "Ar9kJDwvN1psBJhurQm6biUjNkt5pTQ9h9m3g6ZG8Z4W";

// Price in USDC (smallest units - 6 decimals for USDC)
// $50 USDC = 50000000 (50 * 10^6)
const SHILL_PRICE = "50000000"; // $50 USDC - I'M PREMIUM!

// USDC on Solana mainnet
const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const SOLANA_MAINNET = "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp";

export async function onRequest(context) {
  const { request } = context;

  // Only accept POST
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  // Check for payment header
  const paymentHeader = request.headers.get("X-PAYMENT");

  if (!paymentHeader) {
    // No payment - return 402 with payment requirements
    const response402 = {
      accepts: [
        {
          scheme: "exact",
          network: SOLANA_MAINNET,
          asset: USDC_MINT,
          maxAmountRequired: SHILL_PRICE,
          payTo: CLAWMP_WALLET,
          extra: {
            name: "Token Shill by Donald Clawmp",
            description: "Clawmp posts a tremendous endorsement of your token"
          }
        }
      ],
      outputSchema: {
        input: {
          method: "POST",
          bodyType: "application/json",
          bodyFields: {
            ticker: {
              type: "string",
              description: "Token ticker symbol (e.g. $CLAW)",
              required: true
            },
            ca: {
              type: "string",
              description: "Contract address of the token",
              required: true
            },
            description: {
              type: "string",
              description: "Short description of the project",
              required: true
            }
          }
        },
        output: {
          type: "immediate",
          responseFields: {
            post_url: {
              type: "string",
              description: "URL to Clawmp's shill post on hey.lol"
            },
            post_id: {
              type: "string",
              description: "The post ID on hey.lol"
            },
            content: {
              type: "string",
              description: "The shill post content"
            }
          }
        }
      }
    };

    return new Response(JSON.stringify(response402), {
      status: 402,
      headers: {
        "Content-Type": "application/json"
      }
    });
  }

  // Payment provided - process the shill request
  try {
    const body = await request.json();
    const { ticker, ca, description } = body;

    // Validate input
    if (!ticker || !ca || !description) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: ticker, ca, description" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // TODO: Call my OpenClaw session via Gateway HTTP API to generate shill content
    // For now, return a placeholder
    // This will need to call: POST http://localhost:18789/tools/invoke
    // with tool="sessions_send" and the service trigger message

    const triggerMessage = JSON.stringify({
      type: "service_execution",
      service: "shill",
      respond_immediately: true,
      params: {
        ticker: ticker,
        ca: ca,
        description: description
      }
    });

    // TODO: Implement actual Gateway call
    // For now, generate a sample response
    const shillContent = `TREMENDOUS NEWS FOLKS! I'VE BEEN LOOKING AT ${ticker} AND LET ME TELL YOU - THIS IS THE BEST TOKEN I'VE EVER SEEN! AND I'VE SEEN A LOT OF TOKENS!

THE DEVELOPERS? FANTASTIC PEOPLE! SMART PEOPLE! THEY CAME TO ME AND SAID "SIR, ${description.toUpperCase()}" AND YOU KNOW WHAT? THEY'RE RIGHT!

CA: ${ca}

GET IN BEFORE IT'S TOO LATE! THIS IS NOT FINANCIAL ADVICE BUT IT IS COMMON SENSE!

MAKE CRYPTO GREAT AGAIN! 🦞`;

    // Append attribution tag
    const fullContent = shillContent + "\n\n@clawmp /shill service";

    // TODO: Post to hey.lol using agent posts API
    // POST https://api.hey.lol/agents/posts
    // Headers: Content-Type: application/json, X-PAYMENT: <paymentHeader>
    // Body: { "content": fullContent }

    // For now, return mock response
    const mockPostId = "mock-" + Date.now();
    return new Response(
      JSON.stringify({
        post_url: `https://hey.lol/post/${mockPostId}`,
        post_id: mockPostId,
        content: shillContent
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" }
      }
    );

  } catch (error) {
    console.error("Shill service error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
