"use client"

import { cn } from "@/lib/utils"
import { ModeToggle } from "./theme-toggle"
import { SidebarTrigger } from "./ui/sidebar"
import { LanguageToggle } from "./language-toggle"

interface AppHeaderProps {
    leftToolbar?: React.ReactNode
    rightToolbar?: React.ReactNode
    middleToolbar?: React.ReactNode
    className?: string
}

export const AppHeader = ({
    leftToolbar,
    rightToolbar,
    middleToolbar,
    className
}: AppHeaderProps) => {
    return (
        <header className={cn("flex h-14 shrink-0 items-center justify-between gap-2 border-b px-4 bg-background", className)}>
            <div className="flex gap-x-4 items-center">
                <SidebarTrigger />
                {leftToolbar}
            </div>
            <div className="flex gap-x-4 items-center">
                {middleToolbar}
            </div>
            <div className="flex gap-x-4 items-center">
                {rightToolbar}
                <LanguageToggle />
                <ModeToggle />
            </div>
        </header>
    )
}