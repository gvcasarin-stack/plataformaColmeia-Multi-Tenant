"use client"

import React, { useEffect, useState } from 'react'
import { devLog } from "@/lib/utils/productionLogger";
import { Button } from "@/components/ui/button"

interface SimpleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
}

export function SimpleModal({ open, onOpenChange, title, description, children }: SimpleModalProps) {
  devLog.log('SimpleModal rendered with open:', open)
  
  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onOpenChange(false)
      }
    }
    
    if (open) {
      document.addEventListener('keydown', handleEscape)
      // Prevent scrolling when modal is open
      document.body.style.overflow = 'hidden'
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = ''
    }
  }, [open, onOpenChange])
  
  if (!open) return null
  
  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-50"
        onClick={() => onOpenChange(false)}
      />
      
      {/* Modal */}
      <div className="fixed left-[50%] top-[50%] z-50 w-full max-w-md translate-x-[-50%] translate-y-[-50%] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-6 shadow-lg rounded-lg">
        {/* Header */}
        <div className="flex flex-col mb-5 pb-3 border-b border-gray-100 dark:border-gray-700">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white">{title}</h2>
            <button 
              onClick={() => onOpenChange(false)}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                <path d="M18 6 6 18"></path>
                <path d="m6 6 12 12"></path>
              </svg>
            </button>
          </div>
          
          {description && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{description}</p>
          )}
        </div>
        
        {/* Content */}
        <div>
          {children}
        </div>
      </div>
    </>
  )
}

export function SimpleModalDemo() {
  const [open, setOpen] = useState(false)
  
  return (
    <div className="p-4 border rounded-md">
      <h3 className="text-lg font-medium mb-4">Simple Modal Test</h3>
      
      <div className="space-y-4">
        <p>This component uses a simple custom modal implementation without Radix UI.</p>
        
        <Button 
          onClick={() => {
            devLog.log('Opening simple modal')
            setOpen(true)
          }}
        >
          Open Simple Modal
        </Button>
        
        <SimpleModal
          open={open}
          onOpenChange={setOpen}
          title="Simple Modal"
        >
          <div className="space-y-4">
            <p>This is a simple modal implementation without using Radix UI.</p>
            <div className="flex justify-end">
              <Button onClick={() => setOpen(false)}>Close</Button>
            </div>
          </div>
        </SimpleModal>
      </div>
    </div>
  )
}
