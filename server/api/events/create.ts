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
    
    // Function to convert local time to UTC
    const convertToUTC = (date: string, time: string, timezone: string) => {
      // Create a date string in the format expected by the Date constructor
      const dateTimeStr = `${date}T${time}`;
      // Create a date object - this will be interpreted in the local timezone
      const localDate = new Date(dateTimeStr);
      
      // Format the date in the specified timezone
      const options: Intl.DateTimeFormatOptions = {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      };
      
      // Get the date parts in the specified timezone
      const formatter = new Intl.DateTimeFormat('en-US', options);
      const parts = formatter.formatToParts(localDate);
      
      // Reconstruct the date in the correct timezone
      const year = parts.find(p => p.type === 'year')?.value;
      const month = parts.find(p => p.type === 'month')?.value;
      const day = parts.find(p => p.type === 'day')?.value;
      const hour = parts.find(p => p.type === 'hour')?.value;
      const minute = parts.find(p => p.type === 'minute')?.value;
      const second = parts.find(p => p.type === 'second')?.value;
      
      // Create a new date string in ISO format
      const isoDateStr = `${year}-${month}-${day}T${hour}:${minute}:${second}`;
      
      // Create a new date object from the ISO string
      const dateInTimezone = new Date(isoDateStr);
      
      // Return the UTC ISO string
      return dateInTimezone.toISOString();
    };
    
    // Map Swoogo pillar values to Webflow pillar IDs
    const pillarMapping: Record<string, string> = {
      'Connect': '67ce5781f71b4b2d91c44df4',
      'Scale': '67ce576fe8288f21bdeb494a',
      'Start': '67ce5760f155bc0716caaecd'
    }
    
    // Map Swoogo webhook data to Webflow fields
    const webflowFields = {
      pillar: pillarMapping[webhookPayload.event.c_95742?.value as string] || "", // Map pillar value to ID
      "is-featured-event": false,
      "ticket-price": "", // Will be updated later when handling paid events
      "rsvp-link": `${webhookPayload.event.domain}/${webhookPayload.event.url}`, // Construct RSVP link with protocol and slash
      "meeting-room": "", // Not provided in Swoogo payload
      shortdescription: "", // Will be updated later when Swoogo field is added
      location: webhookPayload.event.event_location_name || "", // Only use location name
      "end-date-time": convertToUTC(webhookPayload.event.end_date, webhookPayload.event.end_time, webhookPayload.event.timezone),
      "start-date-time": convertToUTC(webhookPayload.event.start_date, webhookPayload.event.start_time, webhookPayload.event.timezone),
      image: webhookPayload.event.c_95697?.startsWith('//') ? `https:${webhookPayload.event.c_95697}` : webhookPayload.event.c_95697 || "", // Add https: prefix if URL starts with //
      name: webhookPayload.event.name,
      slug: webhookPayload.event.url // Using Swoogo's URL as the slug
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
        items: [{
          isArchived: false,
          isDraft: false,
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