import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PasswordStrengthMeter } from './PasswordStrengthMeter';

describe('PasswordStrengthMeter', () => {
  it('renders nothing for an empty password', () => {
    const { container } = render(<PasswordStrengthMeter password="" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('rates a short password as weak', () => {
    render(<PasswordStrengthMeter password="abc" />);
    expect(screen.getByText('Very weak')).toBeInTheDocument();
  });

  it('rates a long mixed-character password as strong', () => {
    render(<PasswordStrengthMeter password="Str0ng!Passw0rd" />);
    expect(screen.getByText('Strong')).toBeInTheDocument();
  });
});
