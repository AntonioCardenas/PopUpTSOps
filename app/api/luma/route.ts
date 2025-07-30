import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const eventApiId = searchParams.get("event_api_id");
    const proxyKey = searchParams.get("proxy_key");

    if (!eventApiId || !proxyKey) {
      return NextResponse.json(
        { error: "Missing required parameters: event_api_id and proxy_key" },
        { status: 400 }
      );
    }

    // Validate event ID against environment if configured
    const configuredEventId = process.env.NEXT_PUBLIC_EVENT_ID;
    if (configuredEventId && configuredEventId !== eventApiId) {
      return NextResponse.json({ error: "Event ID mismatch" }, { status: 403 });
    }

    const apiKey = process.env.NEXT_PUBLIC_LUMAAPIKEY;

    if (!apiKey) {
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

    const response = await fetch(url, options);

    if (!response.ok) {
      throw new Error(
        `Luma API error: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();
    console.log("API: Lu.ma API response data:", data);

    // Return the guest data directly
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching Luma data:", error);
    return NextResponse.json(
      { error: "Failed to fetch Luma data" },
      { status: 500 }
    );
  }
}
