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
    
    console.log('Received Swoogo webhook payload:', JSON.stringify(webhookPayload, null, 2))
    
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
      swoogo: webhookPayload.event.id?.toString() || ""
    }
    
    console.log('Prepared Webflow fields:', JSON.stringify(webflowFields, null, 2))
    
    // Create the new item as draft in Webflow
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
      throw new Error(`Failed to create Webflow item: ${response.statusText} - ${errorText}`)
    }
    
    const newItem = await response.json()
    console.log('Created Webflow item (draft):', JSON.stringify(newItem, null, 2))
    
    return {
      statusCode: 200,
      body: {
        message: 'Event created successfully in Webflow as draft',
        webflow: newItem
      }
    }
  } catch (error) {
    console.error('Error processing webhook:', error)
    return {
      statusCode: 500,
      body: {
        error: 'Failed to process webhook',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
})

