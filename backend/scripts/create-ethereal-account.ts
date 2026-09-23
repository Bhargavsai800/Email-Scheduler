import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';

async function createEtherealAccount() {
  console.log('\nGenerating new Ethereal test SMTP account...\n');

  try {
    const testAccount = await nodemailer.createTestAccount();

    console.log('=======================================================');
    console.log('       NEW ETHEREAL SMTP TEST ACCOUNT CREATED          ');
    console.log('=======================================================');
    console.log(`ETHEREAL_HOST=smtp.ethereal.email`);
    console.log(`ETHEREAL_PORT=587`);
    console.log(`ETHEREAL_USER=${testAccount.user}`);
    console.log(`ETHEREAL_PASSWORD=${testAccount.pass}`);
    console.log(`ETHEREAL_FROM_EMAIL="ReachInbox Scheduler <${testAccount.user}>"`);
    console.log('=======================================================\n');

    // Optionally update .env in backend directory if credentials are empty
    const envPath = path.resolve(__dirname, '../.env');
    if (fs.existsSync(envPath)) {
      let content = fs.readFileSync(envPath, 'utf8');
      if (content.includes('ETHEREAL_USER=\n') || content.includes('ETHEREAL_USER=\r\n')) {
        content = content.replace(/ETHEREAL_USER=.*/, `ETHEREAL_USER=${testAccount.user}`);
        content = content.replace(/ETHEREAL_PASSWORD=.*/, `ETHEREAL_PASSWORD=${testAccount.pass}`);
        content = content.replace(
          /ETHEREAL_FROM_EMAIL=.*/,
          `ETHEREAL_FROM_EMAIL="ReachInbox Scheduler <${testAccount.user}>"`
        );
        fs.writeFileSync(envPath, content, 'utf8');
        console.log(`Updated ${envPath} with new Ethereal credentials automatically!\n`);
      }
    }
  } catch (error) {
    console.error('Failed to create Ethereal test account:', error);
    process.exit(1);
  }
}

createEtherealAccount();
