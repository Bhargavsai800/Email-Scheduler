import React, { useState, useMemo } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Button } from '../../components/ui/Button';
import { scheduleEmail, batchScheduleEmails } from '../../services/api';
import { ScheduledEmail } from '../../types';
import {
  Send,
  Calendar,
  Clock,
  Mail,
  FileText,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Upload,
  Users,
  Check,
  AlertTriangle,
  Layers,
  Gauge,
  Timer,
} from 'lucide-react';

export interface ComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScheduled: (email: ScheduledEmail) => void;
}

export const ComposeModal: React.FC<ComposeModalProps> = ({
  isOpen,
  onClose,
  onScheduled,
}) => {
  const [mode, setMode] = useState<'single' | 'batch'>('single');

  // Single mode fields
  const [recipient, setRecipient] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [scheduleType, setScheduleType] = useState<'preset' | 'custom'>('preset');
  const [selectedPresetSeconds, setSelectedPresetSeconds] = useState<number>(30);

  // Batch mode fields
  const [batchRawText, setBatchRawText] = useState('');
  const [batchDelaySeconds, setBatchDelaySeconds] = useState<number>(2);
  const [fileName, setFileName] = useState<string | null>(null);

  // Default custom date-time to 1 hour from now formatted for datetime-local
  const getInitialCustomDate = () => {
    const d = new Date(Date.now() + 60 * 60 * 1000);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const [customDateTime, setCustomDateTime] = useState<string>(getInitialCustomDate);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const presets = [
    { label: 'In 10 sec (Demo)', seconds: 10 },
    { label: 'In 30 sec', seconds: 30 },
    { label: 'In 1 min', seconds: 60 },
    { label: 'In 10 mins', seconds: 600 },
    { label: 'In 1 hour', seconds: 3600 },
  ];

  // Parse and deduplicate emails in real-time from batch raw text
  const parsedLeads = useMemo(() => {
    if (!batchRawText.trim()) {
      return { total: 0, unique: [], duplicatesCount: 0 };
    }

    // Extract all email patterns across CSV, TSV, commas, newlines, semicolons
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi;
    const matches = batchRawText.match(emailRegex) || [];
    const normalized = matches.map((e) => e.toLowerCase().trim());

    const seen = new Set<string>();
    const unique: string[] = [];
    for (const email of normalized) {
      if (!seen.has(email)) {
        seen.add(email);
        unique.push(email);
      }
    }

    return {
      total: normalized.length,
      unique,
      duplicatesCount: normalized.length - unique.length,
    };
  }, [batchRawText]);

  // Handle CSV/text file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setBatchRawText(content);
      }
    };
    reader.readAsText(file);
  };

  const handleFillDemo = () => {
    if (mode === 'single') {
      setRecipient('candidate@reachinbox.ai');
      setSubject('Welcome to ReachInbox Email Scheduler Demo');
      setBody(
        'Hello from ReachInbox!\n\nThis email was scheduled using BullMQ delayed jobs with Redis rate limiting, delivered through Ethereal SMTP, and indexed in Elasticsearch.'
      );
      setSelectedPresetSeconds(10);
      setScheduleType('preset');
    } else {
      setBatchRawText(
        `alpha@example.com, beta@example.com\ngamma@example.com\nalpha@example.com\n"delta@example.com","Marketing Lead"\nepsilon@example.com`
      );
      setSubject('ReachInbox Assignment: Batch Lead Outreach Demo');
      setBody(
        'Hello,\n\nThis personalized email campaign is powered by ReachInbox automated delayed queueing, distributed rate limiting, and BullMQ worker execution.'
      );
      setBatchDelaySeconds(2);
      setSelectedPresetSeconds(10);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Validation
    if (!subject.trim()) {
      setError('Please provide an email subject line.');
      return;
    }
    if (!body.trim()) {
      setError('Please write message body content.');
      return;
    }

    let targetScheduledAt: string;
    if (scheduleType === 'preset') {
      targetScheduledAt = new Date(
        Date.now() + selectedPresetSeconds * 1000
      ).toISOString();
    } else {
      const parsedDate = new Date(customDateTime);
      if (isNaN(parsedDate.getTime())) {
        setError('Invalid custom scheduled date.');
        return;
      }
      if (parsedDate.getTime() <= Date.now()) {
        setError('Scheduled date must be in the future.');
        return;
      }
      targetScheduledAt = parsedDate.toISOString();
    }

    setIsSubmitting(true);

    try {
      if (mode === 'single') {
        if (!recipient.trim() || !recipient.includes('@')) {
          setError('Please provide a valid recipient email address.');
          setIsSubmitting(false);
          return;
        }

        const scheduled = await scheduleEmail({
          recipient: recipient.trim(),
          subject: subject.trim(),
          body: body.trim(),
          scheduledAt: targetScheduledAt,
        });

        setSuccess(
          `Email queued successfully! Job ID: ${scheduled.bullJobId || scheduled.id}`
        );
        onScheduled(scheduled);

        setTimeout(() => {
          setRecipient('');
          setSubject('');
          setBody('');
          setSuccess(null);
          onClose();
        }, 1200);
      } else {
        // Batch Mode
        if (parsedLeads.unique.length === 0) {
          setError('No valid email leads found. Upload a CSV or paste email addresses.');
          setIsSubmitting(false);
          return;
        }

        const batchRes = await batchScheduleEmails({
          recipients: parsedLeads.unique,
          subject: subject.trim(),
          body: body.trim(),
          startTime: targetScheduledAt,
          delayBetweenEmailsMs: batchDelaySeconds * 1000,
        });

        setSuccess(
          `Batch scheduled successfully! ${batchRes.scheduledCount} unique emails queued across BullMQ.`
        );

        if (batchRes.emails && batchRes.emails.length > 0) {
          onScheduled(batchRes.emails[0]);
        }

        setTimeout(() => {
          setBatchRawText('');
          setFileName(null);
          setSubject('');
          setBody('');
          setSuccess(null);
          onClose();
        }, 1500);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to schedule email(s).');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center space-x-2">
          <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
            <Mail className="w-4 h-4" />
          </div>
          <span>Compose & Schedule Email</span>
        </div>
      }
      description="Create single or batch email jobs with automated BullMQ delay pacing and rate-limit protection."
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Mode Selector Tabs */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center rounded-xl bg-slate-950 p-1 border border-slate-800">
            <button
              type="button"
              onClick={() => setMode('single')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                mode === 'single'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Single Email</span>
            </button>
            <button
              type="button"
              onClick={() => setMode('batch')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                mode === 'batch'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Batch Leads (CSV / Text)</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleFillDemo}
            className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 underline cursor-pointer flex items-center space-x-1"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Auto-fill Demo</span>
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{success}</span>
          </div>
        )}

        {/* Recipient Input (Single Mode) */}
        {mode === 'single' ? (
          <Input
            label="To (Recipient)"
            type="email"
            required
            placeholder="recipient@example.com"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            icon={<Mail className="w-3.5 h-3.5 text-slate-500" />}
          />
        ) : (
          /* Batch Leads Uploader & Textarea (Batch Mode) */
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-slate-300">
                Lead Recipients (CSV file or raw list)
              </label>

              {parsedLeads.unique.length > 0 && (
                <div className="flex items-center space-x-2 text-[11px]">
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                    {parsedLeads.unique.length} Valid Unique
                  </span>
                  {parsedLeads.duplicatesCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium">
                      {parsedLeads.duplicatesCount} Dupes Removed
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* CSV File Upload Dropzone */}
            <div className="relative border border-dashed border-slate-800 hover:border-slate-700 bg-slate-950/40 rounded-xl p-3 flex items-center justify-between text-xs transition-colors">
              <div className="flex items-center space-x-2.5">
                <Upload className="w-4 h-4 text-indigo-400" />
                <span className="text-slate-300">
                  {fileName ? (
                    <span className="font-mono text-indigo-300">{fileName}</span>
                  ) : (
                    'Upload CSV or TXT file with emails'
                  )}
                </span>
              </div>
              <label className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-medium cursor-pointer transition-colors">
                Browse File
                <input
                  type="file"
                  accept=".csv,.txt,.tsv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>

            {/* Paste Box */}
            <Textarea
              rows={3}
              placeholder="Or paste leads here (comma, semicolon, or newline separated)...&#10;e.g. alice@acme.com, bob@acme.com, carol@acme.com"
              value={batchRawText}
              onChange={(e) => setBatchRawText(e.target.value)}
            />
          </div>
        )}

        {/* Subject */}
        <Input
          label="Subject"
          type="text"
          required
          placeholder="Email subject line..."
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          icon={<FileText className="w-3.5 h-3.5 text-slate-500" />}
        />

        {/* Message Body */}
        <Textarea
          label="Message Body"
          required
          rows={4}
          placeholder="Write your email content here..."
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />

        {/* Scheduling & Pacing Options */}
        <div className="pt-2 border-t border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-slate-300 flex items-center space-x-1.5">
              <Clock className="w-3.5 h-3.5 text-indigo-400" />
              <span>
                {mode === 'batch' ? 'Campaign Start Time' : 'When should this email be delivered?'}
              </span>
            </label>

            <div className="flex items-center rounded-lg bg-slate-950 p-0.5 border border-slate-800 text-[11px]">
              <button
                type="button"
                onClick={() => setScheduleType('preset')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  scheduleType === 'preset'
                    ? 'bg-indigo-600 text-white font-medium'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Presets
              </button>
              <button
                type="button"
                onClick={() => setScheduleType('custom')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  scheduleType === 'custom'
                    ? 'bg-indigo-600 text-white font-medium'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Custom Time
              </button>
            </div>
          </div>

          {scheduleType === 'preset' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {presets.map((preset) => (
                <button
                  key={preset.seconds}
                  type="button"
                  onClick={() => setSelectedPresetSeconds(preset.seconds)}
                  className={`p-2.5 rounded-xl border text-xs text-left transition-all cursor-pointer ${
                    selectedPresetSeconds === preset.seconds
                      ? 'border-indigo-500 bg-indigo-500/15 text-indigo-300 font-semibold shadow-sm'
                      : 'border-slate-800 bg-slate-950/60 text-slate-300 hover:border-slate-700 hover:bg-slate-900'
                  }`}
                >
                  <div className="flex items-center space-x-1.5">
                    <Clock className="w-3 h-3 text-indigo-400" />
                    <span>{preset.label}</span>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div>
              <Input
                label="Pick Date & Time"
                type="datetime-local"
                value={customDateTime}
                onChange={(e) => setCustomDateTime(e.target.value)}
                icon={<Calendar className="w-3.5 h-3.5 text-slate-500" />}
              />
            </div>
          )}

          {/* Batch Mode Pacing & Rate Limit Options */}
          {mode === 'batch' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1.5">
                <span className="text-[11px] text-slate-400 flex items-center space-x-1.5">
                  <Timer className="w-3.5 h-3.5 text-amber-400" />
                  <span>Delay Between Sends (Pacing)</span>
                </span>
                <select
                  value={batchDelaySeconds}
                  onChange={(e) => setBatchDelaySeconds(Number(e.target.value))}
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-indigo-500 font-mono"
                >
                  <option value={2}>2 seconds (Safe Default)</option>
                  <option value={5}>5 seconds</option>
                  <option value={10}>10 seconds</option>
                  <option value={30}>30 seconds</option>
                  <option value={60}>1 minute</option>
                </select>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1.5">
                <span className="text-[11px] text-slate-400 flex items-center space-x-1.5">
                  <Gauge className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Distributed Hourly Limit</span>
                </span>
                <div className="font-mono text-xs font-semibold text-slate-200 py-1">
                  100 emails / hour (Auto-rescheduled)
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-800">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            isLoading={isSubmitting}
            icon={<Send className="w-3.5 h-3.5" />}
          >
            {mode === 'single'
              ? 'Schedule Email'
              : `Schedule Batch (${parsedLeads.unique.length} Leads)`}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
