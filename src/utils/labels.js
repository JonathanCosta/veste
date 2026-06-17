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
