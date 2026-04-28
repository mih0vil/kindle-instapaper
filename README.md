# Sending articles from Instapaper to Kindle

This is a web application that sends articles from Instapaper to Kindle and manages Instapaper articles.

## Motivation

Kindle can be used for reading articles, not just books. The most convenient way to read articles on Kindle is to add them to Instapaper, then send them to Kindle via email. 
Previously, Instapaper had a feature to send these articles to Kindle, but recently they introduced a paywall. So I decided to create this web application to send articles from Instapaper to Kindle for free. 

## Vibe coding

This was also an opportunity to try vibe coding for the first time using Google Antigravity. I am using free version of Google LLM models.
In my experience, Gemini 3.1 pro was not working because of overload on free tier. I switched to lighter Gemini Flash models and it happened to work better.
LLM was not working all the time as it was also overloaded, but I would click retry and it would eventually work.
My prompts were not so apstract as I have experience in programming and I was afraid that ligther LLM model would not work so good but in general, as it is a free version, I am satisified and I managed to create what I wanted.

## Features

- List Instapaper articles
- Send Instapaper articles to Kindle
- Archive Instapaper articles
- Unarchive Instapaper articles
- Send bulk articles to Kindle
- Archive old articles

## Tech stack

- Next.js
- TypeScript
- Tailwind CSS
- Postmark for sending emails
- Instapaper API for fetching and managing articles

## DEV Setup

```bash
npm install
npm run dev
```

## Usage

Open [http://localhost:3235](http://localhost:3235) with your browser to see the result.

## API keys

You need to get an API key from [Instapaper](https://www.instapaper.com/developers/applications)
You also need API key for Postmark to send emails. You can get it from [Postmark](https://postmarkapp.com/) and for this you need to have email address on your own domain, not on gmail or other free email providers.
As for Kindle, your need to know email address of your Kindle device and allow sending email from Postmark to your Kindle email address.
