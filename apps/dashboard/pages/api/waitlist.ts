import type { NextApiRequest, NextApiResponse } from 'next';
import { createServerSupabaseClient } from '@/lib/supabase-server';

interface WaitlistResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<WaitlistResponse>
) {
  // Handle CORS preflight for Framer
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  // Set CORS headers for all responses
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed' 
    });
  }

  try {
    const body = req.body;
    
    // Framer sends form data with field names as keys
    // The email field could be named 'email', 'Email', or be in a fields object
    let email: string | undefined;
    
    if (typeof body === 'object') {
      // Try common field names
      email = body.email || body.Email || body.EMAIL;
      
      // Framer might send data in a different structure
      if (!email && body.fields) {
        email = body.fields.email || body.fields.Email;
      }
      
      // Or as form data array
      if (!email && Array.isArray(body)) {
        const emailField = body.find((f: any) => 
          f.name?.toLowerCase() === 'email' || f.field?.toLowerCase() === 'email'
        );
        email = emailField?.value || emailField?.data;
      }
    }

    if (!email || typeof email !== 'string') {
      console.error('[waitlist] Missing email in request:', JSON.stringify(body));
      return res.status(400).json({ 
        success: false, 
        error: 'Email is required' 
      });
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid email format' 
      });
    }

    const supabase = createServerSupabaseClient();

    // Insert email into waitlist
    const { error: insertError } = await supabase
      .from('waitlist')
      .insert({
        email: email.toLowerCase().trim(),
        source: 'framer',
      });

    if (insertError) {
      // Check if it's a duplicate email error
      if (insertError.code === '23505') {
        // Unique violation - email already exists
        console.log('[waitlist] Email already exists:', email);
        return res.status(200).json({ 
          success: true, 
          message: 'Email already registered' 
        });
      }

      console.error('[waitlist] Insert error:', insertError);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to add to waitlist' 
      });
    }

    console.log('[waitlist] New signup:', email);
    
    return res.status(200).json({ 
      success: true, 
      message: 'Successfully added to waitlist' 
    });

  } catch (error) {
    console.error('[waitlist] Unexpected error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
}
