# Postmark API Skills

This document describes the skills and procedures for interacting with the Postmark API for sending emails, which is used in this project to send articles to Kindle.

## Base Configuration

- **Base URL:** `https://api.postmarkapp.com`
- **Authentication:** `X-Postmark-Server-Token` header (Server API Token)
- **Content-Type:** `application/json`
- **Official Library (Node.js):** `postmark`

## Core Concepts

- **Server API Token:** Specific to a "Server" in Postmark. Used for sending.
- **Account API Token:** Used for account-level management (creating servers, etc.). Not for sending.
- **Sender Signature:** A verified email address or domain that you are authorized to send from.
- **Message Streams:** Transactional (default) or Broadcast.

## Sending Emails (Node.js Library)

### Initialize Client
```javascript
const postmark = require("postmark");
const client = new postmark.ServerClient("YOUR_SERVER_API_TOKEN");
```

### Send Single Email
```javascript
client.sendEmail({
  "From": "sender@yourdomain.com",
  "To": "recipient@example.com",
  "Subject": "Hello from Postmark",
  "HtmlBody": "<strong>Hello</strong> dear Postmark user.",
  "TextBody": "Hello dear Postmark user.",
  "MessageStream": "outbound" // Optional, defaults to "outbound"
});
```

### Send with Template
```javascript
client.sendEmailWithTemplate({
  "From": "sender@yourdomain.com",
  "To": "recipient@example.com",
  "TemplateId": 12345, // Or TemplateAlias: "welcome"
  "TemplateModel": {
    "user_name": "John Doe",
    "company_name": "Acme Corp"
  }
});
```

### Send with Attachments (Crucial for Kindle)
Kindle usually requires articles to be sent as attachments (e.g., `.mobi`, `.epub`, or `.pdf`).
```javascript
const fs = require("fs");
const base64Content = fs.readFileSync("article.epub").toString("base64");

client.sendEmail({
  "From": "sender@yourdomain.com",
  "To": "your_kindle_email@kindle.com",
  "Subject": "Instapaper Article",
  "Attachments": [
    {
      "Name": "article.epub",
      "Content": base64Content,
      "ContentType": "application/epub+zip"
    }
  ]
});
```

## Batching

You can send up to 500 emails in one request.
```javascript
client.sendEmailBatch([
  { "From": "...", "To": "...", "Subject": "...", "TextBody": "..." },
  { "From": "...", "To": "...", "Subject": "...", "TextBody": "..." }
]);
```

## Error Handling

| HTTP Status | Meaning |
|-------------|---------|
| `401` | Unauthorized (Missing or invalid API token) |
| `422` | Unprocessable Entity (Invalid email, missing fields, or sender not verified) |
| `429` | Too Many Requests (Rate limit hit) |
| `500` | Internal Server Error |

Common Postmark Error Codes (in JSON response):
- `10`: Invalid API token.
- `400`: Sender Signature not found or verified.
- `401`: Sender Signature not confirmed.
- `405`: Total attachment size too large (Max 10MB).

## Testing

Use the test token: `POSTMARK_API_TEST`.
This validates the request structure without actually sending the email.
