declare module '*renderer.tsx?pdf-recovery' {
  export const preparePdfResources: typeof import('./renderer.tsx').preparePdfResources
  export const renderTestDrivePdf: typeof import('./renderer.tsx').renderTestDrivePdf
}
