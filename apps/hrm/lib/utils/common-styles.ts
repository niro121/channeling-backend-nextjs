/**
 * Shared button classNames for HRM actions.
 * Pair with Button `variant="outline"` for outline styles,
 * or `variant="default"` / omit for filled styles that set their own background.
 */
export const buttonStyles = {
  cancel: {
    /** Red filled button with slightly darker hover */
    danger:
      'h-9 bg-destructive text-destructive-foreground hover:bg-destructive/80 transition-colors',
    /** Red text → fills red on hover (default cancel) */
    normal:
      'h-9 text-red-500 hover:text-white hover:bg-red-500 transition-colors',
    /** Red outline, soft red hover */
    warning:
      'h-9 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive transition-colors',
    /** Theme light-green hover */
    healthy:
      'h-9 border-primary/30 text-primary hover:bg-secondary hover:text-secondary-foreground transition-colors'
  },
  /** Dark green (theme primary) filled button */
  save: 'h-9 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors',
  /** Outline companion to Save */
  saveAndClose:
    'h-9 border-primary/40 text-primary hover:bg-primary/10 hover:text-primary transition-colors',
  delete: {
    /** Red outline, soft red hover */
    warning:
      'h-9 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive transition-colors',
    /** Red filled button with slightly darker hover */
    danger:
      'h-9 bg-destructive text-destructive-foreground hover:bg-destructive/80 transition-colors'
  }
} as const;
