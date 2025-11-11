'use client'

import { useState, useEffect, useRef, Suspense, FormEvent } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  PromptInput,
  PromptInputImageButton,
  PromptInputImagePreview,
  PromptInputMicButton,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputToolbar,
  PromptInputTools,
  createImageAttachment,
  createImageAttachmentFromStored,
  savePromptToStorage,
  loadPromptFromStorage,
  clearPromptFromStorage,
  type ImageAttachment,
  createImageAttachmentFromSrc,
} from '@/components/ai-elements/prompt-input'
import { AppHeader } from '@/components/shared/app-header'
import { ChatMessages } from '@/components/chat/chat-messages'
import { ChatInput } from '@/components/chat/chat-input'
import { PreviewPanel } from '@/components/chat/preview-panel'
import { ResizableLayout } from '@/components/shared/resizable-layout'
import { BottomToolbar } from '@/components/shared/bottom-toolbar'
import { extractFigmaIds } from '@/lib/figma'

// Component that uses useSearchParams - needs to be wrapped in Suspense
function SearchParamsHandler({ onReset }: { onReset: () => void }) {
  const searchParams = useSearchParams()

  useEffect(() => {
    const reset = searchParams.get('reset')
    if (reset === 'true') {
      onReset() // 🔹 Run only once

      // Clean up URL so it won’t trigger again
      const newUrl = new URL(window.location.href)
      newUrl.searchParams.delete('reset')
      window.history.replaceState({}, '', newUrl.pathname)
    }
  }, []) // ✅ empty dependency array
  return null
}

export function HomeClient() {
  const [message, setMessage] = useState('')
  const [cardData, setCardData] = useState<Card[] | null>(null)
  const [isMounted, setIsMounted] = useState(false)
  const [figmaFileURL, setFigmaFileURL] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showChatInterface, setShowChatInterface] = useState(false)
  const [attachments, setAttachments] = useState<ImageAttachment[]>([])
  const [isDragOver, setIsDragOver] = useState(false)
  const [chatHistory, setChatHistory] = useState<
    Array<{
      type: 'user' | 'assistant'
      content: string | any
      isStreaming?: boolean
      stream?: ReadableStream<Uint8Array> | null
    }>
  >([])
  const [currentChatId, setCurrentChatId] = useState<string | null>(null)
  const [currentChat, setCurrentChat] = useState<{
    id: string
    demo?: string
  } | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [activePanel, setActivePanel] = useState<'chat' | 'preview'>('chat')
  const router = useRouter()
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [showV0Prompt, setshowV0Prompt] = useState(false)
  const [prompt, setPrompt] = useState('')

  const fetchPrompt = async () => {
    const res = await fetch('/prompt.txt')
    if (!res.ok) throw new Error('Failed to fetch prompt')
    const txt = await res.text()
    setPrompt(txt)
  }

  const handleReset = () => {
    // Reset all chat-related state
    setShowChatInterface(false)
    setChatHistory([])
    setCurrentChatId(null)
    setCurrentChat(null)
    setMessage('')
    setAttachments([])
    setIsLoading(false)
    setIsFullscreen(false)
    setRefreshKey((prev) => prev + 1)

    // Clear any stored data
    clearPromptFromStorage()

    // Focus textarea after reset
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus()
      }
    }, 0)
  }

  useEffect(() => setIsMounted(true), [])
  // Auto-focus the textarea on page load and restore from sessionStorage
  useEffect(() => {
    fetchPrompt()
    if (textareaRef.current) {
      textareaRef.current.focus()
    }

    // Restore prompt data from sessionStorage
    const storedData = loadPromptFromStorage()
    if (storedData) {
      setMessage(storedData.message)
      if (storedData.attachments.length > 0) {
        const restoredAttachments = storedData.attachments.map(
          createImageAttachmentFromStored,
        )
        setAttachments(restoredAttachments)
      }
    }
  }, [])

  // Save prompt data to sessionStorage whenever message or attachments change
  useEffect(() => {
    if (message.trim() || attachments.length > 0) {
      savePromptToStorage(message, attachments)
    } else {
      // Clear sessionStorage if both message and attachments are empty
      clearPromptFromStorage()
    }
  }, [message, attachments])

  // Image attachment handlers
  const handleImageFiles = async (files: File[]) => {
    try {
      const newAttachments = await Promise.all(
        files.map((file) => createImageAttachment(file)),
      )
      setAttachments((prev) => [...prev, ...newAttachments])
    } catch (error) {
      console.error('Error processing image files:', error)
    }
  }

  const handleImageUrls = async (urls: string) => {
    try {
      const newAttachments = await createImageAttachmentFromSrc(urls)
      setAttachments((prev) => [...prev, newAttachments])
    } catch (error) {
      console.error('Error processing image files:', error)
    }
  }

  const handleRemoveAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((att) => att.id !== id))
  }

  const handleDragOver = () => {
    setIsDragOver(true)
  }

  const handleDragLeave = () => {
    setIsDragOver(false)
  }

  const handleDrop = () => {
    setIsDragOver(false)
  }

  const generateScreenshots = async (e?: FormEvent) => {
    e?.preventDefault()
    if (!figmaFileURL) return
    const result = extractFigmaIds(figmaFileURL)

    setIsLoading(true)
    try {
      const response = await fetch(
        `/api/figma/screenshots?fileId=${result?.fileId}&nodeId=${result?.nodeId}`,
        {
          method: 'GET',
        },
      )
      if (!response.ok) {
        throw new Error('Failed to generate screenshots')
      }
      const data = await response.json()
      setCardData(data.pages)
      setIsLoading(false)
      convertToComponents(data?.pages[0])
    } catch (error) {
      console.error(error)
    }
  }

  const handleSendMessage = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!message.trim() || isLoading) return

    const userMessage = message.trim()
    const currentAttachments = [...attachments]

    // Clear sessionStorage immediately upon submission
    clearPromptFromStorage()

    setMessage('')
    setAttachments([])

    // Immediately show chat interface and add user message
    setShowChatInterface(true)
    setChatHistory([
      {
        type: 'user',
        content: userMessage,
      },
    ])
    setIsLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage,
          streaming: true,
          attachments: currentAttachments.map((att) => ({ url: att.dataUrl })),
        }),
      })

      if (!response.ok) {
        // Try to get the specific error message from the response
        let errorMessage =
          'Sorry, there was an error processing your message. Please try again.'
        try {
          const errorData = await response.json()
          if (errorData.message) {
            errorMessage = errorData.message
          } else if (response.status === 429) {
            errorMessage =
              'You have exceeded your maximum number of messages for the day. Please try again later.'
          }
        } catch (parseError) {
          console.error('Error parsing error response:', parseError)
          if (response.status === 429) {
            errorMessage =
              'You have exceeded your maximum number of messages for the day. Please try again later.'
          }
        }
        throw new Error(errorMessage)
      }

      if (!response.body) {
        throw new Error('No response body for streaming')
      }

      setIsLoading(false)

      // Add streaming assistant response
      setChatHistory((prev) => [
        ...prev,
        {
          type: 'assistant',
          content: [],
          isStreaming: true,
          stream: response.body,
        },
      ])
    } catch (error) {
      console.error('Error creating chat:', error)
      setIsLoading(false)

      // Use the specific error message if available, otherwise fall back to generic message
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Sorry, there was an error processing your message. Please try again.'

      setChatHistory((prev) => [
        ...prev,
        {
          type: 'assistant',
          content: errorMessage,
        },
      ])
    }
  }

  const handleChatData = async (chatData: any) => {
    if (chatData.id) {
      // Only set currentChat if it's not already set or if this is the main chat object
      if (!currentChatId || chatData.object === 'chat') {
        setCurrentChatId(chatData.id)
        setCurrentChat({ id: chatData.id })

        // Update URL without triggering Next.js routing
        window.history.pushState(null, '', `/chats/${chatData.id}`)
      }

      // Create ownership record for new chat (only if this is a new chat)
      if (!currentChatId) {
        try {
          await fetch('/api/chat/ownership', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              chatId: chatData.id,
            }),
          })
        } catch (error) {
          console.error('Failed to create chat ownership:', error)
          // Don't fail the UI if ownership creation fails
        }
      }
    }
  }

  const handleStreamingComplete = async (finalContent: any) => {
    setIsLoading(false)

    // Update chat history with final content
    setChatHistory((prev) => {
      const updated = [...prev]
      const lastIndex = updated.length - 1
      if (lastIndex >= 0 && updated[lastIndex].isStreaming) {
        updated[lastIndex] = {
          ...updated[lastIndex],
          content: finalContent,
          isStreaming: false,
          stream: undefined,
        }
      }
      return updated
    })

    // Fetch demo URL after streaming completes
    // Use the current state by accessing it in the state updater
    setCurrentChat((prevCurrentChat) => {
      if (prevCurrentChat?.id) {
        // Fetch demo URL asynchronously
        fetch(`/api/chats/${prevCurrentChat.id}`)
          .then((response) => {
            if (response.ok) {
              return response.json()
            } else {
              console.warn('Failed to fetch chat details:', response.status)
              return null
            }
          })
          .then((chatDetails) => {
            if (chatDetails) {
              const demoUrl =
                chatDetails?.latestVersion?.demoUrl || chatDetails?.demo

              // Update the current chat with demo URL
              if (demoUrl) {
                setCurrentChat((prev) =>
                  prev ? { ...prev, demo: demoUrl } : null,
                )
                if (window.innerWidth < 768) {
                  setActivePanel('preview')
                }
              }
            }
          })
          .catch((error) => {
            console.error('Error fetching demo URL:', error)
          })
      }

      // Return the current state unchanged for now
      return prevCurrentChat
    })
  }

  interface Card {
    title: string
    description: string
    image: string
  }

  const convertToComponents = async (card: Card) => {
    console.log('convertToComponents called')

    try {
      setIsLoading(true)

      // 1️ Wait for image to be added as attachment
      await handleImageUrls(card.image)

      setMessage(prompt)

      await new Promise((resolve) => setTimeout(resolve, 1000))

      setIsLoading(false)

      const fakeEvent = {
        preventDefault: () => {},
      } as React.FormEvent<HTMLFormElement>
      setshowV0Prompt(true)
      // await handleSendMessage(fakeEvent);
    } catch (error) {
      console.error('Error in convertToComponents:', error)
      setIsLoading(false)
    }
  }

  const handleChatSendMessage = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!message.trim() || isLoading || !currentChatId) return

    const userMessage = message.trim()
    setMessage('')
    setIsLoading(true)

    // Add user message to chat history
    setChatHistory((prev) => [...prev, { type: 'user', content: userMessage }])

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage,
          chatId: currentChatId,
          streaming: true,
        }),
      })

      if (!response.ok) {
        // Try to get the specific error message from the response
        let errorMessage =
          'Sorry, there was an error processing your message. Please try again.'
        try {
          const errorData = await response.json()
          if (errorData.message) {
            errorMessage = errorData.message
          } else if (response.status === 429) {
            errorMessage =
              'You have exceeded your maximum number of messages for the day. Please try again later.'
          }
        } catch (parseError) {
          console.error('Error parsing error response:', parseError)
          if (response.status === 429) {
            errorMessage =
              'You have exceeded your maximum number of messages for the day. Please try again later.'
          }
        }
        throw new Error(errorMessage)
      }

      if (!response.body) {
        throw new Error('No response body for streaming')
      }

      setIsLoading(false)

      // Add streaming response
      setChatHistory((prev) => [
        ...prev,
        {
          type: 'assistant',
          content: [],
          isStreaming: true,
          stream: response.body,
        },
      ])
    } catch (error) {
      console.error('Error:', error)

      // Use the specific error message if available, otherwise fall back to generic message
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Sorry, there was an error processing your message. Please try again.'

      setChatHistory((prev) => [
        ...prev,
        {
          type: 'assistant',
          content: errorMessage,
        },
      ])
      setIsLoading(false)
    }
  }

  if (showChatInterface) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black flex flex-col">
        {/* Handle search params with Suspense boundary */}
        <Suspense fallback={null}>
          <SearchParamsHandler onReset={handleReset} />
        </Suspense>

        <AppHeader />

        <div className="flex flex-col h-[calc(100vh-64px-40px)] md:h-[calc(100vh-64px)]">
          <ResizableLayout
            className="flex-1 min-h-0"
            singlePanelMode={false}
            activePanel={activePanel === 'chat' ? 'left' : 'right'}
            leftPanel={
              <div className="flex flex-col h-full">
                <div className="flex-1 overflow-y-auto">
                  <ChatMessages
                    chatHistory={chatHistory}
                    isLoading={isLoading}
                    currentChat={currentChat}
                    onStreamingComplete={handleStreamingComplete}
                    onChatData={handleChatData}
                    onStreamingStarted={() => setIsLoading(false)}
                  />
                </div>

                <ChatInput
                  message={message}
                  setMessage={setMessage}
                  onSubmit={handleChatSendMessage}
                  isLoading={isLoading}
                  showSuggestions={false}
                />
              </div>
            }
            rightPanel={
              <PreviewPanel
                currentChat={currentChat}
                isFullscreen={isFullscreen}
                setIsFullscreen={setIsFullscreen}
                refreshKey={refreshKey}
                setRefreshKey={setRefreshKey}
              />
            }
          />

          <div className="md:hidden">
            <BottomToolbar
              activePanel={activePanel}
              onPanelChange={setActivePanel}
              hasPreview={!!currentChat}
            />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black flex flex-col">
      <Suspense fallback={null}>
        <SearchParamsHandler onReset={handleReset} />
      </Suspense>
      <AppHeader />

      {/* Main Content */}
      <div className="flex flex-col lg:flex-row h-[calc(100vh-98px)] overflow-hidden bg-gray-50 dark:bg-black">
        {/* LEFT SIDE — FORM */}
        <div
          className={`w-full  ${showV0Prompt ? 'lg:w-3/4' : ''}  flex flex-col justify-between px-4 sm:px-6 lg:px-8 overflow-hidden`}
        >
          <div className="flex-1 flex flex-col justify-center items-center">
            <div className="max-w-3xl w-full">
              <div className=" mb-8 md:mb-12 text-center">
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-1">
                  Figma to Sitecore
                </h2>
              </div>

              <form
                id="figmaForm"
                className="bg-white shadow-lg rounded-2xl p-6 ring-1 ring-gray-200"
                onSubmit={generateScreenshots}
              >
                <p className="text-sm text-gray-500 mb-6">
                  Enter your Figma file URL to fetch designs
                </p>

                <label className="text-sm font-medium text-gray-700 block mb-2">
                  Figma File URL:
                </label>
                <div className="relative">
                  <input
                    id="figmaFileURL"
                    name="figmaFileURL"
                    type="text"
                    required
                    placeholder="Figma File URL"
                    value={figmaFileURL}
                    onChange={(e) => setFigmaFileURL(e.target.value)}
                    className="peer w-full pr-36 rounded-xl border border-gray-200 px-4 py-3 text-gray-700 placeholder-gray-400 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition"
                  />
                  <button
                    type="submit"
                    className="absolute top-1/2 -translate-y-1/2 right-1.5 inline-flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-white text-sm font-medium shadow-md hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-300 disabled:opacity-60"
                  >
                    {isLoading ? 'Fetching...' : 'Get Screens'}
                  </button>
                </div>
                <p id="emailHelp" className="mt-2 text-xs text-gray-400">
                  We’ll never share your Figma URL with anyone.
                </p>
              </form>
              <div className="mt-4 mb-8 md:mb-12 flex justify-between">
                <img className="w-10" src="./figma.png"></img>
                <img className="w-50" src="./sitecoreai.jpg"></img>
              </div>
            </div>
          </div>

          <div className="mt-8 mb-4 text-center text-sm text-muted-foreground">
            <p>
              Powered by{' '}
              <Link
                href="https://credera.com"
                className="text-foreground hover:underline"
              >
                CREDERA
              </Link>
            </p>
          </div>
        </div>

        {/* RIGHT SIDE — PREVIEW PANEL */}

        <div
          className={`w-full ${showV0Prompt ? 'block' : 'hidden'} lg:w-1/4 bg-white dark:bg-gray-900 border-t lg:border-t-0 lg:border-l border-gray-200 flex flex-col h-full`}
        >
          {/* 🔹 Scrollable preview area */}
          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
            {cardData && cardData.length > 0 ? (
              <div className="w-full max-w-md mx-auto font-bold text-center">
                <p className="text-left text-gray-700 font-medium">
                  Figma Screen Preview:
                </p>
                <h2 className="text-xl mb-5">{cardData[0].title}</h2>
                <img
                  src={cardData[0].image}
                  alt="Figma Preview"
                  className="rounded-xl shadow-lg w-full object-contain mb-4"
                />
              </div>
            ) : (
              <div className="text-gray-400 text-sm mt-12 text-center">
                Figma preview will appear here
              </div>
            )}
          </div>

          {/* 🔹 Fixed bottom input area */}
          <div className="p-4 border-t border-gray-200 bg-white dark:bg-gray-900">
            <PromptInput
              onSubmit={handleSendMessage}
              className="w-full relative"
              onImageDrop={handleImageFiles}
              isDragOver={isDragOver}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <PromptInputImagePreview
                attachments={attachments}
                onRemove={handleRemoveAttachment}
              />
              <PromptInputTextarea
                ref={textareaRef}
                onChange={(e) => setMessage(e.target.value)}
                value={message}
                placeholder="Prompt for generating sitecore components..."
                className="min-h-[80px] text-base"
                disabled={isLoading || !showV0Prompt}
              />
              <PromptInputToolbar>
                <PromptInputTools>
                  <PromptInputImageButton
                    onImageSelect={handleImageFiles}
                    disabled={isLoading}
                  />
                </PromptInputTools>
                <PromptInputTools>
                  <PromptInputMicButton
                    onTranscript={(transcript) =>
                      setMessage(
                        (prev) => prev + (prev ? ' ' : '') + transcript,
                      )
                    }
                    onError={(error) =>
                      console.error('Speech recognition error:', error)
                    }
                    disabled={isLoading}
                  />
                  <PromptInputSubmit
                    disabled={!message.trim() || isLoading}
                    status={isLoading ? 'streaming' : 'ready'}
                  />
                </PromptInputTools>
              </PromptInputToolbar>
            </PromptInput>
          </div>
        </div>
      </div>

      {!showV0Prompt && (
        // <div className=" mb-6 md:mb-6 mt-12 max-w-[1200px] mx-auto">
        //   {isMounted && cardData?.length ? (
        //     <h2 className="text-xl sm:text-xl md:text-2xl font-medium text-gray-900 dark:text-white mb-4">
        //       Showing Results for Figma Id: {figmaFileURL}
        //     </h2>
        //   ) : (
        //     <></>
        //   )}
        // </div>
        <></>
      )}

      {isMounted && cardData?.length && !showV0Prompt ? (
        <div
          className="flex m-auto justify-center gap-8 mb-8 w-[1200px] flex-wrap"
          suppressHydrationWarning
        >
          {/* {cardData?.map((card, index) => (
              <div
                key={index}
                className="bg-white rounded-2xl shadow-md hover:shadow-lg transition w-[250px] flex flex-col overflow-hidden"
              >
                
            <div className="w-full h-auto overflow-hidden">
              <img
                src={card.image}
                alt={card.title}
                className="w-full h-full object-cover"
              />
            </div>

        
            <div className="p-4 flex flex-col flex-grow justify-end">
              <h2 className="text-lg font-semibold text-gray-800">
                {card.title}
              </h2>
              <p className="text-gray-500 text-sm mt-1 text-center">
                <button
                  onClick={() => {
                    convertToComponents(card)
                  }}
                  className="w-full mt-auto inline-flex justify-center text-center mx-auto items-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg shadow hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 transition"
                >
                  {isLoading ? 'Converting...' : 'Convert'}
                </button>
              </p>
            </div>
          </div>
        ))} */}
        </div>
      ) : null}
    </div>
  )
}
