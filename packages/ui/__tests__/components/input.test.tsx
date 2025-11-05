import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Input } from '../../src/components/input';

describe('Input', () => {
  it('renders with default variant and size', () => {
    render(<Input placeholder="Test input" />);
    const input = screen.getByPlaceholderText('Test input');
    expect(input).toBeInTheDocument();
    expect(input).toHaveClass('h-10'); // default size
  });

  it('renders with error variant', () => {
    render(<Input variant="error" placeholder="Error input" />);
    const input = screen.getByPlaceholderText('Error input');
    expect(input).toHaveClass('border-destructive');
  });

  it('renders with small size', () => {
    render(<Input size="sm" placeholder="Small input" />);
    const input = screen.getByPlaceholderText('Small input');
    expect(input).toHaveClass('h-8');
  });

  it('renders with large size', () => {
    render(<Input size="lg" placeholder="Large input" />);
    const input = screen.getByPlaceholderText('Large input');
    expect(input).toHaveClass('h-12');
  });

  it('forwards ref correctly', () => {
    const ref = { current: null } as React.RefObject<HTMLInputElement>;
    render(<Input ref={ref} placeholder="Ref test" />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });

  it('supports disabled state', () => {
    render(<Input disabled placeholder="Disabled input" />);
    const input = screen.getByPlaceholderText('Disabled input');
    expect(input).toBeDisabled();
    expect(input).toHaveClass('disabled:opacity-50');
  });

  it('passes through native HTML attributes', () => {
    render(
      <Input
        type="email"
        placeholder="Email"
        required
        aria-label="Email address"
      />,
    );
    const input = screen.getByPlaceholderText('Email');
    expect(input).toHaveAttribute('type', 'email');
    expect(input).toHaveAttribute('required');
    expect(input).toHaveAttribute('aria-label', 'Email address');
  });

  it('supports aria-invalid for error state', () => {
    render(
      <Input
        variant="error"
        placeholder="Invalid"
        aria-invalid="true"
        aria-describedby="error-msg"
      />,
    );
    const input = screen.getByPlaceholderText('Invalid');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAttribute('aria-describedby', 'error-msg');
  });

  it('supports aria-required for required fields', () => {
    render(
      <Input placeholder="Required field" required aria-required="true" />,
    );
    const input = screen.getByPlaceholderText('Required field');
    expect(input).toHaveAttribute('required');
    expect(input).toHaveAttribute('aria-required', 'true');
  });
});
