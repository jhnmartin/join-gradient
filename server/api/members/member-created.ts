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
  
  console.log('Received OfficeRnD member webhook payload:', JSON.stringify(webhookPayload, null, 2))
  
  // Extract member email from the payload
  const memberEmail = webhookPayload.data?.object?.email
  
  if (!memberEmail) {
    console.error('No email found in webhook payload')
    return {
      statusCode: 400,
      body: 'No email found in webhook payload'
    }
  }
  
  console.log('Adding member email to Klaviyo list:', memberEmail)
  
  // Add member to Klaviyo using the latest API
  const klaviyoResponse = await fetch('https://a.klaviyo.com/api/profile-import', {
    method: 'POST',
    headers: {
      'accept': 'application/vnd.api+json',
      'revision': '2025-04-15',
      'content-type': 'application/vnd.api+json',
      'Authorization': `Su6CLk ${process.env.KLAVIYO_PRIVATE_KEY}`
    },
          body: JSON.stringify({
        data: {
          type: "profile",
          attributes: {
            email: memberEmail,
            subscriptions: {
              email: {
                marketing: {
                  can_receive_email_marketing: true,
                  consent: "SUBSCRIBED",
                  consent_timestamp: new Date().toISOString(),
                  method: "API"
                }
              },
              sms: {
                marketing: {
                  can_receive_sms_marketing: true,
                  consent: "SUBSCRIBED",
                  consent_timestamp: new Date().toISOString(),
                  method: "API"
                },
                transactional: {
                  can_receive_sms_transactional: true,
                  consent: "SUBSCRIBED",
                  consent_timestamp: new Date().toISOString(),
                  method: "API"
                }
              }
            }
          }
        }
      })
  })
  
  if (!klaviyoResponse.ok) {
    const errorText = await klaviyoResponse.text()
    console.error('Klaviyo API error response:', errorText)
    throw new Error(`Failed to add member to Klaviyo: ${klaviyoResponse.statusText} - ${errorText}`)
  }
  
  const klaviyoResult = await klaviyoResponse.json()
  console.log('Successfully created profile in Klaviyo:', klaviyoResult)
  
  // Extract profile ID from the response
  const profileId = klaviyoResult.data?.[0]?.id
  
  if (!profileId) {
    console.error('No profile ID returned from Klaviyo profile creation')
    throw new Error('Failed to get profile ID from Klaviyo response')
  }
  
  // Add profile to list
  console.log('Adding profile to Klaviyo list:', profileId)
  
  const listResponse = await fetch('https://a.klaviyo.com/api/lists/U28wF5/relationships/profiles', {
    method: 'POST',
    headers: {
      'accept': 'application/vnd.api+json',
      'revision': '2025-04-15',
      'content-type': 'application/vnd.api+json',
      'Authorization': `Su6CLk ${process.env.KLAVIYO_PRIVATE_KEY}`
    },
    body: JSON.stringify({
      data: [{
        type: "profile",
        id: profileId
      }]
    })
  })
  
  if (!listResponse.ok) {
    const errorText = await listResponse.text()
    console.error('Klaviyo list API error response:', errorText)
    throw new Error(`Failed to add profile to Klaviyo list: ${listResponse.statusText} - ${errorText}`)
  }
  
  const listResult = await listResponse.json()
  console.log('Successfully added profile to Klaviyo list:', listResult)
  
  return {
    statusCode: 200,
    body: 'Member webhook processed, profile created and added to Klaviyo list successfully'
  }
} catch (error) {
  console.error('Error processing member webhook:', error)
  return {
    statusCode: 500,
    body: 'Internal server error'
  }
}
})
