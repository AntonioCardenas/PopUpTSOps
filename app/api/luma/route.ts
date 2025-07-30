import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const eventApiId = searchParams.get("event_api_id");
    const proxyKey = searchParams.get("proxy_key");

    console.log("API Route - Received params:", { eventApiId, proxyKey });

    if (!eventApiId || !proxyKey) {
      console.log("API Route - Missing parameters");
      return NextResponse.json(
        { error: "Missing required parameters: event_api_id and proxy_key" },
        { status: 400 }
      );
    }

    // Validate event ID against environment if configured
    const configuredEventId = process.env.NEXT_PUBLIC_EVENT_ID;
    if (configuredEventId && configuredEventId !== eventApiId) {
      console.log("API Route - Event ID mismatch:", {
        configuredEventId,
        eventApiId,
      });
      return NextResponse.json({ error: "Event ID mismatch" }, { status: 403 });
    }

    const apiKey = process.env.NEXT_PUBLIC_LUMAAPIKEY;

    if (!apiKey) {
      console.log("API Route - No API key configured");
      return NextResponse.json(
        { error: "Lu.ma API key not configured" },
        { status: 500 }
      );
    }

    const options = {
      method: "GET",
      headers: {
        accept: "application/json",
        "x-luma-api-key": apiKey,
      },
    };

    const url = `https://public-api.luma.com/v1/event/get-guest?event_api_id=${eventApiId}&proxy_key=${proxyKey}`;
    console.log("API Route - Making request to:", url);

    const response = await fetch(url, options);

    console.log("API Route - Lu.ma response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.log("API Route - Lu.ma API error:", errorText);
      throw new Error(
        `Luma API error: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();
    console.log(
      "API Route - Lu.ma response data received:",
      !!data,
      !!data.guest
    );

    // Return the guest data directly
    return NextResponse.json(data);
  } catch (error) {
    console.error("API Route - Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch Luma data" },
      { status: 500 }
    );
  }
}
