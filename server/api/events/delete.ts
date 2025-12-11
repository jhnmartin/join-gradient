import { defineEventHandler, readBody } from 'h3'

export default defineEventHandler(async (event) => {
  // Only allow POST requests
  if (event.method !== 'POST') {
    return {
      statusCode: 405,
      body: 'Method Not Allowed'
    }
  }

  try {
    const webhookPayload = await readBody(event)
    
    console.log('Received Swoogo delete webhook payload:', JSON.stringify(webhookPayload, null, 2))
    
    return {
      statusCode: 200,
      body: {
        message: 'Delete webhook received',
        received: true
      }
    }
  } catch (error) {
    console.error('Error processing delete webhook:', error)
    return {
      statusCode: 500,
      body: {
        error: 'Failed to process delete webhook',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
})
