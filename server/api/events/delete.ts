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
    
    console.log('Received webhook payload:', JSON.stringify(webhookPayload, null, 2))
    
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
    const rndId = webflowItem.fieldData?.rnd || ""

    console.log('Found Webflow item:', webflowItemId)
    console.log('OfficeRnD ID from Webflow:', rndId)
    
    // Delete Webflow item
    const webflowResponse = await fetch(`https://api.webflow.com/v2/collections/${collectionId}/items/${webflowItemId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${process.env.WEBFLOW_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (!webflowResponse.ok) {
      const errorText = await webflowResponse.text()
      console.error('Webflow API error response:', errorText)
      throw new Error(`Failed to delete Webflow item: ${webflowResponse.statusText} - ${errorText}`)
    }
    
    console.log('Deleted Webflow item:', webflowItemId)

    // Delete OfficeRnD event if we have the RND ID
    if (rndId) {
      try {
        console.log('Getting OfficeRnD OAuth token...')
        // Get OfficeRnD OAuth token with v2 scopes
        const encodedParams = new URLSearchParams();
        encodedParams.set('client_id', process.env.OFFICERND_CLIENT_ID || "");
        encodedParams.set('client_secret', process.env.OFFICERND_CLIENT_SECRET || "");
        encodedParams.set('grant_type', 'client_credentials');
        encodedParams.set('scope', 'flex.collaboration.events.read flex.collaboration.events.create flex.collaboration.events.update flex.collaboration.events.delete');

        const optionsRnd = {
          method: 'POST',
          headers: {
            accept: 'application/json',
            'content-type': 'application/x-www-form-urlencoded'
          },
          body: encodedParams
        };

        // Get OAuth token
        const tokenResponse = await fetch('https://identity.officernd.com/oauth/token', optionsRnd);
        if (!tokenResponse.ok) {
          const errorText = await tokenResponse.text();
          console.error('Failed to get OfficeRnD token. Status:', tokenResponse.status);
          console.error('Error response:', errorText);
          throw new Error(`Failed to get OfficeRnD token: ${tokenResponse.status} - ${errorText}`);
        }
        const tokenData = await tokenResponse.json();
        console.log('Successfully obtained OfficeRnD token')

        // Delete event in OfficeRnD v2 API
        console.log('Deleting OfficeRnD event:', rndId)
        const deleteEventResponse = await fetch(`https://app.officernd.com/api/v2/organizations/gradient/events/${rndId}`, {
          method: 'DELETE',
          headers: {
            accept: 'application/json',
            'content-type': 'application/json',
            authorization: `Bearer ${tokenData.access_token}`
          }
        });

        if (!deleteEventResponse.ok) {
          const errorText = await deleteEventResponse.text();
          console.error('Failed to delete OfficeRnD event. Status:', deleteEventResponse.status);
          console.error('Error response:', errorText);
          throw new Error(`Failed to delete OfficeRnD event: ${deleteEventResponse.status} - ${errorText}`);
        }

        console.log('Deleted OfficeRnD event:', rndId);
      } catch (officerndError) {
        // Log error but don't fail the entire request - Webflow was deleted successfully
        console.error('OfficeRnD event deletion failed (non-blocking):', officerndError);
      }
    } else {
      console.warn('No OfficeRnD ID found in Webflow item, skipping OfficeRnD deletion')
    }
    
    return {
      statusCode: 200,
      body: {
        message: 'Event deleted successfully',
        webflow_id: webflowItemId,
        officernd_id: rndId || null
      }
    }
  } catch (error) {
    console.error('Error:', error)
    return {
      statusCode: 500,
      body: {
        error: 'Failed to delete event',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
}) 