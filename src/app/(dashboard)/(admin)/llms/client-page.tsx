"use client"

import { useLlmsList } from "@/features/llms/hooks/use-llms"
import { useLlmsParams } from "@/features/llms/hooks/use-llms-params"

const ClientPage = () => {
    const [params, setParams] = useLlmsParams()
    const { data } = useLlmsList(params)
    return (
        <div>
            <h1>LLM List</h1>
            <pre>{JSON.stringify(data, null, 2)}</pre>
        </div>
    )
}

export default ClientPage