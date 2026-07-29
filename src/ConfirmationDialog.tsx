import {
  useEffect,
  useRef,
  type RefObject,
} from 'react'

export function ConfirmationDialog({
  title,
  description,
  confirmLabel,
  onCancel,
  onConfirm,
  returnFocusRef,
}: {
  title: string
  description: string
  confirmLabel: string
  onCancel: () => void
  onConfirm: () => void
  returnFocusRef?: RefObject<HTMLButtonElement | null>
}) {
  const cancelButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    cancelButtonRef.current?.focus()
  }, [])

  const cancel = () => {
    onCancel()
    returnFocusRef?.current?.focus()
  }

  return (
    <div
      className="confirmation-dialog-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) cancel()
      }}
    >
      <section
        className="confirmation-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirmation-dialog-title"
        aria-describedby="confirmation-dialog-description"
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault()
            cancel()
          }
          if (event.key === 'Tab') {
            const buttons = Array.from(
              event.currentTarget.querySelectorAll<HTMLButtonElement>(
                'button:not(:disabled)',
              ),
            )
            const first = buttons[0]
            const last = buttons[buttons.length - 1]
            if (
              event.shiftKey &&
              document.activeElement === first
            ) {
              event.preventDefault()
              last?.focus()
            } else if (
              !event.shiftKey &&
              document.activeElement === last
            ) {
              event.preventDefault()
              first?.focus()
            }
          }
        }}
      >
        <h2 id="confirmation-dialog-title">{title}</h2>
        <p id="confirmation-dialog-description">{description}</p>
        <div className="confirmation-dialog__actions">
          <button
            ref={cancelButtonRef}
            type="button"
            className="control-button"
            onClick={cancel}
          >
            Cancel
          </button>
          <button
            type="button"
            className="begin-button"
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </section>
    </div>
  )
}
