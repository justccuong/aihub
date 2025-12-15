import { headers } from "next/headers"
import { createAuth } from "./auth"
import { redirect } from "next/navigation"
import { Path } from "@/config/constants"

export const requireAuth = async () => {
    const auth = await createAuth()
    const session = await auth.api.getSession({
        headers: await headers(),
    })

    if (!session) {
        redirect(Path.LOGIN)
    }

    return session
}

export const requireUnauth = async () => {
    const auth = await createAuth()
    const session = await auth.api.getSession({
        headers: await headers(),
    })

    if (session) {
        redirect(Path.ADMIN_DASHBOARD)
    }
}