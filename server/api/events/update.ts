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
    const rndId = webflowItem.fieldData?.rnd || ""

    console.log('Found Webflow item:', webflowItemId)
    console.log('Swoogo event status:', webhookPayload.event.status)
    console.log('Webflow item isDraft:', webflowIsDraft)
    console.log('OfficeRnD event ID from Webflow:', rndId)
    
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
      
      // Create OfficeRnD event after successful publish
      try {
        // Convert dates for OfficeRnD (use same logic as Webflow)
        const startDateTime = convertToUTC(startDate, startTime);
        const endDateTime = convertToUTC(endDate, endTime) || calculateEndTime(startDate, startTime);
        
        // OfficeRnD location/office ID (hardcoded for Gradient location)
        const officeId = "6602e576ef1d2a70ca915a07"
        
        if (!startDateTime || !endDateTime) {
          console.error('Cannot create OfficeRnD event: Missing required start or end date/time', {
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

          // Create event in OfficeRnD v2 API
          console.log('Creating OfficeRnD event')
          const createEventResponse = await fetch('https://app.officernd.com/api/v2/organizations/gradient/events', {
            method: 'POST',
            headers: {
              accept: 'application/json',
              'content-type': 'application/json',
              authorization: `Bearer ${tokenData.access_token}`
            },
            body: JSON.stringify(officerndFields)
          });

          if (!createEventResponse.ok) {
            const errorText = await createEventResponse.text();
            console.error('Failed to create OfficeRnD event. Status:', createEventResponse.status);
            console.error('Error response:', errorText);
            throw new Error(`Failed to create OfficeRnD event: ${createEventResponse.status} - ${errorText}`);
          }

          const officerndEvent = await createEventResponse.json();
          console.log('Created OfficeRnD event:', officerndEvent);
          console.log('OfficeRnD event ID:', officerndEvent._id);

          // Update Webflow item with OfficeRnD ID
          if (officerndEvent._id) {
            console.log('Updating Webflow item with OfficeRnD ID:', officerndEvent._id);
            
            const updateRndResponse = await fetch(`https://api.webflow.com/v2/collections/${collectionId}/items/${webflowItemId}`, {
              method: 'PATCH',
              headers: {
                'Authorization': `Bearer ${process.env.WEBFLOW_ACCESS_TOKEN}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                fieldData: {
                  rnd: officerndEvent._id
                }
              })
            });

            if (!updateRndResponse.ok) {
              const errorText = await updateRndResponse.text();
              console.error('Failed to update Webflow item with OfficeRnD ID:', errorText);
              // Don't throw - OfficeRnD event was created successfully
            } else {
              const updatedWithRnd = await updateRndResponse.json();
              updatedWebflowItem = updatedWithRnd;
              console.log('Successfully updated Webflow item with OfficeRnD ID');
            }
          }
        }
      } catch (officerndError) {
        // Log error but don't fail the entire request - Webflow was published successfully
        console.error('OfficeRnD event creation failed (non-blocking):', officerndError);
      }
      
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
      
      // Update OfficeRnD event if we have the RND ID
      if (rndId) {
        try {
          // Map Officernd v2 API fields for UPDATE
          // PUT endpoint only accepts title and where - other fields (location, start, end, timezone, description, links, image) are not allowed
          const officerndFields = {
            title: webhookPayload.event.name,
            where: "Gradient"
          }
          
          console.log('Prepared OfficeRnD fields:', JSON.stringify(officerndFields, null, 2))
          
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

          // Update event in OfficeRnD v2 API
          console.log('Updating OfficeRnD event:', rndId)
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

          const updatedOfficerndEvent = await updateEventResponse.json();
          console.log('Successfully updated OfficeRnD event:', JSON.stringify(updatedOfficerndEvent, null, 2))
        } catch (officerndError) {
          // Log error but don't fail the entire request - Webflow was updated successfully
          console.error('OfficeRnD event update failed (non-blocking):', officerndError);
        }
      } else {
        console.warn('No OfficeRnD ID found in Webflow item, skipping OfficeRnD update')
      }
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

