'use client'

import { useId, useRef } from 'react'

export function ConfirmSubmitButton({
  children,
  message,
  className,
  title,
  dialogTitle,
  confirmLabel = 'Підтвердити',
}) {
  const dialogRef = useRef(null)
  const titleId = useId()

  if (dialogTitle) {
    return (
      <>
        <button
          type="button"
          className={className}
          title={title}
          onClick={() => dialogRef.current?.showModal()}
        >
          {children}
        </button>
        <dialog ref={dialogRef} className="confirm-dialog" aria-labelledby={titleId}>
          <div className="confirm-dialog__content">
            <h2 id={titleId}>{dialogTitle}</h2>
            <p>{message}</p>
            <div className="confirm-dialog__actions">
              <button type="button" className="btn btn--secondary" onClick={() => dialogRef.current?.close()}>
                Скасувати
              </button>
              <button type="submit" className="btn btn--danger">
                {confirmLabel}
              </button>
            </div>
          </div>
        </dialog>
      </>
    )
  }

  return (
    <button
      type="submit"
      className={className}
      title={title}
      onClick={(event) => {
        if (!window.confirm(message)) event.preventDefault()
      }}
    >
      {children}
    </button>
  )
}
