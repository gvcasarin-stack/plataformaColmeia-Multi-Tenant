"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { ChevronRight } from "lucide-react"

const Accordion = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    type?: "single" | "multiple";
    collapsible?: boolean;
    value?: string;
    onValueChange?: (value: string) => void;
    defaultValue?: string;
  }
>(({ className, children, type = "single", collapsible = false, ...props }, ref) => {
  const [openItems, setOpenItems] = React.useState<Set<string>>(
    new Set(props.defaultValue ? [props.defaultValue] : [])
  );

  const handleItemToggle = (value: string) => {
    const newOpenItems = new Set(openItems);
    
    if (newOpenItems.has(value)) {
      if (collapsible || (type === "multiple" && newOpenItems.size > 1)) {
        newOpenItems.delete(value);
      }
    } else {
      if (type === "single") {
        newOpenItems.clear();
      }
      newOpenItems.add(value);
    }
    
    setOpenItems(newOpenItems);
    
    if (props.onValueChange) {
      props.onValueChange(value);
    }
  };

  return (
    <div
      ref={ref}
      className={cn("space-y-2", className)}
      {...props}
    >
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as React.ReactElement<AccordionItemProps>, {
            onToggle: handleItemToggle,
            isOpen: openItems.has(child.props.value),
          });
        }
        return child;
      })}
    </div>
  );
});
Accordion.displayName = "Accordion";

interface AccordionItemProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
  onToggle?: (value: string) => void;
  isOpen?: boolean;
}

const AccordionItem = React.forwardRef<
  HTMLDivElement,
  AccordionItemProps
>(({ className, children, value, onToggle, isOpen = false, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn("border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden", className)}
      {...props}
    >
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          if (child.type === AccordionTrigger) {
            return React.cloneElement(child as React.ReactElement<AccordionTriggerProps>, {
              onClick: () => onToggle?.(value),
              isOpen,
            });
          }
          if (child.type === AccordionContent) {
            return React.cloneElement(child as React.ReactElement<AccordionContentProps>, {
              isOpen,
            });
          }
        }
        return child;
      })}
    </div>
  );
});
AccordionItem.displayName = "AccordionItem";

interface AccordionTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isOpen?: boolean;
}

const AccordionTrigger = React.forwardRef<
  HTMLButtonElement,
  AccordionTriggerProps
>(({ className, children, isOpen, ...props }, ref) => {
  return (
    <button
      ref={ref}
      className={cn(
        "flex w-full items-center justify-between py-4 px-5 font-medium transition-all",
        className
      )}
      {...props}
    >
      {children}
      <ChevronRight className={cn(
        "h-4 w-4 shrink-0 transition-transform duration-200",
        isOpen && "rotate-90"
      )} />
    </button>
  );
});
AccordionTrigger.displayName = "AccordionTrigger";

interface AccordionContentProps extends React.HTMLAttributes<HTMLDivElement> {
  isOpen?: boolean;
}

const AccordionContent = React.forwardRef<
  HTMLDivElement,
  AccordionContentProps
>(({ className, children, isOpen, ...props }, ref) => {
  return isOpen ? (
    <div
      ref={ref}
      className={cn(
        "overflow-hidden text-sm",
        className
      )}
      {...props}
    >
      <div className="pb-4 pt-0 px-5">{children}</div>
    </div>
  ) : null;
});
AccordionContent.displayName = "AccordionContent";

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent }
