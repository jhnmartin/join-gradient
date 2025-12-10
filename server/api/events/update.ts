import { defineEventHandler, readBody } from 'h3'

export default defineEventHandler(async (event) => {
  console.log('Update webhook received - Method:', event.method)
  
  // Only allow POST requests
  if (event.method !== 'POST') {
    console.log('Invalid method received:', event.method)
    return {
      statusCode: 405,
      body: 'Method Not Allowed'
    }
  }

  try {
    const collectionId = "67af76d9b4dc5bc8f0aa0b6f"
    console.log('Reading webhook payload...')
    const webhookPayload = await readBody(event)
    console.log('Webhook payload received:', JSON.stringify(webhookPayload, null, 2))
    
    const officeId = "6602e576ef1d2a70ca915a07"
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
        // Validate inputs
        if (!date || !time) {
          console.error('Convert to UTC: Missing required date/time fields:', { date, time });
          return null;
        }

        console.log('Converting date/time:', { date, time });

        // Create a date string in the format expected by the Date constructor
        const dateTimeStr = `${date}T${time}`;
        console.log('Created date string:', dateTimeStr);
        
        // Create a date object
        const dateObj = new Date(dateTimeStr);
        if (isNaN(dateObj.getTime())) {
          console.error('Invalid date string:', dateTimeStr);
          return null;
        }

        console.log('Initial date object:', dateObj.toISOString());

        // Check if the date is during daylight savings time (March to November)
        const month = dateObj.getMonth();
        const isDST = month >= 2 && month <= 10; // March (2) to November (10)
        console.log('Is DST:', isDST);
        
        // Add hours based on DST (5 hours during DST, 6 hours during standard time)
        dateObj.setHours(dateObj.getHours() + (isDST ? 5 : 6));
        
        const result = dateObj.toISOString();
        console.log('Final UTC date:', result);
        return result;
      } catch (error) {
        console.error('Error converting date to UTC:', error);
        return null;
      }
    };

    // Helper function to calculate end time if not provided (defaults to 2 hours after start)
    const calculateEndTime = (startDate: string, startTime: string) => {
      const startUTC = convertToUTC(startDate, startTime);
      if (!startUTC) return null;
      
      const endDate = new Date(startUTC);
      endDate.setHours(endDate.getHours() + 2); // Default 2 hour duration
      return endDate.toISOString();
    };
    
    // Map Swoogo pillar values to Webflow pillar IDs
    const pillarMapping: Record<string, string> = {
      'Connect': '67ce5781f71b4b2d91c44df4',
      'Scale': '67ce576fe8288f21bdeb494a',
      'Start': '67ce5760f155bc0716caaecd'
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

    if (!rndId) {
      console.warn('No OfficeRnD ID found in Webflow item, skipping OfficeRnD update')
    }

    // Get start and end dates/times, with fallbacks
    const startDate = webhookPayload.event.start_date;
    const startTime = webhookPayload.event.start_time;
    // Use end_date/end_time if available, otherwise fall back to close_date/close_time, or calculate from start
    const endDate = webhookPayload.event.end_date || webhookPayload.event.close_date;
    const endTime = webhookPayload.event.end_time || webhookPayload.event.close_time;

    // Convert dates for Webflow
    const webflowStartDateTime = convertToUTC(startDate, startTime);
    const webflowEndDateTime = convertToUTC(endDate, endTime) || calculateEndTime(startDate, startTime) || "";

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
      "start-date-time": webflowStartDateTime || "",
      image: webhookPayload.event.c_95697?.startsWith('//') ? `https:${webhookPayload.event.c_95697}` : webhookPayload.event.c_95697 || "",
      name: webhookPayload.event.name,
      slug: webhookPayload.event.url.replace(/^\//, '').replace(/[^a-zA-Z0-9-_]/g, '-'),
      swoogo: swoogoId // Keep Swoogo ID updated
    }

    console.log('Prepared Webflow fields:', JSON.stringify(webflowFields, null, 2))

    console.log('Prepared Webflow fields:', JSON.stringify(webflowFields, null, 2))
    
    console.log('Updating Webflow item:', webflowItemId)
    // Update Webflow item
    const webflowResponse = await fetch(`https://api.webflow.com/v2/collections/${collectionId}/items/${webflowItemId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${process.env.WEBFLOW_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fieldData: webflowFields
      })
    })
    
    if (!webflowResponse.ok) {
      const errorText = await webflowResponse.text()
      console.error('Webflow API error response:', errorText)
      throw new Error(`Failed to update Webflow item: ${webflowResponse.statusText} - ${errorText}`)
    }
    
    const updatedWebflowItem = await webflowResponse.json()
    console.log('Successfully updated Webflow item:', JSON.stringify(updatedWebflowItem, null, 2))

    // Update OfficeRnD event if we have the RND ID
    let updatedOfficerndEvent = null;
    if (rndId) {
      try {
        // Convert dates for OfficeRnD (use same logic as Webflow)
        const startDateTime = convertToUTC(startDate, startTime);
        const endDateTime = convertToUTC(endDate, endTime) || calculateEndTime(startDate, startTime);
        
        if (!startDateTime || !endDateTime) {
          console.error('Cannot update OfficeRnD event: Missing required start or end date/time', {
            start_date: startDate,
            start_time: startTime,
            end_date: endDate,
            end_time: endTime,
            converted_start: startDateTime,
            converted_end: endDateTime
          });
        } else {
          // Map Officernd v2 API fields
          const officerndFields = {
            title: webhookPayload.event.name,
            location: officeId, // Single location ID
            start: startDateTime, // ISO 8601 UTC format
            end: endDateTime, // ISO 8601 UTC format
            timezone: "America/Chicago",
            where: "Gradient",
            description: webhookPayload.event.description || "",
            links: [`${webhookPayload.event.domain}/${webhookPayload.event.url}`],
            image: webhookPayload.event.c_95697?.startsWith('//') ? `https:${webhookPayload.event.c_95697}` : webhookPayload.event.c_95697 || ""
          }
          
          console.log('Prepared OfficeRnD fields:', JSON.stringify(officerndFields, null, 2))
          
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

          console.log('Updating OfficeRnD event:', rndId)
          // Update event in OfficeRnD v2 API
          const updateEventResponse = await fetch(`https://app.officernd.com/api/v2/organizations/gradient/events/${rndId}`, {
            method: 'PUT',
            headers: {
              accept: 'application/json',
              'content-type': 'application/json',
              authorization: `Bearer ${tokenData.access_token}`
            },
            body: JSON.stringify(officerndFields)
          });

          if (!updateEventResponse.ok) {
            const errorText = await updateEventResponse.text();
            console.error('Failed to update OfficeRnD event. Status:', updateEventResponse.status);
            console.error('Error response:', errorText);
            throw new Error(`Failed to update OfficeRnD event: ${updateEventResponse.status} - ${errorText}`);
          }

          updatedOfficerndEvent = await updateEventResponse.json();
          console.log('Successfully updated OfficeRnD event:', JSON.stringify(updatedOfficerndEvent, null, 2))
        }
      } catch (officerndError) {
        // Log error but don't fail the entire request - Webflow was updated successfully
        console.error('OfficeRnD event update failed (non-blocking):', officerndError);
      }
    }
    
    console.log('Update process completed successfully')
    return {
      statusCode: 200,
      body: {
        webflow: updatedWebflowItem,
        officernd: updatedOfficerndEvent
      }
    }
  } catch (error) {
    console.error('Error in update process:', error)
    return {
      statusCode: 500,
      body: {
        error: 'Failed to update event',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
}) 