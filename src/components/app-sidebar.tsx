"use client"

import {
    BookIcon,
    BotIcon,
    LogOutIcon,
} from "lucide-react"
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

const menuItems = [
    {
        title: "Agent Management",
        items: [
            { title: "LLMs", icon: BotIcon, url: "/llms" },
            { title: "Datasource", icon: BookIcon, url: "/datasource-groups" },
        ],
    },
]

export const AppSidebar = () => {
    const pathname = usePathname()
    const router = useRouter()

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
                    <SidebarMenuButton asChild className="gap-x-4 h-10 px-4">
                        <Link href="/" prefetch>
                            <Image
                                src="/logos/logo.webp"
                                alt="Nodebase"
                                width={30}
                                height={30}
                            />
                            <span className="font-semibold text-sm">
                                Admin Dashboard
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