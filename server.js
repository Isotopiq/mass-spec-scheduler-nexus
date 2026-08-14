import express from 'express';
import { Pool } from 'pg';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import cors from 'cors';
import multer from 'multer';
import nodemailer from 'nodemailer';
import XLSX from 'xlsx';
import dotenv from 'dotenv';
import pgFormat from 'pg-format';
import * as fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import crypto from 'crypto';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadBucketCommand } from '@aws-sdk/client-s3';
import { cardTemplates, modernTemplates } from './emailTemplatePresets.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;
const DATABASE_URL = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/mass_spec_scheduler';
const JWT_SECRET = process.env.JWT_SECRET || 'change-me';
const S3_PROVIDER = (process.env.S3_PROVIDER || 'local').toLowerCase();
const UPLOAD_DIR = path.join(__dirname, 'uploads');

if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const pool = new Pool({ connectionString: DATABASE_URL });

const ALLOWED_TABLES = {
  app_settings: { select: 'all', insert: 'admin', update: 'admin', delete: 'admin', restrictedColumns: [] },
  booking_templates: { select: 'owner-or-admin', insert: 'authenticated', update: 'owner-or-admin', delete: 'owner-or-admin', restrictedColumns: [] },
  bookings: { select: 'all', insert: 'authenticated', update: 'owner-or-admin', delete: 'owner-or-admin', restrictedColumns: [] },
  booking_swaps: { select: 'admin', insert: 'authenticated', update: 'admin', delete: 'admin', restrictedColumns: [] },
  booking_waitlist: { select: 'owner-or-admin', insert: 'authenticated', update: 'owner-or-admin', delete: 'owner-or-admin', restrictedColumns: [] },
  comments: { select: 'all', insert: 'authenticated', update: 'owner-or-admin', delete: 'owner-or-admin', restrictedColumns: [] },
  email_digests: { select: 'owner-or-admin', insert: 'authenticated', update: 'owner-or-admin', delete: 'owner-or-admin', restrictedColumns: [] },
  email_templates: { select: 'all', insert: 'admin', update: 'admin', delete: 'admin', restrictedColumns: [] },
  instruments: { select: 'all', insert: 'admin', update: 'admin', delete: 'admin', restrictedColumns: [] },
  instrument_maintenance: { select: 'all', insert: 'admin', update: 'admin', delete: 'admin', restrictedColumns: [] },
  maintenance_history: { select: 'all', insert: 'admin', update: 'admin', delete: 'admin', restrictedColumns: [] },
  notifications: { select: 'owner-or-admin', insert: 'admin', update: 'owner-or-admin', delete: 'owner-or-admin', restrictedColumns: [] },
  profiles: { select: 'all', insert: 'admin', update: 'owner-or-admin', delete: 'admin', restrictedColumns: ['password_hash'] },
  schedule_delays: { select: 'all', insert: 'admin', update: 'admin', delete: 'admin', restrictedColumns: [] },
  schedule_delay_bookings: { select: 'all', insert: 'admin', update: 'admin', delete: 'admin', restrictedColumns: [] },
  smtp_settings: { select: 'admin', insert: 'admin', update: 'admin', delete: 'admin', restrictedColumns: [] },
  status_colors: { select: 'all', insert: 'admin', update: 'admin', delete: 'admin', restrictedColumns: [] },
  usage_quota_periods: { select: 'all', insert: 'admin', update: 'admin', delete: 'admin', restrictedColumns: [] },
  usage_quotas: { select: 'all', insert: 'admin', update: 'admin', delete: 'admin', restrictedColumns: [] },
};

function sanitizeColumn(col) {
  return col && /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(col) ? col : null;
}

function sanitizeColumns(cols, table) {
  const restricted = ALLOWED_TABLES[table]?.restrictedColumns || [];
  if (!cols || cols === '*') {
    return Object.keys(ALLOWED_TABLES).includes(table) ? pgFormat('"%I".*', table) : '*';
  }
  const parts = Array.isArray(cols) ? cols : String(cols).split(',').map(c => c.trim()).filter(Boolean);
  const safe = parts.map(sanitizeColumn).filter(Boolean).filter(c => !restricted.includes(c));
  if (safe.length === 0) return 'NULL';
  return safe.map(c => pgFormat('"%I"', c)).join(', ');
}

function buildWhere(filters, table, user, action, values, paramStart = 1) {
  const conditions = [];
  const params = [];
  let paramIdx = paramStart;

  const addCondition = (op, col, val) => {
    const safeCol = sanitizeColumn(col);
    if (!safeCol) return;
    switch (op) {
      case 'eq':
        conditions.push(pgFormat('"%I" = $%s', safeCol, paramIdx++));
        params.push(val);
        break;
      case 'neq':
        conditions.push(pgFormat('"%I" != $%s', safeCol, paramIdx++));
        params.push(val);
        break;
      case 'gt':
        conditions.push(pgFormat('"%I" > $%s', safeCol, paramIdx++));
        params.push(val);
        break;
      case 'gte':
        conditions.push(pgFormat('"%I" >= $%s', safeCol, paramIdx++));
        params.push(val);
        break;
      case 'lt':
        conditions.push(pgFormat('"%I" < $%s', safeCol, paramIdx++));
        params.push(val);
        break;
      case 'lte':
        conditions.push(pgFormat('"%I" <= $%s', safeCol, paramIdx++));
        params.push(val);
        break;
      case 'is':
        conditions.push(pgFormat('"%I" IS NULL', safeCol));
        break;
      case 'in':
        if (Array.isArray(val) && val.length > 0) {
          conditions.push(pgFormat('"%I"::text = ANY($%s::text[])', safeCol, paramIdx++));
          params.push(val.map(v => String(v)));
        }
        break;
    }
  };

  // Authorization conditions
  if (table === 'profiles' && (action === 'update' || action === 'delete')) {
    if (user.role !== 'admin') {
      conditions.push(pgFormat('"id" = $%s', paramIdx++));
      params.push(user.id);
    }
  }
  if (table === 'bookings' && (action === 'update' || action === 'delete' || action === 'insert')) {
    if (user.role !== 'admin') {
      if (action === 'insert') {
        // ensure user_id is current user; handled in value override below
      } else {
        const start = paramIdx;
        conditions.push(pgFormat('"user_id" = $%s OR $%s = $%s', start, start + 1, start + 2));
        params.push(user.id, user.role, 'admin'); // simplified: if admin, allow all; else own
        paramIdx += 3;
      }
    }
  }
  if (table === 'booking_waitlist' && (action === 'update' || action === 'delete' || action === 'select')) {
    if (user.role !== 'admin') {
      conditions.push(pgFormat('"user_id" = $%s', paramIdx++));
      params.push(user.id);
    }
  }
  if (table === 'comments' && (action === 'update' || action === 'delete')) {
    if (user.role !== 'admin') {
      conditions.push(pgFormat('"user_id" = $%s', paramIdx++));
      params.push(user.id);
    }
  }
  if (table === 'notifications' && (action === 'update' || action === 'delete' || action === 'select')) {
    if (user.role !== 'admin') {
      conditions.push(pgFormat('"user_id" = $%s', paramIdx++));
      params.push(user.id);
    }
  }
  if (table === 'email_digests' && (action === 'update' || action === 'delete' || action === 'select')) {
    if (user.role !== 'admin') {
      conditions.push(pgFormat('"user_id" = $%s', paramIdx++));
      params.push(user.id);
    }
  }
  if (table === 'smtp_settings' && action === 'select') {
    if (user.role !== 'admin') {
      // non-admins cannot view SMTP credentials
      throw new Error('Unauthorized');
    }
  }

  for (const f of (filters || [])) {
    if (Array.isArray(f)) {
      // or/and not used
      continue;
    }
    addCondition(f.op, f.column, f.value);
  }

  return { where: conditions.length ? 'WHERE ' + conditions.join(' AND ') : '', params, paramIdx };
}

function sanitizeValues(values, table) {
  const restricted = ALLOWED_TABLES[table]?.restrictedColumns || [];
  const out = {};
  for (const [k, v] of Object.entries(values)) {
    const safe = sanitizeColumn(k);
    if (safe && !restricted.includes(safe)) {
      out[safe] = v;
    }
  }
  return out;
}

function authorizeAction(table, action, user) {
  const perms = ALLOWED_TABLES[table];
  if (!perms) throw new Error('Unknown table');
  const required = perms[action];
  if (required === 'admin' && user.role !== 'admin') throw new Error('Admin access required');
  if (required === 'authenticated' && !user) throw new Error('Authentication required');
  if (required === 'owner-or-admin' && user.role !== 'admin' && action === 'insert' && !user) throw new Error('Authentication required');
}

async function getSettings() {
  try {
    const { rows } = await pool.query('SELECT * FROM app_settings LIMIT 1');
    return rows[0] || null;
  } catch (e) {
    return null;
  }
}

async function enforceQuotaRules(userId, instrumentId, startTime, endTime, excludeBookingId) {
  const user_id = userId;
  if (!user_id || !startTime || !endTime) return;

  const { rows: periods } = await pool.query(
    `SELECT p.id, p.name, p.start_date, p.end_date
     FROM usage_quota_periods p
     WHERE p.active = true
       AND p.start_date <= $1 AND p.end_date >= $2`,
    [endTime, startTime]
  );

  for (const period of periods) {
    const { rows: quotas } = await pool.query(
      `SELECT q.*
       FROM usage_quotas q
       WHERE q.period_id = $1 AND q.user_id = $2
         AND (q.instrument_id IS NULL OR q.instrument_id = $3)`,
      [period.id, user_id, instrumentId]
    );

    for (const quota of quotas) {
      const { rows: usage } = await pool.query(
        `SELECT
           COALESCE(SUM(EXTRACT(EPOCH FROM (b.end_time - b.start_time)) / 3600.0), 0) AS total_hours,
           COUNT(*) AS total_bookings
         FROM bookings b
         WHERE b.user_id = $1
           AND b.start_time >= $2 AND b.end_time <= $3
           AND lower(b.status) NOT IN ('cancelled', 'denied')
           AND ($4::uuid IS NULL OR b.id <> $4)
           AND ($5::uuid IS NULL OR b.instrument_id = $5)`,
        [user_id, period.start_date, period.end_date, excludeBookingId || null, quota.instrument_id || null]
      );
      const u = usage[0];
      const newHours = (new Date(endTime) - new Date(startTime)) / 36e5;
      const newTotalHours = parseFloat(u.total_hours) + newHours;
      const newTotalBookings = parseInt(u.total_bookings, 10) + 1;

      if (quota.max_hours !== null && newTotalHours > parseFloat(quota.max_hours)) {
        throw new Error(`Quota exceeded for period "${period.name}": this booking would exceed the ${quota.max_hours}-hour limit for ${quota.instrument_id ? 'this instrument' : 'all instruments'}.`);
      }
      if (quota.max_bookings !== null && newTotalBookings > quota.max_bookings) {
        throw new Error(`Quota exceeded for period "${period.name}": this booking would exceed the ${quota.max_bookings}-booking limit for ${quota.instrument_id ? 'this instrument' : 'all instruments'}.`);
      }
    }
  }
}

async function enforceBookingRules(action, values, table, filters, user) {
  if (table !== 'bookings') return;

  let startTime = values?.start_time;
  let endTime = values?.end_time;
  let status = values?.status;
  let instrumentId = values?.instrument_id;
  let bookingId = null;
  let existingStartTime = null;

  // For update, gather existing if needed
  if (action === 'update' && values) {
    const idFilter = (filters || []).find(f => f.op === 'eq' && f.column === 'id');
    if (idFilter) {
      bookingId = idFilter.value;
      const existing = await pool.query('SELECT * FROM bookings WHERE id = $1', [bookingId]);
      if (existing.rows.length) {
        const ex = existing.rows[0];
        existingStartTime = ex.start_time;
        if (!startTime) startTime = ex.start_time;
        if (!endTime) endTime = ex.end_time;
        if (!status) status = ex.status;
        if (!instrumentId) instrumentId = ex.instrument_id;
      }
    }
  }

  if (action === 'insert') {
    if (!user) throw new Error('Authentication required');
    if (user.role !== 'admin') values.user_id = user.id;
    // enforce user_id matches for non-admins
    if (user.role !== 'admin' && values.user_id && values.user_id !== user.id) {
      throw new Error('Cannot create booking for another user');
    }
  }

  // Horizon check when start_time is provided and is being changed on update
  const startChanged = !existingStartTime || (startTime && startTime !== existingStartTime);
  if (startTime && startChanged) {
    const settings = await getSettings();
    const maxDays = settings?.max_booking_days_ahead ?? 0;
    if (maxDays > 0) {
      const start = new Date(startTime);
      const now = new Date();
      const maxDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + maxDays, 23, 59, 59, 999);
      if (start > maxDate) {
        throw new Error(`Booking cannot be scheduled more than ${maxDays} days in advance`);
      }
    }
  }

  // Overlap check for active bookings
  const lowerStatus = String(status || '').toLowerCase();
  if (startTime && endTime && instrumentId && !['cancelled', 'denied'].includes(lowerStatus)) {
    const overlapQuery = `
      SELECT 1 FROM bookings
      WHERE instrument_id = $1 AND id <> COALESCE($2, '00000000-0000-0000-0000-000000000000'::uuid)
        AND lower(status) NOT IN ('cancelled', 'denied')
        AND start_time < $3 AND end_time > $4
      LIMIT 1
    `;
    const { rows } = await pool.query(overlapQuery, [instrumentId, bookingId || null, endTime, startTime]);
    if (rows.length) throw new Error('Booking conflict: this instrument is already booked during the selected time window.');

    // Maintenance conflict check
    const maintQuery = `
      SELECT 1 FROM instrument_maintenance
      WHERE instrument_id = $1
        AND lower(status) NOT IN ('cancelled', 'completed')
        AND start_time < $2 AND end_time > $3
      LIMIT 1
    `;
    const { rows: maintRows } = await pool.query(maintQuery, [instrumentId, endTime, startTime]);
    if (maintRows.length) throw new Error('Instrument is unavailable due to scheduled maintenance during the selected time window.');
  }

  // Quota enforcement
  const effectiveUserId = values?.user_id || user?.id;
  if (effectiveUserId && startTime && endTime && !['cancelled', 'denied'].includes(lowerStatus)) {
    await enforceQuotaRules(effectiveUserId, instrumentId, startTime, endTime, action === 'update' ? bookingId : null);
  }
}

async function validateMaintenanceEvent(action, values, filters) {
  let instrumentId = values?.instrument_id;
  let startTime = values?.start_time;
  let endTime = values?.end_time;
  let status = values?.status;
  let maintenanceId = null;

  if (action === 'update') {
    const idFilter = (filters || []).find(f => f.op === 'eq' && f.column === 'id');
    if (idFilter) {
      maintenanceId = idFilter.value;
      const existing = await pool.query('SELECT * FROM instrument_maintenance WHERE id = $1', [maintenanceId]);
      if (existing.rows.length) {
        const ex = existing.rows[0];
        instrumentId = instrumentId || ex.instrument_id;
        startTime = startTime || ex.start_time;
        endTime = endTime || ex.end_time;
        status = status || ex.status;
      }
    }
  }

  if (!instrumentId || !startTime || !endTime) return;
  if (['cancelled', 'completed'].includes(String(status || '').toLowerCase())) return;

  const bookingOverlapQuery = `
    SELECT 1 FROM bookings
    WHERE instrument_id = $1
      AND lower(status) NOT IN ('cancelled', 'denied')
      AND start_time < $2 AND end_time > $3
    LIMIT 1
  `;
  const { rows } = await pool.query(bookingOverlapQuery, [instrumentId, endTime, startTime]);
  if (rows.length) throw new Error('Maintenance conflict: this instrument is already booked during the selected time window.');

  const maintenanceOverlapQuery = `
    SELECT 1 FROM instrument_maintenance
    WHERE instrument_id = $1
      AND lower(status) NOT IN ('cancelled', 'completed')
      AND ($4::uuid IS NULL OR id <> $4)
      AND start_time < $2 AND end_time > $3
    LIMIT 1
  `;
  const { rows: maintRows } = await pool.query(maintenanceOverlapQuery, [instrumentId, endTime, startTime, maintenanceId]);
  if (maintRows.length) throw new Error('Maintenance conflict: another maintenance event already exists during this time window.');
}

async function handleRestQuery(req, res) {
  const user = req.user;
  const { table, action, columns, values, filters, order, limit, single, count } = req.body || {};

  try {
    if (!user) throw new Error('Unauthorized');
    if (!ALLOWED_TABLES[table]) throw new Error('Unknown table: ' + table);
    if (!['select', 'insert', 'update', 'delete'].includes(action)) throw new Error('Unknown action');

    authorizeAction(table, action, user);

    // For insert/update on bookings, run value copy/horizon/overlap
    let safeValues = values ? sanitizeValues(values, table) : null;
    if (table === 'bookings' && safeValues && (action === 'insert' || action === 'update')) {
      await enforceBookingRules(action, safeValues, table, filters, user);
    }

    if (table === 'instrument_maintenance' && safeValues && (action === 'insert' || action === 'update')) {
      await validateMaintenanceEvent(action, safeValues, filters);
    }

    if (table === 'comments' && action === 'insert' && safeValues && user.role !== 'admin') {
      safeValues.user_id = user.id;
    }

    if (table === 'booking_waitlist' && action === 'insert' && safeValues && user.role !== 'admin') {
      safeValues.user_id = user.id;
    }

    if (table === 'profiles' && action === 'insert' && safeValues && user.role !== 'admin') {
      throw new Error('Only admins can create profiles directly');
    }

    let sql = '';
    let params = [];

    if (action === 'select') {
      const selCols = String(columns || '*');
      if (selCols.toLowerCase().trim() === 'count') {
        sql = pgFormat('SELECT COUNT(*) AS count FROM "%I"', table);
      } else {
        sql = pgFormat('SELECT %s FROM "%I"', sanitizeColumns(selCols, table), table);
      }
      const { where, params: whereParams } = buildWhere(filters, table, user, action, null);
      sql += ' ' + where;
      params = whereParams;
      if (order && order.column) {
        const safeOrder = sanitizeColumn(order.column);
        if (safeOrder) sql += pgFormat(' ORDER BY "%I" %s', safeOrder, order.ascending === false ? 'DESC' : 'ASC');
      }
      if (limit && Number.isInteger(limit)) sql += ` LIMIT ${Number(limit)}`;
    } else if (action === 'insert') {
      const rows = Array.isArray(safeValues) ? safeValues : [safeValues];
      if (rows.length === 0) throw new Error('No values to insert');
      const keys = Object.keys(rows[0]);
      const safeKeys = keys.map(sanitizeColumn).filter(Boolean);
      const placeholders = rows.map((row, i) => {
        const rowKeys = Object.keys(row).map(sanitizeColumn).filter(Boolean);
        return '(' + rowKeys.map((_, j) => '$' + (i * rowKeys.length + j + 1)).join(', ') + ')';
      });
      // Flatten params in row order using per-row keys
      const allParams = [];
      let paramIdx = 1;
      const rowPlaceholders = rows.map(row => {
        const rowKeys = Object.keys(row).map(sanitizeColumn).filter(Boolean);
        const vals = rowKeys.map(k => row[k]);
        const placeholder = '(' + rowKeys.map(() => '$' + paramIdx++).join(', ') + ')';
        allParams.push(...vals);
        return placeholder;
      });
      sql = pgFormat('INSERT INTO "%I" (%s) VALUES %s %s', table, safeKeys.map(k => pgFormat('"%I"', k)).join(', '), rowPlaceholders.join(', '), columns ? `RETURNING ${sanitizeColumns(columns, table)}` : 'RETURNING *');
      params = allParams;
      // Note: above safeKeys based on first row; if rows have different keys, could fail. Assume uniform.
      // Use per-row keys for params but assume uniform keys for columns.
    } else if (action === 'update') {
      if (!safeValues || !Object.keys(safeValues).length) throw new Error('No values to update');
      let paramIdx = 1;
      const setClauses = [];
      for (const [k, v] of Object.entries(safeValues)) {
        setClauses.push(pgFormat('"%I" = $%s', k, paramIdx++));
        params.push(v);
      }
      const { where, params: whereParams } = buildWhere(filters, table, user, action, safeValues, paramIdx);
      params.push(...whereParams);
      sql = pgFormat('UPDATE "%I" SET %s %s', table, setClauses.join(', '), where);
      if (columns) sql += ' RETURNING ' + sanitizeColumns(columns, table);
      else sql += ' RETURNING *';
    } else if (action === 'delete') {
      const { where, params: whereParams } = buildWhere(filters, table, user, action, null);
      params = whereParams;
      sql = pgFormat('DELETE FROM "%I" %s', table, where);
      if (columns) sql += ' RETURNING ' + sanitizeColumns(columns, table);
    }

    let preDeleteBookings = [];
    let preUpdateBookings = [];
    if (table === 'bookings' && action === 'delete') {
      try {
        const { where: preWhere, params: preParams } = buildWhere(filters, table, user, 'select', null, 1);
        const preResult = await pool.query(`SELECT id, instrument_id, start_time, end_time FROM "${table}" ${preWhere}`, preParams);
        preDeleteBookings = preResult.rows;
      } catch (e) {
        console.error('pre-delete booking fetch error:', e);
      }
    }
    if (table === 'bookings' && action === 'update' && values?.status) {
      try {
        const { where: preWhere, params: preParams } = buildWhere(filters, table, user, 'select', null, 1);
        const preResult = await pool.query(`SELECT id, user_id, instrument_id, start_time, end_time, status FROM "${table}" ${preWhere}`, preParams);
        preUpdateBookings = preResult.rows;
      } catch (e) {
        console.error('pre-update booking status fetch error:', e);
      }
    }

    const queryResult = await pool.query(sql, params);
    const rows = queryResult.rows;
    const rowCount = queryResult.rowCount;

    if (table === 'bookings' && action === 'delete') {
      for (const b of preDeleteBookings) {
        autoFillWaitlist(b.instrument_id, b.start_time, b.end_time);
      }
    }

    if (table === 'bookings' && action === 'update') {
      for (const b of rows) {
        const prev = preUpdateBookings.find(p => p.id === b.id);
        sendBookingStatusNotifications(b, prev?.status);
      }
    }

    let data = rows;
    if (single) {
      if (rows.length === 0) {
        if (single === 'maybe') data = null;
        else throw new Error('No rows found');
      } else {
        data = rows[0];
      }
    }

    const restricted = ALLOWED_TABLES[table]?.restrictedColumns || [];
    if (restricted.length) {
      const strip = (r) => {
        if (!r || typeof r !== 'object') return r;
        for (const col of restricted) delete r[col];
        return r;
      };
      if (Array.isArray(data)) data = data.map(strip);
      else if (data) data = strip(data);
    }

    const result = { data, error: null };
    if (count === 'exact') result.count = rowCount ?? rows.length;
    res.json(result);
  } catch (err) {
    console.error('REST query error:', err);
    res.status(400).json({ data: null, error: { message: err.message }, count: null });
  }
}

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) {
    req.user = null;
    return next();
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (e) {
    req.user = null;
    next();
  }
}

function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') return res.status(403).json({ error: 'Admin required' });
  next();
}

function durationSeconds(expiresIn) {
  const match = typeof expiresIn === 'string' && expiresIn.match(/^(\d+)([smhd])$/);
  if (!match) return 604800;
  const value = parseInt(match[1], 10);
  const unit = match[2];
  const multipliers = { s: 1, m: 60, h: 3600, d: 86400 };
  return value * (multipliers[unit] || 86400);
}

function userRowToSession(row, options = {}) {
  const expiresIn = options.expiresIn || '7d';
  const expiresInSeconds = durationSeconds(expiresIn);
  const user = {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    department: row.department,
    profileImage: row.profile_image,
    app_metadata: {},
    user_metadata: { name: row.name, department: row.department },
    aud: 'authenticated',
    created_at: row.created_at,
    updated_at: row.updated_at,
    email_confirmed_at: row.created_at,
    phone: null,
    phone_confirmed_at: null,
    confirmation_sent_at: null,
    recovery_sent_at: null,
    email_change_sent_at: null,
    new_email: null,
    invited_at: null,
    action_link: null,
    last_sign_in_at: row.last_sign_in_at || null,
    is_anonymous: false
  };
  const accessToken = jwt.sign({ id: row.id, email: row.email, role: row.role, name: row.name, department: row.department, profile_image: row.profile_image }, JWT_SECRET, { expiresIn });
  return { user, accessToken, expires_in: expiresInSeconds };
}

async function runMigrations() {
  const migrationsDir = path.join(__dirname, 'migrations');
  if (!fs.existsSync(migrationsDir)) return;
  const files = fs.readdirSync(migrationsDir).sort();
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    for (const file of files) {
      const ext = path.extname(file);
      if (!['.sql', '.js'].includes(ext)) continue;
      const { rows } = await client.query('SELECT 1 FROM schema_migrations WHERE filename = $1', [file]);
      if (rows.length) {
        console.log('Skipping already applied migration', file);
        continue;
      }
      const filePath = path.join(migrationsDir, file);
      await client.query('BEGIN');
      if (ext === '.sql') {
        const content = fs.readFileSync(filePath, 'utf8');
        await client.query(content);
      } else if (ext === '.js') {
        const mod = await import(pathToFileURL(filePath).href);
        if (typeof mod.default === 'function') {
          await mod.default({ pool: client });
        } else {
          throw new Error(`Migration ${file} must export a default async function`);
        }
      }
      await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file]);
      await client.query('COMMIT');
      console.log('Applied migration', file);
    }
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}

async function seedDefaults() {
  const defaultAdminEmail = process.env.DEFAULT_ADMIN_EMAIL;
  const defaultAdminPassword = process.env.DEFAULT_ADMIN_PASSWORD;
  if (defaultAdminEmail && defaultAdminPassword) {
    const { rows } = await pool.query('SELECT id FROM profiles LIMIT 1');
    if (rows.length === 0) {
      const hash = await bcrypt.hash(defaultAdminPassword, 10);
      await pool.query(
        'INSERT INTO profiles (email, name, role, password_hash) VALUES ($1, $2, $3, $4)',
        [defaultAdminEmail, 'Admin', 'admin', hash]
      );
      console.log('Created default admin user:', defaultAdminEmail);
    }
  }
}

function smtpTransport(settings) {
  const port = Number(settings.port) || 587;
  const useTls = settings.use_tls !== false;
  const secure = useTls && port === 465;
  const transport = {
    host: settings.host,
    port,
    secure,
    auth: { user: settings.username, pass: settings.password }
  };
  if (useTls) {
    transport.tls = { rejectUnauthorized: false };
  } else {
    transport.ignoreTLS = true;
  }
  return nodemailer.createTransport(transport);
}

async function getLogoAndSiteUrl() {
  const settings = await getSettings();
  const siteUrl = process.env.SITE_URL || `http://localhost:${PORT || 3000}`;
  const defaultLogo = `${siteUrl.replace(/\/$/, '')}/lovable-uploads/40965317-613a-41b7-bc11-d9e8b6cba9ae.png`;
  let logoUrl = settings?.logo_url || settings?.favicon_url || defaultLogo;
  if (logoUrl && logoUrl.startsWith('/') && !logoUrl.startsWith('//')) {
    logoUrl = `${siteUrl.replace(/\/$/, '')}${logoUrl}`;
  }
  return { logoUrl, siteUrl };
}

function substituteVars(text, vars) {
  if (!text) return '';
  let result = String(text);
  for (const [k, v] of Object.entries(vars)) {
    result = result.split(`{{${k}}}`).join(String(v != null ? v : ''));
  }
  return result;
}

function buildLogoHeader(logoUrl, siteUrl) {
  if (!logoUrl) return '';
  return `
    <tr>
      <td style="background:#ffffff;padding:24px 0;text-align:center;border-bottom:1px solid #e5e7eb;">
        <a href="${siteUrl || '#'}" target="_blank" style="display:inline-block;">
          <img src="${logoUrl}" alt="MSLab Scheduler" style="max-height:64px;max-width:200px;border:0;display:block;margin:0 auto;">
        </a>
      </td>
    </tr>`;
}

function buildEmailHtml({ logoUrl, siteUrl, title, content, footerText }) {
  const logoSection = logoUrl ? buildLogoHeader(logoUrl, siteUrl) : '';
  const footer = footerText || `<a href="${siteUrl || '#'}" style="color:#4f46e5;text-decoration:none;font-weight:500;">MSLab Scheduler</a>`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title ? title.replace(/</g, '&lt;') : 'MSLab Scheduler'}</title>
</head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
    <tr>
      <td align="center" style="padding:20px 0;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width:600px;width:100%;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
          ${logoSection}
          <tr>
            <td style="padding:32px 32px 24px;color:#1f2937;font-size:16px;line-height:1.6;">
              ${content}
            </td>
          </tr>
          <tr>
            <td style="background:#f9fafb;padding:24px 32px;text-align:center;color:#6b7280;font-size:13px;line-height:1.5;border-top:1px solid #e5e7eb;">
              ${footer}<br>
              <span style="color:#9ca3af;">This is an automated email. Please do not reply.</span>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

async function createNotification({ userId, type = 'info', title, message, link }) {
  try {
    await pool.query(
      'INSERT INTO notifications (user_id, type, title, message, link) VALUES ($1, $2, $3, $4, $5)',
      [userId, type, title, message, link || null]
    );
  } catch (e) {
    console.error('createNotification error:', e);
  }
}

async function sendEmailToUser({ userId, templateType, variables, fallbackSubject = 'Notification', fallbackHtml = '' }) {
  try {
    const userRes = await pool.query('SELECT email, name FROM profiles WHERE id = $1', [userId]);
    if (!userRes.rows.length) return;
    const { email, name } = userRes.rows[0];
    const { logoUrl, siteUrl } = await getLogoAndSiteUrl();
    await sendEmailWithTemplate({
      to: email,
      subject: fallbackSubject,
      htmlContent: fallbackHtml,
      templateType,
      variables: { userName: name || 'there', siteUrl, logoUrl, ...(variables || {}) }
    });
  } catch (e) {
    console.error('sendEmailToUser error:', e);
  }
}

async function notifyUser({ userId, type, title, message, link, templateType, templateVars, fallbackSubject, fallbackHtml }) {
  await createNotification({ userId, type, title, message, link });
  await sendEmailToUser({ userId, templateType, variables: templateVars, fallbackSubject, fallbackHtml });
}

async function sendBookingStatusNotifications(booking, previousStatus) {
  try {
    const status = String(booking?.status || '').toLowerCase();
    const prev = String(previousStatus || '').toLowerCase();
    if (status === prev) return;

    const userId = booking.user_id;
    const instRes = await pool.query('SELECT name FROM instruments WHERE id = $1', [booking.instrument_id]);
    const instrumentName = instRes.rows[0]?.name || 'an instrument';
    const startDate = new Date(booking.start_time).toLocaleString();
    const endDate = new Date(booking.end_time).toLocaleString();

    if (status === 'confirmed') {
      await notifyUser({
        userId,
        type: 'success',
        title: 'Booking approved',
        message: `Your booking for ${instrumentName} on ${startDate} has been approved.`,
        templateType: 'booking_approved',
        templateVars: { instrumentName, startDate, endDate, status: 'confirmed', bookingId: booking.id },
        fallbackSubject: 'Booking Approved',
        fallbackHtml: `<h2>Your booking has been approved</h2><p>${instrumentName} on ${startDate}</p>`
      });
    } else if (status === 'denied') {
      await notifyUser({
        userId,
        type: 'warning',
        title: 'Booking denied',
        message: `Your booking for ${instrumentName} on ${startDate} was denied.`,
        templateType: 'booking_denied',
        templateVars: { instrumentName, startDate, endDate, status: 'denied', bookingId: booking.id },
        fallbackSubject: 'Booking Denied',
        fallbackHtml: `<h2>Your booking was denied</h2><p>${instrumentName} on ${startDate}</p>`
      });
    }
  } catch (e) { console.error('sendBookingStatusNotifications error:', e); }
}

async function sendWaitlistFilledNotification(booking) {
  try {
    const userId = booking.user_id;
    const instRes = await pool.query('SELECT name FROM instruments WHERE id = $1', [booking.instrument_id]);
    const instrumentName = instRes.rows[0]?.name || 'an instrument';
    const startDate = new Date(booking.start_time).toLocaleString();
    const endDate = new Date(booking.end_time).toLocaleString();
    await notifyUser({
      userId,
      type: 'success',
      title: 'Waitlist slot auto-booked',
      message: `A ${instrumentName} slot on ${startDate} became available and was booked for you.`,
      templateType: 'waitlist_filled',
      templateVars: { instrumentName, startDate, endDate, status: 'confirmed', bookingId: booking.id },
      fallbackSubject: 'Waitlist Slot Auto-Booked',
      fallbackHtml: `<h2>A slot you were waiting for is now booked</h2><p>${instrumentName} on ${startDate}</p>`
    });
  } catch (e) { console.error('sendWaitlistFilledNotification error:', e); }
}

async function sendEmailDigest(userId, frequency) {
  try {
    const userRes = await pool.query('SELECT email, name FROM profiles WHERE id = $1', [userId]);
    if (!userRes.rows.length) return;
    const { email, name } = userRes.rows[0];

    const since = frequency === 'weekly' ? "now() - interval '7 days'" : "now() - interval '1 day'";
    const { rows } = await pool.query(
      `SELECT * FROM notifications WHERE user_id = $1 AND created_at > ${since} ORDER BY created_at DESC`,
      [userId]
    );
    if (!rows.length) return;

    const listHtml = rows.map(n => `<li style="margin-bottom:8px;color:#4b5563;"><strong style="color:#111827;">${n.title}</strong> — ${n.message}</li>`).join('');
    await sendEmailWithTemplate({
      to: email,
      subject: frequency === 'weekly' ? 'Weekly Lab Digest' : 'Daily Lab Digest',
      htmlContent: `
        <h1 style="color:#111827;font-size:24px;margin:0 0 16px;">Hello {{userName}},</h1>
        <p style="color:#4b5563;font-size:16px;line-height:1.6;margin:0 0 16px;">Here are your recent notifications from MSLab Scheduler:</p>
        <ul style="margin:0 0 24px;padding-left:20px;">{{notifications}}</ul>
        <p style="text-align:center;margin:24px 0 0;">
          <a href="{{siteUrl}}" style="display:inline-block;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#ffffff;padding:14px 28px;border-radius:6px;text-decoration:none;font-weight:600;">View Dashboard</a>
        </p>
      `,
      templateType: 'notification_digest',
      variables: { userName: name || 'there', notifications: listHtml }
    });

    await pool.query('UPDATE notifications SET email_sent = true WHERE id = ANY($1::uuid[])', [rows.map(n => n.id)]);
    await pool.query('UPDATE email_digests SET last_sent = now() WHERE user_id = $1', [userId]);
  } catch (e) { console.error('sendEmailDigest error:', e); }
}

async function sendEmailWithTemplate({ to, subject, htmlContent, templateType, variables }) {
  const settingsRows = await pool.query('SELECT * FROM smtp_settings LIMIT 1');
  const settings = settingsRows.rows[0];
  if (!settings) throw new Error('SMTP not configured. Go to Admin → SMTP and save your mail server settings before sending test emails.');
  global.smtpSettingsCache = settings;

  const { logoUrl, siteUrl } = await getLogoAndSiteUrl();
  const appName = 'MSLab Scheduler';
  const vars = {
    ...(variables || {}),
    logoUrl,
    siteUrl,
    siteName: appName,
    footerSiteName: appName,
    footerTagline: 'Lab Management System',
    previewText: subject ? `${subject}. You have a new notification from ${appName}.` : `You have a new notification from ${appName}.`
  };
  if (!vars.userName) vars.userName = 'there';
  if (!vars.title) vars.title = subject || appName;

  let body = htmlContent || '';
  if (templateType) {
    const templateRows = await pool.query('SELECT * FROM email_templates WHERE template_type = $1', [templateType]);
    if (templateRows.rows.length) {
      const tpl = templateRows.rows[0].html_content;
      const subj = templateRows.rows[0].subject;
      if (subj) subject = subj;
      body = tpl;
    }
  }

  subject = substituteVars(subject, vars);
  body = substituteVars(body, vars);

  if (!body.trim()) {
    body = `<p style="color:#4b5563;font-size:16px;">${subject ? subject.replace(/</g, '&lt;') : 'You have a new notification.'}</p>`;
  }

  const isFullHtml = /^\s*<!(DOCTYPE|doctype)/i.test(body) || /<html/i.test(body);
  if (isFullHtml) {
    // Full templates already include the logo via {{logoUrl}}. If they do not, inject a logo header.
    // Pre-built htmlContent (e.g. test email preview) already contains a logo, so skip injection there.
    if (logoUrl && !body.includes(logoUrl) && templateType) {
      const injected = `<div style="text-align:center;padding:24px 0;border-bottom:1px solid #e5e7eb;"><a href="${siteUrl || '#'}" target="_blank" style="display:inline-block;"><img src="${logoUrl}" alt="MSLab Scheduler" style="max-height:64px;max-width:200px;border:0;"></a></div>`;
      body = body.replace(/<body([^>]*)>/i, `<body$1>${injected}`);
    }
  } else {
    body = buildEmailHtml({ logoUrl, siteUrl, title: subject, content: body });
  }

  console.log('sendEmailWithTemplate:', { to, subject, templateType, bodyLength: body.length, logoUrl, siteUrl });

  const transporter = smtpTransport(settings);
  try {
    const info = await transporter.sendMail({
      from: `"${settings.from_name || 'MSLab Scheduler'}" <${settings.from_email}>`,
      to,
      subject,
      html: body
    });
    console.log('Email sent:', info.messageId);
    return info;
  } catch (err) {
    console.error('sendEmailWithTemplate send error:', err);
    throw new Error(`SMTP send failed: ${err.message}`);
  }
}

function getS3Client() {
  if (S3_PROVIDER !== 's3') return null;
  return new S3Client({
    endpoint: process.env.S3_ENDPOINT,
    region: process.env.S3_REGION || 'us-east-1',
    credentials: { accessKeyId: process.env.S3_ACCESS_KEY_ID, secretAccessKey: process.env.S3_SECRET_ACCESS_KEY },
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true'
  });
}

function s3KeyPrefix() {
  return (process.env.S3_PATH_PREFIX || 'lcms-sequences/').replace(/\/$/, '') + '/';
}

function s3Bucket() {
  return process.env.S3_BUCKET || 'mass-spec-sequences';
}

function localSequencePath(bookingId, filename) {
  return path.join(UPLOAD_DIR, 'sequences', bookingId, filename);
}

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(authenticateToken);
app.use('/uploads', express.static(UPLOAD_DIR));
app.use(express.static(path.join(__dirname, 'dist')));

// Auth endpoints
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { email, password, name, department } = req.body;
    if (!email || !password || !name) throw new Error('Email, password and name are required');
    const existing = await pool.query('SELECT id FROM profiles WHERE email = $1', [email]);
    if (existing.rows.length) throw new Error('User already registered');

    const { rows: countRows } = await pool.query('SELECT COUNT(*) AS c FROM profiles');
    const isFirst = Number(countRows[0].c) === 0;
    const role = isFirst || email === 'eddy@kapelczak.com' ? 'admin' : 'user';
    const hash = await bcrypt.hash(password, 10);

    const { rows } = await pool.query(
      'INSERT INTO profiles (email, name, role, department, password_hash) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [email, name, role, department || null, hash]
    );
    const { user, accessToken, expires_in } = userRowToSession(rows[0]);
    res.json({ data: { user, session: { access_token: accessToken, token_type: 'bearer', expires_in, expires_at: Date.now() + expires_in * 1000, user } }, error: null });
  } catch (err) {
    res.status(400).json({ data: null, error: { message: err.message } });
  }
});

app.post('/api/auth/signin', async (req, res) => {
  try {
    const { email, password, rememberMe } = req.body;
    if (!email || !password) throw new Error('Email and password are required');
    const { rows } = await pool.query('SELECT * FROM profiles WHERE email = $1', [email]);
    if (!rows.length) throw new Error('Invalid login credentials');
    const valid = await bcrypt.compare(password, rows[0].password_hash);
    if (!valid) throw new Error('Invalid login credentials');
    await pool.query('UPDATE profiles SET last_sign_in_at = now() WHERE id = $1', [rows[0].id]);
    const expiresIn = rememberMe ? '30d' : '1d';
    const { user, accessToken, expires_in } = userRowToSession(rows[0], { expiresIn });
    res.json({ data: { user, session: { access_token: accessToken, token_type: 'bearer', expires_in, expires_at: Date.now() + expires_in * 1000, user } }, error: null });
  } catch (err) {
    res.status(400).json({ data: null, error: { message: err.message } });
  }
});

app.post('/api/auth/signout', (req, res) => {
  res.json({ data: {}, error: null });
});

app.get('/api/auth/session', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM profiles WHERE id = $1', [req.user.id]);
    if (!rows.length) throw new Error('User not found');
    const { user, accessToken, expires_in } = userRowToSession(rows[0]);
    res.json({ data: { session: { access_token: accessToken, token_type: 'bearer', expires_in, expires_at: Date.now() + expires_in * 1000, user } }, error: null });
  } catch (err) {
    res.status(400).json({ data: null, error: { message: err.message } });
  }
});

app.get('/api/auth/user', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM profiles WHERE id = $1', [req.user.id]);
    if (!rows.length) throw new Error('User not found');
    const { user } = userRowToSession(rows[0]);
    res.json({ data: { user }, error: null });
  } catch (err) {
    res.status(400).json({ data: null, error: { message: err.message } });
  }
});

app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { email, redirectTo } = req.body;
    if (!email) throw new Error('Email required');
    const { rows } = await pool.query('SELECT id, email, name FROM profiles WHERE email = $1', [email]);
    if (!rows.length) {
      // Don't reveal whether email exists
      return res.json({ data: {}, error: null });
    }
    const token = crypto.randomBytes(32).toString('hex');
    const hash = crypto.createHash('sha256').update(token).digest('hex');
    await pool.query('DELETE FROM password_reset_tokens WHERE user_id = $1', [rows[0].id]);
    await pool.query(`INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, now() + interval '1 hour')`, [rows[0].id, hash]);

    const settings = await pool.query('SELECT * FROM smtp_settings LIMIT 1');
    if (settings.rows.length) {
      let resetUrl;
      if (redirectTo) {
        resetUrl = redirectTo.includes('?') ? `${redirectTo}&token=${token}` : `${redirectTo}?token=${token}`;
      } else {
        const origin = req.get('origin') || req.headers.referer || `http://localhost:${PORT}`;
        resetUrl = `${origin}/reset-password?token=${token}`;
      }
      await sendEmailWithTemplate({
        to: email,
        subject: 'Password reset',
        htmlContent: `<p style="color:#4b5563;font-size:16px;line-height:1.6;">Click the button below to reset your password. The link expires in 1 hour.</p><p style="text-align:center;margin:24px 0;"><a href="{{resetUrl}}" style="display:inline-block;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#ffffff;padding:14px 28px;border-radius:6px;text-decoration:none;font-weight:600;">Reset Password</a></p><p style="color:#4b5563;font-size:14px;line-height:1.5;">If the button does not work, paste this link into your browser:<br><a href="{{resetUrl}}" style="color:#4f46e5;word-break:break-all;">{{resetUrl}}</a></p>`,
        templateType: 'password_reset',
        variables: { resetUrl, userName: rows[0].name || 'there' }
      });
    }
    res.json({ data: {}, error: null });
  } catch (err) {
    res.status(400).json({ data: null, error: { message: err.message } });
  }
});

app.post('/api/auth/update-password', requireAuth, async (req, res) => {
  try {
    const { password } = req.body;
    if (!password || password.length < 6) throw new Error('Password must be at least 6 characters');
    const hash = await bcrypt.hash(password, 10);
    await pool.query('UPDATE profiles SET password_hash = $1 WHERE id = $2', [hash, req.user.id]);
    res.json({ data: {}, error: null });
  } catch (err) {
    res.status(400).json({ data: null, error: { message: err.message } });
  }
});

app.post('/api/auth/admin-update-password', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { userId, password } = req.body;
    if (!userId || !password || password.length < 6) throw new Error('User id and password required');
    const hash = await bcrypt.hash(password, 10);
    await pool.query('UPDATE profiles SET password_hash = $1 WHERE id = $2', [hash, userId]);
    res.json({ data: {}, error: null });
  } catch (err) {
    res.status(400).json({ data: null, error: { message: err.message } });
  }
});

app.post('/api/auth/reset-password-confirm', async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) throw new Error('Token and password required');
    if (password.length < 6) throw new Error('Password must be at least 6 characters');
    const hash = crypto.createHash('sha256').update(token).digest('hex');
    const { rows } = await pool.query('SELECT user_id FROM password_reset_tokens WHERE token_hash = $1 AND expires_at > now()', [hash]);
    if (!rows.length) throw new Error('Invalid or expired reset token');
    const userId = rows[0].user_id;
    const passwordHash = await bcrypt.hash(password, 10);
    await pool.query('UPDATE profiles SET password_hash = $1 WHERE id = $2', [passwordHash, userId]);
    await pool.query('DELETE FROM password_reset_tokens WHERE user_id = $1', [userId]);
    res.json({ data: { success: true }, error: null });
  } catch (err) {
    res.status(400).json({ data: null, error: { message: err.message } });
  }
});

app.post('/api/auth/admin-create-user', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { email, password, name, role, department } = req.body;
    if (!email || !name) throw new Error('Email and name required');
    const existing = await pool.query('SELECT id FROM profiles WHERE email = $1', [email]);
    if (existing.rows.length) throw new Error('User already registered');
    let pwd = password;
    if (!pwd) pwd = Math.random().toString(36).slice(-8) + 'A1!';
    const hash = await bcrypt.hash(pwd, 10);
    const { rows } = await pool.query(
      'INSERT INTO profiles (email, name, role, department, password_hash) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [email, name, role || 'user', department || null, hash]
    );
    const { user } = userRowToSession(rows[0]);
    res.json({ data: { user, generatedPassword: password ? undefined : pwd }, error: null });
  } catch (err) {
    res.status(400).json({ data: null, error: { message: err.message } });
  }
});

app.get('/api/app-settings', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM app_settings LIMIT 1');
    if (rows.length === 0) return res.json({ data: null, error: { message: 'Settings not found' } });
    res.json({ data: rows[0], error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: { message: err.message } });
  }
});

app.post('/api/rest/query', requireAuth, handleRestQuery);

// Booking swaps
const ACTIVE_SWAP_STATUSES = ['pending', 'accepted'];
const IMMOVABLE_SWAP_STATUSES = ['cancelled', 'denied', 'completed'];

function isImmovableSwapStatus(status) {
  return IMMOVABLE_SWAP_STATUSES.includes(String(status || '').toLowerCase());
}

async function sendSwapStatusNotification(swap, status) {
  try {
    const requesterName = swap.requester_name || 'Someone';
    const recipientName = swap.recipient_name || 'Someone';
    const title = `Swap request ${status}`;
    const message = `Your swap request with ${status === 'pending' ? recipientName : status === 'accepted' || status === 'approved' ? 'has been accepted' : 'has been declined'}.`;
    for (const userId of [swap.requester_user_id, swap.recipient_user_id]) {
      if (!userId) continue;
      await notifyUser({
        userId,
        type: 'info',
        title,
        message,
        templateType: 'swap_status',
        templateVars: { status: String(status).toLowerCase(), requesterName, recipientName },
        fallbackSubject: title,
        fallbackHtml: `<h2>${title}</h2><p>${message}</p>`
      });
    }
  } catch (e) { console.error('sendSwapStatusNotification error:', e); }
}

async function getSwapWithBookings(swapId) {
  const { rows: swapRows } = await pool.query(
    `SELECT s.*,
            rb.start_time as rb_start, rb.end_time as rb_end, rb.instrument_id as rb_instrument_id, rb.user_id as rb_user_id, rb.purpose as rb_purpose,
            tb.start_time as tb_start, tb.end_time as tb_end, tb.instrument_id as tb_instrument_id, tb.user_id as tb_user_id, tb.purpose as tb_purpose
     FROM booking_swaps s
     JOIN bookings rb ON rb.id = s.requester_booking_id
     JOIN bookings tb ON tb.id = s.recipient_booking_id
     WHERE s.id = $1`,
    [swapId]
  );
  return swapRows[0] || null;
}

async function findBookingConflict(bookingId, startTime, endTime, instrumentId, excludeIds) {
  const exclude = [bookingId, ...excludeIds].filter(Boolean);
  const { rows } = await pool.query(
    `SELECT 1 FROM bookings
     WHERE instrument_id = $1 AND id <> ALL($2::uuid[]) AND lower(status) NOT IN ('cancelled', 'denied')
       AND start_time < $3 AND end_time > $4
     LIMIT 1`,
    [instrumentId, exclude, endTime, startTime]
  );
  if (rows.length > 0) return true;

  const { rows: maintRows } = await pool.query(
    `SELECT 1 FROM instrument_maintenance
     WHERE instrument_id = $1 AND lower(status) NOT IN ('cancelled', 'completed')
       AND start_time < $2 AND end_time > $3
     LIMIT 1`,
    [instrumentId, endTime, startTime]
  );
  return maintRows.length > 0;
}

async function canExecuteSwap(swap) {
  // Check that swapping instrument/time between the two bookings doesn't create conflicts with other bookings.
  const requesterBooking = {
    id: swap.requester_booking_id,
    start: swap.requester_new_start || swap.tb_start,
    end: swap.requester_new_end || swap.tb_end,
    instrument_id: swap.requester_new_instrument_id || swap.tb_instrument_id
  };
  const recipientBooking = {
    id: swap.recipient_booking_id,
    start: swap.recipient_new_start || swap.rb_start,
    end: swap.recipient_new_end || swap.rb_end,
    instrument_id: swap.recipient_new_instrument_id || swap.rb_instrument_id
  };

  // If swapped slots would overlap each other that's fine only if start/end match, which they do by exchange.
  const aConflicts = await findBookingConflict(requesterBooking.id, requesterBooking.start, requesterBooking.end, requesterBooking.instrument_id, [recipientBooking.id]);
  const bConflicts = await findBookingConflict(recipientBooking.id, recipientBooking.start, recipientBooking.end, recipientBooking.instrument_id, [requesterBooking.id]);
  return !aConflicts && !bConflicts;
}

async function autoFillWaitlist(instrumentId, startTime, endTime) {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM booking_waitlist
       WHERE instrument_id = $1
         AND status = 'waiting'
         AND start_time < $2 AND end_time > $3
       ORDER BY created_at ASC`,
      [instrumentId, endTime, startTime]
    );

    const filled = [];
    for (const w of rows) {
      // Check that this waiting slot is still free before converting
      const overlap = await pool.query(
        `SELECT 1 FROM bookings
         WHERE instrument_id = $1
           AND lower(status) NOT IN ('cancelled', 'denied')
           AND start_time < $2 AND end_time > $3
         LIMIT 1`,
        [w.instrument_id, w.end_time, w.start_time]
      );
      if (overlap.rows.length) continue;

      const newBookingResult = await pool.query(
        `INSERT INTO bookings (user_id, instrument_id, start_time, end_time, purpose, details, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'confirmed') RETURNING *`,
        [w.user_id, w.instrument_id, w.start_time, w.end_time, w.purpose || 'Waitlist auto-fill', w.details]
      );
      const newBooking = newBookingResult.rows[0];

      await pool.query(
        `UPDATE booking_waitlist SET status = 'filled', filled_booking_id = $1, updated_at = now() WHERE id = $2`,
        [newBooking.id, w.id]
      );

      sendWaitlistFilledNotification(newBooking);

      filled.push({ waitlist: w, booking: newBooking });
    }
    return filled;
  } catch (e) {
    console.error('autoFillWaitlist error:', e);
    return [];
  }
}

async function executeSwapTx(swap) {
  const requesterInstrumentId = swap.tb_instrument_id;
  const requesterStart = swap.tb_start;
  const requesterEnd = swap.tb_end;
  const recipientInstrumentId = swap.rb_instrument_id;
  const recipientStart = swap.rb_start;
  const recipientEnd = swap.rb_end;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      'UPDATE bookings SET instrument_id = $1, start_time = $2, end_time = $3 WHERE id = $4',
      [requesterInstrumentId, requesterStart, requesterEnd, swap.requester_booking_id]
    );
    await client.query(
      'UPDATE bookings SET instrument_id = $1, start_time = $2, end_time = $3 WHERE id = $4',
      [recipientInstrumentId, recipientStart, recipientEnd, swap.recipient_booking_id]
    );
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

app.post('/api/booking-swaps', requireAuth, async (req, res) => {
  try {
    const { requesterBookingId, recipientBookingId } = req.body;
    if (!requesterBookingId || !recipientBookingId) throw new Error('Both bookings are required');
    if (requesterBookingId === recipientBookingId) throw new Error('Cannot swap a booking with itself');

    const { rows: requesterRows } = await pool.query('SELECT * FROM bookings WHERE id = $1', [requesterBookingId]);
    const { rows: recipientRows } = await pool.query('SELECT * FROM bookings WHERE id = $1', [recipientBookingId]);
    if (!requesterRows.length || !recipientRows.length) throw new Error('Booking not found');
    const requesterBooking = requesterRows[0];
    const recipientBooking = recipientRows[0];

    if (['cancelled', 'denied'].includes(requesterBooking.status.toLowerCase()) || ['cancelled', 'denied'].includes(recipientBooking.status.toLowerCase())) {
      throw new Error('Cannot swap cancelled or denied bookings');
    }

    if (req.user.role !== 'admin' && requesterBooking.user_id !== req.user.id) {
      throw new Error('You can only request swaps for your own bookings');
    }

    const existing = await pool.query(
      `SELECT id FROM booking_swaps
       WHERE status IN ('pending', 'accepted')
         AND (requester_booking_id = ANY($1::uuid[]) OR recipient_booking_id = ANY($1::uuid[]))`,
      [[requesterBookingId, recipientBookingId]]
    );
    if (existing.rows.length) throw new Error('An active swap request already exists for one of these bookings');

    const { rows } = await pool.query(
      `INSERT INTO booking_swaps (requester_booking_id, recipient_booking_id, requester_user_id, recipient_user_id, status, requested_at)
       VALUES ($1, $2, $3, $4, 'pending', now()) RETURNING *`,
      [requesterBookingId, recipientBookingId, requesterBooking.user_id, recipientBooking.user_id]
    );

    sendSwapStatusNotification(rows[0], 'pending');

    res.json({ data: rows[0], error: null });
  } catch (err) {
    console.error('create booking swap error:', err);
    res.status(400).json({ data: null, error: { message: err.message } });
  }
});

app.post('/api/booking-swaps/:id/respond', requireAuth, async (req, res) => {
  try {
    const { response } = req.body; // 'accept', 'decline', or 'cancel'
    const swapId = req.params.id;
    const swap = await getSwapWithBookings(swapId);
    if (!swap) throw new Error('Swap request not found');

    if (response === 'cancel') {
      if (req.user.role !== 'admin' && req.user.id !== swap.requester_user_id) throw new Error('Not authorized');
      const { rows } = await pool.query(
        "UPDATE booking_swaps SET status = 'cancelled', updated_at = now() WHERE id = $1 RETURNING *",
        [swapId]
      );
      return res.json({ data: rows[0], error: null });
    }

    if (req.user.role !== 'admin' && req.user.id !== swap.recipient_user_id) throw new Error('Not authorized to respond to this swap');

    let newStatus = swap.status;
    if (response === 'accept') newStatus = 'accepted';
    else if (response === 'decline') newStatus = 'declined';
    else throw new Error('Invalid response');

    const { rows } = await pool.query(
      'UPDATE booking_swaps SET status = $1, responded_at = now(), updated_at = now() WHERE id = $2 RETURNING *',
      [newStatus, swapId]
    );
    sendSwapStatusNotification(swap, newStatus);
    res.json({ data: rows[0], error: null });
  } catch (err) {
    console.error('respond to swap error:', err);
    res.status(400).json({ data: null, error: { message: err.message } });
  }
});

app.post('/api/booking-swaps/:id/admin', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { status: requestedStatus, adminNotes } = req.body;
    const swapId = req.params.id;
    const swap = await getSwapWithBookings(swapId);
    if (!swap) throw new Error('Swap request not found');

    const normalizedStatus = String(requestedStatus).toLowerCase();
    if (!['pending', 'accepted', 'declined', 'approved', 'denied', 'cancelled'].includes(normalizedStatus)) {
      throw new Error('Invalid status');
    }

    if (normalizedStatus === 'approved' && !['pending', 'accepted'].includes(swap.status)) {
      throw new Error('Swap must be pending or accepted before it can be approved');
    }

    const notes = adminNotes !== undefined ? adminNotes : swap.admin_notes;

    if (normalizedStatus === 'approved') {
      const safeToSwap = await canExecuteSwap(swap);
      if (!safeToSwap) throw new Error('Cannot approve swap: one or both bookings would conflict with existing reservations');
      await executeSwapTx(swap);
    }

    const { rows } = await pool.query(
      'UPDATE booking_swaps SET status = $1, admin_notes = $2, updated_at = now() WHERE id = $3 RETURNING *',
      [normalizedStatus, notes, swapId]
    );
    sendSwapStatusNotification(swap, normalizedStatus);
    res.json({ data: rows[0], error: null });
  } catch (err) {
    console.error('admin review swap error:', err);
    res.status(400).json({ data: null, error: { message: err.message } });
  }
});

app.get('/api/booking-swaps', requireAuth, async (req, res) => {
  try {
    const { status } = req.query;
    let sql = `
      SELECT s.*,
             rb.start_time as requester_start, rb.end_time as requester_end,
             rb.purpose as requester_purpose,
             tb.start_time as recipient_start, tb.end_time as recipient_end,
             tb.purpose as recipient_purpose,
             i1.name as requester_instrument_name,
             i2.name as recipient_instrument_name,
             p1.name as requester_name,
             p2.name as recipient_name,
             p1.email as requester_email,
             p2.email as recipient_email
      FROM booking_swaps s
      JOIN bookings rb ON rb.id = s.requester_booking_id
      JOIN bookings tb ON tb.id = s.recipient_booking_id
      JOIN instruments i1 ON i1.id = rb.instrument_id
      JOIN instruments i2 ON i2.id = tb.instrument_id
      JOIN profiles p1 ON p1.id = s.requester_user_id
      JOIN profiles p2 ON p2.id = s.recipient_user_id
    `;
    const params = [];
    const conditions = [];
    if (req.user.role !== 'admin') {
      conditions.push('(s.requester_user_id = $1 OR s.recipient_user_id = $1)');
      params.push(req.user.id);
    }
    if (status) {
      params.push(status);
      conditions.push(`s.status = $${params.length}`);
    }
    if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
    sql += ' ORDER BY s.created_at DESC';

    const { rows } = await pool.query(sql, params);
    res.json({ data: rows, error: null });
  } catch (err) {
    console.error('list swaps error:', err);
    res.status(400).json({ data: null, error: { message: err.message } });
  }
});

app.get('/api/booking-swaps/eligible', requireAuth, async (req, res) => {
  try {
    const { bookingId } = req.query;
    if (!bookingId) throw new Error('bookingId required');
    const { rows: myRows } = await pool.query('SELECT * FROM bookings WHERE id = $1', [bookingId]);
    if (!myRows.length) throw new Error('Booking not found');
    const myBooking = myRows[0];

    if (req.user.role !== 'admin' && myBooking.user_id !== req.user.id) throw new Error('Not authorized');

    const { rows } = await pool.query(
      `SELECT b.*, i.name as instrument_name, p.name as user_name
       FROM bookings b
       JOIN instruments i ON i.id = b.instrument_id
       JOIN profiles p ON p.id = b.user_id
       WHERE b.id != $1
         AND b.start_time > now()
         AND lower(b.status) NOT IN ('cancelled', 'denied')
         AND NOT EXISTS (
           SELECT 1 FROM booking_swaps s
           WHERE s.status IN ('pending', 'accepted')
             AND (s.requester_booking_id = b.id OR s.recipient_booking_id = b.id)
         )
       ORDER BY b.start_time ASC`,
      [bookingId]
    );
    res.json({ data: rows, error: null });
  } catch (err) {
    console.error('eligible swaps error:', err);
    res.status(400).json({ data: null, error: { message: err.message } });
  }
});

// Waitlist
app.get('/api/waitlist', requireAuth, async (req, res) => {
  try {
    const { status } = req.query;
    let sql = `
      SELECT w.*,
             i.name as instrument_name,
             p.name as user_name,
             p.email as user_email,
             b.id as filled_booking_id,
             b.start_time as filled_start,
             b.end_time as filled_end
      FROM booking_waitlist w
      JOIN instruments i ON i.id = w.instrument_id
      JOIN profiles p ON p.id = w.user_id
      LEFT JOIN bookings b ON b.id = w.filled_booking_id
    `;
    const params = [];
    const conditions = [];
    if (req.user.role !== 'admin') {
      conditions.push('w.user_id = $1');
      params.push(req.user.id);
    }
    if (status) {
      params.push(status);
      conditions.push(`w.status = $${params.length}`);
    }
    if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
    sql += ' ORDER BY w.created_at DESC';

    const { rows } = await pool.query(sql, params);
    res.json({ data: rows, error: null });
  } catch (err) {
    console.error('list waitlist error:', err);
    res.status(400).json({ data: null, error: { message: err.message } });
  }
});

app.post('/api/waitlist/:id/cancel', requireAuth, async (req, res) => {
  try {
    const id = req.params.id;
    const { rows: existing } = await pool.query('SELECT * FROM booking_waitlist WHERE id = $1', [id]);
    if (!existing.length) throw new Error('Waitlist entry not found');
    if (req.user.role !== 'admin' && existing[0].user_id !== req.user.id) throw new Error('Not authorized');
    const { rows } = await pool.query(
      "UPDATE booking_waitlist SET status = 'cancelled', updated_at = now() WHERE id = $1 RETURNING *",
      [id]
    );
    res.json({ data: rows[0], error: null });
  } catch (err) {
    console.error('cancel waitlist error:', err);
    res.status(400).json({ data: null, error: { message: err.message } });
  }
});

// Storage
const upload = multer({ storage: multer.memoryStorage() });

app.post('/api/storage/upload', requireAuth, upload.single('file'), async (req, res) => {
  try {
    const { bucket, path: filePath, upsert } = req.body;
    if (!req.file) throw new Error('No file uploaded');
    const bucketDir = path.join(UPLOAD_DIR, bucket);
    fs.mkdirSync(bucketDir, { recursive: true });
    const target = path.join(bucketDir, filePath);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, req.file.buffer);
    res.json({ data: { path: `${bucket}/${filePath}` }, error: null });
  } catch (err) {
    res.status(400).json({ data: null, error: { message: err.message } });
  }
});

app.get('/api/storage/public-url', (req, res) => {
  const { bucket, path: filePath } = req.query;
  const url = `${req.protocol}://${req.get('host')}/uploads/${encodeURIComponent(bucket)}/${filePath}`;
  res.json({ data: { publicUrl: url }, error: null });
});

// Functions
app.post('/api/functions/send-email', requireAuth, async (req, res) => {
  try {
    const { to, subject, htmlContent, templateType, variables } = req.body;
    await sendEmailWithTemplate({ to, subject, htmlContent, templateType, variables });
    res.json({ data: { success: true }, error: null });
  } catch (err) {
    console.error('send-email error:', err);
    res.status(400).json({ data: { success: false, error: err.message }, error: null });
  }
});

app.post('/api/functions/apply-email-template-style', requireAuth, requireAdmin, async (req, res) => {
  try {
    const style = String(req.body.style || 'card');
    const presets = style === 'modern' ? modernTemplates : cardTemplates;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (const [type, tpl] of Object.entries(presets)) {
        await client.query(
          `INSERT INTO email_templates (template_type, subject, html_content)
           VALUES ($1, $2, $3)
           ON CONFLICT (template_type)
           DO UPDATE SET subject = EXCLUDED.subject, html_content = EXCLUDED.html_content, updated_at = now()`,
          [type, tpl.subject, tpl.html]
        );
      }
      await client.query(
        `UPDATE app_settings SET email_template_style = $1 WHERE id = '00000000-0000-0000-0000-000000000001'`,
        [style]
      );
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
    res.json({ data: { success: true, style }, error: null });
  } catch (err) {
    console.error('apply-email-template-style error:', err);
    res.status(400).json({ data: { success: false, error: err.message }, error: null });
  }
});

app.post('/api/functions/s3-test-connection', requireAuth, async (req, res) => {
  try {
    if (S3_PROVIDER === 'local') {
      return res.json({ ok: true, endpoint: 'local', bucket: 'uploads', region: 'local', forcePathStyle: true });
    }
    const s3 = getS3Client();
    if (!s3 || !process.env.S3_BUCKET) throw new Error('S3 not configured');
    await s3.send(new HeadBucketCommand({ Bucket: s3Bucket() }));
    res.json({ ok: true, endpoint: process.env.S3_ENDPOINT, bucket: s3Bucket(), region: process.env.S3_REGION || 'us-east-1', forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true' });
  } catch (err) {
    res.json({ ok: false, error: err.message, status: 500 });
  }
});

async function updateBookingSequenceFile(bookingId, key, name, size) {
  await pool.query(
    'UPDATE bookings SET sequence_file_key = $1, sequence_file_name = $2, sequence_file_size = $3, sequence_file_uploaded_at = now() WHERE id = $4',
    [key, name, size, bookingId]
  );
}

async function clearBookingSequenceFile(bookingId) {
  await pool.query(
    'UPDATE bookings SET sequence_file_key = NULL, sequence_file_name = NULL, sequence_file_size = NULL, sequence_file_uploaded_at = NULL WHERE id = $1',
    [bookingId]
  );
}

async function getBookingSequenceFile(bookingId) {
  const { rows } = await pool.query('SELECT sequence_file_key, sequence_file_name FROM bookings WHERE id = $1', [bookingId]);
  return rows[0] || null;
}

async function saveSequenceFileLocal(bookingId, file) {
  const dir = path.join(UPLOAD_DIR, 'sequences', bookingId);
  fs.mkdirSync(dir, { recursive: true });
  const target = path.join(dir, file.originalname);
  fs.writeFileSync(target, file.buffer);
  const key = `sequences/${bookingId}/${file.originalname}`;
  return { key, name: file.originalname, size: file.size, path: target };
}

async function deleteSequenceFileLocal(key) {
  const target = path.join(UPLOAD_DIR, key);
  if (fs.existsSync(target)) fs.unlinkSync(target);
}

app.post('/api/functions/s3-upload-sequence', requireAuth, upload.single('file'), async (req, res) => {
  try {
    const { bookingId } = req.body;
    if (!req.file) throw new Error('No file uploaded');
    if (S3_PROVIDER === 'local') {
      const { key, name, size } = await saveSequenceFileLocal(bookingId, req.file);
      await updateBookingSequenceFile(bookingId, key, name, size);
      return res.json({ key, name, size, uploadedAt: new Date().toISOString() });
    }
    const s3 = getS3Client();
    const key = s3KeyPrefix() + `${bookingId}/${req.file.originalname}`;
    await s3.send(new PutObjectCommand({ Bucket: s3Bucket(), Key: key, Body: req.file.buffer, ContentType: req.file.mimetype }));
    await updateBookingSequenceFile(bookingId, key, req.file.originalname, req.file.size);
    res.json({ key, name: req.file.originalname, size: req.file.size, uploadedAt: new Date().toISOString() });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/functions/s3-download-sequence', requireAuth, async (req, res) => {
  try {
    const { bookingId } = req.query;
    const info = await getBookingSequenceFile(bookingId);
    if (!info || !info.sequence_file_key) throw new Error('No sequence file for this booking');
    if (S3_PROVIDER === 'local') {
      const target = path.join(UPLOAD_DIR, info.sequence_file_key);
      if (!fs.existsSync(target)) throw new Error('File not found');
      return res.sendFile(path.resolve(target));
    }
    const s3 = getS3Client();
    const obj = await s3.send(new GetObjectCommand({ Bucket: s3Bucket(), Key: info.sequence_file_key }));
    res.setHeader('Content-Disposition', `attachment; filename="${info.sequence_file_name || 'sequence-file'}"`);
    obj.Body.pipe(res);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/functions/s3-delete-sequence', requireAuth, async (req, res) => {
  try {
    const { bookingId } = req.body;
    const info = await getBookingSequenceFile(bookingId);
    if (info && info.sequence_file_key) {
      if (S3_PROVIDER === 'local') await deleteSequenceFileLocal(info.sequence_file_key);
      else {
        const s3 = getS3Client();
        await s3.send(new DeleteObjectCommand({ Bucket: s3Bucket(), Key: info.sequence_file_key }));
      }
    }
    await clearBookingSequenceFile(bookingId);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/functions/s3-replace-sequence', requireAuth, upload.single('file'), async (req, res) => {
  try {
    const { bookingId } = req.body;
    if (!req.file) throw new Error('No file uploaded');
    const old = await getBookingSequenceFile(bookingId);
    if (old && old.sequence_file_key) {
      if (S3_PROVIDER === 'local') await deleteSequenceFileLocal(old.sequence_file_key);
      else {
        const s3 = getS3Client();
        await s3.send(new DeleteObjectCommand({ Bucket: s3Bucket(), Key: old.sequence_file_key }));
      }
    }
    if (S3_PROVIDER === 'local') {
      const { key, name, size } = await saveSequenceFileLocal(bookingId, req.file);
      await updateBookingSequenceFile(bookingId, key, name, size);
      return res.json({ key, name, size, uploadedAt: new Date().toISOString() });
    }
    const s3 = getS3Client();
    const key = s3KeyPrefix() + `${bookingId}/${req.file.originalname}`;
    await s3.send(new PutObjectCommand({ Bucket: s3Bucket(), Key: key, Body: req.file.buffer, ContentType: req.file.mimetype }));
    await updateBookingSequenceFile(bookingId, key, req.file.originalname, req.file.size);
    res.json({ key, name: req.file.originalname, size: req.file.size, uploadedAt: new Date().toISOString() });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Bulk import / export (admin only)
const importUpload = multer({ dest: '/tmp' });

app.post('/api/admin/import/:type', requireAuth, requireAdmin, importUpload.single('file'), async (req, res) => {
  try {
    const type = req.params.type;
    if (!req.file) throw new Error('No file uploaded');
    const fileBuf = fs.readFileSync(req.file.path);
    const wb = XLSX.read(fileBuf, { type: 'buffer' });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
    fs.unlinkSync(req.file.path);

    let inserted = 0;
    if (type === 'users') {
      for (const row of rows) {
        const email = String(row.email || row.Email || '').trim();
        const name = String(row.name || row.Name || '').trim();
        if (!email || !name) continue;
        const role = String(row.role || row.Role || 'user').toLowerCase();
        const department = String(row.department || row.Department || '');
        const tempPassword = Math.random().toString(36).slice(-10);
        const passwordHash = await bcrypt.hash(tempPassword, 10);
        await pool.query(
          `INSERT INTO profiles (email, name, role, department, password_hash)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, role = EXCLUDED.role, department = EXCLUDED.department`,
          [email, name, role, department, passwordHash]
        );
        inserted++;
      }
    } else if (type === 'instruments') {
      for (const row of rows) {
        const name = String(row.name || row.Name || '').trim();
        if (!name) continue;
        const description = String(row.description || row.Description || '');
        const status = String(row.status || row.Status || 'available').toLowerCase();
        const location = String(row.location || row.Location || '');
        const specifications = String(row.specifications || row.Specifications || '');
        const existing = await pool.query('SELECT id FROM instruments WHERE name = $1 LIMIT 1', [name]);
        if (existing.rows.length) {
          await pool.query('UPDATE instruments SET description = $1, status = $2, location = $3, specifications = $4 WHERE id = $5', [description, status, location, specifications, existing.rows[0].id]);
        } else {
          await pool.query('INSERT INTO instruments (name, description, status, location, specifications) VALUES ($1, $2, $3, $4, $5)', [name, description, status, location, specifications]);
        }
        inserted++;
      }
    } else {
      throw new Error('Invalid import type');
    }
    res.json({ data: { inserted }, error: null });
  } catch (err) {
    console.error('bulk import error:', err);
    res.status(400).json({ data: null, error: { message: err.message } });
  }
});

app.get('/api/admin/export/:type', requireAuth, requireAdmin, async (req, res) => {
  try {
    const type = req.params.type;
    let rows = [];
    if (type === 'bookings') {
      const { rows: data } = await pool.query(
        `SELECT b.id, p.name as user_name, p.email as user_email, i.name as instrument_name,
                b.start_time, b.end_time, b.purpose, b.details, b.status, b.created_at
         FROM bookings b
         JOIN profiles p ON p.id = b.user_id
         JOIN instruments i ON i.id = b.instrument_id
         ORDER BY b.start_time DESC`
      );
      rows = data;
    } else if (type === 'users') {
      const { rows: data } = await pool.query('SELECT id, name, email, role, department, created_at FROM profiles ORDER BY name');
      rows = data;
    } else if (type === 'instruments') {
      const { rows: data } = await pool.query('SELECT id, name, description, status, location, created_at FROM instruments ORDER BY name');
      rows = data;
    } else {
      throw new Error('Invalid export type');
    }
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, type);
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Disposition', `attachment; filename="${type}.xlsx"`);
    res.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buf);
  } catch (err) {
    console.error('bulk export error:', err);
    res.status(400).json({ data: null, error: { message: err.message } });
  }
});

// Recurring bookings
app.post('/api/bookings/recurring', requireAuth, async (req, res) => {
  try {
    const settings = await getSettings();
    if (!settings?.recurring_bookings_enabled) throw new Error('Recurring bookings are disabled by an administrator');

    const { instrumentId, startTime, endTime, purpose, details, repeatWeeks } = req.body;
    const weeks = parseInt(repeatWeeks || '1', 10);
    if (!instrumentId || !startTime || !endTime || weeks < 2 || weeks > 52) throw new Error('Invalid recurring booking request');

    const created = [];
    const skipped = [];
    const firstStart = new Date(startTime);
    const firstEnd = new Date(endTime);
    const durationMs = firstEnd.getTime() - firstStart.getTime();

    let parentId = null;
    for (let i = 0; i < weeks; i++) {
      const s = new Date(firstStart.getTime() + i * 7 * 24 * 60 * 60 * 1000);
      const e = new Date(s.getTime() + durationMs);
      const instStart = s.toISOString();
      const instEnd = e.toISOString();
      try {
        const hasConflict = await findBookingConflict(null, instStart, instEnd, instrumentId, []);
        if (hasConflict) throw new Error('Booking conflict');
        const { rows } = await pool.query(
          `INSERT INTO bookings (user_id, instrument_id, start_time, end_time, purpose, details, status, recurrence_rule, parent_booking_id)
           VALUES ($1, $2, $3, $4, $5, $6, 'confirmed', $7, $8) RETURNING *`,
          [req.user.id, instrumentId, instStart, instEnd, purpose || 'Recurring booking', details, `weekly:${weeks}`, parentId]
        );
        created.push(rows[0]);
        if (!parentId) parentId = rows[0].id;
      } catch (e) {
        skipped.push({ start: instStart, error: e.message });
      }
    }
    res.json({ data: { created, skipped, count: created.length }, error: null });
  } catch (err) {
    console.error('recurring booking error:', err);
    res.status(400).json({ data: null, error: { message: err.message } });
  }
});

// Check-in / check-out (admin initiated)
app.post('/api/bookings/:id/check-in', requireAuth, requireAdmin, async (req, res) => {
  try {
    const bookingId = req.params.id;
    const now = new Date().toISOString();
    const { rows } = await pool.query(
      'UPDATE bookings SET checked_in_at = $1, actual_start_time = $1, status = \'in_progress\' WHERE id = $2 RETURNING *',
      [now, bookingId]
    );
    if (!rows.length) throw new Error('Booking not found');
    res.json({ data: rows[0], error: null });
  } catch (err) {
    console.error('check-in error:', err);
    res.status(400).json({ data: null, error: { message: err.message } });
  }
});

app.post('/api/bookings/:id/check-out', requireAuth, requireAdmin, async (req, res) => {
  try {
    const bookingId = req.params.id;
    const now = new Date().toISOString();
    const { rows } = await pool.query(
      "UPDATE bookings SET checked_out_at = $1, actual_end_time = $1, status = 'completed' WHERE id = $2 RETURNING *",
      [now, bookingId]
    );
    if (!rows.length) throw new Error('Booking not found');
    res.json({ data: rows[0], error: null });
  } catch (err) {
    console.error('check-out error:', err);
    res.status(400).json({ data: null, error: { message: err.message } });
  }
});

// Schedule delay endpoints
const IMMOVABLE_STATUSES = ['completed', 'cancelled', 'denied'];

app.post('/api/schedule-delays', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { delayMinutes, cutoff, instrumentId, reason, appliedBy, appliedByName } = req.body;
    const delayMs = Number(delayMinutes) * 60 * 1000;
    const cutoffTime = new Date(cutoff);

    let query = 'SELECT * FROM bookings WHERE start_time >= $1 AND lower(status) NOT IN (' + IMMOVABLE_STATUSES.map(s => `'${s}'`).join(',') + ')';
    const qparams = [cutoffTime.toISOString()];
    if (instrumentId) {
      query += ' AND instrument_id = $2';
      qparams.push(instrumentId);
    }
    query += ' ORDER BY start_time DESC';
    const { rows: targets } = await pool.query(query, qparams);

    if (targets.length === 0) return res.json({ data: { affected: 0, skipped: 0 } });

    const { rows: delayRows } = await pool.query(
      'INSERT INTO schedule_delays (cutoff_time, delay_minutes, instrument_id, reason, applied_by, applied_by_name, affected_count, status) VALUES ($1, $2, $3, $4, $5, $6, 0, $7) RETURNING *',
      [cutoffTime.toISOString(), Number(delayMinutes), instrumentId || null, reason || '', appliedBy || null, appliedByName || null, 'applied']
    );
    const delay = delayRows[0];

    const moved = [];
    for (const booking of targets) {
      const newStart = new Date(new Date(booking.start_time).getTime() + delayMs);
      const newEnd = new Date(new Date(booking.end_time).getTime() + delayMs);
      await pool.query(
        'UPDATE bookings SET start_time = $1, end_time = $2 WHERE id = $3',
        [newStart.toISOString(), newEnd.toISOString(), booking.id]
      );
      moved.push({ booking, newStart, newEnd });
    }

    if (moved.length) {
      const values = moved.map((m, i) => `($${i * 6 + 1}, $${i * 6 + 2}, $${i * 6 + 3}, $${i * 6 + 4}, $${i * 6 + 5}, $${i * 6 + 6})`).join(',');
      const params = moved.flatMap(m => [delay.id, m.booking.id, m.booking.start_time, m.booking.end_time, m.newStart.toISOString(), m.newEnd.toISOString()]);
      await pool.query(
        `INSERT INTO schedule_delay_bookings (delay_id, booking_id, original_start, original_end, new_start, new_end) VALUES ${values}`,
        params
      );
    }

    await pool.query('UPDATE schedule_delays SET affected_count = $1 WHERE id = $2', [moved.length, delay.id]);

    // Send notifications (best-effort)
    for (const m of moved) {
      try {
        const { rows: profileRows } = await pool.query('SELECT email, name FROM profiles WHERE id = $1', [m.booking.user_id]);
        if (!profileRows[0]?.email) continue;
        const { rows: instRows } = await pool.query('SELECT name FROM instruments WHERE id = $1', [m.booking.instrument_id]);
        const instrumentName = instRows[0]?.name || 'your instrument';
        await sendEmailWithTemplate({
          to: profileRows[0].email,
          subject: `Booking Delayed: ${instrumentName}`,
          htmlContent: `<p style="color:#4b5563;font-size:16px;line-height:1.6;">Dear {{userName}},</p><p style="color:#4b5563;font-size:16px;line-height:1.6;">Your booking for <strong>{{instrumentName}}</strong> has been delayed by <strong>{{delayMinutes}} minutes</strong>.</p><div style="background:#fffbeb;border-left:4px solid #f59e0b;padding:16px;margin:16px 0;"><p style="margin:0 0 8px;color:#4b5563;"><strong>Reason:</strong> {{reason}}</p><p style="margin:0;color:#4b5563;"><strong>Previous start:</strong> {{oldStartDate}}</p><p style="margin:0;color:#4b5563;"><strong>New start:</strong> {{newStartDate}}</p><p style="margin:0;color:#4b5563;"><strong>New end:</strong> {{newEndDate}}</p></div>`,
          templateType: 'booking_delayed',
          variables: {
            userName: profileRows[0].name || '',
            instrumentName,
            delayMinutes: String(delayMinutes),
            reason: reason || 'Scheduling adjustment',
            oldStartDate: new Date(m.booking.start_time).toLocaleString(),
            newStartDate: m.newStart.toLocaleString(),
            newEndDate: m.newEnd.toLocaleString()
          }
        });
      } catch (e) {
        console.error('Failed to send delay email', e);
      }
    }

    res.json({ data: { affected: moved.length, skipped: targets.length - moved.length } });
  } catch (err) {
    console.error('apply delay error:', err);
    res.status(400).json({ data: null, error: { message: err.message } });
  }
});

app.post('/api/schedule-delays/:id/reverse', requireAuth, requireAdmin, async (req, res) => {
  try {
    const delayId = req.params.id;
    const { rows: delayRows } = await pool.query('SELECT * FROM schedule_delays WHERE id = $1', [delayId]);
    if (!delayRows.length) throw new Error('Delay not found');
    const delay = delayRows[0];

    const { rows: records } = await pool.query('SELECT * FROM schedule_delay_bookings WHERE delay_id = $1 ORDER BY original_start ASC', [delayId]);
    const bookingIds = records.map(r => r.booking_id);
    const current = await pool.query('SELECT * FROM bookings WHERE id = ANY($1::uuid[])', [bookingIds]);
    const currentById = new Map(current.rows.map(b => [b.id, b]));

    let restored = 0;
    let skipped = 0;
    for (const record of records) {
      const booking = currentById.get(record.booking_id);
      if (!booking) { skipped++; continue; }
      if (new Date(booking.start_time).getTime() !== new Date(record.new_start).getTime() || new Date(booking.end_time).getTime() !== new Date(record.new_end).getTime()) {
        skipped++; continue;
      }
      await pool.query(
        'UPDATE bookings SET start_time = $1, end_time = $2 WHERE id = $3',
        [new Date(record.original_start).toISOString(), new Date(record.original_end).toISOString(), record.booking_id]
      );
      restored++;
    }

    await pool.query(
      'UPDATE schedule_delays SET status = $1, reversed_at = now() WHERE id = $2',
      ['reversed', delayId]
    );

    for (const record of records) {
      try {
        const booking = currentById.get(record.booking_id);
        if (!booking) continue;
        const { rows: profileRows } = await pool.query('SELECT email, name FROM profiles WHERE id = $1', [booking.user_id]);
        if (!profileRows[0]?.email) continue;
        const { rows: instRows } = await pool.query('SELECT name FROM instruments WHERE id = $1', [booking.instrument_id]);
        const instrumentName = instRows[0]?.name || 'your instrument';
        await sendEmailWithTemplate({
          to: profileRows[0].email,
          subject: `Booking Delay Reversed: ${instrumentName}`,
          htmlContent: `<p style="color:#4b5563;font-size:16px;line-height:1.6;">Dear {{userName}},</p><p style="color:#4b5563;font-size:16px;line-height:1.6;">The <strong>{{delayMinutes}} minute</strong> delay applied to your booking for <strong>{{instrumentName}}</strong> has been reversed.</p><div style="background:#ecfdf5;border-left:4px solid #10b981;padding:16px;margin:16px 0;"><p style="margin:0;color:#4b5563;"><strong>Delayed start:</strong> {{oldStartDate}}</p><p style="margin:0;color:#4b5563;"><strong>Restored start:</strong> {{newStartDate}}</p><p style="margin:0;color:#4b5563;"><strong>Restored end:</strong> {{newEndDate}}</p></div>`,
          templateType: 'booking_delay_reversed',
          variables: {
            userName: profileRows[0].name || '',
            instrumentName,
            delayMinutes: String(delay.delay_minutes),
            oldStartDate: new Date(record.new_start).toLocaleString(),
            newStartDate: new Date(record.original_start).toLocaleString(),
            newEndDate: new Date(record.original_end).toLocaleString()
          }
        });
      } catch (e) {
        console.error('Failed to send reversal email', e);
      }
    }

    res.json({ data: { affected: restored, restored, skipped } });
  } catch (err) {
    console.error('reverse delay error:', err);
    res.status(400).json({ data: null, error: { message: err.message } });
  }
});

app.get('/health', (req, res) => res.type('text').send('healthy\n'));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

async function start() {
  await runMigrations();
  await seedDefaults();
  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

start().catch(err => {
  console.error('Startup error:', err);
  process.exit(1);
});
