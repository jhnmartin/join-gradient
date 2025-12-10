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
    
    // Function to convert Central time to UTC
    const convertToUTC = (date: string | null, time: string | null) => {
      try {
        if (!date || !time) {
          return null;
        }

        const dateTimeStr = `${date}T${time}`;
        const dateObj = new Date(dateTimeStr);
        
        if (isNaN(dateObj.getTime())) {
          console.error('Invalid date string:', dateTimeStr);
          return null;
        }

        // Check if the date is during daylight savings time (March to November)
        const month = dateObj.getMonth();
        const isDST = month >= 2 && month <= 10; // March (2) to November (10)
        
        // Add hours based on DST (5 hours during DST, 6 hours during standard time)
        dateObj.setHours(dateObj.getHours() + (isDST ? 5 : 6));
        
        return dateObj.toISOString();
      } catch (error) {
        console.error('Error converting date to UTC:', error);
        return null;
      }
    };

    // Helper function to calculate end time (2 hours after start)
    const calculateEndTime = (startDate: string, startTime: string) => {
      const startUTC = convertToUTC(startDate, startTime);
      if (!startUTC) return null;
      
      const endDate = new Date(startUTC);
      endDate.setHours(endDate.getHours() + 2); // 2 hour duration
      return endDate.toISOString();
    };

    // Get start and end dates/times
    const startDate = webhookPayload.event.start_date;
    const startTime = webhookPayload.event.start_time;
    const endDate = webhookPayload.event.end_date;
    const endTime = webhookPayload.event.end_time;

    // Convert dates for Webflow
    const webflowStartDateTime = convertToUTC(startDate, startTime) || "";
    const webflowEndDateTime = convertToUTC(endDate, endTime) || calculateEndTime(startDate, startTime) || "";
    
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
    const webflowIsDraft = webflowItem.isDraft === true

    console.log('Found Webflow item:', webflowItemId)
    console.log('Swoogo event status:', webhookPayload.event.status)
    console.log('Webflow item isDraft:', webflowIsDraft)
    
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
      "end-date-time": webflowEndDateTime,
      "start-date-time": webflowStartDateTime,
      image: webhookPayload.event.c_95697?.startsWith('//') ? `https:${webhookPayload.event.c_95697}` : webhookPayload.event.c_95697 || "",
      name: webhookPayload.event.name,
      slug: webhookPayload.event.url.replace(/^\//, '').replace(/[^a-zA-Z0-9-_]/g, '-'),
      swoogo: swoogoId
    }
    
    console.log('Prepared Webflow fields:', JSON.stringify(webflowFields, null, 2))
    
    // Determine states
    const swoogoIsDraft = webhookPayload.event.status === "draft"
    const cmsLocaleId = "674f3bbeda46bee36857e306"
    
    let updatedWebflowItem
    
    // Handle different states
    if (swoogoIsDraft && webflowIsDraft) {
      // Case 1: Swoogo draft / Webflow draft - update draft endpoint
      console.log('Case 1: Updating Webflow draft item (Swoogo draft / Webflow draft)')
      const draftResponse = await fetch(`https://api.webflow.com/v2/collections/${collectionId}/items/${webflowItemId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${process.env.WEBFLOW_ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          isArchived: false,
          isDraft: true,
          fieldData: webflowFields
        })
      })
      
      if (!draftResponse.ok) {
        const errorText = await draftResponse.text()
        console.error('Webflow API error response:', errorText)
        throw new Error(`Failed to update Webflow draft item: ${draftResponse.statusText} - ${errorText}`)
      }
      
      updatedWebflowItem = await draftResponse.json()
      console.log('Successfully updated Webflow draft item')
      
    } else if (!swoogoIsDraft && webflowIsDraft) {
      // Case 2: Swoogo live / Webflow draft - update draft with isDraft: false, then publish
      console.log('Case 2: Publishing Webflow item (Swoogo live / Webflow draft)')
      
      // Update draft endpoint with isDraft: false
      const draftResponse = await fetch(`https://api.webflow.com/v2/collections/${collectionId}/items/${webflowItemId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${process.env.WEBFLOW_ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          isArchived: false,
          isDraft: false,
          fieldData: webflowFields
        })
      })
      
      if (!draftResponse.ok) {
        const errorText = await draftResponse.text()
        console.error('Webflow API error response (draft update):', errorText)
        throw new Error(`Failed to update Webflow draft item: ${draftResponse.statusText} - ${errorText}`)
      }
      
      updatedWebflowItem = await draftResponse.json()
      console.log('Successfully updated Webflow draft item with isDraft: false')
      
      // Publish the item
      const publishResponse = await fetch(`https://api.webflow.com/v2/collections/${collectionId}/items/publish`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.WEBFLOW_ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          items: [{
            id: webflowItemId,
            cmsLocaleIds: [cmsLocaleId]
          }]
        })
      })
      
      if (!publishResponse.ok) {
        const errorText = await publishResponse.text()
        console.error('Webflow API error response (publish):', errorText)
        throw new Error(`Failed to publish Webflow item: ${publishResponse.statusText} - ${errorText}`)
      }
      
      console.log('Successfully published Webflow item')
      
    } else if (!swoogoIsDraft && !webflowIsDraft) {
      // Case 3: Swoogo live / Webflow live - update live endpoint
      console.log('Case 3: Updating Webflow live item (Swoogo live / Webflow live)')
      
      const liveResponse = await fetch(`https://api.webflow.com/v2/collections/${collectionId}/items/${webflowItemId}/live`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${process.env.WEBFLOW_ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          isArchived: false,
          isDraft: false,
          fieldData: webflowFields
        })
      })
      
      if (!liveResponse.ok) {
        const errorText = await liveResponse.text()
        console.error('Webflow API error response (live update):', errorText)
        throw new Error(`Failed to update Webflow live item: ${liveResponse.statusText} - ${errorText}`)
      }
      
      updatedWebflowItem = await liveResponse.json()
      console.log('Successfully updated Webflow live item')
    }
    
    return {
      statusCode: 200,
      body: {
        message: `Event updated successfully in Webflow (${swoogoIsDraft ? 'draft' : 'live'})`,
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

