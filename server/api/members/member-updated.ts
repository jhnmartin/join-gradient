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
    
    console.log('Received OfficeRnD member-updated webhook payload:', JSON.stringify(webhookPayload, null, 2))
    
    // Extract member email from the payload
    const memberEmail = webhookPayload.data?.object?.email
    
    if (!memberEmail) {
      console.error('No email found in webhook payload')
      return {
        statusCode: 400,
        body: 'No email found in webhook payload'
      }
    }
    
    console.log('Member updated - Email:', memberEmail)
    
    // TODO: Add logic to handle member removal from Klaviyo list
    // This will be implemented next
    
    return {
      statusCode: 200,
      body: 'Member update webhook received successfully'
    }
  } catch (error) {
    console.error('Error processing member update webhook:', error)
    return {
      statusCode: 500,
      body: 'Internal server error'
    }
  }
}) 