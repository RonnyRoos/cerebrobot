export { cn } from './utils/cn';

// Design System - Primitives (T049)
export { Box, Stack, Text, Button } from './components/primitives';

// Design System - Form Components (T021)
export { Input, type InputProps } from './components/input';
export { Textarea, type TextareaProps } from './components/textarea';
export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
} from './components/select';

// Design System - Theme
export { Theme as ThemeProvider, useTheme } from './theme/theme-provider';
export type {
  ThemeName,
  ThemeConfig,
  ThemeContext,
  ColorToken,
  SpacingToken,
  TypographyToken,
  ElevationToken,
  RadiusToken,
  BlurToken,
  DesignToken,
  SpacingValue,
  ColorValue,
  Breakpoint,
  ResponsiveValue,
} from './theme/types';
export {
  ColorTokens,
  SpacingTokens,
  ShadowTokens,
  RadiusTokens,
  getTokenValue,
  setTokenValue,
  isDarkMode,
  getCurrentTheme,
} from './theme/types';

// Design System - Accessibility
export {
  getContrastRatio,
  checkContrast,
  checkContrastCompliance,
  checkTokenContrast,
  hslToRgb,
  hexToRgb,
  getTokenRgb,
  WHITE,
  BLACK,
  GRAY_50,
  GRAY_900,
  PURPLE_500,
  BLUE_500,
  DARK_BG,
} from './theme/accessibility';
export type { RGB, ContrastResult } from './theme/accessibility';

// Chat components
export {
  MessageBubble,
  type MessageBubbleProps,
  type MessageBubbleElement,
} from './chat/message-bubble';
export { Avatar, type AvatarProps, type AvatarElement } from './chat/avatar';
export { CodeBlock, type CodeBlockProps, type CodeBlockElement } from './chat/code-block';
export {
  TypingIndicator,
  type TypingIndicatorProps,
  type TypingIndicatorElement,
} from './chat/typing-indicator';
export { Timestamp, type TimestampProps, type TimestampElement } from './chat/timestamp';
export { CopyButton, type CopyButtonProps, type CopyButtonElement } from './chat/copy-button';
