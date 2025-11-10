import React from 'react'

export type Task = {
    id: number
    title: string
    description?: string
}

type Props = {
    /** Array of tasks (id should be 1-based and ordered) */
    tasks: Task[]
    /** Number of the last completed task. 0 means nothing completed yet. */
    currentStep: number
    /** Optional: hide/show modal (default true) */
    open?: boolean
    /** Optional close handler for the close button */
    onClose?: () => void
    /** Optional start handler */
    onStart?: () => void
}

export default function TaskProgressModal({ tasks, currentStep, open = true, onClose, onStart }: Props) {
    if (!open) return null

    const maxTaskId = tasks.length > 0 ? Math.max(...tasks.map((t) => t.id)) : 0
    const allCompleted = currentStep >= maxTaskId && maxTaskId > 0

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
                    <h2 id="modal-title" className="text-lg font-semibold text-gray-900 flex items-center gap-3">
                        {/* Spinner: hidden when everything is finished or before start */}
                        {currentStep > 0 && !allCompleted && (
                            <svg
                                className="w-5 h-5 text-blue-600 animate-spin"
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                aria-hidden="true"
                            >
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                            </svg>
                        )}

                        Processing Tasks...
                    </h2>

                    {/* Close button (calls onClose if provided) */}
                    <button
                        className="p-2 rounded-md hover:bg-gray-100 focus:outline-none"
                        aria-label="Close"
                        onClick={() => onClose?.()}
                        type="button"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Body */}
                <div className="px-6 py-6">
                    <p className="text-sm text-gray-600 mb-5">Please wait while we complete the setup process. You can track progress below.</p>

                    <ol className="space-y-4">
                        {tasks.map((task) => {
                            const completed = task.id <= currentStep && currentStep > 0
                            const isActive = currentStep > 0 && !allCompleted && task.id === currentStep + 1

                            return (
                                <li key={task.id} className="flex items-start gap-4">
                                    <div className="flex-shrink-0">
                                        {/* Circle: change classes based on state */}
                                        <div
                                            className={
                                                `flex items-center justify-center w-9 h-9 rounded-full font-semibold border-2 ` +
                                                (completed
                                                    ? 'bg-green-500 text-white border-green-500'
                                                    : isActive
                                                        ? 'bg-blue-100 text-blue-600 border-blue-400 animate-pulse'
                                                        : 'bg-white text-gray-700 border-gray-200')
                                            }
                                            aria-hidden="true"
                                        >
                                            {task.id}
                                        </div>
                                    </div>

                                    <div className="flex-1">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-sm font-medium text-gray-900">{task.title}</h3>
                                            <span className={`text-xs font-medium ${completed ? 'text-green-600' : isActive ? 'text-blue-600' : 'text-gray-500'}`}>
                                                {completed ? 'Completed' : isActive ? 'In progress...' : 'Pending'}
                                            </span>
                                        </div>
                                        {task.description && <p className="mt-1 text-sm text-gray-600">{task.description}</p>}
                                    </div>
                                </li>
                            )
                        })}
                    </ol>

                    {/* Start Button visible only when nothing started */}
                    {/* {currentStep === 0 && (
            <div className="mt-6 flex justify-center">
              <button
                onClick={onStart}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none"
              >
                Start
              </button>
            </div>
          )} */}
                </div>
            </div>
        </div>
    )
}