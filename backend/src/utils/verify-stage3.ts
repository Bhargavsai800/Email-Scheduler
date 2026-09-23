import { emailService } from '../services/email.service';
import { scheduleEmailSchema } from '../controllers/email.controller';
import { emailQueue, scheduleEmailJob } from '../queues/email.queue';
import { config } from '../config/env';

async function verifyStage3() {
  console.log('\n======================================================');
  console.log('       STAGE 3 COMPREHENSIVE VERIFICATION SUITE       ');
  console.log('======================================================\n');

  let passed = 0;
  let total = 0;

  function assert(testName: string, condition: boolean, details?: string) {
    total++;
    if (condition) {
      passed++;
      console.log(`[PASS] ${testName} ${details ? `(${details})` : ''}`);
    } else {
      console.error(`[FAIL] ${testName} ${details ? `(${details})` : ''}`);
    }
  }

  // 1. Validate Zod Request Validation Schema
  console.log('--- 1. Testing Schedule Email Request Validation ---');

  // Test valid payload
  const futureDate = new Date(Date.now() + 60000).toISOString();
  const validPayload = {
    recipient: 'test@example.com',
    subject: 'Stage 3 Test Email',
    body: 'Hello from ReachInbox Email Scheduler',
    scheduledAt: futureDate,
  };
  const validRes = scheduleEmailSchema.safeParse(validPayload);
  assert('Valid payload passes validation', validRes.success);

  // Test invalid email
  const invalidEmailRes = scheduleEmailSchema.safeParse({
    ...validPayload,
    recipient: 'not-an-email',
  });
  assert('Invalid email is rejected', !invalidEmailRes.success, 'correctly caught invalid email');

  // Test past date rejection
  const pastDateRes = scheduleEmailSchema.safeParse({
    ...validPayload,
    scheduledAt: '2020-01-01T00:00:00.000Z',
  });
  assert('Past scheduledAt is rejected', !pastDateRes.success, 'correctly caught past timestamp');

  // Test empty subject rejection
  const emptySubjectRes = scheduleEmailSchema.safeParse({
    ...validPayload,
    subject: '   ',
  });
  assert('Empty subject is rejected', !emptySubjectRes.success, 'correctly caught empty subject');

  // 2. Test Ethereal SMTP Service
  console.log('\n--- 2. Testing Ethereal SMTP Email Delivery ---');
  try {
    const isConfigured = Boolean(config.ethereal.user && config.ethereal.password);
    assert(
      'Ethereal SMTP credentials configured in environment',
      isConfigured,
      `User: ${config.ethereal.user}`
    );

    if (isConfigured) {
      console.log('Dispatching test message via Ethereal SMTP...');
      const sendResult = await emailService.sendEmail({
        recipient: 'destination@ethereal.email',
        subject: 'ReachInbox Stage 3 Ethereal Test',
        body: 'This is a verified test email sent via Ethereal SMTP for ReachInbox Email Scheduler.',
      });

      assert(
        'Email sent successfully with messageId',
        Boolean(sendResult.messageId),
        `MessageId: ${sendResult.messageId}`
      );
      assert(
        'Ethereal preview URL generated',
        Boolean(sendResult.previewUrl),
        `Preview URL: ${sendResult.previewUrl}`
      );
    }
  } catch (smtpErr) {
    assert(
      'Ethereal SMTP delivery test',
      false,
      smtpErr instanceof Error ? smtpErr.message : String(smtpErr)
    );
  }

  // 3. Test Queue Configuration & Logical Job ID Strategy
  console.log('\n--- 3. Testing BullMQ Queue Configuration ---');
  assert('BullMQ Queue name matches config', emailQueue.name === config.emailQueueName);
  assert('BullMQ default job attempts set to 3', emailQueue.defaultJobOptions?.attempts === 3);

  console.log('\n======================================================');
  console.log(` Stage 3 Test Results: ${passed}/${total} passed`);
  console.log('======================================================\n');

  await emailQueue.close().catch(() => {});
  process.exit(passed === total ? 0 : 1);
}

verifyStage3();
