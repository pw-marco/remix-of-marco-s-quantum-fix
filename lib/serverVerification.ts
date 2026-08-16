// lib/serverVerification.ts
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import dbConnect from '@/lib/mongodb';
import UserModel from '@/models/User';
import { JWT_SECRET_VALUE } from "@/lib/defaults";

const SECRET = new TextEncoder().encode(JWT_SECRET_VALUE);

export interface VerificationResult {
    needsVerification: boolean;
    userTag: string | null;
    userId: string | null;
    anonId: string | null;
}

/**
 * Get user information from JWT token and database
 */
export async function getUserInfo(): Promise<{
    userId: string | null;
    userTag: string | null;
    isAuthenticated: boolean;
}> {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('accessToken')?.value;

        if (!token) {
            return { userId: null, userTag: null, isAuthenticated: false };
        }

        // Verify JWT token
        const { payload } = await jwtVerify(token, SECRET);
        const userId = payload._id as string;

        // Connect to database and get user tag
        await dbConnect();
        const user = await UserModel.findById(userId, { tag: 1 }).lean().exec() as { tag?: string } | null;

        return {
            userId,
            userTag: user?.tag ?? null,
            isAuthenticated: true,
        };
    } catch (error) {
        console.error("Error getting user info:", error);
        return { userId: null, userTag: null, isAuthenticated: false };
    }
}

/**
 * Check if user needs verification for batch access
 */
export async function checkBatchVerification(batchId: string): Promise<VerificationResult> {
    const cookieStore = await cookies();
    const anonId = cookieStore.get('anon_id')?.value || null;

    const { userId, userTag, isAuthenticated } = await getUserInfo();

    // If not authenticated, redirect to auth
    if (!isAuthenticated) {
        return {
            needsVerification: false, // Will be handled by auth redirect
            userTag,
            userId,
            anonId,
        };
    }

    // If user has premium tag (not "user" or null), skip verification
    if (userTag && userTag !== "user") {
        console.log(`User Tag: ${userTag} - skipping verification`);
        return {
            needsVerification: false,
            userTag,
            userId,
            anonId,
        };
    }

    // For regular users, check verification status
    if (anonId) {
        try {
            const response = await fetch(`${process.env.BASE_URL}/api/auth/check-verification`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-server-request": "true" // Identify server requests
                },
                body: JSON.stringify({ anon_id: anonId, batchId }),
            });

            if (response.ok) {
                const verification = await response.json();
                return {
                    needsVerification: !verification?.verified,
                    userTag,
                    userId,
                    anonId,
                };
            }
        } catch (error) {
            console.error("Error checking verification:", error);
        }
    }

    // Default: needs verification
    return {
        needsVerification: true,
        userTag,
        userId,
        anonId,
    };
}

/**
 * Generate anonymous ID if not exists
 */
export function generateAnonId(): string {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
        const r = (Math.random() * 16) | 0;
        const v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

/**
 * Check if user needs to see ads (regular users)
 */
export async function shouldShowAds(): Promise<boolean> {
    const { userTag } = await getUserInfo();

    // Show ads to regular users (tag is "user" or null)
    return !userTag || userTag === "user";
}