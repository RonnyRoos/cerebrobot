import type { Meta, StoryObj } from '@storybook/react';

/**
 * Design System Tokens
 *
 * This page documents the foundational design tokens used throughout the Cerebrobot UI.
 * Tokens are organized into three tiers:
 * - **Primitives**: Raw values (colors, spacing units, font sizes)
 * - **Semantic**: Context-aware tokens that reference primitives
 * - **Component**: Backward-compatible aliases for component-specific tokens
 */
const meta: Meta = {
  title: 'Design System/Tokens',
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj;

const TokenGrid = ({ children }: { children: React.ReactNode }) => (
  <div className="p-8 space-y-8 bg-bg-base min-h-screen">{children}</div>
);

const TokenSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="space-y-4">
    <h2 className="text-2xl font-bold text-text-primary">{title}</h2>
    {children}
  </div>
);

const ColorSwatch = ({ name, value, token }: { name: string; value: string; token: string }) => (
  <div className="flex items-center gap-4 p-4 bg-bg-surface rounded-lg border border-border-subtle">
    <div
      className="w-16 h-16 rounded-lg border border-border-subtle shrink-0"
      style={{ backgroundColor: value }}
    />
    <div className="flex-1 min-w-0">
      <p className="text-sm font-medium text-text-primary font-mono">{name}</p>
      <p className="text-xs text-text-secondary font-mono">{token}</p>
      <p className="text-xs text-text-tertiary">{value}</p>
    </div>
  </div>
);

export const Colors: Story = {
  render: () => (
    <TokenGrid>
      <TokenSection title="Semantic Colors">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <ColorSwatch
            name="text-primary"
            token="--color-text-primary"
            value="hsl(var(--color-text-primary))"
          />
          <ColorSwatch
            name="text-secondary"
            token="--color-text-secondary"
            value="hsl(var(--color-text-secondary))"
          />
          <ColorSwatch
            name="text-tertiary"
            token="--color-text-tertiary"
            value="hsl(var(--color-text-tertiary))"
          />
          <ColorSwatch name="bg-base" token="--color-bg-base" value="hsl(var(--color-bg-base))" />
          <ColorSwatch
            name="bg-surface"
            token="--color-bg-surface"
            value="hsl(var(--color-bg-surface))"
          />
          <ColorSwatch
            name="bg-elevated"
            token="--color-bg-elevated"
            value="hsl(var(--color-bg-elevated))"
          />
          <ColorSwatch
            name="accent-primary"
            token="--color-accent-primary"
            value="hsl(var(--color-accent-primary))"
          />
          <ColorSwatch
            name="accent-secondary"
            token="--color-accent-secondary"
            value="hsl(var(--color-accent-secondary))"
          />
          <ColorSwatch
            name="border-subtle"
            token="--color-border-subtle"
            value="hsl(var(--color-border-subtle))"
          />
        </div>
      </TokenSection>

      <TokenSection title="Primitive Colors">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <ColorSwatch name="purple-500" token="--color-purple-500" value="hsl(277 92% 62%)" />
          <ColorSwatch name="blue-500" token="--color-blue-500" value="hsl(217 91% 60%)" />
          <ColorSwatch name="pink-500" token="--color-pink-500" value="hsl(330 85% 68%)" />
          <ColorSwatch name="cyan-500" token="--color-cyan-500" value="hsl(190 95% 55%)" />
          <ColorSwatch name="neutral-50" token="--color-neutral-50" value="hsl(240 10% 98%)" />
          <ColorSwatch name="neutral-900" token="--color-neutral-900" value="hsl(240 10% 10%)" />
        </div>
      </TokenSection>
    </TokenGrid>
  ),
};

const SpacingBox = ({ size, token }: { size: string; token: string }) => {
  const sizeClass = `space-${size}`;
  return (
    <div className="flex items-center gap-4 p-4 bg-bg-surface rounded-lg border border-border-subtle">
      <div
        className={`bg-accent-primary rounded`}
        style={{ width: `var(--${sizeClass})`, height: `var(--${sizeClass})` }}
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text-primary font-mono">{sizeClass}</p>
        <p className="text-xs text-text-secondary font-mono">{token}</p>
      </div>
    </div>
  );
};

export const Spacing: Story = {
  render: () => (
    <TokenGrid>
      <TokenSection title="Spacing Scale (4px base unit)">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 6, 8, 10, 12, 16].map((size) => (
            <SpacingBox key={size} size={String(size)} token={`--space-${size}`} />
          ))}
        </div>
      </TokenSection>
    </TokenGrid>
  ),
};

const TypographyExample = ({ size, token }: { size: string; token: string }) => (
  <div className="p-4 bg-bg-surface rounded-lg border border-border-subtle">
    <p className={`font-medium text-text-primary`} style={{ fontSize: `var(--font-size-${size})` }}>
      The quick brown fox jumps over the lazy dog
    </p>
    <p className="text-xs text-text-secondary font-mono mt-2">
      {size} - {token}
    </p>
  </div>
);

export const Typography: Story = {
  render: () => (
    <TokenGrid>
      <TokenSection title="Font Sizes">
        <div className="space-y-4">
          {['xs', 'sm', 'base', 'lg', 'xl', '2xl', '3xl', '4xl'].map((size) => (
            <TypographyExample key={size} size={size} token={`--font-size-${size}`} />
          ))}
        </div>
      </TokenSection>
    </TokenGrid>
  ),
};

const ElevationBox = ({ name, shadow }: { name: string; shadow: string }) => (
  <div className="p-8 bg-bg-base">
    <div
      className="w-full h-24 bg-bg-surface rounded-lg flex items-center justify-center"
      style={{ boxShadow: shadow }}
    >
      <p className="text-sm font-medium text-text-primary font-mono">{name}</p>
    </div>
  </div>
);

export const Elevation: Story = {
  render: () => (
    <TokenGrid>
      <TokenSection title="Standard Shadows">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ElevationBox name="shadow-sm" shadow="var(--shadow-sm)" />
          <ElevationBox name="shadow-md" shadow="var(--shadow-md)" />
          <ElevationBox name="shadow-lg" shadow="var(--shadow-lg)" />
          <ElevationBox name="shadow-xl" shadow="var(--shadow-xl)" />
        </div>
      </TokenSection>

      <TokenSection title="Neon Flux Glows">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ElevationBox name="shadow-glow-purple" shadow="var(--shadow-glow-purple)" />
          <ElevationBox name="shadow-glow-blue" shadow="var(--shadow-glow-blue)" />
          <ElevationBox name="shadow-glow-pink" shadow="var(--shadow-glow-pink)" />
          <ElevationBox name="shadow-glow-cyan" shadow="var(--shadow-glow-cyan)" />
        </div>
      </TokenSection>
    </TokenGrid>
  ),
};
