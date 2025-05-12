import { defineEventHandler, readBody } from 'h3'
import { serverSupabaseServiceRole } from '#supabase/server'

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
    
    const supabase = await serverSupabaseServiceRole(event)
    const officeId = "6602e576ef1d2a70ca915a07"
    
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
    
    console.log('Querying Supabase for event with Swoogo ID:', webhookPayload.event.id)
    // Get the event from Supabase using the Swoogo ID
    const { data: eventData, error: supabaseError } = await supabase
      .from('events')
      .select('*')
      .eq('swoogo_id', webhookPayload.event.id)
      .single()

    if (supabaseError || !eventData) {
      console.error('Error fetching event from Supabase:', supabaseError)
      return {
        statusCode: 404,
        body: 'Event not found in database'
      }
    }
    
    console.log('Found event in Supabase:', JSON.stringify(eventData, null, 2))

    // Check if we have the required IDs
    if (!eventData.webflow_id) {
      console.error('Missing Webflow ID in Supabase record')
      throw new Error('Missing Webflow ID in database record')
    }

    if (!eventData.officernd_id) {
      console.error('Missing OfficeRnD ID in Supabase record')
      throw new Error('Missing OfficeRnD ID in database record')
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
      "end-date-time": convertToUTC(webhookPayload.event.end_date, webhookPayload.event.end_time),
      "start-date-time": convertToUTC(webhookPayload.event.start_date, webhookPayload.event.start_time),
      image: webhookPayload.event.c_95697?.startsWith('//') ? `https:${webhookPayload.event.c_95697}` : webhookPayload.event.c_95697 || "",
      name: webhookPayload.event.name,
      slug: webhookPayload.event.url.replace(/^\//, '').replace(/[^a-zA-Z0-9-_]/g, '-')
    }

    console.log('Prepared Webflow fields:', JSON.stringify(webflowFields, null, 2))

    // Map Officernd fields
    const officerndFields = {
      title: webhookPayload.event.name,
      office: officeId,
      start: convertToUTC(webhookPayload.event.start_date, webhookPayload.event.start_time),
      end: convertToUTC(webhookPayload.event.end_date, webhookPayload.event.end_time),
      links: [`${webhookPayload.event.domain}/${webhookPayload.event.url}`],
      image: webhookPayload.event.c_95697?.startsWith('//') ? `https:${webhookPayload.event.c_95697}` : webhookPayload.event.c_95697 || "",
      timezone: "America/Chicago",
      description: ""
    }

    console.log('Prepared OfficeRnD fields:', JSON.stringify(officerndFields, null, 2))
    
    console.log('Updating Webflow item:', eventData.webflow_id)
    // Update Webflow item
    const webflowResponse = await fetch(`https://api.webflow.com/v2/collections/${collectionId}/items/${eventData.webflow_id}`, {
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
    
    if (!webflowResponse.ok) {
      const errorText = await webflowResponse.text()
      console.error('Webflow API error response:', errorText)
      throw new Error(`Failed to update Webflow item: ${webflowResponse.statusText} - ${errorText}`)
    }
    
    const updatedWebflowItem = await webflowResponse.json()
    console.log('Successfully updated Webflow item:', JSON.stringify(updatedWebflowItem, null, 2))

    console.log('Getting OfficeRnD OAuth token...')
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
    console.log('Successfully obtained OfficeRnD token')

    console.log('Updating OfficeRnD event:', eventData.officernd_id)
    // Update event in OfficeRnD
    const updateEventResponse = await fetch(`https://app.officernd.com/api/v1/organizations/gradient/events/${eventData.officernd_id}`, {
      method: 'PUT',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        authorization: `Bearer ${tokenData.access_token}`
      },
      body: JSON.stringify(officerndFields)
    });

    if (!updateEventResponse.ok) {
      console.error('Failed to update OfficeRnD event:', await updateEventResponse.text());
      throw new Error('Failed to update OfficeRnD event');
    }

    const updatedOfficerndEvent = await updateEventResponse.json();
    console.log('Successfully updated OfficeRnD event:', JSON.stringify(updatedOfficerndEvent, null, 2))
    
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