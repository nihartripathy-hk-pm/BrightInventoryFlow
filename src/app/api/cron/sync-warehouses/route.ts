import { NextResponse } from "next/server";

// Warehouse sync from Redshift is not wired in the prototype.
// Warehouses are managed directly in Google Sheets via the seed script.
// This endpoint is a stub for the production version.
export async function POST() {
  return NextResponse.json({ message: "Redshift sync not configured in prototype." }, { status: 501 });
}
