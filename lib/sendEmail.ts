import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

type SendEmailParams = {
  to: string;
  subject: string;
  html: string;
};

export async function sendEmail({ to, subject, html }: SendEmailParams) {
  if (!process.env.RESEND_API_KEY) {
    throw new Error(
      'Chýba RESEND_API_KEY. Doplň ho do .env.local alebo do Vercel Environment Variables.',
    );
  }

  if (!process.env.EMAIL_FROM) {
    throw new Error(
      'Chýba EMAIL_FROM. Doplň napríklad EMAIL_FROM="ZEDPERA <onboarding@resend.dev>".',
    );
  }

  if (!to) {
    throw new Error('Chýba príjemca e-mailu.');
  }

  if (!subject) {
    throw new Error('Chýba predmet e-mailu.');
  }

  if (!html) {
    throw new Error('Chýba HTML obsah e-mailu.');
  }

  return resend.emails.send({
    from: process.env.EMAIL_FROM,
    to,
    subject,
    html,
  });
}