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
    
    console.log('Received Swoogo delete webhook payload:', JSON.stringify(webhookPayload, null, 2))
    
    // Extract Swoogo event ID
    const swoogoId = webhookPayload.event.id?.toString() || "";
    
    if (!swoogoId) {
      return {
        statusCode: 400,
        body: 'Swoogo ID is required in the webhook payload'
      }
    }
    
    // Find Webflow item by Swoogo ID
    console.log('Searching for Webflow item with Swoogo ID:', swoogoId)
    
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
    const rndId = webflowItem.fieldData?.rnd || ""

    console.log('Found Webflow item:', webflowItem.id)
    console.log('OfficeRnD event ID from Webflow:', rndId)
    
    // Delete from OfficeRnD if we have the RND ID
    if (!rndId) {
      console.warn('No OfficeRnD ID found in Webflow item, skipping OfficeRnD deletion')
      return {
        statusCode: 200,
        body: {
          message: 'Event found in Webflow but no OfficeRnD ID to delete',
          webflowItemId: webflowItem.id
        }
      }
    }

    try {
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

      // Delete event from OfficeRnD v2 API
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

      console.log('Successfully deleted OfficeRnD event:', rndId)
      
      return {
        statusCode: 200,
        body: {
          message: 'Event deleted successfully from OfficeRnD',
          webflowItemId: webflowItem.id,
          officerndEventId: rndId
        }
      }
    } catch (officerndError) {
      console.error('OfficeRnD event deletion failed:', officerndError);
      throw officerndError;
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
