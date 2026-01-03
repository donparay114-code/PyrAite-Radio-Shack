import { NextRequest } from "next/server";
import jwt from "jsonwebtoken";

/**
 * JWT payload structure for authenticated users
 */
export interface AuthPayload {
  userId: number;
  telegramId?: number;
  email?: string;
  tier?: string;
  iat?: number;
  exp?: number;
}

/**
 * Result of authentication attempt
 */
export interface AuthResult {
  success: boolean;
  userId?: number;
  payload?: AuthPayload;
  error?: string;
}

/**
 * Get JWT secret from environment with fallback for development
 */
function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("JWT_SECRET environment variable is required in production");
    }
    // Development fallback - should never be used in production
    console.warn("[Auth] Using development JWT secret - do not use in production!");
    return "dev-secret-not-for-production";
  }
  return secret;
}

/**
 * Extract Bearer token from Authorization header
 */
function extractBearerToken(request: NextRequest): string | null {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader) {
    return null;
  }

  // Support both "Bearer <token>" and legacy "Token <token>" formats
  const match = authHeader.match(/^(?:Bearer|Token)\s+(.+)$/i);
  return match ? match[1] : null;
}

/**
 * Verify JWT token and extract payload
 */
function verifyToken(token: string): AuthPayload | null {
  try {
    const secret = getJwtSecret();
    const payload = jwt.verify(token, secret) as AuthPayload;
    return payload;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      console.warn("[Auth] Token expired");
    } else if (error instanceof jwt.JsonWebTokenError) {
      console.warn("[Auth] Invalid token:", error.message);
    }
    return null;
  }
}

/**
 * Authenticate a request and get the user ID
 *
 * @param request - NextRequest object
 * @returns AuthResult with userId if successful, or error message if failed
 *
 * @example
 * ```ts
 * const auth = getAuthenticatedUser(request);
 * if (!auth.success) {
 *   return NextResponse.json({ error: auth.error }, { status: 401 });
 * }
 * const userId = auth.userId;
 * ```
 */
export function getAuthenticatedUser(request: NextRequest): AuthResult {
  // First, try Bearer token from Authorization header
  const token = extractBearerToken(request);

  if (token) {
    const payload = verifyToken(token);
    if (payload && payload.userId) {
      return {
        success: true,
        userId: payload.userId,
        payload,
      };
    }
    return {
      success: false,
      error: "Invalid or expired token",
    };
  }

  // Fallback: Check for x-user-id header (for internal services / testing)
  // This should only be trusted in development or from verified internal sources
  const userIdHeader = request.headers.get("x-user-id");
  if (userIdHeader && process.env.NODE_ENV !== "production") {
    const userId = parseInt(userIdHeader, 10);
    if (!isNaN(userId) && userId > 0) {
      console.warn("[Auth] Using x-user-id header - development only!");
      return {
        success: true,
        userId,
      };
    }
  }

  return {
    success: false,
    error: "No authentication token provided",
  };
}

/**
 * Create a JWT token for a user
 *
 * @param payload - User data to encode in the token
 * @param expiresIn - Token expiration time (default: 7 days)
 * @returns Signed JWT token
 */
export function createAuthToken(
  payload: Omit<AuthPayload, "iat" | "exp">,
  expiresIn: string | number = "7d"
): string {
  const secret = getJwtSecret();
  return jwt.sign(payload, secret, { expiresIn });
}

/**
 * Check if a user has moderator or owner role for a channel
 * (Helper for authorization checks)
 */
export function isModeratorRole(role: string | null | undefined): boolean {
  return role === "owner" || role === "moderator" || role === "admin";
}
