
"use client";

import type { Settings } from '@/lib/types';

// This is now a client-side service that fetches from the API.
// It no longer contains any server-side logic (db/fs access).

async function handleResponse(response: Response, defaultError: string) {
    if (!response.ok) {
        let message = defaultError;
        try {
            const errorData = await response.json();
            message = errorData.message || message;
        } catch(e) {
            // Ignore if body isn't JSON, use default or status text
             message = response.statusText || message;
        }
        throw new Error(message);
    }
    return response.json();
}

export async function getSetting<T extends keyof Settings>(configId: T): Promise<Settings[T] | null> {
    try {
        const response = await fetch(`/api/setting/${configId}`);
        if (!response.ok) {
            // A 404 is a normal case (setting not found), return null.
            if (response.status === 404) {
                return null;
            }
            // For other errors, throw.
            throw new Error(`Failed to fetch setting ${configId}. Status: ${response.status}`);
        }
        const data = await response.json();
        // The API returns { config: value }, so we extract it.
        return data.config || null;
    } catch (error) {
        console.error(`Error in getSetting for ${configId}:`, error);
        // Re-throw the error so the calling component can handle it if needed
        throw error;
    }
}

export async function saveSetting<T extends keyof Settings>(configId: T, configValue: Settings[T]): Promise<void> {
    try {
        const response = await fetch(`/api/setting/${configId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ config: configValue }),
        });
        
        await handleResponse(response, `Failed to save setting ${configId}.`);

    } catch (error) {
        console.error(`Error in saveSetting for ${configId}:`, error);
        throw error;
    }
}
