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
    const officeId = "6602e576ef1d2a70ca915a07"
    
    console.log('Received webhook payload:', JSON.stringify(webhookPayload, null, 2))
    
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
      pillar: pillarMapping[webhookPayload.event.c_95742?.value as string] || "", // Map pillar value to ID
      "is-featured-event": false,
      "ticket-price": "", // Will be updated later when handling paid events
      "rsvp-link": `${webhookPayload.event.domain}/${webhookPayload.event.url}`, // Use domain directly
      "meeting-room": "", // Not provided in Swoogo payload
      shortdescription: "", // Will be updated later when Swoogo field is added
      location: webhookPayload.event.event_location_name || "", // Only use location name
      "end-date-time": webflowEndDateTime,
      "start-date-time": webflowStartDateTime || "",
      image: webhookPayload.event.c_95697?.startsWith('//') ? `https:${webhookPayload.event.c_95697}` : webhookPayload.event.c_95697 || "", // Add https: prefix if URL starts with //
      name: webhookPayload.event.name,
      slug: webhookPayload.event.url.replace(/^\//, '').replace(/[^a-zA-Z0-9-_]/g, '-'), // Clean up URL to make valid slug
      swoogo: webhookPayload.event.id?.toString() || "" // Save Swoogo event ID
    }


    // Validate required fields
    if (!webflowFields.name) {
      return {
        statusCode: 400,
        body: 'Name is required in the webhook payload'
      }
    }
    
    console.log('Creating Webflow item with mapped data:', webflowFields)
    
    // Create the new item with mapped fields (as draft)
    const response = await fetch(`https://api.webflow.com/v2/collections/${collectionId}/items`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.WEBFLOW_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        items: [{
          isArchived: false,
          isDraft: true,
          fieldData: webflowFields
        }]
      })
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('Webflow API error response:', errorText)
      throw new Error(`Failed to create item: ${response.statusText} - ${errorText}`)
    }
    
    const newItem = await response.json()
    console.log('Created new item:', newItem)

    // Create OfficeRnD event (non-blocking - won't fail if this errors)
    let officerndEvent = null;
    try {
      // Convert dates for OfficeRnD (use same logic as Webflow)
      const startDateTime = convertToUTC(startDate, startTime);
      const endDateTime = convertToUTC(endDate, endTime) || calculateEndTime(startDate, startTime);
      
      // Validate that we have both start and end for OfficeRnD
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
        
        // Get OfficeRnD OAuth token
        const optionsRnd = {
          method: 'POST',
          headers: {
            accept: 'application/json',
            'content-type': 'application/x-www-form-urlencoded'
          },
          body: new URLSearchParams({
            client_id: process.env.OFFICERND_CLIENT_ID || "",
            client_secret: process.env.OFFICERND_CLIENT_SECRET || "",
            grant_type: 'client_credentials',
            scope: 'officernd.api.read officernd.api.write'
          })
        };

        // Get OAuth token
        const tokenResponse = await fetch('https://identity.officernd.com/oauth/token', optionsRnd);
        if (!tokenResponse.ok) {
          console.error('Failed to get OfficeRnD token:', await tokenResponse.text());
          throw new Error('Failed to get OfficeRnD token');
        }
        const tokenData = await tokenResponse.json();

        // Create event in OfficeRnD
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
          console.error('Failed to create OfficeRnD event:', errorText);
          throw new Error(`Failed to create OfficeRnD event: ${errorText}`);
        }

        officerndEvent = await createEventResponse.json();
        console.log('Created OfficeRnD event:', officerndEvent);
        console.log('OfficeRnD event ID:', officerndEvent._id);
      }
    } catch (officerndError) {
      // Log error but don't fail the entire request - Webflow was created successfully
      console.error('OfficeRnD event creation failed (non-blocking):', officerndError);
    }
    
    return {
      statusCode: 200,
      body: {
        webflow: newItem,
        officernd: officerndEvent,
        message: 'Event created successfully in Webflow' + (officerndEvent ? ' and OfficeRnD' : ' (OfficeRnD creation skipped)')
      }
    }
  } catch (error) {
    console.error('Error:', error)
    return {
      statusCode: 500,
      body: {
        error: 'Failed to create event',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
})