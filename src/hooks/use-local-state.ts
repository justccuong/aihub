import { useEffect, useState } from "react"

interface UseLocalStateProps<T> {
    value?: T
    setValue?: (value: T) => void
    defaultValue?: T
}

/**
 * Custom hook để hỗ trợ cả controlled và uncontrolled component
 * - Nếu value và setValue được truyền vào -> controlled mode
 * - Nếu không -> uncontrolled mode với internal state
 */
export const useLocalState = <T>({
    value,
    setValue,
    defaultValue,
}: UseLocalStateProps<T>) => {
    const [localValue, setLocalValue] = useState<T | undefined>(
        value ?? defaultValue
    )

    // Đồng bộ localValue khi value từ props thay đổi
    useEffect(() => {
        if (value !== undefined) {
            setLocalValue(value)
        }
    }, [value])

    // Nếu value được truyền vào -> controlled mode
    const isControlled = value !== undefined
    const usedValue = isControlled ? value : localValue
    const usedSetValue = setValue ?? setLocalValue

    return [usedValue, usedSetValue] as const
}