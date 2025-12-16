"use client"

import dynamic from "next/dynamic"
import { PlaygroundLoading } from "./playground-container"

// Dynamic import with ssr:false to exclude heavy AI SDK dependencies from SSR bundle
const PlaygroundContainer = dynamic(
    () => import("./playground-container").then(m => m.PlaygroundContainer),
    {
        ssr: false,
        loading: () => <PlaygroundLoading />
    }
)

export const PlaygroundWrapper = () => {
    return <PlaygroundContainer />
}
