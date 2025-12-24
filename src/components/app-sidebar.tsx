"use client"

import {
    BookIcon,
    BotIcon,
    BotMessageSquareIcon,
    LogOutIcon,
    PlayIcon,
} from "lucide-react"
import "client-only"
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "./ui/sidebar"
import Link from "next/link"
import Image from "next/image"
import { usePathname, useRouter } from "next/navigation"
import { Path } from "@/config/constants"
import { signOut } from "@/lib/auth/client"
import { useTheme } from "next-themes"
import { useClient } from "@/hooks/use-client"

const menuItems = [
    {
        title: "Agent Management",
        items: [
            { title: "LLMs", icon: BotIcon, url: "/llms" },
            { title: "Datasource", icon: BookIcon, url: "/datasources" },
            { title: "Agents", icon: BotMessageSquareIcon, url: "/agents" },
            { title: "Playground", icon: PlayIcon, url: "/playground" },
        ],
    },
]

export const AppSidebar = () => {
    const pathname = usePathname()
    const router = useRouter()
    const isClient = useClient()
    const { resolvedTheme } = useTheme()

    const handleLogout = async () => {
        await signOut({
            fetchOptions: {
                onSuccess: () => {
                    router.push("/login")
                },
            },
        })
    }

    return (
        <Sidebar collapsible="icon">
            <SidebarHeader>
                <SidebarMenuItem>
                    <SidebarMenuButton asChild className="h-10 px-4">
                        <Link href="/" prefetch suppressHydrationWarning>
                            {
                                isClient && resolvedTheme === "dark" ? (
                                    <Image
                                        src="/JS_white.png"
                                        alt="JS Club AI Hub"
                                        width={50}
                                        height={50}
                                    />
                                ) : (
                                    <Image
                                        src="/JS_logo.png"
                                        alt="JS Club AI Hub"
                                        width={50}
                                        height={50}
                                    />
                                )
                            }
                            <span className="font-semibold text-sm">
                                JS Club AI Hub
                            </span>
                        </Link>
                    </SidebarMenuButton>
                </SidebarMenuItem>
            </SidebarHeader>
            <SidebarContent>
                {menuItems.map((group) => (
                    <SidebarGroup key={group.title}>
                        <SidebarGroupLabel>{group.title}</SidebarGroupLabel>
                        <SidebarGroupContent>
                            <SidebarMenu>
                                {group.items.map((item) => (
                                    <SidebarMenuItem key={item.title}>
                                        <SidebarMenuButton
                                            tooltip={item.title}
                                            isActive={
                                                `${Path.ADMIN_DASHBOARD}${item.url}` === "/"
                                                    ? pathname === "/"
                                                    : pathname.startsWith(
                                                        `${item.url}`
                                                    )
                                            }
                                            asChild
                                            className="gap-x-4 h-10 px-4"
                                        >
                                            <Link href={`${item.url}`} prefetch>
                                                <item.icon className="size-4" />
                                                <span>{item.title}</span>
                                            </Link>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                ))}
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>
                ))}
            </SidebarContent>
            <SidebarFooter>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            tooltip="Logout"
                            onClick={handleLogout}
                            className="gap-x-4 h-10 px-4 text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                            <LogOutIcon className="size-4" />
                            <span>Logout</span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarFooter>
        </Sidebar>
    )
}