# Epic 21: Unified Communications Hub

## 1. Overview & Architecture

- **Concept**: A "Unified Inbox" where admins can view a chronological feed of all SMS and Email communications with a specific client.
- **SMS Provider**: Twilio. Each workspace (tenant) will have the ability to provision a dedicated Twilio business phone number.
- **Email Provider**: SendGrid or Resend.
- **Ingestion**: The backend will require public webhook endpoints to receive incoming messages from Twilio and email providers in real-time.

## 2. Database Requirements

- `tenant_communications_settings`: Tracks the tenant's assigned Twilio number and API keys (if bring-your-own-key) or platform billing status.
- `messages`: A unified table (`id`, `tenant_id`, `client_id`, `channel` [sms/email], `direction` [inbound/outbound], `content`, `status`, `timestamp`, `external_id`).

## 3. User Stories: Core Infrastructure

- [ ] **US-21.1: Number Provisioning** — "As an Admin, I can purchase/assign a dedicated business phone number to my workspace via Twilio integration."
- [ ] **US-21.2: SMS Sending** — "As an Admin, I can type a text message in the app and it sends to the client's phone via our Twilio number."
- [ ] **US-21.3: SMS Receiving (Webhook)** — "As a system, when a client replies to our Twilio number, a webhook intercepts the message and saves it to the client's conversation history."
- [ ] **US-21.4: Email Sending** — "As an Admin, I can compose an email in the app that sends to the client via our cloud email provider."
- [ ] **US-21.5: Call Forwarding** — "As an Admin, if a client calls my Twilio business number, I want it to automatically forward the call to my personal cell phone."

## 4. User Stories: Frontend UI

- [ ] **US-21.6: The Unified Inbox** — "As an Admin, I can navigate to a 'Communications' tab that shows a list of clients on the left, and a chat-style history on the right."
- [ ] **US-21.7: Omnichannel Feed** — "As an Admin, my chat history with a client shows both Emails and SMS messages in a single chronological feed, with visual indicators for the channel used."
