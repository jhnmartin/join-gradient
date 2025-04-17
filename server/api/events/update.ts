import { defineEventHandler, readBody } from 'h3'

export default defineEventHandler(async (event) => {
  // Only allow PUT requests
  if (event.method !== 'PUT') {
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
        body: 'Event ID is required for updates'
      }
    }
    
    // Map webhook data to Webflow fields
    const webflowFields = {
      pillar: webhookPayload.pillar || "",
      "is-featured-event": webhookPayload.isFeaturedEvent || false,
      "ticket-price": webhookPayload.ticketPrice || "",
      "rsvp-link": webhookPayload.rsvpLink || "",
      "meeting-room": webhookPayload.meetingRoom || "",
      shortdescription: webhookPayload.shortDescription || "",
      location: webhookPayload.location || "",
      "end-date-time": webhookPayload.endDateTime || "",
      "start-date-time": webhookPayload.startDateTime || "",
      image: webhookPayload.image || "",
      name: webhookPayload.name,
      slug: webhookPayload.slug || webhookPayload.name?.toLowerCase().replace(/\s+/g, '-')
    }
    
    // Update the item
    const response = await fetch(`https://api.webflow.com/v2/collections/${collectionId}/items/${webhookPayload.id}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer d021eb5b4f008722f7f36d688ae0940d0f350f82b1686896f1ab986ca332d58c`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        isArchived: false,
        isDraft: false,
        fieldData: webflowFields
      })
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('Webflow API error response:', errorText)
      throw new Error(`Failed to update item: ${response.statusText} - ${errorText}`)
    }
    
    const updatedItem = await response.json()
    console.log('Updated item:', updatedItem)
    
    return {
      statusCode: 200,
      body: updatedItem
    }
  } catch (error) {
    console.error('Webflow error:', error)
    return {
      statusCode: 500,
      body: {
        error: 'Failed to update Webflow item',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
}) 