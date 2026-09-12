// Google Calendar 24-Color Palette Configuration
// Extracted from Google Calendar Material Design standards

export const GOOGLE_CALENDAR_COLORS = [
  // Row 1 (9 colors)
  { id: 'berry', name: 'Berry', hex: '#ad1457', textColor: '#ffffff', row: 1 },
  { id: 'flamingo', name: 'Flamingo', hex: '#d81b60', textColor: '#ffffff', row: 1 },
  { id: 'tomato', name: 'Tomato', hex: '#e67c73', textColor: '#ffffff', row: 1 },
  { id: 'red', name: 'Red', hex: '#d50000', textColor: '#ffffff', row: 1 },
  { id: 'tangerine', name: 'Tangerine', hex: '#f4511e', textColor: '#ffffff', row: 1 },
  { id: 'pumpkin', name: 'Pumpkin', hex: '#ef6c00', textColor: '#ffffff', row: 1 },
  { id: 'mango', name: 'Mango', hex: '#f09300', textColor: '#ffffff', row: 1 },
  { id: 'banana', name: 'Banana', hex: '#f6bf26', textColor: '#202124', row: 1 },
  { id: 'mustard', name: 'Mustard', hex: '#e4c441', textColor: '#202124', row: 1 },

  // Row 2 (9 colors)
  { id: 'avocado', name: 'Avocado', hex: '#c0ca33', textColor: '#202124', row: 2 },
  { id: 'pistachio', name: 'Pistachio', hex: '#7cb342', textColor: '#ffffff', row: 2 },
  { id: 'basil', name: 'Basil', hex: '#0b8043', textColor: '#ffffff', row: 2 },
  { id: 'sage', name: 'Sage', hex: '#33b679', textColor: '#ffffff', row: 2 },
  { id: 'peacock', name: 'Peacock', hex: '#009688', textColor: '#ffffff', row: 2 },
  { id: 'sky', name: 'Sky', hex: '#039be5', textColor: '#ffffff', row: 2 },
  { id: 'blue', name: 'Blue', hex: '#4285f4', textColor: '#ffffff', row: 2, isDefault: true },
  { id: 'blueberry', name: 'Blueberry', hex: '#7986cb', textColor: '#ffffff', row: 2 },
  { id: 'indigo', name: 'Indigo', hex: '#3f51b5', textColor: '#ffffff', row: 2 },

  // Row 3 (6 colors)
  { id: 'lavender', name: 'Lavender', hex: '#b39ddb', textColor: '#202124', row: 3 },
  { id: 'wisteria', name: 'Wisteria', hex: '#9e69af', textColor: '#ffffff', row: 3 },
  { id: 'grape', name: 'Grape', hex: '#8e24aa', textColor: '#ffffff', row: 3 },
  { id: 'cocoa', name: 'Cocoa', hex: '#795548', textColor: '#ffffff', row: 3 },
  { id: 'graphite', name: 'Graphite', hex: '#616161', textColor: '#ffffff', row: 3 },
  { id: 'birch', name: 'Birch', hex: '#a79b8e', textColor: '#ffffff', row: 3 }
];

// Legacy aliases mapped to preserve existing data in database
export const LEGACY_COLOR_ALIASES = {
  amber: { id: 'amber', name: 'Amber', hex: '#f29900', textColor: '#ffffff' },
  green: { id: 'green', name: 'Green', hex: '#188038', textColor: '#ffffff' },
  purple: { id: 'purple', name: 'Purple', hex: '#a142f4', textColor: '#ffffff' },
  gray: { id: 'gray', name: 'Gray', hex: '#5f6368', textColor: '#ffffff' }
};

export const DEFAULT_CALENDAR_COLOR_ID = 'blue';

export const ALL_VALID_COLOR_TAGS = [
  ...GOOGLE_CALENDAR_COLORS.map(c => c.id),
  'amber',
  'green',
  'purple',
  'gray'
];

/**
 * Generates the Schedule-X `calendars` dictionary with theme color tokens
 * for all 24 Google colors and legacy tags.
 */
export function buildScheduleXCalendars() {
  const calendars = {};

  GOOGLE_CALENDAR_COLORS.forEach(color => {
    calendars[color.id] = {
      colorName: color.id,
      lightColors: {
        main: color.hex,
        container: color.hex,
        onContainer: color.textColor
      },
      darkColors: {
        main: color.hex,
        container: color.hex,
        onContainer: color.textColor
      }
    };
  });

  // Legacy mappings
  Object.values(LEGACY_COLOR_ALIASES).forEach(legacy => {
    calendars[legacy.id] = {
      colorName: legacy.id,
      lightColors: {
        main: legacy.hex,
        container: legacy.hex,
        onContainer: legacy.textColor
      },
      darkColors: {
        main: legacy.hex,
        container: legacy.hex,
        onContainer: legacy.textColor
      }
    };
  });

  return calendars;
}

/**
 * Returns color definition by id, defaulting to 'blue'
 */
export function getColorById(id) {
  const found = GOOGLE_CALENDAR_COLORS.find(c => c.id === id);
  if (found) return found;
  if (LEGACY_COLOR_ALIASES[id]) return LEGACY_COLOR_ALIASES[id];
  return GOOGLE_CALENDAR_COLORS.find(c => c.id === DEFAULT_CALENDAR_COLOR_ID);
}
