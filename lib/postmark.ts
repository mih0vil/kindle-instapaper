import * as postmark from 'postmark';

/**
 * Postmark client for sending emails.
 */
export const postmarkClient = new postmark.ServerClient(process.env.POSTMARK_SERVER_TOKEN || '');

/**
 * Sends an article to Kindle via email.
 * 
 * @param to - Recipient Kindle email address
 * @param originalTitle - Article title
 * @param htmlContent - Article HTML content
 * @returns Promise with Postmark response
 */
export async function sendEmailToKindle(to: string, originalTitle: string, htmlContent: string) {
  const title = originalTitle
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/gi, '_')
    .toLowerCase() + '.html';

  return postmarkClient.sendEmail({
    From: process.env.POSTMARK_FROM_EMAIL || '',
    To: to,
    Subject: originalTitle,
    HtmlBody: htmlContent,
    Attachments: [
      {
        Name: title,
        Content: Buffer.from(htmlContent).toString('base64'),
        ContentType: 'text/html',
        ContentID: null,
      },
    ],
  });
}
