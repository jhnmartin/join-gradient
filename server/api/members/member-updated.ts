// Function to determine if a member should be removed from Klaviyo list
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function checkRemovalConditions(webhookPayload: any): boolean {
  const memberData = webhookPayload.data?.object
  const status = memberData?.status
  
  console.log('Checking removal conditions for status:', status)
  
  // Remove from Klaviyo list if status is not "active"
  if (status && status !== 'active') {
    console.log('Member status is not active, should remove from Klaviyo')
    return true
  }
  
  console.log('Member status is active or missing, no removal needed')
  return false
}

export default defineEventHandler(async (event) => {
  // Only allow POST requests
  if (event.method !== 'POST') {
    return {
      statusCode: 405,
      body: 'Method Not Allowed'
    }
  }

  try {
    const webhookPayload = await readBody(event)
    
    console.log('Received OfficeRnD member-updated webhook payload:', JSON.stringify(webhookPayload, null, 2))
    
    // Extract member email from the payload
    const memberEmail = webhookPayload.data?.object?.email
    
    if (!memberEmail) {
      console.error('No email found in webhook payload')
      return {
        statusCode: 400,
        body: 'No email found in webhook payload'
      }
    }
    
    console.log('Member updated - Email:', memberEmail)
    console.log('Member status:', webhookPayload.data?.object?.status)
    console.log('Event type:', webhookPayload.eventType)
    
    // Check if member should be removed from Klaviyo list
    const shouldRemoveFromList = checkRemovalConditions(webhookPayload)
    console.log('Should remove from Klaviyo list:', shouldRemoveFromList)
    
    if (shouldRemoveFromList) {
      console.log('Member meets removal conditions, removing from Klaviyo list:', memberEmail)
      console.log('Klaviyo API Key exists:', !!process.env.KLAVIYO_PRIVATE_API_KEY)
      console.log('Klaviyo API Key length:', process.env.KLAVIYO_PRIVATE_API_KEY?.length)
      
      // First, find the profile ID by email
      const profileSearchResponse = await fetch(`https://a.klaviyo.com/api/profiles/?filter=equals(email,"${memberEmail}")`, {
        method: 'GET',
        headers: {
          'accept': 'application/vnd.api+json',
          'revision': '2025-04-15',
          'Authorization': `Klaviyo-API-Key ${process.env.KLAVIYO_PRIVATE_API_KEY}`
        }
      })
      
      if (!profileSearchResponse.ok) {
        const errorText = await profileSearchResponse.text()
        console.error('Klaviyo profile search error:', errorText)
        throw new Error(`Failed to find profile in Klaviyo: ${profileSearchResponse.statusText}`)
      }
      
      const searchResult = await profileSearchResponse.json()
      const profileId = searchResult.data?.[0]?.id
      
      if (!profileId) {
        console.log('Profile not found in Klaviyo for email:', memberEmail)
        return {
          statusCode: 200,
          body: 'Member not found in Klaviyo, no removal needed'
        }
      }
      
      // Remove profile from list
      const removeResponse = await fetch('https://a.klaviyo.com/api/lists/U28wF5/relationships/profiles', {
        method: 'DELETE',
        headers: {
          'accept': 'application/vnd.api+json',
          'revision': '2025-04-15',
          'content-type': 'application/vnd.api+json',
          'Authorization': `Klaviyo-API-Key ${process.env.KLAVIYO_PRIVATE_API_KEY}`
        },
        body: JSON.stringify({
          data: [{
            type: "profile",
            id: profileId
          }]
        })
      })
      
      if (!removeResponse.ok) {
        const errorText = await removeResponse.text()
        console.error('Klaviyo list removal error:', errorText)
        throw new Error(`Failed to remove profile from Klaviyo list: ${removeResponse.statusText}`)
      }
      
      console.log('Successfully removed member from Klaviyo list:', memberEmail)
      
      return {
        statusCode: 200,
        body: 'Member removed from Klaviyo list successfully'
      }
    }
    
    return {
      statusCode: 200,
      body: 'Member update webhook received, no action needed'
    }
  } catch (error) {
    console.error('Error processing member update webhook:', error)
    return {
      statusCode: 500,
      body: 'Internal server error'
    }
  }
}) 