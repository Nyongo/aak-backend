# WhatsApp Bot Integration Setup

This guide will help you set up the WhatsApp bot functionality in your existing backend.

## What Was Added

1. **Prisma Model**: `WhatsAppConversation` - Stores conversation state for each user
2. **WhatsApp Module**: Complete module with controller, services, and conversation flow
3. **Integration**: Connected to your existing `ZohoCrmService` for lead creation

## Setup Steps

### 1. Install Dependencies

The WhatsApp integration uses Twilio. Check if you need to install it:

```bash
cd jf-backend
npm install twilio
```

### 2. Run Database Migration

Add the new `WhatsAppConversation` table to your database:

```bash
# Generate Prisma client with new model
npx prisma generate

# Create and run migration
npx prisma migrate dev --name add_whatsapp_conversations

# Or if you prefer to create migration manually first:
npx prisma migrate dev --create-only --name add_whatsapp_conversations
# Review the migration file, then:
npx prisma migrate dev
```

### 3. Configure Environment Variables

Add these to your `.env` file:

```env
# Twilio WhatsApp API Configuration
TWILIO_ACCOUNT_SID=your_account_sid_here
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_WHATSAPP_NUMBER=+14155238886

# WhatsApp Webhook (for Meta WhatsApp API - optional)
WHATSAPP_WEBHOOK_VERIFY_TOKEN=your_verify_token_here
```

**To get Twilio credentials:**
1. Sign up at https://www.twilio.com
2. Go to Console Dashboard
3. Get your Account SID and Auth Token
4. Get a WhatsApp-enabled phone number (sandbox or production)

### 4. Start Your Server

```bash
npm run start:dev
```

The WhatsApp webhook will be available at:
- `GET /whatsapp/webhook` - Webhook verification
- `POST /whatsapp/webhook` - Receive messages
- `GET /whatsapp/health` - Health check

### 5. Configure Twilio Webhook

1. Go to Twilio Console → Phone Numbers → Manage → Active Numbers
2. Click on your WhatsApp number
3. In "Messaging" section, set webhook URL to:
   ```
   https://your-domain.com/whatsapp/webhook
   ```
4. Save

### 6. Test Locally with ngrok

For local testing, use ngrok to expose your server:

```bash
# Install ngrok
npm install -g ngrok

# Start your server
npm run start:dev

# In another terminal, create tunnel
ngrok http 3000

# Use the ngrok HTTPS URL in Twilio webhook:
# https://abc123.ngrok.io/whatsapp/webhook
```

### 7. Test the Bot

1. Send "Hello" to your Twilio WhatsApp number
2. Follow the conversation flow
3. Check server logs for debugging
4. Verify lead is created in Zoho CRM

## Conversation Flow

The bot follows this flow (matching your visualization):

1. **Initial** → User says "Hello"
2. **Collect Name** → Full name
3. **Verify Phone** → Confirm phone number
4. **Collect Email** → Optional email
5. **Select Type** → SME (1) or School Director (2)
6. **Check Registration** → Is business registered?
7. **Check Logbook** → Do you have car logbook?
8. **Collect Business Name** → Business name
9. **Collect Business Type** → Type of business
10. **Collect Region** → Operating region
11. **Collect Years** → Years in operation
12. **Check Statements** → Bank/M-Pesa statements available?
13. **Collect Loan Amount** → Desired loan amount
14. **Collect Loan Purpose** → Purpose of loan
15. **Confirmation** → Lead created in Zoho CRM

## API Endpoints

### Webhook (Twilio/Meta)
```
POST /whatsapp/webhook
```

### Health Check
```
GET /whatsapp/health
```

## Integration with Existing Systems

The WhatsApp bot integrates with:

- **ZohoCrmService**: Creates leads automatically when conversation completes
- **Prisma**: Stores conversation state in `WhatsAppConversation` table
- **Existing Lead DTO**: Uses your `CreateLeadDto` format

## Lead Data Mapping

The bot maps conversation data to your `CreateLeadDto`:

```typescript
{
  name: fullName,
  email: email (optional),
  phone: phoneNumber,
  company: businessName,
  industry: businessType,
  message: "Loan Purpose: ...\nLoan Amount: ...\nRegion: ...",
  source: "whatsapp_bot",
  leadStatus: "New",
  city: region
}
```

## Troubleshooting

### Messages not being received?

1. Check webhook URL is correct in Twilio Console
2. Verify server is running and accessible
3. Check server logs for errors
4. Ensure Twilio credentials are correct in `.env`

### Lead not created in Zoho?

1. Check `ZohoCrmService` configuration
2. Verify Zoho API credentials
3. Check server logs for Zoho API errors
4. Ensure conversation completed all steps

### Conversation state lost?

- Conversation state is stored in database
- Each phone number has one active conversation
- State persists across server restarts

### Database errors?

1. Make sure migration ran successfully:
   ```bash
   npx prisma migrate status
   ```
2. Regenerate Prisma client:
   ```bash
   npx prisma generate
   ```

## Next Steps

1. **Add Error Handling**: Implement retry logic for failed messages
2. **Add Timeouts**: Handle users who don't respond for extended periods
3. **Add Analytics**: Track conversion rates and drop-off points
4. **Add Templates**: Use WhatsApp message templates for better UX
5. **Add Media Support**: Allow users to upload documents/images
6. **Add Multi-language**: Support multiple languages

## Files Created

- `src/jf/whatsapp/whatsapp.module.ts` - Module definition
- `src/jf/whatsapp/whatsapp.controller.ts` - Webhook controller
- `src/jf/whatsapp/whatsapp.service.ts` - Twilio integration
- `src/jf/whatsapp/conversation.service.ts` - Conversation flow logic
- `prisma/schema.prisma` - Added `WhatsAppConversation` model

## Support

For issues or questions:
- Check server logs for detailed error messages
- Review Twilio Console for message delivery status
- Verify all environment variables are set correctly
