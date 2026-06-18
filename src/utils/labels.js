/**
 * Type label mapping for item types.
 * Centralizes the Portuguese display names for internal English type values.
 */
export const TYPE_LABEL = {
  top: 'Parte de Cima',
  bottom: 'Parte de Baixo',
  full: 'Inteiro',
  shoes: 'Calçados',
  accessory: 'Acessórios',
}

/**
 * Returns the Portuguese label for a given item type.
 * Falls back to 'Desconhecido' for unknown types.
 *
 * @param {string} type - Internal type value (e.g. 'top', 'bottom')
 * @returns {string} Display label in Portuguese
 */
export function labelForType(type) {
  return TYPE_LABEL[type] || 'Desconhecido'
}

/**
 * Default color palette for clothing items.
 * Each value is a hex color string used for swatches and filtering.
 */
export const CORES_PADRAO = [
  '#171717',
  '#FFFFFF',
  '#9CA3AF',
  '#FEF3C7',
  '#1E3A8A',
  '#3B82F6',
  '#EF4444',
  '#10B981',
  '#FACC15',
  '#F9A8D4',
  '#9333EA',
  '#92400E',
]
