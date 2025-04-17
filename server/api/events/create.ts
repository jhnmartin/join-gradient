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
    const collectionId = "67af76d9b4dc5bc8f0aa0b6f"
    const webhookPayload = await readBody(event)
    
    console.log('Received webhook payload:', webhookPayload)
    
    // Map webhook data to Webflow fields
    // This is where you'll customize the mapping based on your webhook payload structure
    const webflowFields = {
      pillar: "",
      "is-featured-event": false,
      "ticket-price": webhookPayload.ticketPrice || "",
      "rsvp-link": webhookPayload.rsvpLink || "",
      "meeting-room": webhookPayload.meetingRoom || "",
      shortdescription: webhookPayload.shortDescription || "",
      location: webhookPayload.location || "",
      "end-date-time": webhookPayload.endDateTime || "",
      "start-date-time": webhookPayload.startDateTime || "",
      image: webhookPayload.image || "",
      name: webhookPayload.name,
      slug: webhookPayload.slug || webhookPayload.name.toLowerCase().replace(/\s+/g, '-')
    }
    
    // Validate required fields
    if (!webflowFields.name) {
      return {
        statusCode: 400,
        body: 'Name is required in the webhook payload'
      }
    }
    
    console.log('Creating Webflow item with mapped data:', webflowFields)
    
    // Create the new item with mapped fields
    const response = await fetch(`https://api.webflow.com/v2/collections/${collectionId}/items/live`, {
      method: 'POST',
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
      throw new Error(`Failed to create item: ${response.statusText} - ${errorText}`)
    }
    
    const newItem = await response.json()
    console.log('Created new item:', newItem)
    
    return {
      statusCode: 200,
      body: newItem
    }
  } catch (error) {
    console.error('Webflow error:', error)
    return {
      statusCode: 500,
      body: {
        error: 'Failed to create Webflow item',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
}) 