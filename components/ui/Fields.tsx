import type { InputHTMLAttributes, ReactNode } from 'react';
export function Field({
  label,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input {...props} />
    </label>
  );
}
export function ExternalLink({
  href,
  children,
  className = '',
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <a className={className} href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  );
}
export function Brand() {
  return (
    <div className="brand">
      <span className="brand-icon" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
      <div>
        AMA <span>TATAMI PLANNER</span>
      </div>
    </div>
  );
}
