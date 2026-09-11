import type { SyntheticEvent } from 'react';

import { colors, typography } from '../../constants/theme';
import type { CompanySelectProps } from './CompanySelect';

export function CompanySelect({
  companies,
  disabled,
  error,
  loading,
  onBlur,
  onChange,
  onRetry,
  value,
}: CompanySelectProps) {
  const retryIfEmpty = (event: SyntheticEvent) => {
    if (companies.length) return;
    event.preventDefault();
    onRetry();
  };

  return (
    <select
      aria-busy={loading}
      aria-describedby={error ? 'signup-company-error' : undefined}
      aria-invalid={Boolean(error)}
      aria-label="소속 선택"
      disabled={disabled}
      onBlur={onBlur}
      onChange={(event) => onChange(event.currentTarget.value)}
      onKeyDown={(event) => {
        if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)) {
          retryIfEmpty(event);
        }
      }}
      onPointerDown={retryIfEmpty}
      style={{
        backgroundColor: colors.gray100,
        border: 0,
        borderRadius: 26,
        boxSizing: 'border-box',
        color: value ? colors.gray800 : colors.gray400,
        fontFamily: typography.authBody.fontFamily,
        fontSize: typography.authBody.fontSize,
        height: 52,
        letterSpacing: typography.authBody.letterSpacing,
        padding: '0 16px',
        width: '100%',
      }}
      value={value}
    >
      <option disabled value="">
        소속을 선택해주세요.
      </option>
      {companies.map((company) => (
        <option
          key={company.id}
          style={{ color: colors.gray800 }}
          value={company.id}
        >
          {company.businessName}
        </option>
      ))}
    </select>
  );
}
