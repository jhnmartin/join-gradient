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
    
    console.log('Received Swoogo update webhook payload:', JSON.stringify(webhookPayload, null, 2))
    
    const swoogoId = webhookPayload.event.id?.toString() || "";
    
    if (!swoogoId) {
      return {
        statusCode: 400,
        body: 'Swoogo ID is required in the webhook payload'
      }
    }
    
    // Find Webflow item by Swoogo ID
    console.log('Searching for Webflow item with Swoogo ID:', swoogoId)
    
    // Search Webflow collection for item with matching swoogo field
    const searchResponse = await fetch(`https://api.webflow.com/v2/collections/${collectionId}/items?filter=${encodeURIComponent(JSON.stringify({ field: "swoogo", operator: "equals", value: swoogoId }))}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.WEBFLOW_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      }
    })

    if (!searchResponse.ok) {
      const errorText = await searchResponse.text()
      console.error('Failed to search Webflow collection:', errorText)
      return {
        statusCode: 404,
        body: 'Event not found in Webflow collection'
      }
    }

    const searchResults = await searchResponse.json()
    console.log('Webflow search results:', JSON.stringify(searchResults, null, 2))

    if (!searchResults.items || searchResults.items.length === 0) {
      return {
        statusCode: 404,
        body: 'Event not found in Webflow collection'
      }
    }

    const webflowItem = searchResults.items[0]
    const webflowItemId = webflowItem.id

    console.log('Found Webflow item:', webflowItemId)
    console.log('Swoogo event status:', webhookPayload.event.status)
    
    // Map Swoogo pillar values to Webflow pillar IDs
    const pillarMapping: Record<string, string> = {
      'Connect': '67ce5781f71b4b2d91c44df4',
      'Scale': '67ce576fe8288f21bdeb494a',
      'Start': '67ce5760f155bc0716caaecd'
    }
    
    // Map Swoogo webhook data to Webflow fields
    const webflowFields = {
      pillar: pillarMapping[webhookPayload.event.c_95742?.value as string] || "",
      "is-featured-event": false,
      "ticket-price": "",
      "rsvp-link": `${webhookPayload.event.domain}/${webhookPayload.event.url}`,
      "meeting-room": "",
      shortdescription: "",
      location: webhookPayload.event.event_location_name || "",
      "end-date": "", // Will be handled later
      "start-date": "", // Will be handled later
      image: webhookPayload.event.c_95697?.startsWith('//') ? `https:${webhookPayload.event.c_95697}` : webhookPayload.event.c_95697 || "",
      name: webhookPayload.event.name,
      slug: webhookPayload.event.url.replace(/^\//, '').replace(/[^a-zA-Z0-9-_]/g, '-'),
      swoogo: swoogoId
    }
    
    console.log('Prepared Webflow fields:', JSON.stringify(webflowFields, null, 2))
    
    // Determine if we're updating draft or live based on Swoogo event status
    const isDraft = webhookPayload.event.status === "draft"
    const endpoint = isDraft 
      ? `https://api.webflow.com/v2/collections/${collectionId}/items/${webflowItemId}`
      : `https://api.webflow.com/v2/collections/${collectionId}/items/${webflowItemId}/live`
    
    console.log(`Updating Webflow item (${isDraft ? 'draft' : 'live'}):`, webflowItemId)
    
    // Update Webflow item
    const webflowResponse = await fetch(endpoint, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${process.env.WEBFLOW_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        isArchived: false,
        isDraft: isDraft,
        fieldData: webflowFields
      })
    })
    
    if (!webflowResponse.ok) {
      const errorText = await webflowResponse.text()
      console.error('Webflow API error response:', errorText)
      throw new Error(`Failed to update Webflow item: ${webflowResponse.statusText} - ${errorText}`)
    }
    
    const updatedWebflowItem = await webflowResponse.json()
    console.log(`Successfully updated Webflow item (${isDraft ? 'draft' : 'live'}):`, JSON.stringify(updatedWebflowItem, null, 2))
    
    return {
      statusCode: 200,
      body: {
        message: `Event updated successfully in Webflow (${isDraft ? 'draft' : 'live'})`,
        webflow: updatedWebflowItem
      }
    }
  } catch (error) {
    console.error('Error processing update webhook:', error)
    return {
      statusCode: 500,
      body: {
        error: 'Failed to process update webhook',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
})

