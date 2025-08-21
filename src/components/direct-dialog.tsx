"use client"

import React, { useState } from 'react'
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { Button } from "@/components/ui/button"
import { devLog } from "@/lib/utils/productionLogger";
import { X } from "lucide-react"

export function DirectDialog() {
  const [open, setOpen] = useState(false)
  
  devLog.log('DirectDialog rendered with open state:', open)
  
  return (
    <div className="p-4 border rounded-md">
      <h3 className="text-lg font-medium mb-4">Direct Dialog Test</h3>
      
      <div className="space-y-4">
        <p>This component uses Radix UI Dialog directly without the UI component abstraction.</p>
        
        <Button 
          onClick={() => {
            devLog.log('Opening direct dialog manually')
            setOpen(true)
          }}
        >
          Open Direct Dialog
        </Button>
        
        <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
          <DialogPrimitive.Portal>
            <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
            <DialogPrimitive.Content className="fixed left-[50%] top-[50%] z-50 w-full max-w-md translate-x-[-50%] translate-y-[-50%] bg-white p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] rounded-lg">
              <div className="flex flex-col space-y-1.5 text-center sm:text-left">
                <DialogPrimitive.Title className="text-lg font-semibold">
                  Direct Dialog Test
                </DialogPrimitive.Title>
                <DialogPrimitive.Description className="text-sm text-gray-500">
                  This dialog uses Radix UI primitives directly.
                </DialogPrimitive.Description>
              </div>
              <div className="mt-4">
                <p>Testing if direct implementation works.</p>
              </div>
              <div className="mt-4 flex justify-end">
                <Button onClick={() => setOpen(false)}>Close</Button>
              </div>
              <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </DialogPrimitive.Close>
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
      </div>
    </div>
  )
}
