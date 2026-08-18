/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type ComplaintStatus = 'Unresolved' | 'Investigating' | 'Resolved';
export type ComplaintSeverity = 'Low' | 'Medium' | 'High';

export interface Complaint {
  id: string;
  timestamp: string; // ISO string of submission
  parentName: string;
  parentEmail: string;
  specialistName: string;
  sessionDateTime: string; // Date & Time of the session
  prefilledComplaints: string[];
  customDetails: string;
  newTeacherSolve?: string; // Parent response to 'Would a new teacher solve this issue?'
  status: ComplaintStatus;
  supervisorNotes: string;
  
  // AI Generated fields
  category: string;
  severity: ComplaintSeverity;
  aiSummary: string;
  parentEmailSubject: string;
  parentEmailBody: string;
  supervisorEmailSubject: string;
  supervisorEmailBody: string;
}

export interface SimulatedEmail {
  id: string;
  complaintId: string;
  sender: string;
  recipient: string;
  subject: string;
  body: string;
  timestamp: string;
  type: 'parent_receipt' | 'supervisor_alert';
}

export interface Stats {
  total: number;
  unresolved: number;
  investigating: number;
  resolved: number;
  mostFrequentIssues: { issue: string; count: number }[];
}
