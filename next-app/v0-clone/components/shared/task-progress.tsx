import React from 'react'

export type Task = {
  id: number
  title: string
  description?: string
}

type Props = {
  tasks: Task[]
  currentStep: number
  isError?: boolean
  errorMessage?: string
  open?: boolean
  onClose?: () => void
  onStart?: () => void
}

export default function TaskProgressModal({
  tasks,
  currentStep,
  isError = false,
  errorMessage,
  open = true,
  onClose,
  onStart,
}: Props) {
  if (!open) return null

  const maxTaskId = tasks.length > 0 ? Math.max(...tasks.map((t) => t.id)) : 0
  const allCompleted = currentStep >= maxTaskId && maxTaskId > 0

  // Identify which task is currently failing
  const failedTaskId = isError ? currentStep + 1 : null

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2
            id="modal-title"
            className="text-lg font-semibold text-gray-900 flex items-center gap-3"
          >
            {currentStep > 0 && !allCompleted && !isError && (
              <svg
                className="w-5 h-5 text-blue-600 animate-spin"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                ></path>
              </svg>
            )}
            Processing Tasks...
          </h2>

          <button
            className="p-2 rounded-md hover:bg-gray-100"
            aria-label="Close"
            onClick={() => onClose?.()}
            type="button"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-6">
          <p className="text-sm text-gray-600 mb-5">
            Please wait while we complete the setup process. You can track
            progress below.
          </p>

          <ol className="space-y-4">
            {tasks.map((task) => {
              const isFailed = failedTaskId === task.id
              const completed = task.id <= currentStep && !isFailed
              const isActive =
                !isError &&
                currentStep > 0 &&
                !allCompleted &&
                task.id === currentStep + 1

              // Circle styling logic
              const circleClass =
                `flex items-center justify-center w-9 h-9 rounded-full font-semibold border-2 ` +
                (isFailed
                  ? 'bg-red-500 text-white border-red-500'
                  : completed
                  ? 'bg-green-500 text-white border-green-500'
                  : isActive
                  ? 'bg-blue-100 text-blue-600 border-blue-400 animate-pulse'
                  : 'bg-white text-gray-700 border-gray-200')

              // Status label
              const statusLabel = isFailed
                ? 'Failed'
                : completed
                ? 'Completed'
                : isActive
                ? 'In progress...'
                : 'Pending'

              const statusClass =
                isFailed
                  ? 'text-red-600'
                  : completed
                  ? 'text-green-600'
                  : isActive
                  ? 'text-blue-600'
                  : 'text-gray-500'

              return (
                <li key={task.id} className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <div className={circleClass}>{task.id}</div>
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3
                        className={`text-sm font-medium ${
                          isFailed ? 'text-red-700' : 'text-gray-900'
                        }`}
                      >
                        {task.title}
                      </h3>

                      <span className={`text-xs font-medium ${statusClass}`}>
                        {statusLabel}
                      </span>
                    </div>

                    {task.description && (
                      <p
                        className={`mt-1 text-sm ${
                          isFailed ? 'text-red-600' : 'text-gray-600'
                        }`}
                      >
                        {task.description}
                      </p>
                    )}

                    {isFailed && errorMessage && (
                      <p className="mt-2 text-xs text-red-600">
                        {errorMessage}
                      </p>
                    )}
                  </div>
                </li>
              )
            })}
          </ol>
        </div>
      </div>
    </div>
  )
}
