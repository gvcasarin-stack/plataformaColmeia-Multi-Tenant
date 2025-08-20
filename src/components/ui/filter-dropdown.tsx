"use client"

import * as React from "react"
import { Filter } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface FilterOption {
  label: string
  value: string
}

interface FilterDropdownProps {
  options: FilterOption[]
  value: string[]
  onChange: (value: string[]) => void
  label: string
}

export function FilterDropdown({
  options,
  value,
  onChange,
  label,
}: FilterDropdownProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="ml-auto">
          <Filter className="mr-2 h-4 w-4" />
          {label}
          {value.length > 0 && (
            <span className="ml-1 rounded-full bg-primary w-4 h-4 text-[10px] flex items-center justify-center text-primary-foreground">
              {value.length}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[200px]">
        <DropdownMenuLabel>Filtrar por {label}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {options.map((option) => (
          <DropdownMenuCheckboxItem
            key={option.value}
            checked={value.includes(option.value)}
            onCheckedChange={(checked) => {
              if (checked) {
                onChange([...value, option.value])
              } else {
                onChange(value.filter((v) => v !== option.value))
              }
            }}
          >
            {option.label}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
} 