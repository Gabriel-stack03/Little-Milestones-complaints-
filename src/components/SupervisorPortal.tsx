/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Lock, 
  Folder, 
  AlertTriangle, 
  Activity, 
  Search, 
  Filter, 
  RefreshCw, 
  Eye, 
  ChevronRight, 
  X, 
  CheckCircle2, 
  Clock, 
  MessageSquare,
  Mail,
  FileSpreadsheet,
  AlertCircle,
  Inbox,
  Sparkles,
  Check
} from 'lucide-react';
import { Complaint, SimulatedEmail, ComplaintStatus } from '../types.js';

interface SupervisorPortalProps {
  complaints: Complaint[];
  emails: SimulatedEmail[];
  onRefreshData: () => Promise<void>;
  onResetDatabase: () => Promise<void>;
  onUpdateComplaintStatus: (id: string, status: ComplaintStatus, notes: string) => Promise<void>;
}

export default function SupervisorPortal({
  complaints,
  emails,
  onRefreshData,
  onResetDatabase,
  onUpdateComplaintStatus
}: SupervisorPortalProps) {
  
  // Authentication State
  const [passcode, setPasscode] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return sessionStorage.getItem('supervisor_auth') === 'true';
  });
  const [authError, setAuthError] = useState('');

  // Active Tab: 'dashboard' | 'outbox'
  const [activeTab, setActiveTab] = useState<'dashboard' | 'outbox'>('dashboard');

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpecialist, setSelectedSpecialist] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Selected Complaint for Drawer/Modal Details
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  
  // Supervisor Action Edit States (for the currently selected complaint)
  const [actionStatus, setActionStatus] = useState<ComplaintStatus>('Unresolved');
  const [actionNotes, setActionNotes] = useState('');
  const [isSavingAction, setIsSavingAction] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState('');

  // Auto-refresh state
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Authenticate Handler
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passcode === 'admin123') {
      setIsAuthenticated(true);
      sessionStorage.setItem('supervisor_auth', 'true');
      setAuthError('');
    } else {
      setAuthError('Incorrect passcode. Please try again.');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('supervisor_auth');
    setPasscode('');
  };

  // Sync selected complaint local status when selected complaint changes
  useEffect(() => {
    if (selectedComplaint) {
      setActionStatus(selectedComplaint.status);
      setActionNotes(selectedComplaint.supervisorNotes || '');
      setActionSuccessMsg('');
    }
  }, [selectedComplaint]);

  // Handle Save Status & Notes
  const handleSaveStatus = async () => {
    if (!selectedComplaint) return;
    setIsSavingAction(true);
    setActionSuccessMsg('');
    try {
      await onUpdateComplaintStatus(selectedComplaint.id, actionStatus, actionNotes);
      setActionSuccessMsg('Complaint record updated successfully.');
      
      // Update our local state for the drawer too
      setSelectedComplaint(prev => prev ? {
        ...prev,
        status: actionStatus,
        supervisorNotes: actionNotes
      } : null);

      // Auto clear success message after 3 seconds
      setTimeout(() => setActionSuccessMsg(''), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSavingAction(false);
    }
  };

  const handleResetClick = async () => {
    if (window.confirm('Are you sure you want to reset the database? This will clear all custom submissions and restore initial pre-populated records for demonstration purposes.')) {
      await onResetDatabase();
      setSelectedComplaint(null);
    }
  };

  const handleRefreshClick = async () => {
    setIsRefreshing(true);
    await onRefreshData();
    setIsRefreshing(false);
  };

  // ----------------------------------------------------
  // Statistics Calculations
  // ----------------------------------------------------
  const totalComplaintsCount = complaints.length;
  
  // Unresolved counts: standard unresolved + investigating
  const unresolvedComplaintsCount = complaints.filter(c => c.status === 'Unresolved').length;
  const investigatingComplaintsCount = complaints.filter(c => c.status === 'Investigating').length;
  const totalOpenCasesCount = unresolvedComplaintsCount + investigatingComplaintsCount;

  // Calculate Most Frequently Reported Issues
  const issueCounts: { [key: string]: number } = {};
  complaints.forEach(c => {
    c.prefilledComplaints.forEach(issue => {
      issueCounts[issue] = (issueCounts[issue] || 0) + 1;
    });
  });

  const sortedIssues = Object.entries(issueCounts)
    .map(([issue, count]) => ({ issue, count }))
    .sort((a, b) => b.count - a.count);

  const topIssue = sortedIssues.length > 0 
    ? `${sortedIssues[0].issue} (${sortedIssues[0].count} reports)` 
    : 'None logged yet';

  // Extract unique specialists from active complaints
  const uniqueSpecialists = Array.from(new Set(complaints.map(c => c.specialistName)));

  // ----------------------------------------------------
  // Filter Logic
  // ----------------------------------------------------
  const filteredComplaints = complaints.filter(c => {
    // 1. Text Search query filter
    const query = searchQuery.toLowerCase();
    const matchesSearch = 
      c.parentName.toLowerCase().includes(query) ||
      c.parentEmail.toLowerCase().includes(query) ||
      c.specialistName.toLowerCase().includes(query) ||
      c.customDetails.toLowerCase().includes(query) ||
      c.category.toLowerCase().includes(query) ||
      c.id.toLowerCase().includes(query);

    // 2. Specialist Filter
    const matchesSpecialist = selectedSpecialist ? c.specialistName === selectedSpecialist : true;

    // 3. Date Range Filters
    const complaintDate = new Date(c.timestamp);
    
    let matchesStartDate = true;
    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      matchesStartDate = complaintDate >= start;
    }

    let matchesEndDate = true;
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      matchesEndDate = complaintDate <= end;
    }

    return matchesSearch && matchesSpecialist && matchesStartDate && matchesEndDate;
  });

  // Filter Outbox emails based on search query too
  const filteredEmails = emails.filter(m => {
    const query = searchQuery.toLowerCase();
    return (
      m.recipient.toLowerCase().includes(query) ||
      m.subject.toLowerCase().includes(query) ||
      m.body.toLowerCase().includes(query) ||
      m.complaintId.toLowerCase().includes(query)
    );
  });

  // Password Login Screen
  if (!isAuthenticated) {
    return (
      <div id="supervisor-login-section" className="max-w-md mx-auto my-12">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="bg-slate-900 text-white p-6 text-center">
            <div className="mx-auto flex items-center justify-center h-10 w-10 rounded-full bg-slate-800 mb-2">
              <Lock className="w-5 h-5 text-sky-400" />
            </div>
            <h3 className="font-display text-lg font-bold">Supervisor Portal Sign-In</h3>
            <p className="text-xs text-slate-400 mt-1">Please enter your passcode to access complaints analytics.</p>
          </div>

          <form onSubmit={handleLogin} className="p-6 space-y-4">
            {authError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Passcode</label>
              <input
                id="supervisor-passcode-input"
                type="password"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white transition-all text-center font-mono tracking-widest"
                required
              />
            </div>

            <button
              id="supervisor-login-btn"
              type="submit"
              className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              Sign In
            </button>

            {/* Helper Credential Tag */}
            <div className="text-center pt-2">
              <span className="inline-flex items-center px-2 py-1 rounded bg-sky-50 border border-sky-100 text-sky-700 font-mono text-[10px] uppercase font-bold">
                Access Code: admin123
              </span>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div id="supervisor-dashboard-section" className="space-y-6">
      
      {/* Dashboard Sub Header Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold tracking-tight text-slate-800 flex items-center space-x-2">
            <span>Supervisor Command Center</span>
            <span className="text-xs bg-sky-100 text-sky-800 px-2.5 py-0.5 rounded-full font-sans font-medium">Supervisor Authorized</span>
          </h2>
          <p className="text-xs text-slate-500">Monitor reported specialist issues, evaluate severity, review AI logs, and document operational resolutions.</p>
        </div>

        <div className="flex items-center space-x-2 self-start md:self-auto">
          <button
            onClick={handleRefreshClick}
            disabled={isRefreshing}
            className="p-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 rounded-lg text-xs font-medium inline-flex items-center space-x-1.5 transition-colors"
            title="Refresh Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            onClick={handleResetClick}
            className="p-2 bg-white hover:bg-rose-50 border border-slate-200 text-rose-600 rounded-lg text-xs font-medium inline-flex items-center space-x-1.5 transition-colors"
            title="Restore Defaults"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset Defaults</span>
          </button>

          <button
            onClick={handleLogout}
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* Analytics Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Case Card */}
        <div className="bg-white rounded-xl shadow-xs border border-slate-100 p-5 flex items-center space-x-4">
          <div className="p-3 bg-slate-50 rounded-lg text-slate-600">
            <Folder className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">Total Complaints Logged</span>
            <h4 className="text-2xl font-display font-bold text-slate-800 mt-0.5">{totalComplaintsCount}</h4>
          </div>
        </div>

        {/* Unresolved Case Card */}
        <div className="bg-white rounded-xl shadow-xs border border-slate-100 p-5 flex items-center space-x-4">
          <div className="p-3 bg-amber-50 rounded-lg text-amber-600">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">Active Open Cases</span>
            <div className="flex items-baseline space-x-1.5 mt-0.5">
              <h4 className="text-2xl font-display font-bold text-slate-800">{totalOpenCasesCount}</h4>
              <span className="text-[10px] text-slate-500">({unresolvedComplaintsCount} unresolved, {investigatingComplaintsCount} investigating)</span>
            </div>
          </div>
        </div>

        {/* Dynamic Most Frequent Card */}
        <div className="bg-white rounded-xl shadow-xs border border-slate-100 p-5 flex items-center space-x-4">
          <div className="p-3 bg-sky-50 rounded-lg text-sky-600">
            <Activity className="w-6 h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-xs text-slate-400 font-medium uppercase tracking-wider block">Most Frequent Issue</span>
            <h4 className="text-sm font-semibold text-slate-800 mt-1 truncate" title={topIssue}>
              {topIssue}
            </h4>
          </div>
        </div>
      </div>

      {/* Tab Navigation & Toolbar */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-100 p-4 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-2 gap-2">
          
          {/* Navigation Tabs */}
          <div className="flex space-x-1 bg-slate-50 p-1 rounded-lg self-start">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                activeTab === 'dashboard' 
                  ? 'bg-white text-slate-800 shadow-xs' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <span className="flex items-center space-x-1.5">
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Complaints Ledger</span>
              </span>
            </button>
            <button
              onClick={() => setActiveTab('outbox')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                activeTab === 'outbox' 
                  ? 'bg-white text-slate-800 shadow-xs' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <span className="flex items-center space-x-1.5">
                <Inbox className="w-3.5 h-3.5" />
                <span>Simulated Mail Outbox ({emails.length})</span>
              </span>
            </button>
          </div>

          <div className="text-[10px] text-slate-400 font-mono">
            {activeTab === 'dashboard' 
              ? `Showing ${filteredComplaints.length} of ${totalComplaintsCount} complaints` 
              : `Showing ${filteredEmails.length} of ${emails.length} dispatched emails`}
          </div>
        </div>

        {/* Interactive Query Filters Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search bar */}
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search parent, specialist, ID, details..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white transition-all"
            />
          </div>

          {activeTab === 'dashboard' && (
            <>
              {/* Specialist Select */}
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
                  <Filter className="w-3.5 h-3.5" />
                </span>
                <select
                  value={selectedSpecialist}
                  onChange={(e) => setSelectedSpecialist(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white transition-all"
                >
                  <option value="">All Specialists</option>
                  {uniqueSpecialists.map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>

              {/* Start Date */}
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-medium text-slate-400 shrink-0">From:</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all"
                />
              </div>

              {/* End Date */}
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-medium text-slate-400 shrink-0">To:</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all"
                />
              </div>
            </>
          )}
        </div>

        {/* Clear Filters Helper Row */}
        {(searchQuery || selectedSpecialist || startDate || endDate) && (
          <div className="flex items-center justify-between bg-slate-50 p-2 rounded-lg text-xs">
            <span className="text-slate-500">Active filters applied.</span>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedSpecialist('');
                setStartDate('');
                setEndDate('');
              }}
              className="text-sky-600 hover:text-sky-700 font-semibold"
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>

      {/* Main Ledger Table Tab View */}
      {activeTab === 'dashboard' ? (
        <div className="bg-white rounded-xl shadow-xs border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-55/40 bg-slate-50 border-b border-slate-100 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="px-5 py-3">Incident Time & Sub Date</th>
                  <th className="px-5 py-3">Parent Info</th>
                  <th className="px-5 py-3">Intervention Specialist</th>
                  <th className="px-5 py-3">Reported Issues</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredComplaints.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-slate-400">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <AlertCircle className="w-8 h-8 text-slate-300" />
                        <p className="font-medium text-slate-500">No complaints match your active filter criteria.</p>
                        <p className="text-[10px]">Try resetting dates, specialist name, or cleaning your search query.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredComplaints.map(complaint => (
                    <tr 
                      key={complaint.id}
                      className="hover:bg-slate-50/50 transition-colors cursor-pointer group"
                      onClick={() => setSelectedComplaint(complaint)}
                    >
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="font-semibold text-slate-700">
                          {new Date(complaint.sessionDateTime).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: '2-digit'
                          })}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                          Sub: {new Date(complaint.timestamp).toLocaleDateString()}
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <div className="font-semibold text-slate-800">{complaint.parentName}</div>
                        <div className="text-slate-400 font-mono text-[10px] mt-0.5">{complaint.parentEmail}</div>
                      </td>

                      <td className="px-5 py-4 whitespace-nowrap font-medium text-slate-700">
                        {complaint.specialistName}
                      </td>

                      <td className="px-5 py-4 max-w-xs">
                        <div className="flex flex-wrap gap-1">
                          {complaint.prefilledComplaints.map(tag => (
                            <span 
                              key={tag} 
                              className="inline-block px-2 py-0.5 rounded bg-slate-100 text-[10px] font-medium text-slate-600 border border-slate-200"
                            >
                              {tag}
                            </span>
                          ))}
                          {complaint.customDetails && (
                            <span className="inline-block px-2 py-0.5 rounded bg-sky-50 text-[10px] font-medium text-sky-700 border border-sky-100">
                              Custom notes
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-[10px] font-semibold uppercase ${
                          complaint.status === 'Resolved' 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                            : complaint.status === 'Investigating' 
                            ? 'bg-amber-50 text-amber-700 border border-amber-100' 
                            : 'bg-rose-50 text-rose-700 border border-rose-100'
                        }`}>
                          <span className={`h-1 w-1 rounded-full mr-1.5 ${
                            complaint.status === 'Resolved' 
                              ? 'bg-emerald-500' 
                              : complaint.status === 'Investigating' 
                              ? 'bg-amber-500' 
                              : 'bg-rose-500'
                          }`}></span>
                          {complaint.status}
                        </span>
                      </td>

                      <td className="px-5 py-4 whitespace-nowrap text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedComplaint(complaint);
                          }}
                          className="p-1.5 bg-slate-50 hover:bg-sky-50 text-slate-500 hover:text-sky-600 rounded-lg border border-slate-200 hover:border-sky-200 transition-all inline-flex items-center space-x-1 text-[10px] font-semibold"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Review</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Simulated Mailbox Logs View */
        <div className="bg-white rounded-xl shadow-xs border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-55/40 bg-slate-50 border-b border-slate-100 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="px-5 py-3">Timestamp</th>
                  <th className="px-5 py-3">Type</th>
                  <th className="px-5 py-3">Recipient</th>
                  <th className="px-5 py-3">Subject</th>
                  <th className="px-5 py-3">Related ID</th>
                  <th className="px-5 py-3 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-mono">
                {filteredEmails.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-slate-400 font-sans">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <Inbox className="w-8 h-8 text-slate-300" />
                        <p className="font-medium text-slate-500">No simulated emails found.</p>
                        <p className="text-[10px]">Submit complaints on the parent tab to trigger automatic receipts.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredEmails.map(mail => (
                    <tr key={mail.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-4 whitespace-nowrap text-slate-500 text-[10px]">
                        {new Date(mail.timestamp).toLocaleString()}
                      </td>

                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-semibold ${
                          mail.type === 'supervisor_alert' 
                            ? 'bg-rose-50 border border-rose-100 text-rose-700' 
                            : 'bg-sky-50 border border-sky-100 text-sky-700'
                        }`}>
                          {mail.type === 'supervisor_alert' ? 'Supervisor Alert' : 'Parent Receipt'}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-slate-700">{mail.recipient}</td>
                      <td className="px-5 py-4 max-w-xs truncate font-sans text-slate-800">{mail.subject}</td>
                      <td className="px-5 py-4 text-slate-400 font-semibold">{mail.complaintId}</td>
                      <td className="px-5 py-4 whitespace-nowrap text-right">
                        <button
                          onClick={() => {
                            // Find the related complaint to open the modal
                            const relatedComp = complaints.find(c => c.id === mail.complaintId);
                            if (relatedComp) {
                              setSelectedComplaint(relatedComp);
                            } else {
                              alert(`Simulated Email Body:\n\n${mail.body}`);
                            }
                          }}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded text-[10px] font-sans font-medium transition-all"
                        >
                          View Content
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Slide-over Detailed Complaint Panel / Drawer */}
      <AnimatePresence>
        {selectedComplaint && (
          <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/50 backdrop-blur-xs flex justify-end">
            {/* Backdrop Closer */}
            <div className="absolute inset-0" onClick={() => setSelectedComplaint(null)}></div>
            
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative bg-white shadow-2xl max-w-xl w-full h-full flex flex-col overflow-y-auto"
            >
              
              {/* Drawer Header */}
              <div className="p-6 border-b border-slate-100 shrink-0 flex items-center justify-between bg-slate-900 text-white">
                <div>
                  <span className="text-[10px] bg-slate-800 text-slate-300 font-mono px-2 py-0.5 rounded font-bold uppercase">
                    ID: {selectedComplaint.id}
                  </span>
                  <h3 className="font-display text-lg font-bold mt-1 text-sky-100">
                    Review Session Report
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedComplaint(null)}
                  className="p-1.5 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Content */}
              <div className="p-6 space-y-6 flex-1 overflow-y-auto">
                
                {/* 1. Core Specs */}
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/60 grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 block font-medium">Intervention Specialist</span>
                    <p className="font-semibold text-slate-800 mt-1 text-sm">{selectedComplaint.specialistName}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Session Timestamp</span>
                    <p className="font-semibold text-slate-800 mt-1 text-sm">
                      {new Date(selectedComplaint.sessionDateTime).toLocaleString('en-US', {
                        dateStyle: 'medium',
                        timeStyle: 'short'
                      })}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Parent Contact</span>
                    <p className="font-semibold text-slate-800 mt-1">{selectedComplaint.parentName}</p>
                    <p className="text-slate-500 font-mono text-[10px] mt-0.5">{selectedComplaint.parentEmail}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Filing Date</span>
                    <p className="font-semibold text-slate-800 mt-1">
                      {new Date(selectedComplaint.timestamp).toLocaleDateString()} at {new Date(selectedComplaint.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>

                {/* 2. Parent description */}
                <div>
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Parent Statement</h4>
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-1.5">
                      {selectedComplaint.prefilledComplaints.map(item => (
                        <span key={item} className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] font-medium border border-slate-200">
                          {item}
                        </span>
                      ))}
                    </div>
                    <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200/60 text-xs leading-relaxed text-slate-700 italic whitespace-pre-wrap">
                      {selectedComplaint.customDetails ? `"${selectedComplaint.customDetails}"` : <span className="text-slate-400">No additional custom details provided.</span>}
                    </div>
                    {selectedComplaint.newTeacherSolve && (
                      <div className="mt-3 bg-indigo-50/30 p-3 rounded-lg border border-indigo-100/50 flex items-center justify-between text-xs">
                        <span className="text-slate-500 font-medium">Would a new teacher solve this issue?</span>
                        <span className={`px-2.5 py-1 rounded-full font-semibold text-[10px] uppercase ${
                          selectedComplaint.newTeacherSolve === 'Yes'
                            ? 'bg-emerald-100 text-emerald-800'
                            : selectedComplaint.newTeacherSolve === 'No'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {selectedComplaint.newTeacherSolve}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 3. AI Intake Diagnostics */}
                <div className="bg-sky-50/40 rounded-xl p-5 border border-sky-100/80 space-y-3.5">
                  <div className="flex items-center justify-between border-b border-sky-100/60 pb-2">
                    <div className="flex items-center space-x-1.5 text-xs font-bold text-sky-900">
                      <Sparkles className="w-4 h-4 text-sky-600 animate-pulse" />
                      <span>Intelligent Intake Assessment</span>
                    </div>
                    <span className="text-[10px] bg-sky-100 text-sky-800 px-2 py-0.5 rounded-full font-semibold">Gemini 3.5 AI</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-slate-500">AI Identified Issue Category</span>
                      <p className="font-semibold text-slate-800 mt-0.5 text-xs">{selectedComplaint.category}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Assessed Severity Index</span>
                      <p className="mt-0.5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          selectedComplaint.severity === 'High' 
                            ? 'bg-rose-100 text-rose-800' 
                            : selectedComplaint.severity === 'Medium' 
                            ? 'bg-amber-100 text-amber-800' 
                            : 'bg-sky-100 text-sky-800'
                        }`}>
                          {selectedComplaint.severity}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wide block mb-1">AI Incident Executive Summary</span>
                    <p className="text-xs text-slate-700 leading-relaxed bg-white p-3 rounded-lg border border-sky-100">
                      {selectedComplaint.aiSummary}
                    </p>
                  </div>
                </div>

                {/* 4. Communication Dispatch History */}
                <div>
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Automated Transmitted Emails</h4>
                  <div className="space-y-3">
                    {/* Parent Receipt */}
                    <div className="border border-slate-200 rounded-lg overflow-hidden text-[11px]">
                      <div className="bg-slate-55 bg-slate-100 px-3 py-2 border-b border-slate-200 font-semibold text-slate-700 flex justify-between items-center">
                        <span>Parent Receipt Confirmation</span>
                        <span className="font-mono text-[9px] text-slate-400">Status: Dispatched</span>
                      </div>
                      <div className="p-3 bg-white font-mono space-y-1.5 text-slate-600 leading-relaxed">
                        <div><span className="text-slate-400">To:</span> {selectedComplaint.parentEmail}</div>
                        <div><span className="text-slate-400">Subject:</span> {selectedComplaint.parentEmailSubject}</div>
                        <div className="whitespace-pre-wrap bg-slate-50 p-2 rounded border border-slate-100 text-[10px] max-h-36 overflow-y-auto mt-1">
                          {selectedComplaint.parentEmailBody}
                        </div>
                      </div>
                    </div>

                    {/* Supervisor Alert */}
                    <div className="border border-slate-200 rounded-lg overflow-hidden text-[11px]">
                      <div className="bg-slate-55 bg-slate-100 px-3 py-2 border-b border-slate-200 font-semibold text-slate-700 flex justify-between items-center">
                        <span>Supervisor Notification Alert</span>
                        <span className="font-mono text-[9px] text-slate-400">Status: Dispatched</span>
                      </div>
                      <div className="p-3 bg-white font-mono space-y-1.5 text-slate-600 leading-relaxed">
                        <div><span className="text-slate-400">To:</span> gcontreras@ednovate.org</div>
                        <div><span className="text-slate-400">Subject:</span> {selectedComplaint.supervisorEmailSubject}</div>
                        <div className="whitespace-pre-wrap bg-slate-50 p-2 rounded border border-slate-100 text-[10px] max-h-36 overflow-y-auto mt-1">
                          {selectedComplaint.supervisorEmailBody}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 5. Supervisor Resolution Actions */}
                <div className="border-t border-slate-200 pt-5 space-y-4">
                  <h4 className="text-xs font-semibold text-slate-800 uppercase tracking-wider flex items-center space-x-1">
                    <span>Supervisor Case Investigation Panel</span>
                  </h4>

                  {actionSuccessMsg && (
                    <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-100 text-xs rounded-lg flex items-center space-x-2">
                      <Check className="w-4 h-4" />
                      <span>{actionSuccessMsg}</span>
                    </div>
                  )}

                  <div className="space-y-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Set Case Status</label>
                      <div className="flex space-x-2">
                        {(['Unresolved', 'Investigating', 'Resolved'] as ComplaintStatus[]).map(st => (
                          <button
                            key={st}
                            type="button"
                            onClick={() => setActionStatus(st)}
                            className={`flex-1 py-2 text-xs font-semibold rounded-lg border transition-all ${
                              actionStatus === st
                                ? st === 'Resolved'
                                  ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
                                  : st === 'Investigating'
                                  ? 'bg-amber-500 border-amber-500 text-white shadow-xs'
                                  : 'bg-rose-600 border-rose-600 text-white shadow-xs'
                                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            {st}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Investigation & Action Notes</label>
                      <textarea
                        id="supervisor-notes-input"
                        rows={3}
                        value={actionNotes}
                        onChange={(e) => setActionNotes(e.target.value)}
                        placeholder="Document your conversations with the specialist, investigation insights, corrective training actions, and parent followups here..."
                        className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white transition-all placeholder:text-slate-400"
                      />
                    </div>

                    <button
                      id="save-status-btn"
                      onClick={handleSaveStatus}
                      disabled={isSavingAction}
                      className="w-full py-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center space-x-1"
                    >
                      {isSavingAction ? (
                        <span>Saving Changes...</span>
                      ) : (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Commit Status Update & Notes</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

              </div>

              {/* Drawer Footer */}
              <div className="p-4 bg-slate-50 border-t border-slate-100 shrink-0 flex items-center justify-end">
                <button
                  onClick={() => setSelectedComplaint(null)}
                  className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
                >
                  Close Panel
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
