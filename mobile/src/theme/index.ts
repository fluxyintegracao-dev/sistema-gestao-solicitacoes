export const colors = {
  background: '#ECF2FB',
  backgroundElevated: '#F4F8FF',
  backgroundDeep: '#DCE7F6',
  surface: '#FFFFFF',
  surfaceMuted: '#F3F7FF',
  surfaceGlass: 'rgba(255, 255, 255, 0.78)',
  surfaceRaised: '#F9FBFF',
  panel: '#F7FAFF',
  panelStrong: '#EFF5FF',
  border: '#C9D7EA',
  borderSoft: '#D8E3F2',
  panelBorder: '#C5D5EB',
  panelBorderStrong: '#AFC4E4',
  panelGlow: 'rgba(80, 122, 194, 0.18)',
  text: '#102544',
  textMuted: '#4F6486',
  textSoft: '#7085A3',
  primary: '#2B4F89',
  primaryStrong: '#16325A',
  primaryDeep: '#0E2444',
  primarySoft: '#DCE6F4',
  primaryGlow: 'rgba(43, 79, 137, 0.16)',
  success: '#169B62',
  successSoft: '#E7F7F0',
  warning: '#C77A12',
  warningSoft: '#FFF4E3',
  danger: '#C44747',
  dangerSoft: '#FDEDEE',
  info: '#2D6BA2',
  infoSoft: '#EAF3FE',
  overlay: 'rgba(10, 25, 44, 0.42)',
  white: '#FFFFFF'
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32
} as const;

export const radii = {
  sm: 10,
  md: 14,
  lg: 20,
  pill: 999
} as const;

export const shadows = {
  card: {
    shadowColor: '#29456F',
    shadowOpacity: 0.16,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 12 },
    elevation: 6
  },
  button: {
    shadowColor: '#1F3E71',
    shadowOpacity: 0.2,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5
  },
  floating: {
    shadowColor: '#365A8D',
    shadowOpacity: 0.14,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 16 },
    elevation: 8
  }
} as const;
