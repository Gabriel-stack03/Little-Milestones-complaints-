/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import pg from 'pg';
import { Complaint, SimulatedEmail, ComplaintStatus, ComplaintSeverity } from './types.js';

const { Pool } = pg;

let pool: pg.Pool | null = null;
let isPgInitialized = false;

/**
 * Initializes and returns the PostgreSQL connection pool if DATABASE_URL is configured.
 */
export function getPgPool(): pg.Pool | null {
  if (pool) return pool;

  const dbUrl = process.env.DATABASE_URL?.trim();
  if (!dbUrl) {
    return null;
  }

  try {
    const isLocalhost = dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1');
    pool = new Pool({
      connectionString: dbUrl,
      ssl: isLocalhost ? false : { rejectUnauthorized: false },
      max: 10,
      connectionTimeoutMillis: 10000,
    });

    pool.on('error', (err) => {
      console.error('Unexpected error on idle PostgreSQL client pool:', err);
    });

    return pool;
  } catch (error) {
    console.error('Failed to initialize PostgreSQL pool from DATABASE_URL:', error);
    return null;
  }
}

/**
 * Initializes the PostgreSQL schema (creates tables if they don't exist)
 * and seeds initial records if the database is currently empty.
 */
export async function initPgDatabase(initialComplaints: Complaint[]): Promise<boolean> {
  const currentPool = getPgPool();
  if (!currentPool) {
    console.log('[Database] No DATABASE_URL provided. Operating in local file-system storage mode.');
    return false;
  }

  try {
    const client = await currentPool.connect();
    try {
      console.log('[Database] Connected to PostgreSQL. Initializing tables...');

      // 1. Create complaints table
      await client.query(`
        CREATE TABLE IF NOT EXISTS complaints (
          id VARCHAR(64) PRIMARY KEY,
          timestamp VARCHAR(64) NOT NULL,
          parent_name TEXT NOT NULL,
          parent_email TEXT NOT NULL,
          specialist_name TEXT NOT NULL,
          session_date_time VARCHAR(64) NOT NULL,
          prefilled_complaints JSONB NOT NULL DEFAULT '[]'::jsonb,
          custom_details TEXT DEFAULT '',
          new_teacher_solve TEXT DEFAULT '',
          status VARCHAR(32) NOT NULL DEFAULT 'Unresolved',
          supervisor_notes TEXT DEFAULT '',
          category TEXT DEFAULT 'Uncategorized',
          severity VARCHAR(32) DEFAULT 'Low',
          ai_summary TEXT DEFAULT '',
          parent_email_subject TEXT DEFAULT '',
          parent_email_body TEXT DEFAULT '',
          supervisor_email_subject TEXT DEFAULT '',
          supervisor_email_body TEXT DEFAULT '',
          created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // 2. Create emails log table
      await client.query(`
        CREATE TABLE IF NOT EXISTS emails (
          id VARCHAR(64) PRIMARY KEY,
          complaint_id VARCHAR(64) NOT NULL,
          sender TEXT NOT NULL,
          recipient TEXT NOT NULL,
          subject TEXT NOT NULL,
          body TEXT NOT NULL,
          timestamp VARCHAR(64) NOT NULL,
          type VARCHAR(32) NOT NULL,
          created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // 3. Seed initial sample complaints if the complaints table is empty
      const countRes = await client.query('SELECT COUNT(*) FROM complaints');
      const totalComplaints = parseInt(countRes.rows[0].count, 10);

      if (totalComplaints === 0 && initialComplaints.length > 0) {
        console.log('[Database] Seeding initial template complaints into PostgreSQL...');
        for (const item of initialComplaints) {
          await client.query(
            `INSERT INTO complaints (
              id, timestamp, parent_name, parent_email, specialist_name, session_date_time,
              prefilled_complaints, custom_details, new_teacher_solve, status, supervisor_notes,
              category, severity, ai_summary, parent_email_subject, parent_email_body,
              supervisor_email_subject, supervisor_email_body
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
            ON CONFLICT (id) DO NOTHING`,
            [
              item.id,
              item.timestamp,
              item.parentName,
              item.parentEmail,
              item.specialistName,
              item.sessionDateTime,
              JSON.stringify(item.prefilledComplaints || []),
              item.customDetails || '',
              item.newTeacherSolve || '',
              item.status,
              item.supervisorNotes || '',
              item.category,
              item.severity,
              item.aiSummary,
              item.parentEmailSubject,
              item.parentEmailBody,
              item.supervisorEmailSubject,
              item.supervisorEmailBody
            ]
          );
        }
      }

      isPgInitialized = true;
      console.log('[Database] PostgreSQL tables initialized and ready.');
      return true;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('[Database] Failed to initialize PostgreSQL tables:', error);
    return false;
  }
}

/**
 * Maps database row to Complaint interface
 */
function mapRowToComplaint(row: any): Complaint {
  let prefilled: string[] = [];
  if (Array.isArray(row.prefilled_complaints)) {
    prefilled = row.prefilled_complaints;
  } else if (typeof row.prefilled_complaints === 'string') {
    try {
      prefilled = JSON.parse(row.prefilled_complaints);
    } catch {
      prefilled = [];
    }
  }

  return {
    id: row.id,
    timestamp: row.timestamp,
    parentName: row.parent_name,
    parentEmail: row.parent_email,
    specialistName: row.specialist_name,
    sessionDateTime: row.session_date_time,
    prefilledComplaints: prefilled,
    customDetails: row.custom_details || '',
    newTeacherSolve: row.new_teacher_solve || '',
    status: row.status as ComplaintStatus,
    supervisorNotes: row.supervisor_notes || '',
    category: row.category || 'Uncategorized',
    severity: row.severity as ComplaintSeverity,
    aiSummary: row.ai_summary || '',
    parentEmailSubject: row.parent_email_subject || '',
    parentEmailBody: row.parent_email_body || '',
    supervisorEmailSubject: row.supervisor_email_subject || '',
    supervisorEmailBody: row.supervisor_email_body || ''
  };
}

/**
 * Maps database row to SimulatedEmail interface
 */
function mapRowToEmail(row: any): SimulatedEmail {
  return {
    id: row.id,
    complaintId: row.complaint_id,
    sender: row.sender,
    recipient: row.recipient,
    subject: row.subject,
    body: row.body,
    timestamp: row.timestamp,
    type: row.type as 'parent_receipt' | 'supervisor_alert'
  };
}

export const dbService = {
  isPgActive(): boolean {
    return isPgInitialized && pool !== null;
  },

  async getAllComplaints(): Promise<Complaint[]> {
    const currentPool = getPgPool();
    if (!currentPool || !isPgInitialized) {
      throw new Error('PostgreSQL is not active');
    }
    const res = await currentPool.query('SELECT * FROM complaints ORDER BY timestamp DESC');
    return res.rows.map(mapRowToComplaint);
  },

  async insertComplaint(item: Complaint): Promise<void> {
    const currentPool = getPgPool();
    if (!currentPool || !isPgInitialized) {
      throw new Error('PostgreSQL is not active');
    }
    await currentPool.query(
      `INSERT INTO complaints (
        id, timestamp, parent_name, parent_email, specialist_name, session_date_time,
        prefilled_complaints, custom_details, new_teacher_solve, status, supervisor_notes,
        category, severity, ai_summary, parent_email_subject, parent_email_body,
        supervisor_email_subject, supervisor_email_body
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)`,
      [
        item.id,
        item.timestamp,
        item.parentName,
        item.parentEmail,
        item.specialistName,
        item.sessionDateTime,
        JSON.stringify(item.prefilledComplaints || []),
        item.customDetails || '',
        item.newTeacherSolve || '',
        item.status,
        item.supervisorNotes || '',
        item.category,
        item.severity,
        item.aiSummary,
        item.parentEmailSubject,
        item.parentEmailBody,
        item.supervisorEmailSubject,
        item.supervisorEmailBody
      ]
    );
  },

  async updateComplaintStatus(id: string, status: ComplaintStatus, notes?: string): Promise<Complaint | null> {
    const currentPool = getPgPool();
    if (!currentPool || !isPgInitialized) {
      throw new Error('PostgreSQL is not active');
    }

    let query: string;
    let params: any[];

    if (notes !== undefined) {
      query = `UPDATE complaints SET status = $1, supervisor_notes = $2 WHERE id = $3 RETURNING *`;
      params = [status, notes, id];
    } else {
      query = `UPDATE complaints SET status = $1 WHERE id = $2 RETURNING *`;
      params = [status, id];
    }

    const res = await currentPool.query(query, params);
    if (res.rows.length === 0) return null;
    return mapRowToComplaint(res.rows[0]);
  },

  async getAllEmails(): Promise<SimulatedEmail[]> {
    const currentPool = getPgPool();
    if (!currentPool || !isPgInitialized) {
      throw new Error('PostgreSQL is not active');
    }
    const res = await currentPool.query('SELECT * FROM emails ORDER BY timestamp DESC');
    return res.rows.map(mapRowToEmail);
  },

  async insertEmail(email: SimulatedEmail): Promise<void> {
    const currentPool = getPgPool();
    if (!currentPool || !isPgInitialized) {
      throw new Error('PostgreSQL is not active');
    }
    await currentPool.query(
      `INSERT INTO emails (id, complaint_id, sender, recipient, subject, body, timestamp, type)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        email.id,
        email.complaintId,
        email.sender,
        email.recipient,
        email.subject,
        email.body,
        email.timestamp,
        email.type
      ]
    );
  },

  async resetDatabase(initialList: Complaint[]): Promise<void> {
    const currentPool = getPgPool();
    if (!currentPool || !isPgInitialized) {
      throw new Error('PostgreSQL is not active');
    }
    await currentPool.query('DELETE FROM emails');
    await currentPool.query('DELETE FROM complaints');
    for (const item of initialList) {
      await this.insertComplaint(item);
    }
  }
};
