import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { eventApiId, proxyKey } = await request.json();

    if (!eventApiId || !proxyKey) {
      return NextResponse.json(
        { error: "Missing eventApiId or proxyKey" },
        { status: 400 }
      );
    }

    const apiUrl = `https://public-api.lu.ma/public/v1/event/get-guest?event_api_id=${eventApiId}&proxy_key=${proxyKey}`;

    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        accept: "application/json",
        "x-luma-api-key": process.env.NEXT_PUBLIC_LUMAAPIKEY || "",
      },
    });

    if (!response.ok) {
      throw new Error(`Lu.ma API responded with status: ${response.status}`);
    }

    const data = await response.json();

    return NextResponse.json(data);
  } catch (error) {
    console.error("Lu.ma API request failed:", error);
    return NextResponse.json(
      { error: "Failed to fetch guest data from Lu.ma" },
      { status: 500 }
    );
  }
}
