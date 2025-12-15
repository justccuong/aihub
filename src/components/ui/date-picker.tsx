"use client"

import * as React from "react"
import { format, parse } from "date-fns"
import { CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"

interface DatePickerProps {
    value?: string // YYYY-MM-DD format
    onChange: (value: string | undefined) => void
    placeholder?: string
    disabled?: boolean
    className?: string
}

export function DatePicker({
    value,
    onChange,
    placeholder = "Pick a date",
    disabled,
    className,
}: DatePickerProps) {
    const [open, setOpen] = React.useState(false)
    const date = value ? parse(value, "yyyy-MM-dd", new Date()) : undefined

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    disabled={disabled}
                    data-empty={!date}
                    className={cn(
                        "w-full justify-start text-left font-normal data-[empty=true]:text-muted-foreground",
                        className
                    )}
                >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP") : <span>{placeholder}</span>}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(newDate) => {
                        onChange(newDate ? format(newDate, "yyyy-MM-dd") : undefined)
                        setOpen(false) // Auto-close after selection
                    }}
                    captionLayout="dropdown"
                    defaultMonth={date}
                    initialFocus
                />
            </PopoverContent>
        </Popover>
    )
}
