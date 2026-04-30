import * as postmark from 'postmark';
import HTMLtoDOCX from '@turbodocx/html-to-docx';

/**
 * Postmark client for sending emails.
 */
export const postmarkClient = new postmark.ServerClient(process.env.POSTMARK_SERVER_TOKEN || '');

/**
 * Sends an article to Kindle via email in DOCX format.
 * 
 * @param to - Recipient Kindle email address
 * @param originalTitle - Article title
 * @param htmlContent - Article HTML content
 * @returns Promise with Postmark response
 */
export async function sendEmailToKindle(to: string, originalTitle: string, htmlContent: string) {
  try {
    // Convert HTML to DOCX
    // Using empty strings for header/footer instead of null for better compatibility
    const docxBuffer = await HTMLtoDOCX(htmlContent, '', {
      title: originalTitle,
      creator: 'Instapaper to Kindle',
      orientation: 'portrait',
      margins: { top: 720 },
    }, '');

    const filename = originalTitle
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/gi, '_')
      .toLowerCase() + '.docx';

    return await postmarkClient.sendEmail({
      From: process.env.POSTMARK_FROM_EMAIL || '',
      To: to,
      Subject: originalTitle,
      // Send a simple HTML body so the Kindle service focuses on the attachment
      HtmlBody: `<p>Article: <strong>${originalTitle}</strong></p><p>Sent from Kindle-Instapaper.</p>`,
      Attachments: [
        {
          Name: filename,
          Content: Buffer.from(docxBuffer as Buffer).toString('base64'),
          ContentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          ContentID: null,
        },
      ],
    });
  } catch (error) {
    console.error('Error in sendEmailToKindle during conversion:', error);
    // Log a snippet of the HTML to help debug "unsupported file type" errors
    console.error('HTML content snippet:', htmlContent.substring(0, 500));
    throw error;
  }
}
