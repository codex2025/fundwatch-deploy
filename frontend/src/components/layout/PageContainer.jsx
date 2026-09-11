import React from 'react';

/**
 * Standard page frame. One place controls page gutters and max width, so no
 * screen can introduce its own and cause the shell overflow the audit found.
 */
export default function PageContainer({ title, description, actions, children, wide = false }) {
  return (
    <div
      className="mx-auto w-full px-3 sm:px-4 lg:px-6 py-4 sm:py-5 space-y-4"
      style={{ maxWidth: wide ? '100%' : '1600px' }}
    >
      {(title || actions) && (
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            {title && <h1 className="text-xl font-semibold tracking-tight">{title}</h1>}
            {description && (
              <p className="text-sm text-content-muted mt-1 max-w-2xl">{description}</p>
            )}
          </div>
          {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
        </div>
      )}
      {children}
    </div>
  );
}
