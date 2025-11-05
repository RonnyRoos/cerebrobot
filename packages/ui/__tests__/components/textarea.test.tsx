import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Textarea } from '../../src/components/textarea';

describe('Textarea', () => {
  it('renders with default variant', () => {
    render(<Textarea placeholder="Test textarea" />);
    const textarea = screen.getByPlaceholderText('Test textarea');
    expect(textarea).toBeInTheDocument();
    expect(textarea).toHaveClass('min-h-[80px]');
  });

  it('renders with error variant', () => {
    render(<Textarea variant="error" placeholder="Error textarea" />);
    const textarea = screen.getByPlaceholderText('Error textarea');
    expect(textarea).toHaveClass('border-destructive');
  });

  it('forwards ref correctly', () => {
    const ref = { current: null } as React.RefObject<HTMLTextAreaElement>;
    render(<Textarea ref={ref} placeholder="Ref test" />);
    expect(ref.current).toBeInstanceOf(HTMLTextAreaElement);
  });

  it('supports disabled state', () => {
    render(<Textarea disabled placeholder="Disabled textarea" />);
    const textarea = screen.getByPlaceholderText('Disabled textarea');
    expect(textarea).toBeDisabled();
    expect(textarea).toHaveClass('disabled:opacity-50');
  });

  it('passes through native HTML attributes', () => {
    render(
      <Textarea
        placeholder="Message"
        required
        rows={5}
        aria-label="Message textarea"
      />,
    );
    const textarea = screen.getByPlaceholderText('Message');
    expect(textarea).toHaveAttribute('required');
    expect(textarea).toHaveAttribute('rows', '5');
    expect(textarea).toHaveAttribute('aria-label', 'Message textarea');
  });

  it('supports aria-invalid for error state', () => {
    render(
      <Textarea
        variant="error"
        placeholder="Invalid"
        aria-invalid="true"
        aria-describedby="error-msg"
      />,
    );
    const textarea = screen.getByPlaceholderText('Invalid');
    expect(textarea).toHaveAttribute('aria-invalid', 'true');
    expect(textarea).toHaveAttribute('aria-describedby', 'error-msg');
  });

  it('supports aria-required for required fields', () => {
    render(
      <Textarea placeholder="Required field" required aria-required="true" />,
    );
    const textarea = screen.getByPlaceholderText('Required field');
    expect(textarea).toHaveAttribute('required');
    expect(textarea).toHaveAttribute('aria-required', 'true');
  });
});
