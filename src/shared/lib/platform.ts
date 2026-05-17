export const isElectron = typeof window !== 'undefined' && !!(window as any).electronAPI?.isElectron
export const isWeb = !isElectron
export const isMobile = typeof window !== 'undefined' && window.innerWidth < 768
export const isTablet = typeof window !== 'undefined' && window.innerWidth >= 768 && window.innerWidth < 1024
export const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 1024

export const platform = {
  isElectron,
  isWeb,
  isMobile,
  isTablet,
  isDesktop,
  canUseFileSystem: isElectron,
  canUseTerminal: isElectron,
  canUseLocalAI: isElectron,
}
