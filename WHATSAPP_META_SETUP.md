# WhatsApp Bot Setup - Meta WhatsApp Business API

This guide will help you set up the WhatsApp bot using Meta's official WhatsApp Business API (Cloud API), which is **free** and more reliable than Twilio.

## Why Meta WhatsApp API?

✅ **Free tier**: 1,000 conversations per month  
✅ **Official API**: Direct from Meta (WhatsApp)  
✅ **Better reliability**: No sandbox limitations  
✅ **Easier setup**: No complex approval process  
✅ **Production ready**: Works immediately  

## Setup Steps

### 1. Create Meta Business Account

1. Go to [Meta for Developers](https://developers.facebook.com/)
2. Click "My Apps" → "Create App"
3. Select "Business" as the app type
4. Fill in app details and create

### 2. Add WhatsApp Product

1. In your app dashboard, click "Add Product"
2. Find "WhatsApp" and click "Set Up"
3. You'll be taken to the WhatsApp setup flow

### 3. Get Your Credentials

You'll need these from Meta:

1. **Phone Number ID**: 
   - Go to WhatsApp → API Setup
   - Copy the "Phone number ID" (looks like: `123456789012345`)

2. **Access Token**:
   - In API Setup, find "Temporary access token"
   - For production, create a System User and get a permanent token
   - Copy the token (starts with `EAAB...`)

3. **App Secret** (optional, for webhook verification):
   - Go to Settings → Basic
   - Copy "App Secret"

4. **Webhook Verify Token** (create your own):
   - Create a random string (e.g., `my_secure_verify_token_12345`)

### 4. Configure Environment Variables

Add these to your `.env` file:

```env
# Meta WhatsApp Business API Configuration
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id_here
WHATSAPP_ACCESS_TOKEN=your_access_token_here
WHATSAPP_WEBHOOK_VERIFY_TOKEN=your_verify_token_here
WHATSAPP_APP_SECRET=your_app_secret_here  # Optional, for webhook verification
```

### 5. Configure Webhook

1. **Get your webhook URL**:
   - Production: `https://your-domain.com/whatsapp/webhook`
   - Local testing: Use ngrok (see below)

2. **In Meta Dashboard**:
   - Go to WhatsApp → Configuration
   - Click "Edit" on Webhook
   - Enter your webhook URL
   - Enter your Verify Token (same as in `.env`)
   - Subscribe to these fields:
     - `messages`
     - `message_status`

3. **Verify Webhook**:
   - Meta will send a GET request to verify
   - Your server should return the challenge (already implemented)

### 6. Test Locally with ngrok

```bash
# Install ngrok
npm install -g ngrok

# Start your server
npm run start:dev

# In another terminal, create tunnel
ngrok http 3000

# Copy the HTTPS URL (e.g., https://abc123.ngrok.io)
# Use this in Meta webhook configuration: https://abc123.ngrok.io/whatsapp/webhook
```

### 7. Test the Bot

1. Send "Hello" to your WhatsApp Business number
2. Follow the conversation flow
3. Check server logs for debugging
4. Verify lead is created in Zoho CRM

## API Endpoints

### Webhook Verification (GET)
```
GET /whatsapp/webhook?hub.mode=subscribe&hub.verify_token=YOUR_TOKEN&hub.challenge=CHALLENGE
```

### Webhook (POST) - Receive Messages
```
POST /whatsapp/webhook
```

### Health Check
```
GET /whatsapp/health
```

## Free Tier Limits

- **1,000 conversations per month** (free)
- Each conversation = 24-hour window
- After 24 hours, you need to use message templates

## Message Templates (For 24+ Hour Conversations)

After 24 hours, you can only send pre-approved message templates. To create templates:

1. Go to WhatsApp → Message Templates
2. Click "Create Template"
3. Fill in template details
4. Submit for approval (usually instant for simple templates)

Example template:
```
Template Name: loan_application_update
Category: UTILITY
Language: en
Body: Your loan application has been received. We'll contact you within 24 hours.
```

## Troubleshooting

### Messages not being received?

1. ✅ Check webhook URL is correct in Meta Dashboard
2. ✅ Verify server is running and accessible
3. ✅ Check server logs for errors
4. ✅ Ensure credentials are correct in `.env`
5. ✅ Verify webhook is subscribed to `messages` field

### "Invalid OAuth access token" error?

- Your access token may have expired
- Generate a new token in Meta Dashboard
- For production, use a System User token (doesn't expire)

### Webhook verification failing?

- Ensure `WHATSAPP_WEBHOOK_VERIFY_TOKEN` matches in both `.env` and Meta Dashboard
- Check that your server is accessible (use ngrok for local testing)

### Messages not sending?

- Check phone number format (should be international without +)
- Verify `WHATSAPP_PHONE_NUMBER_ID` is correct
- Check access token permissions
- Review Meta Dashboard → WhatsApp → API Status

### Rate Limits?

- Free tier: 1,000 conversations/month
- Upgrade to paid tier for more capacity
- Check usage in Meta Dashboard

## Migration from Twilio

If you were using Twilio before:

1. ✅ Remove Twilio environment variables
2. ✅ Add Meta WhatsApp variables (see above)
3. ✅ Update webhook URL in Meta Dashboard
4. ✅ Test with a few messages
5. ✅ Remove `twilio` package (optional):
   ```bash
   npm uninstall twilio
   ```

## Production Setup

### 1. Get Permanent Access Token

1. Go to Business Settings → System Users
2. Create a System User
3. Assign WhatsApp permissions
4. Generate token (doesn't expire)

### 2. Use Environment-Specific Tokens

```env
# Development
WHATSAPP_PHONE_NUMBER_ID=dev_phone_id
WHATSAPP_ACCESS_TOKEN=dev_token

# Production
WHATSAPP_PHONE_NUMBER_ID=prod_phone_id
WHATSAPP_ACCESS_TOKEN=prod_token
```

### 3. Set Up Monitoring

- Monitor webhook delivery in Meta Dashboard
- Set up alerts for failed messages
- Track conversation completion rates

## Support

- [Meta WhatsApp API Docs](https://developers.facebook.com/docs/whatsapp)
- [WhatsApp Business API Guide](https://developers.facebook.com/docs/whatsapp/cloud-api)
- Check server logs for detailed error messages
- Review Meta Dashboard for API status

## Next Steps

1. ✅ Set up Meta Business Account
2. ✅ Get credentials and add to `.env`
3. ✅ Configure webhook
4. ✅ Test with a few messages
5. ✅ Monitor usage and upgrade if needed
