import { forwardRef, type ForwardedRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

interface BaseProps {
  label?: string;
  hint?: string;
  error?: string;
  textarea?: boolean;
}

type InputProps = BaseProps & InputHTMLAttributes<HTMLInputElement> & TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Input = forwardRef<HTMLInputElement | HTMLTextAreaElement, InputProps>(function Input(
  { label, hint, error, className, textarea = false, ...props },
  ref,
) {
  const sharedClassName = cn(
    'w-full rounded-xl border border-border bg-[#121212] px-4 py-3 text-base md:text-sm text-text-primary outline-none transition focus:border-gold focus:ring-2 focus:ring-gold/20 placeholder:text-text-muted',
    textarea ? 'min-h-[120px] resize-y' : 'h-11 overflow-hidden text-ellipsis placeholder:text-sm sm:placeholder:text-base',
    error ? 'border-danger focus:border-danger focus:ring-danger/20' : '',
    className,
  );

  return (
    <label className="block space-y-2">
      {label ? <span className="text-sm font-medium text-text-primary">{label}</span> : null}
      {textarea ? (
        <textarea ref={ref as ForwardedRef<HTMLTextAreaElement>} className={sharedClassName} {...props} />
      ) : (
        <input ref={ref as ForwardedRef<HTMLInputElement>} className={sharedClassName} {...props} />
      )}
      {error ? <span className="text-sm text-danger">{error}</span> : null}
      {!error && hint ? <span className="text-xs text-text-secondary">{hint}</span> : null}
    </label>
  );
});
