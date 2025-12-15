import SignupForm from "@/features/auth/components/signup-form"
import { requireUnauth } from "@/lib/auth/utils"
import { getCloudflareContext } from "@opennextjs/cloudflare"
import { notFound } from "next/navigation"

export default async function Page() {
    const { env } = await getCloudflareContext({ async: true })
    if (env.NEXTJS_ENV !== 'development') {
        notFound()
    }

    await requireUnauth()
    return <SignupForm />
}
