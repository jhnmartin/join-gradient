import { defineEventHandler, readBody } from 'h3'

export default defineEventHandler(async (event) => {
  // Only allow DELETE requests
  if (event.method !== 'DELETE') {
    return {
      statusCode: 405,
      body: 'Method Not Allowed'
    }
  }

  try {
    const collectionId = "67af76d9b4dc5bc8f0aa0b6f"
    const webhookPayload = await readBody(event)
    
    // Validate required fields
    if (!webhookPayload.id) {
      return {
        statusCode: 400,
        body: 'Event ID is required for deletion'
      }
    }
    
    // Delete the item
    const response = await fetch(`https://api.webflow.com/v2/collections/${collectionId}/items/${webhookPayload.id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer d021eb5b4f008722f7f36d688ae0940d0f350f82b1686896f1ab986ca332d58c`,
        'Content-Type': 'application/json'
      }
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('Webflow API error response:', errorText)
      throw new Error(`Failed to delete item: ${response.statusText} - ${errorText}`)
    }
    
    return {
      statusCode: 200,
      body: {
        message: 'Event deleted successfully',
        id: webhookPayload.id
      }
    }
  } catch (error) {
    console.error('Webflow error:', error)
    return {
      statusCode: 500,
      body: {
        error: 'Failed to delete Webflow item',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
}) 