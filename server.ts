/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import { Complaint, SimulatedEmail, ComplaintStatus, ComplaintSeverity } from './src/types.js';

// Setup Data Persistence
const DATA_DIR = path.join(process.cwd(), 'data');
const COMPLAINTS_FILE = path.join(DATA_DIR, 'complaints.json');
const EMAILS_FILE = path.join(DATA_DIR, 'emails.json');

// Ensure database directory and files exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Pre-populate with realistic historical records if empty so the supervisor dashboard is full of useful data on first load
const initialComplaints: Complaint[] = [
  {
    id: 'comp_1',
    timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
    parentName: 'Eleanor Vance',
    parentEmail: 'eleanor.vance@example.com',
    specialistName: 'Marcus Vance, BCBA',
    sessionDateTime: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 - 2 * 60 * 60 * 1000).toISOString().slice(0, 16),
    prefilledComplaints: ['Not showing up on time', 'Lack of communication'],
    customDetails: 'Marcus was 25 minutes late and did not send any message or pick up my calls. When he arrived, he did not apologize and seemed very rushed.',
    status: 'Investigating',
    supervisorNotes: 'Emailed Marcus for clarification. He mentioned there was traffic, but acknowledged he should have communicated with the parent.',
    category: 'Punctuality & Communication',
    severity: 'Medium',
    aiSummary: 'Specialist was 25 minutes late without proactive communication. Did not acknowledge the lateness or apologize upon arrival.',
    parentEmailSubject: 'Complaint Received - Session with Specialist Marcus Vance',
    parentEmailBody: 'Dear Eleanor Vance,\n\nWe have received your complaint regarding the session with Marcus Vance on ' + new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 - 2 * 60 * 60 * 1000).toLocaleDateString() + '. We understand that the specialist was late by 25 minutes and did not communicate, which is not in line with our standards. We are investigating this matter and will contact you shortly with an update.\n\nBest regards,\nComplaint Resolution Team',
    supervisorEmailSubject: 'ALERT: Medium Severity Complaint - Marcus Vance',
    supervisorEmailBody: 'Dear Supervisor,\n\nAn incident of Medium severity has been logged for specialist Marcus Vance, BCBA. Parent Eleanor Vance reported 25-minute tardiness and a total lack of communication. Please review the details in the dashboard and take action.'
  },
  {
    id: 'comp_2',
    timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
    parentName: 'Robert Jenkins',
    parentEmail: 'r.jenkins@example.com',
    specialistName: 'Sarah Jenkins, RBT',
    sessionDateTime: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000 - 3 * 60 * 60 * 1000).toISOString().slice(0, 16),
    prefilledComplaints: ['Incomplete session duration'],
    customDetails: 'The session was scheduled for 2 hours, but Sarah packed up and left after 1 hour and 15 minutes, claiming she had to beat the afternoon rush hour.',
    status: 'Unresolved',
    supervisorNotes: '',
    category: 'Session Duration',
    severity: 'High',
    aiSummary: 'Specialist allegedly shortened a 2-hour session by 45 minutes, citing personal convenience (traffic/rush hour) as the reason for early departure.',
    parentEmailSubject: 'Acknowledgement: Incomplete Session Duration - Sarah Jenkins',
    parentEmailBody: 'Dear Robert Jenkins,\n\nThank you for bringing to our attention that the session on ' + new Date(Date.now() - 1 * 24 * 60 * 60 * 1000 - 3 * 60 * 60 * 1000).toLocaleDateString() + ' was ended 45 minutes early. We take session compliance and therapy integrity extremely seriously. We are actively conducting a review of this scheduled slot and will contact you with our resolution plans.\n\nSincerely,\nSupervisory Board',
    supervisorEmailSubject: 'URGENT ALERT: High Severity Complaint - Sarah Jenkins',
    supervisorEmailBody: 'Dear Supervisor,\n\nA High-severity complaint has been filed against Sarah Jenkins, RBT. The specialist is accused of leaving 45 minutes early from a 2-hour scheduled block. Immediate operational and scheduling audit is required.'
  },
  {
    id: 'comp_3',
    timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
    parentName: 'Maria Rodriguez',
    parentEmail: 'm.rodriguez@example.com',
    specialistName: 'David Kim, OT',
    sessionDateTime: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 - 4 * 60 * 60 * 1000).toISOString().slice(0, 16),
    prefilledComplaints: ['Not showing up on time'],
    customDetails: 'David was 5 minutes late. Not a huge issue, but wanted to log it since it happened last week too.',
    status: 'Resolved',
    supervisorNotes: 'Logged and addressed. David apologized to the parent and made up the 5 minutes at the end of the session. Parent confirmed she is satisfied with the resolution.',
    category: 'Punctuality',
    severity: 'Low',
    aiSummary: 'Specialist was slightly late (5 minutes). Parent noted it as a minor recurring punctuality pattern but noted no unprofessional behavior.',
    parentEmailSubject: 'Thank you for your feedback - David Kim',
    parentEmailBody: 'Dear Maria Rodriguez,\n\nWe appreciate you letting us know about the 5-minute delay on David Kim\'s arrival. We have spoken with David and he ensured that this minor delay was compensated by extending the session duration. Thank you for helping us maintain punctuality.\n\nWarmly,\nAdministration Team',
    supervisorEmailSubject: 'Notification: Low Severity Feedback - David Kim',
    supervisorEmailBody: 'Dear Supervisor,\n\nA low-severity minor punctuality feedback has been logged for David Kim, OT. Parent noted a 5-minute delay.'
  }
];

// Initialize Files
if (!fs.existsSync(COMPLAINTS_FILE)) {
  fs.writeFileSync(COMPLAINTS_FILE, JSON.stringify(initialComplaints, null, 2), 'utf-8');
}
if (!fs.existsSync(EMAILS_FILE)) {
  fs.writeFileSync(EMAILS_FILE, JSON.stringify([], null, 2), 'utf-8');
}

// Load current data
let complaints: Complaint[] = JSON.parse(fs.readFileSync(COMPLAINTS_FILE, 'utf-8'));
let emails: SimulatedEmail[] = JSON.parse(fs.readFileSync(EMAILS_FILE, 'utf-8'));

function saveData() {
  fs.writeFileSync(COMPLAINTS_FILE, JSON.stringify(complaints, null, 2), 'utf-8');
  fs.writeFileSync(EMAILS_FILE, JSON.stringify(emails, null, 2), 'utf-8');
}

// Initialize Gemini Client
let ai: GoogleGenAI | null = null;
const apiKey = process.env.GEMINI_API_KEY;
if (apiKey && apiKey !== 'MY_GEMINI_API_KEY') {
  ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
  console.log('Gemini AI Client successfully initialized.');
} else {
  console.log('No valid GEMINI_API_KEY detected. Using intelligent fallback local templates.');
}

async function sendRealEmailWithResend(to: string, subject: string, bodyText: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || apiKey.trim() === '') {
    console.log(`[Resend Sim] Skipped sending real email (No RESEND_API_KEY). To: ${to}, Subject: ${subject}`);
    return { success: false, error: 'No RESEND_API_KEY configured.' };
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'onboarding@resend.dev',
        to: [to],
        subject: subject,
        text: bodyText
      })
    });

    const data = await response.json() as any;
    if (!response.ok) {
      console.error('Resend API Error details:', data);
      if (data && (data.name === 'validation_error' || data.message?.toLowerCase().includes('onboarding') || data.message?.toLowerCase().includes('restrict'))) {
        console.warn('[Resend Sandbox Notice] This error usually happens because onboarding@resend.dev can only send to your own registered Resend account email address on the free tier. We logged the error, but the application continues normally using simulated logs.');
      }
      return { success: false, error: data };
    }
    console.log(`[Resend Success] Real email sent to ${to}. Message ID: ${data.id}`);
    return { success: true, id: data.id };
  } catch (err) {
    console.error('Failed to dispatch real email via Resend:', err);
    return { success: false, error: err };
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route: Reset database (optional/helpful testing button)
  app.post('/api/reset', (req, res) => {
    complaints = [...initialComplaints];
    emails = [];
    saveData();
    res.json({ message: 'Database reset to default template items.', complaints, emails });
  });

  // API Route: Get all complaints
  app.get('/api/complaints', (req, res) => {
    res.json(complaints);
  });

  // API Route: Get all emails (our Simulated outbox)
  app.get('/api/emails', (req, res) => {
    res.json(emails);
  });

  // API Route: Submit new complaint
  app.post('/api/complaints', async (req, res) => {
    try {
      const {
        parentName,
        parentEmail,
        specialistName,
        sessionDateTime,
        prefilledComplaints,
        customDetails,
        newTeacherSolve
      } = req.body;

      // Validate inputs
      if (!parentName || !parentEmail || !specialistName || !sessionDateTime) {
        return res.status(400).json({ error: 'Missing required fields (Parent Name, Parent Email, Specialist Name, Session Date/Time).' });
      }

      // 1. Generate standard metadata
      const id = 'comp_' + Math.random().toString(36).substring(2, 11);
      const timestamp = new Date().toISOString();

      // 2. Prepare AI analysis or rule-based fallback
      let analysis = {
        category: 'Uncategorized',
        severity: 'Low' as ComplaintSeverity,
        aiSummary: 'No detailed description was provided.',
        parentEmailSubject: 'We have received your complaint',
        parentEmailBody: '',
        supervisorEmailSubject: 'ALERT: Specialist Complaint Logged',
        supervisorEmailBody: ''
      };

      // Rule-based standard backup generator in case Gemini is offline or API key isn't provided
      const formattedSessionTime = new Date(sessionDateTime).toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short'
      });

      const issueSummaryStr = prefilledComplaints && prefilledComplaints.length > 0
        ? prefilledComplaints.join(', ')
        : 'Other / Custom complaint';

      // Smart rule-based template builder
      const fallbackCategory = prefilledComplaints && prefilledComplaints.length > 0 
        ? prefilledComplaints[0].split(' ')[0] // e.g. "Not" or "Unprofessional" or "Incomplete"
        : 'Specialist Behavior';

      let fallbackSeverity: ComplaintSeverity = 'Low';
      if (
        customDetails?.toLowerCase().includes('abuse') || 
        customDetails?.toLowerCase().includes('hurt') || 
        customDetails?.toLowerCase().includes('leave early') || 
        prefilledComplaints?.includes('Unprofessional behavior')
      ) {
        fallbackSeverity = 'High';
      } else if (
        prefilledComplaints?.includes('Incomplete session duration') || 
        prefilledComplaints?.includes('Not showing up on time')
      ) {
        fallbackSeverity = 'Medium';
      }

      analysis.category = fallbackCategory;
      analysis.severity = fallbackSeverity;
      analysis.aiSummary = `Parent submitted feedback regarding session with ${specialistName} on ${formattedSessionTime}. Issues highlighted: ${issueSummaryStr}. Details: "${customDetails || 'None provided'}"${newTeacherSolve ? `. Would a new teacher solve the issue? "${newTeacherSolve}"` : ''}`;
      
      analysis.parentEmailSubject = `Confirmation of Receipt - Feedback on Session with ${specialistName}`;
      analysis.parentEmailBody = `Dear ${parentName},\n\nThank you for contacting the Intervention Services Quality Assurance team. We confirm receiving your feedback concerning your session with Specialist ${specialistName} on ${formattedSessionTime}.\n\nReported issues:\n- ${issueSummaryStr}\n\nOur supervisors are reviewing this report immediately, with a primary focus on ensuring consistent and professional support. We will reach out to you within 24–48 business hours with updates or to discuss resolution details.\n\nBest regards,\nQuality Assurance & Care Team\nIntervention Specialist Group`;
      
      analysis.supervisorEmailSubject = `[ALERT] ${fallbackSeverity} Severity Complaint Filed: ${specialistName}`;
      analysis.supervisorEmailBody = `Attention Supervisor,\n\nA new ${fallbackSeverity}-severity complaint has been submitted by parent ${parentName} (${parentEmail}) concerning Specialist ${specialistName}.\n\nSession Time: ${formattedSessionTime}\nReported Issues: ${issueSummaryStr}\nCustom Details: "${customDetails || 'None provided'}"\nWould a new teacher solve this issue? ${newTeacherSolve || 'Not specified'}\n\nPlease log in to the Supervisor Portal immediately to review the AI analysis, update the case status, and document investigation steps.`;

      // 3. Query Gemini for advanced, intelligent analysis if available
      if (ai) {
        try {
          const aiPrompt = `
You are an expert Quality Assurance coordinator for a special education and therapist intervention agency. 
Your job is to analyze parent complaints submitted against Intervention Specialists and generate an automated assessment.

Here are the details of the complaint:
- Parent Name: ${parentName}
- Parent Email: ${parentEmail}
- Intervention Specialist Name: ${specialistName}
- Session Date & Time: ${sessionDateTime}
- Pre-filled Checklist issues selected: ${JSON.stringify(prefilledComplaints)}
- Parent custom notes / details: "${customDetails || ''}"
- Would a new teacher solve this issue: "${newTeacherSolve || 'Not specified'}"

Perform the following tasks:
1. Determine a concise, professional Category (e.g., "Punctuality", "Professional Conduct", "Session Completion", "Communication Breakdown", or a hybrid).
2. Rate the Severity of this complaint: "Low", "Medium", or "High". High is for severe unprofessionalism, early termination of service without explanation, or repeat issues. Low is for minor delays.
3. Write a 2-3 sentence professional, objective summary of the parent's actual problem (the 'aiSummary'). Keep it factual, and if the parent answered whether a new teacher would solve the issue, reflect their response if relevant.
4. Draft an empathetic, polite confirmation email SUBJECT and BODY back to the parent. Explicitly mention their specialist's name, the date/time of the session, and give them a reassuring timeline of 24-48 hours. Keep it formatted with paragraph linebreaks.
5. Draft an alert email SUBJECT and BODY to the agency supervisor. The subject should contain the severity level and specialist name. The body should list the specific concerns, session details (including if a new teacher would solve the issue), and suggest immediate action steps for the supervisor.

Return your response strictly in the following JSON schema:
{
  "category": "String category of the complaint",
  "severity": "Low" | "Medium" | "High",
  "aiSummary": "String summary of the issues",
  "parentEmailSubject": "String subject",
  "parentEmailBody": "String email body to parent",
  "supervisorEmailSubject": "String subject to supervisor",
  "supervisorEmailBody": "String email body to supervisor"
}
`;

          let response;
          try {
            console.log('Attempting analysis with gemini-3.5-flash...');
            response = await ai.models.generateContent({
              model: 'gemini-3.5-flash',
              contents: aiPrompt,
              config: {
                responseMimeType: 'application/json',
                responseSchema: {
                  type: Type.OBJECT,
                  properties: {
                    category: { type: Type.STRING },
                    severity: { type: Type.STRING, enum: ['Low', 'Medium', 'High'] },
                    aiSummary: { type: Type.STRING },
                    parentEmailSubject: { type: Type.STRING },
                    parentEmailBody: { type: Type.STRING },
                    supervisorEmailSubject: { type: Type.STRING },
                    supervisorEmailBody: { type: Type.STRING }
                  },
                  required: [
                    'category',
                    'severity',
                    'aiSummary',
                    'parentEmailSubject',
                    'parentEmailBody',
                    'supervisorEmailSubject',
                    'supervisorEmailBody'
                  ]
                }
              }
            });
          } catch (firstErr: any) {
            console.warn('gemini-3.5-flash failed or was unavailable, attempting fallback to gemini-3.1-flash-lite...', firstErr.message || firstErr);
            response = await ai.models.generateContent({
              model: 'gemini-3.1-flash-lite',
              contents: aiPrompt,
              config: {
                responseMimeType: 'application/json',
                responseSchema: {
                  type: Type.OBJECT,
                  properties: {
                    category: { type: Type.STRING },
                    severity: { type: Type.STRING, enum: ['Low', 'Medium', 'High'] },
                    aiSummary: { type: Type.STRING },
                    parentEmailSubject: { type: Type.STRING },
                    parentEmailBody: { type: Type.STRING },
                    supervisorEmailSubject: { type: Type.STRING },
                    supervisorEmailBody: { type: Type.STRING }
                  },
                  required: [
                    'category',
                    'severity',
                    'aiSummary',
                    'parentEmailSubject',
                    'parentEmailBody',
                    'supervisorEmailSubject',
                    'supervisorEmailBody'
                  ]
                }
              }
            });
          }

          if (response && response.text) {
            const parsed = JSON.parse(response.text.trim());
            analysis = { ...analysis, ...parsed };
            console.log('Successfully completed Gemini AI complaint analysis.');
          }
        } catch (aiError) {
          console.error('Error during Gemini API generation, using rule-based fallback:', aiError);
        }
      }

      // 4. Create Complaint Record
      const newComplaint: Complaint = {
        id,
        timestamp,
        parentName,
        parentEmail,
        specialistName,
        sessionDateTime,
        prefilledComplaints: prefilledComplaints || [],
        customDetails: customDetails || '',
        newTeacherSolve: newTeacherSolve || '',
        status: 'Unresolved',
        supervisorNotes: '',
        category: analysis.category,
        severity: analysis.severity,
        aiSummary: analysis.aiSummary,
        parentEmailSubject: analysis.parentEmailSubject,
        parentEmailBody: analysis.parentEmailBody,
        supervisorEmailSubject: analysis.supervisorEmailSubject,
        supervisorEmailBody: analysis.supervisorEmailBody
      };

      // 5. Trigger simulated emails (outbox logging)
      const parentEmailLog: SimulatedEmail = {
        id: 'mail_' + Math.random().toString(36).substring(2, 11),
        complaintId: id,
        sender: 'no-reply@intervention-system.org',
        recipient: parentEmail,
        subject: analysis.parentEmailSubject,
        body: analysis.parentEmailBody,
        timestamp: new Date().toISOString(),
        type: 'parent_receipt'
      };

      const supervisorEmailLog: SimulatedEmail = {
        id: 'mail_' + Math.random().toString(36).substring(2, 11),
        complaintId: id,
        sender: 'alerts@intervention-system.org',
        recipient: 'gcontreras@ednovate.org',
        subject: analysis.supervisorEmailSubject,
        body: analysis.supervisorEmailBody,
        timestamp: new Date().toISOString(),
        type: 'supervisor_alert'
      };

      // Append to server-side lists
      complaints.unshift(newComplaint); // Newest first
      emails.unshift(parentEmailLog, supervisorEmailLog); // Newest first
      
      saveData();

      // 6. Optional: Trigger real Resend emails (if API key is present)
      const isSupervisorEmail = parentEmail.toLowerCase().trim() === 'gcontreras@ednovate.org';

      if (isSupervisorEmail) {
        // Parent email is the supervisor's email - send parent receipt directly (will succeed)
        await sendRealEmailWithResend('gcontreras@ednovate.org', analysis.parentEmailSubject, analysis.parentEmailBody);
      } else {
        // Attempt to send to the actual input parent email
        const parentRes = await sendRealEmailWithResend(parentEmail, analysis.parentEmailSubject, analysis.parentEmailBody);
        
        // If it failed because of Sandbox constraints (or if parentEmail is a dummy like parent@email.com),
        // forward a copy of the parent receipt to the verified supervisor email so they can still see it in their inbox!
        if (!parentRes.success) {
          console.log(`[Resend Sandbox Fallback] Forwarding copy of Parent Receipt to verified supervisor address: gcontreras@ednovate.org`);
          await sendRealEmailWithResend(
            'gcontreras@ednovate.org', 
            `[Parent Receipt Copy for ${parentEmail}] ${analysis.parentEmailSubject}`, 
            `--- SANDBOX COPY FOR PARENT (${parentEmail}) ---\n\n${analysis.parentEmailBody}`
          );
        }
      }

      // Always send the supervisor alert to gcontreras@ednovate.org
      await sendRealEmailWithResend('gcontreras@ednovate.org', analysis.supervisorEmailSubject, analysis.supervisorEmailBody);

      res.status(201).json({
        message: 'Complaint submitted successfully.',
        complaint: newComplaint,
        emailsDispatched: [parentEmailLog, supervisorEmailLog]
      });

    } catch (err: any) {
      console.error('Error adding complaint:', err);
      res.status(500).json({ error: 'Server error processing complaint submission.' });
    }
  });

  // API Route: Update complaint status and supervisor notes
  app.put('/api/complaints/:id/status', (req, res) => {
    try {
      const { id } = req.params;
      const { status, supervisorNotes } = req.body;

      if (!status) {
        return res.status(400).json({ error: 'Missing status update value.' });
      }

      const index = complaints.findIndex(c => c.id === id);
      if (index === -1) {
        return res.status(404).json({ error: 'Complaint not found.' });
      }

      // Maintain notes or overwrite if provided
      complaints[index].status = status as ComplaintStatus;
      if (supervisorNotes !== undefined) {
        complaints[index].supervisorNotes = supervisorNotes;
      }

      saveData();
      res.json({ message: 'Complaint status updated.', complaint: complaints[index] });

    } catch (err: any) {
      console.error('Error updating status:', err);
      res.status(500).json({ error: 'Server error processing status update.' });
    }
  });

  // Vite Integration
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
