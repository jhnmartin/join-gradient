import { defineEventHandler, readBody } from 'h3'
import { serverSupabaseServiceRole } from '#supabase/server'

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
    const supabase = await serverSupabaseServiceRole(event)
    // const officeId = "6602e576ef1d2a70ca915a07" // Will be used by separate OfficeRnD script
    
    console.log('Received webhook payload:', webhookPayload)
    
    // Function to convert Central time to UTC
    const convertToUTC = (date: string, time: string) => {
      try {
        // Validate inputs
        if (!date || !time) {
          console.error('Missing required date/time fields:', { date, time });
          return "";
        }

        console.log('Converting date/time:', { date, time });

        // Create a date string in the format expected by the Date constructor
        const dateTimeStr = `${date}T${time}`;
        console.log('Created date string:', dateTimeStr);
        
        // Create a date object
        const dateObj = new Date(dateTimeStr);
        if (isNaN(dateObj.getTime())) {
          console.error('Invalid date string:', dateTimeStr);
          return "";
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
        return "";
      }
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
      "rsvp-link": `${webhookPayload.event.domain}/${webhookPayload.event.url}`, // Use domain directly
      "meeting-room": "", // Not provided in Swoogo payload
      shortdescription: "", // Will be updated later when Swoogo field is added
      location: webhookPayload.event.event_location_name || "", // Only use location name
      "end-date-time": convertToUTC(webhookPayload.event.end_date, webhookPayload.event.end_time),
      "start-date-time": convertToUTC(webhookPayload.event.start_date, webhookPayload.event.start_time),
      image: webhookPayload.event.c_95697?.startsWith('//') ? `https:${webhookPayload.event.c_95697}` : webhookPayload.event.c_95697 || "", // Add https: prefix if URL starts with //
      name: webhookPayload.event.name,
      slug: webhookPayload.event.url.replace(/^\//, '').replace(/[^a-zA-Z0-9-_]/g, '-') // Clean up URL to make valid slug
    }


    //Map Officernd fields
    const officerndFields = {
      title: webhookPayload.event.name,
      office: officeId,
      start: convertToUTC(webhookPayload.event.start_date, webhookPayload.event.start_time),
      end: convertToUTC(webhookPayload.event.end_date, webhookPayload.event.end_time),
      links: [`${webhookPayload.event.domain}/${webhookPayload.event.url}`],
      image: webhookPayload.event.c_95697?.startsWith('//') ? `https:${webhookPayload.event.c_95697}` : webhookPayload.event.c_95697 || "", // Add https: prefix if URL starts with //
      timezone: "America/Chicago",
      description: ""
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
    const response = await fetch(`https://api.webflow.com/v2/collections/${collectionId}/items/live`, {
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
    const createEventResponse = await fetch('https://app.officernd.com/api/v1/organizations/gradient/events', {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        authorization: `Bearer ${tokenData.access_token}`
      },
      body: JSON.stringify(officerndFields)
    });

    if (!createEventResponse.ok) {
      console.error('Failed to create OfficeRnD event:', await createEventResponse.text());
      throw new Error('Failed to create OfficeRnD event');
    }

    const officerndEvent = await createEventResponse.json();
    console.log('Created OfficeRnD event:', officerndEvent);
    console.log('OfficeRnD event ID:', officerndEvent._id);

    // Store the event in Supabase (without OfficeRnD ID for now)
    console.log('Storing event in Supabase with IDs:', {
      swoogo_id: webhookPayload.event.id,
      webflow_id: newItem.items[0].id
    });

    const { error: supabaseError } = await supabase
      .from('events')
      .insert([{
        name: webhookPayload.event.name,
        swoogo_id: webhookPayload.event.id,
        webflow_id: newItem.items[0].id,
        officernd_id: null // Will be populated by separate script when Webflow goes live
      }])

    if (supabaseError) {
      console.error('Error storing event in Supabase:', supabaseError)
      console.error('Failed to store event with data:', {
        name: webhookPayload.event.name,
        swoogo_id: webhookPayload.event.id,
        webflow_id: newItem.items[0].id,
        officernd_id: null
      });
      // Don't throw the error since the Webflow item was created successfully
    } else {
      console.log('Successfully stored event in Supabase');
    }
    
    return {
      statusCode: 200,
      body: {
        webflow: newItem,
        message: 'Event created as draft in Webflow. OfficeRnD creation will happen when published.'
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