import { NextApiRequest, NextApiResponse } from 'next';
import { setCorsOrigin } from '@/lib/cors';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    setCorsOrigin(req, res);
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    setCorsOrigin(req, res);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = req.body;
    
    console.log('Plasmic webhook received:', {
      event: body.event,
      projectId: body.projectId,
      version: body.version,
      timestamp: new Date().toISOString()
    });

    setCorsOrigin(req, res);
    res.setHeader('Content-Type', 'application/json');
    
    return res.status(200).json({ 
      success: true, 
      message: 'Webhook received successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Webhook error:', error);
    
    setCorsOrigin(req, res);
    res.setHeader('Content-Type', 'application/json');
    
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to process webhook' 
    });
  }
}
