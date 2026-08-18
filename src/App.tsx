/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldAlert, 
  User, 
  Activity, 
  HelpCircle, 
  HeartHandshake, 
  FileText, 
  AlertTriangle,
  Lock,
  Unlock,
  KeyRound
} from 'lucide-react';
import ParentSubmissionForm from './components/ParentSubmissionForm.tsx';
import SupervisorPortal from './components/SupervisorPortal.tsx';
import { Complaint, SimulatedEmail, ComplaintStatus } from './types.js';

export default function App() {
  const [activeView, setActiveView] = useState<'parent' | 'supervisor'>('parent');
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [emails, setEmails] = useState<SimulatedEmail[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [appError, setAppError] = useState<string | null>(null);

  // Supervisor authentication state
  const [isSupervisorUnlocked, setIsSupervisorUnlocked] = useState<boolean>(() => {
    return sessionStorage.getItem('supervisor_unlocked') === 'true';
  });
  const [showPasscodeModal, setShowPasscodeModal] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [passcodeError, setPasscodeError] = useState<string | null>(null);

  // Fetch all complaints and emails from full-stack Express server
  const fetchData = async () => {
    try {
      setAppError(null);
      const [compRes, emailRes] = await Promise.all([
        fetch('/api/complaints'),
        fetch('/api/emails')
      ]);

      if (!compRes.ok || !emailRes.ok) {
        throw new Error('Failed to retrieve care logs from server.');
      }

      const compData = await compRes.json();
      const emailData = await emailRes.json();

      setComplaints(compData);
      setEmails(emailData);
    } catch (err: any) {
      console.error('Fetch error:', err);
      setAppError('Unable to sync with storage database. Please confirm server state.');
    } finally {
      setIsLoading(false);
    }
  };

  // Run on mount
  useEffect(() => {
    fetchData();
  }, []);

  // Callback when parent submits a new complaint
  const handleSubmissionSuccess = (newComplaint: Complaint) => {
    // Append locally so both parent and supervisor views update instantly!
    setComplaints(prev => [newComplaint, ...prev]);
    // Re-fetch email outbox to capture the newly triggered simulated emails
    fetchData();
  };

  // Reset database back to default historical logs
  const handleResetDatabase = async () => {
    try {
      const response = await fetch('/api/reset', { method: 'POST' });
      if (!response.ok) throw new Error('Reset request failed.');
      const data = await response.json();
      setComplaints(data.complaints);
      setEmails(data.emails);
    } catch (err) {
      console.error(err);
      alert('Could not restore default template data.');
    }
  };

  // Update a complaint's status and add supervisor notes
  const handleUpdateComplaintStatus = async (id: string, status: ComplaintStatus, notes: string) => {
    try {
      const response = await fetch(`/api/complaints/${id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status, supervisorNotes: notes })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update complaint status.');
      }

      const data = await response.json();
      
      // Update local state arrays
      setComplaints(prev => prev.map(c => c.id === id ? data.complaint : c));
    } catch (err: any) {
      console.error(err);
      throw err;
    }
  };

  const handleVerifyPasscode = (e: React.FormEvent) => {
    e.preventDefault();
    // Security PIN
    if (passcode.trim() === '2003') {
      setIsSupervisorUnlocked(true);
      sessionStorage.setItem('supervisor_unlocked', 'true');
      setShowPasscodeModal(false);
      setPasscode('');
      setPasscodeError(null);
      setActiveView('supervisor');
    } else {
      setPasscodeError('Incorrect passcode. Please try again.');
    }
  };

  const handleLockSupervisor = () => {
    setIsSupervisorUnlocked(false);
    sessionStorage.removeItem('supervisor_unlocked');
    setActiveView('parent');
  };

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col font-sans antialiased">
      
      {/* Top Professional Portal Bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* System Logo */}
            <div className="flex items-center space-x-2.5">
              <div className="p-2 bg-slate-900 text-white rounded-xl">
                <HeartHandshake className="w-5 h-5 text-sky-400" />
              </div>
              <div>
                <span className="font-display font-black text-slate-900 tracking-tight text-base sm:text-lg block">
                  LittleMilestones
                </span>
                <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400 block -mt-1 font-mono">
                  Specialist Complaint Manager
                </span>
              </div>
            </div>

            {/* Portal Tab Switcher (Only visible to authenticated supervisors) */}
            {isSupervisorUnlocked && (
              <div className="flex items-center space-x-3">
                <nav className="flex space-x-1 bg-slate-100 p-1 rounded-xl">
                  <button
                    id="tab-parent-portal"
                    onClick={() => setActiveView('parent')}
                    className={`relative px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all ${
                      activeView === 'parent' 
                        ? 'bg-white text-slate-900 shadow-xs' 
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <User className="w-3.5 h-3.5" />
                    <span>Parent Form</span>
                  </button>

                  <button
                    id="tab-supervisor-portal"
                    onClick={() => setActiveView('supervisor')}
                    className={`relative px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all ${
                      activeView === 'supervisor' 
                        ? 'bg-white text-slate-900 shadow-xs' 
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>Supervisor Portal</span>
                    {complaints.filter(c => c.status === 'Unresolved').length > 0 && (
                      <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse absolute -top-0.5 -right-0.5"></span>
                    )}
                  </button>
                </nav>

                <button
                  onClick={handleLockSupervisor}
                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                  title="Lock Supervisor Session"
                >
                  <Lock className="w-4 h-4" />
                </button>
              </div>
            )}

          </div>
        </div>
      </header>

      {/* Main Dynamic View Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {isLoading ? (
          <div className="h-[60vh] flex flex-col items-center justify-center space-y-3">
            <svg className="animate-spin h-8 w-8 text-slate-700" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-sm font-medium text-slate-500 font-display">Initializing Care Storage Environs...</p>
          </div>
        ) : appError ? (
          <div className="max-w-md mx-auto my-12 p-6 bg-rose-50 border border-rose-200 rounded-2xl text-center space-y-4">
            <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto" />
            <h3 className="font-display font-bold text-rose-900 text-lg">Operational Connection Failure</h3>
            <p className="text-xs text-rose-700 leading-relaxed">{appError}</p>
            <button
              onClick={fetchData}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold transition-colors"
            >
              Retry Connection
            </button>
          </div>
        ) : (
          <motion.div
            key={activeView}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
          >
            {activeView === 'parent' ? (
              <ParentSubmissionForm onSubmissionSuccess={handleSubmissionSuccess} />
            ) : (
              <SupervisorPortal 
                complaints={complaints}
                emails={emails}
                onRefreshData={fetchData}
                onResetDatabase={handleResetDatabase}
                onUpdateComplaintStatus={handleUpdateComplaintStatus}
              />
            )}
          </motion.div>
        )}

      </main>

      {/* Compact Elegant Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div className="flex items-center space-x-1.5">
            <HeartHandshake className="w-4 h-4 text-slate-300" />
            <span>LittleMilestones Quality Assurance Platform • Dedicated Therapist Monitoring</span>
          </div>
          <div className="flex items-center space-x-3 font-mono text-[10px]">
            <span>ENV: Node container</span>
            <span>•</span>
            <span>DATABASE: server-side local storage</span>
            <span>•</span>
            <button
              onClick={() => {
                if (isSupervisorUnlocked) {
                  setActiveView(activeView === 'supervisor' ? 'parent' : 'supervisor');
                } else {
                  setShowPasscodeModal(true);
                }
              }}
              className="flex items-center space-x-1 text-slate-400 hover:text-slate-600 font-semibold transition-colors focus:outline-none cursor-pointer"
              title="Staff Access Portal"
            >
              {isSupervisorUnlocked ? (
                <>
                  <Unlock className="w-3 h-3 text-emerald-500" />
                  <span className="text-emerald-600 font-medium">Staff View</span>
                </>
              ) : (
                <>
                  <Lock className="w-3 h-3 text-slate-300" />
                  <span className="hover:underline">Staff Access</span>
                </>
              )}
            </button>
          </div>
        </div>
      </footer>

      {/* Passcode Modal for Supervisor Authentication */}
      <AnimatePresence>
        {showPasscodeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setShowPasscodeModal(false);
                setPasscode('');
                setPasscodeError(null);
              }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="relative w-full max-w-sm bg-white rounded-2xl shadow-xl border border-slate-200 p-6 z-10 overflow-hidden"
            >
              {/* Subtle top decoration strip */}
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-sky-400 to-indigo-500" />

              <div className="flex flex-col items-center text-center">
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl text-slate-700 mb-4">
                  <KeyRound className="w-6 h-6 text-indigo-500 animate-pulse" />
                </div>
                
                <h3 className="font-display font-bold text-slate-800 text-lg leading-tight">
                  Supervisor Access
                </h3>
                <p className="text-xs text-slate-400 mt-1.5 mb-6 max-w-[240px]">
                  Please enter the security PIN to unlock the supervisor management dashboard.
                </p>

                <form onSubmit={handleVerifyPasscode} className="w-full space-y-4">
                  <div>
                    <input
                      type="password"
                      maxLength={12}
                      placeholder="••••"
                      value={passcode}
                      onChange={(e) => {
                        setPasscode(e.target.value);
                        if (passcodeError) setPasscodeError(null);
                      }}
                      className="w-full text-center text-xl tracking-widest font-mono p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all placeholder:text-slate-300"
                      autoFocus
                    />
                    {passcodeError && (
                      <motion.p 
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-[11px] text-rose-500 font-medium mt-2"
                      >
                        {passcodeError}
                      </motion.p>
                    )}
                  </div>

                  <div className="flex space-x-2 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowPasscodeModal(false);
                        setPasscode('');
                        setPasscodeError(null);
                      }}
                      className="flex-1 py-2 px-3 text-xs font-semibold text-slate-500 hover:text-slate-800 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-2 px-3 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm transition-colors"
                    >
                      Unlock Portal
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
