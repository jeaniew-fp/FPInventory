'use server';

export async function sendReceiptEmail(data: {
  to: string;
  staffEmail: string;
  donorName: string;
  dateStr: string;
  pdfBase64: string;
  filename: string;
  totalFmv: number;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error('Email is not configured yet. Please download the PDF instead.');
  }

  const { Resend } = await import('resend');
  const resend = new Resend(apiKey);

  const subject = `FPGWC In-Kind Donation Receipt – ${data.donorName} – ${data.dateStr}`;
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1e1e50;">FPGWC In-Kind Donation Receipt</h2>
      <p>Dear ${data.donorName},</p>
      <p>Thank you for your generous in-kind donation to Family Promise of Greater Washington County!</p>
      <p>Please find your donation receipt attached. The total estimated fair market value of your donation is <strong>$${data.totalFmv.toFixed(2)}</strong>.</p>
      <p style="color: #666; font-size: 13px;">Family Promise of Greater Washington County is a registered 501(c)(3) nonprofit organization. No goods or services were provided in exchange for this donation.</p>
      <p style="color: #666; font-size: 13px;">Questions? Contact us at <a href="https://www.familypromisegwc.org">familypromisegwc.org</a></p>
    </div>
  `;

  // Send to donor
  await resend.emails.send({
    from: 'FPGWC <receipts@familypromisegwc.org>',
    to: data.to,
    cc: data.staffEmail,
    subject,
    html,
    attachments: [
      {
        filename: data.filename,
        content: data.pdfBase64,
      },
    ],
  });
}
