import { defineEventHandler, readBody } from 'h3'
import { serverSupabaseServiceRole } from '#supabase/server'

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
    const supabase = await serverSupabaseServiceRole(event)
    
    console.log('Received webhook payload:', webhookPayload)
    
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
    
    // Delete Webflow item
    const webflowResponse = await fetch(`https://api.webflow.com/v2/collections/${collectionId}/items/${eventData.webflow_id}`, {
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
    
    console.log('Deleted Webflow item:', eventData.webflow_id)

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

    // Delete event in OfficeRnD
    const deleteEventResponse = await fetch(`https://app.officernd.com/api/v1/organizations/gradient/events/${eventData.officernd_id}`, {
      method: 'DELETE',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        authorization: `Bearer ${tokenData.access_token}`
      }
    });

    if (!deleteEventResponse.ok) {
      console.error('Failed to delete OfficeRnD event:', await deleteEventResponse.text());
      throw new Error('Failed to delete OfficeRnD event');
    }

    console.log('Deleted OfficeRnD event:', eventData.officernd_id);

    // Delete the event from Supabase
    const { error: deleteSupabaseError } = await supabase
      .from('events')
      .delete()
      .eq('swoogo_id', webhookPayload.event.id);

    if (deleteSupabaseError) {
      console.error('Error deleting event from Supabase:', deleteSupabaseError);
      throw new Error('Failed to delete event from Supabase');
    }
    
    return {
      statusCode: 200,
      body: {
        message: 'Event deleted successfully',
        webflow_id: eventData.webflow_id,
        officernd_id: eventData.officernd_id
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