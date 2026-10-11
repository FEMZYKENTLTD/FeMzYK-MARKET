import type { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";

const COOKIE_PREFIX = "fm_order_access_";

export function orderAccessCookieName(orderNumber: string) {
  // Order numbers are generated from a fixed alphanumeric prefix + random suffix.
  return `${COOKIE_PREFIX}${orderNumber.replace(/[^A-Za-z0-9_-]/g, "")}`;
}

export function setOrderAccessCookie(response: NextResponse, orderNumber: string, token: string | null | undefined) {
  if (!token) return response;
  response.cookies.set(orderAccessCookieName(orderNumber), token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return response;
}

export function hasOrderAccess(cookieValue: string | undefined, orderNumber: string, expectedToken: string | null | undefined) {
  if (!cookieValue || !expectedToken) return false;
  const supplied = Buffer.from(cookieValue);
  const expected = Buffer.from(expectedToken);
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}
