import React from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { EmailStatusBadge } from './StatusBadge';
import { ScheduledEmail } from '../../types';
import {
  Mail,
  User,
  Clock,
  Send,
  ExternalLink,
  Layers,
  AlertTriangle,
  Calendar,
} from 'lucide-react';

export interface EmailDetailModalProps {
  email: ScheduledEmail | null;
  isOpen: boolean;
  onClose: () => void;
}

export const EmailDetailModal: React.FC<EmailDetailModalProps> = ({
  email,
  isOpen,
  onClose,
}) => {
  if (!email) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center space-x-2">
          <Mail className="w-5 h-5 text-indigo-400" />
          <span>Email Details</span>
        </div>
      }
      description={`ID: ${email.id}`}
      maxWidth="2xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <div>
            {email.previewUrl && (
              <a
                href={email.previewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>View in Ethereal Mail</span>
              </a>
            )}
          </div>
          <Button variant="secondary" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      }
    >
      <div className="space-y-5 text-xs">
        {/* Status & Recipient Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-slate-950/60 border border-slate-800">
          <div className="space-y-1">
            <span className="text-[11px] text-slate-400 flex items-center space-x-1">
              <User className="w-3.5 h-3.5" />
              <span>Recipient</span>
            </span>
            <div className="font-mono text-sm font-semibold text-slate-100">
              {email.recipient}
            </div>
          </div>
          <div>
            <EmailStatusBadge status={email.status} size="md" />
          </div>
        </div>

        {/* Subject */}
        <div>
          <label className="block text-slate-400 font-medium mb-1">Subject</label>
          <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800 text-slate-100 font-medium">
            {email.subject}
          </div>
        </div>

        {/* Body */}
        <div>
          <label className="block text-slate-400 font-medium mb-1">Message Content</label>
          <div className="p-3.5 rounded-xl bg-slate-950/40 border border-slate-800 text-slate-200 whitespace-pre-wrap font-sans max-h-56 overflow-y-auto leading-relaxed">
            {email.body || '(No body provided)'}
          </div>
        </div>

        {/* Metadata Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800 space-y-1">
            <span className="text-slate-400 flex items-center space-x-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>Scheduled Delivery</span>
            </span>
            <div className="font-mono text-slate-200">
              {new Date(email.scheduledAt).toLocaleString()}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800 space-y-1">
            <span className="text-slate-400 flex items-center space-x-1.5">
              <Send className="w-3.5 h-3.5 text-emerald-400" />
              <span>Sent At</span>
            </span>
            <div className="font-mono text-slate-200">
              {email.sentAt ? new Date(email.sentAt).toLocaleString() : 'Not yet dispatched'}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800 space-y-1">
            <span className="text-slate-400 flex items-center space-x-1.5">
              <Layers className="w-3.5 h-3.5 text-indigo-400" />
              <span>BullMQ Job ID</span>
            </span>
            <div className="font-mono text-slate-300 truncate">
              {email.bullJobId || 'Pending reservation'}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800 space-y-1">
            <span className="text-slate-400 flex items-center space-x-1.5">
              <Calendar className="w-3.5 h-3.5 text-sky-400" />
              <span>Created At</span>
            </span>
            <div className="font-mono text-slate-300">
              {new Date(email.createdAt).toLocaleString()}
            </div>
          </div>
        </div>

        {/* Error message if any */}
        {email.error && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-start space-x-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-rose-200">Delivery Error</div>
              <div className="text-[11px] font-mono mt-0.5">{email.error}</div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
