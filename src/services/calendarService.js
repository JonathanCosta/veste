/**
 * Calendar service — CRUD for calendar_logs (Diário de Uso).
 *
 * Each log records that an item or look was used on a given date.
 *   date:       ISO 'YYYY-MM-DD'
 *   entityType: 'item' | 'look'
 *   entityId:   Number (FK to items.id or looks.id)
 *   order:      Number (0 = primary/capa do dia, 1+ = secondary)
 */
import db from '../database/db'

const VALID_ENTITY_TYPES = ['item', 'look']
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/

/**
 * Add a calendar log entry.
 *
 * @param {{ date: string, entityType: string, entityId: number, order?: number }} params
 * @returns {Promise<number>} The new log's id
 */
export async function addCalendarLog({ date, entityType, entityId, order = 0 }) {
  if (!VALID_ENTITY_TYPES.includes(entityType)) {
    throw new Error(`Tipo inválido: ${entityType}. Use 'item' ou 'look'.`)
  }
  if (!DATE_REGEX.test(date)) {
    throw new Error(`Data inválida: ${date}. Use o formato YYYY-MM-DD.`)
  }
  if (!Number.isInteger(entityId) || entityId < 1) {
    throw new Error(`ID inválido: ${entityId}. Deve ser um inteiro positivo.`)
  }
  if (!Number.isInteger(order) || order < 0) {
    throw new Error(`Order inválido: ${order}. Deve ser um inteiro não negativo.`)
  }

  // Verify FK exists
  const table = entityType === 'item' ? db.items : db.looks
  const exists = await table.get(entityId)
  if (!exists) {
    throw new Error(`${entityType} com id ${entityId} não encontrado.`)
  }

  return db.calendar_logs.add({ date, entityType, entityId, order })
}

/**
 * Get all logs for a specific date.
 *
 * @param {string} date - ISO 'YYYY-MM-DD'
 * @returns {Promise<Array>}
 */
export async function getLogsByDate(date) {
  if (!DATE_REGEX.test(date)) {
    throw new Error(`Data inválida: ${date}.`)
  }
  return db.calendar_logs.where('date').equals(date).toArray()
}

/**
 * Get all logs for an entire month (prefix match on date).
 *
 * @param {number} year
 * @param {number} month - 1-indexed (1 = January)
 * @returns {Promise<Array>}
 */
export async function getLogsByMonth(year, month) {
  const prefix = `${year}-${String(month).padStart(2, '0')}`
  return db.calendar_logs.where('date').startsWith(prefix).toArray()
}

/**
 * Delete a calendar log by id.
 *
 * @param {number} id
 * @returns {Promise<void>}
 */
export async function deleteCalendarLog(id) {
  await db.calendar_logs.delete(id)
}

/**
 * Delete all calendar logs referencing a given entity.
 * Used for cascade deletion when an item or look is removed.
 *
 * @param {'item'|'look'} entityType
 * @param {number} entityId
 * @returns {Promise<void>}
 */
export async function deleteCalendarLogsByEntity(entityType, entityId) {
  await db.calendar_logs.where({ entityType, entityId }).delete()
}

/**
 * Update the order of a calendar log (for reordering within a day).
 *
 * @param {number} id
 * @param {number} order
 * @returns {Promise<void>}
 */
export async function updateCalendarLogOrder(id, order) {
  await db.calendar_logs.update(id, { order })
}

/**
 * Count how many times a given entity appears in calendar_logs.
 * Useful for Insights queries.
 *
 * @param {'item'|'look'} entityType
 * @param {number} entityId
 * @returns {Promise<number>}
 */
export async function countEntityUsage(entityType, entityId) {
  return db.calendar_logs.where({ entityType, entityId }).count()
}
