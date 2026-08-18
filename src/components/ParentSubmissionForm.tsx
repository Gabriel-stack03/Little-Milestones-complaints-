/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, 
  Mail, 
  Calendar, 
  Clock, 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  ChevronRight, 
  Send,
  Sparkles,
  Inbox
} from 'lucide-react';
import { Complaint } from '../types.js';

const SPECIALISTS = [
  'Yoselin Rogel',
  'Julia Miller',
  'Heaven Torres',
  'Tyler Grijalva',
  'Sara Ayala',
  'Blanca Banales',
  'Karla Whitehead',
  'Priscilla Sanchez',
  'Katherine Ayala',
  'Sharon (Xue) Huang',
  'Cassandra Loyd',
  'Celeste Manzano',
  'Rafaela Menendez',
  'Rosie (Meigui) Yi (11/08/1985)',
  'Dayanara Flores (9/29/05)',
  'Michelle Tang (9/12/74)',
  'Nancy Talavera',
  'Miracle Ruiz',
  'Patricia Varela',
  'Sandra Hernandez',
  'Desriee Calderon',
  'Sandra Gasca',
  'Arianna Aguirre',
  'Jennae Galloway'
];

const PRE_FILLED_COMPLAINTS = [
  'Not showing up on time',
  'Unprofessional behavior',
  'Incomplete session duration',
  'Lack of communication'
];

interface ParentSubmissionFormProps {
  onSubmissionSuccess: (complaint: Complaint) => void;
}

export default function ParentSubmissionForm({ onSubmissionSuccess }: ParentSubmissionFormProps) {
  const [parentName, setParentName] = useState('');
  const [parentEmail, setParentEmail] = useState('');
  const [specialistName, setSpecialistName] = useState('');
  const [sessionDateTime, setSessionDateTime] = useState('');
  const [selectedIssues, setSelectedIssues] = useState<string[]>([]);
  const [customDetails, setCustomDetails] = useState('');
  const [newTeacherSolve, setNewTeacherSolve] = useState('');
  
  // UI States
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successComplaint, setSuccessComplaint] = useState<Complaint | null>(null);
  const [showEmailReceipt, setShowEmailReceipt] = useState(false);

  const handleCheckboxChange = (issue: string) => {
    setSelectedIssues(prev => 
      prev.includes(issue) 
        ? prev.filter(i => i !== issue) 
        : [...prev, issue]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Frontend Validations
    if (!parentName.trim()) {
      setError('Please provide your full name.');
      return;
    }
    if (!parentEmail.trim() || !parentEmail.includes('@')) {
      setError('Please provide a valid email address.');
      return;
    }
    if (!specialistName) {
      setError('Please select the Intervention Specialist.');
      return;
    }
    if (!sessionDateTime) {
      setError('Please select the Session Date and Time.');
      return;
    }
    if (selectedIssues.length === 0 && !customDetails.trim()) {
      setError('Please select at least one prefilled complaint issue or write your custom feedback details.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/complaints', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          parentName,
          parentEmail,
          specialistName,
          sessionDateTime,
          prefilledComplaints: selectedIssues,
          customDetails,
          newTeacherSolve
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit complaint.');
      }

      setSuccessComplaint(data.complaint);
      onSubmissionSuccess(data.complaint);

      // Reset form fields
      setParentName('');
      setParentEmail('');
      setSpecialistName('');
      setSessionDateTime('');
      setSelectedIssues([]);
      setCustomDetails('');
      setNewTeacherSolve('');
      
    } catch (err: any) {
      setError(err.message || 'An error occurred during submission. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="parent-form-section" className="max-w-2xl mx-auto">
      {/* Intro Heading */}
      <div className="text-center mb-8">
        <h2 className="font-display text-3xl font-bold tracking-tight text-slate-800">
          Parent Feedback & Complaint Portal
        </h2>
        <p className="mt-2 text-slate-500 text-sm md:text-base">
          Submit session issues securely. Your report is immediately categorized by our quality assurance coordinator and flagged for supervisor review.
        </p>
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
            <Mail className="w-3.5 h-3.5 mr-1" />
            Resend Email API Connected
          </span>
          <span className="text-xs text-slate-400 hidden sm:inline">•</span>
          <span className="text-xs text-slate-500">Sends copy to parent email & gcontreras@ednovate.org (with automatic sandbox forwarding)</span>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 md:p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Error Banner */}
          <AnimatePresence>
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-4 bg-rose-50 border-l-4 border-rose-500 rounded-r-lg flex items-start space-x-3"
              >
                <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold text-rose-800">Submission Error</h4>
                  <p className="text-xs text-rose-700 mt-0.5">{error}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Section 1: Contact Details */}
          <div>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              1. Your Contact Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Parent Full Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                    <User className="w-4 h-4" />
                  </span>
                  <input
                    id="parent-name-input"
                    type="text"
                    value={parentName}
                    onChange={(e) => setParentName(e.target.value)}
                    placeholder="Jane Doe"
                    className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white transition-all"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Email Address <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                    <Mail className="w-4 h-4" />
                  </span>
                  <input
                    id="parent-email-input"
                    type="email"
                    value={parentEmail}
                    onChange={(e) => setParentEmail(e.target.value)}
                    placeholder="jane.doe@example.com"
                    className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white transition-all"
                    required
                  />
                </div>
              </div>
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Section 2: Session Details */}
          <div>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              2. Session Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Intervention Specialist <span className="text-rose-500">*</span>
                </label>
                <select
                  id="specialist-select"
                  value={specialistName}
                  onChange={(e) => setSpecialistName(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white transition-all"
                  required
                >
                  <option value="">-- Select Specialist --</option>
                  {SPECIALISTS.map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Session Date & Time <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
                    <Calendar className="w-4 h-4" />
                  </span>
                  <input
                    id="session-time-input"
                    type="datetime-local"
                    value={sessionDateTime}
                    onChange={(e) => setSessionDateTime(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white transition-all"
                    required
                  />
                </div>
              </div>
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Section 3: Complaint Categories */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                3. Primary Issues Observed
              </h3>
              <span className="text-[10px] text-slate-400 italic">Select all that apply</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              {PRE_FILLED_COMPLAINTS.map(issue => {
                const isChecked = selectedIssues.includes(issue);
                return (
                  <label
                    key={issue}
                    className={`flex items-start p-3 rounded-xl border text-sm cursor-pointer transition-all ${
                      isChecked 
                        ? 'bg-sky-50/50 border-sky-200 text-slate-800' 
                        : 'bg-slate-50/30 border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleCheckboxChange(issue)}
                      className="mt-1 mr-3 h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                    />
                    <span>{issue}</span>
                  </label>
                );
              })}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Other / Custom Complaint details <span className="text-slate-400">(Optional)</span>
              </label>
              <textarea
                id="custom-details-textarea"
                rows={4}
                value={customDetails}
                onChange={(e) => setCustomDetails(e.target.value)}
                placeholder="Please describe what happened in detail so the supervisor can properly investigate..."
                className="w-full p-3 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white transition-all placeholder:text-slate-400"
              />
            </div>

            <div className="mt-4" id="new-teacher-solve-container">
              <label className="block text-xs font-medium text-slate-600 mb-2">
                Would a new teacher solve this issue? <span className="text-slate-400">(Optional)</span>
              </label>
              <div className="grid grid-cols-3 gap-3">
                {['Yes', 'No', 'Not sure'].map((option) => {
                  const isOptionSelected = newTeacherSolve === option;
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setNewTeacherSolve(isOptionSelected ? '' : option)}
                      className={`py-2 px-3 text-sm font-medium rounded-lg border text-center transition-all ${
                        isOptionSelected
                          ? 'bg-sky-50 border-sky-300 text-sky-700 font-semibold ring-1 ring-sky-300'
                          : 'bg-slate-50/50 border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Form Submit Button */}
          <div className="pt-2">
            <button
              id="submit-complaint-btn"
              type="submit"
              disabled={loading}
              className={`w-full py-3 px-4 rounded-xl text-white font-medium flex items-center justify-center space-x-2 shadow-sm transition-all ${
                loading 
                  ? 'bg-slate-400 cursor-not-allowed' 
                  : 'bg-sky-600 hover:bg-sky-700 active:scale-[0.99] hover:shadow'
              }`}
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Analyzing & Routing Report...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Submit Secure Complaint</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Success Modal */}
      <AnimatePresence>
        {successComplaint && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-lg w-full overflow-hidden max-h-[90vh] flex flex-col"
            >
              <div className="p-6 text-center border-b border-slate-100 shrink-0">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-emerald-50 mb-3">
                  <CheckCircle className="h-6 w-6 text-emerald-600" />
                </div>
                <h3 className="font-display text-xl font-bold text-slate-900">
                  Complaint Filed Successfully
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  ID: <span className="font-mono">{successComplaint.id}</span> • Received at {new Date(successComplaint.timestamp).toLocaleTimeString()}
                </p>
              </div>

              {/* Modal Scrollable Body */}
              <div className="p-6 overflow-y-auto space-y-4 text-sm text-slate-600">
                <p>
                  Thank you, <strong>{successComplaint.parentName}</strong>. Your feedback on specialist <strong>{successComplaint.specialistName}</strong> has been logged in our database.
                </p>

                {/* AI Assessment Sneak Peek */}
                <div className="bg-sky-50/50 rounded-xl p-4 border border-sky-100 space-y-2">
                  <div className="flex items-center space-x-1.5 text-xs font-semibold text-sky-800">
                    <Sparkles className="w-4 h-4 text-sky-600" />
                    <span>AI Intake Assessment Completed</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-slate-400">Assigned Category:</span>
                      <p className="font-medium text-slate-700 mt-0.5">{successComplaint.category}</p>
                    </div>
                    <div>
                      <span className="text-slate-400">Flagged Severity:</span>
                      <p className="mt-0.5">
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${
                          successComplaint.severity === 'High' 
                            ? 'bg-rose-100 text-rose-800' 
                            : successComplaint.severity === 'Medium' 
                            ? 'bg-amber-100 text-amber-800' 
                            : 'bg-sky-100 text-sky-800'
                        }`}>
                          {successComplaint.severity}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Simulated Email Accordion */}
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setShowEmailReceipt(!showEmailReceipt)}
                    className="w-full flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 text-left text-xs font-semibold text-slate-700 transition-colors"
                  >
                    <div className="flex items-center space-x-2">
                      <Inbox className="w-4 h-4 text-slate-500" />
                      <span>View Confirmation Email Sent to Your Inbox</span>
                    </div>
                    <ChevronRight className={`w-4 h-4 text-slate-400 transform transition-transform ${showEmailReceipt ? 'rotate-90' : ''}`} />
                  </button>

                  <AnimatePresence>
                    {showEmailReceipt && (
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: 'auto' }}
                        exit={{ height: 0 }}
                        className="overflow-hidden border-t border-slate-200"
                      >
                        <div className="p-3 bg-white font-mono text-[11px] leading-relaxed text-slate-700 space-y-2 max-h-60 overflow-y-auto">
                          <div><span className="text-slate-400">From:</span> no-reply@intervention-system.org</div>
                          <div><span className="text-slate-400">To:</span> {successComplaint.parentEmail}</div>
                          <div><span className="text-slate-400">Subject:</span> {successComplaint.parentEmailSubject}</div>
                          <hr className="border-slate-100" />
                          <div className="whitespace-pre-wrap bg-slate-50 p-2.5 rounded border border-slate-100">
                            {successComplaint.parentEmailBody}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <p className="text-xs text-slate-500 text-center italic">
                  An alert has also been automatically triggered and dispatched to the active area supervisor.
                </p>
              </div>

              {/* Modal Footer */}
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end shrink-0">
                <button
                  onClick={() => setSuccessComplaint(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold transition-colors"
                >
                  Done & Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
