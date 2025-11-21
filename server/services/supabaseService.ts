
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

// These should be set in the Vercel environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY; // Use service key for server-side admin actions

if (!supabaseUrl || !supabaseServiceKey) {
    console.warn('Supabase server-side environment variables SUPABASE_URL or SUPABASE_SERVICE_KEY are missing.');
}

// Create a single client instance
export const supabase = (supabaseUrl && supabaseServiceKey) ? createClient(supabaseUrl, supabaseServiceKey) : null;

export const broadcast = async (payload: object) => {
    if (!supabase) {
        // console.warn('Supabase not configured, skipping broadcast.');
        return;
    }
    
    try {
        // Use a single, simple channel for all app updates
        const channel = supabase.channel('app-updates');
        
        await channel.send({
            type: 'broadcast',
            event: 'message',
            payload: payload,
        });
    } catch (error) {
        console.error('Error broadcasting Supabase message:', error);
    }
};
