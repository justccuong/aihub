/**
 * API Error Handling Utilities
 * 
 * Provides structured error handling for API requests.
 */

/**
 * Custom error class for API errors with status code and optional error code
 */
export class ApiError extends Error {
    constructor(
        message: string,
        public status: number,
        public code?: string
    ) {
        super(message)
        this.name = 'ApiError'
    }
}

/**
 * Handle API response and throw structured errors
 * @param response - Fetch Response object
 * @param errorMessage - Custom error message for failed requests
 * @returns Parsed JSON response
 */
export async function handleApiResponse<T>(
    response: Response,
    errorMessage = 'Request failed'
): Promise<T> {
    if (!response.ok) {
        let errorData: { error?: string; message?: string; code?: string } = {}

        try {
            errorData = await response.json()
        } catch {
            // Response body is not JSON
        }

        const message = errorData.error || errorData.message || `${errorMessage} (${response.status})`
        throw new ApiError(message, response.status, errorData.code)
    }

    return response.json()
}

/**
 * Type guard to check if an error is an ApiError
 */
export function isApiError(error: unknown): error is ApiError {
    return error instanceof ApiError
}

/**
 * Get user-friendly error message from any error
 */
export function getErrorMessage(error: unknown): string {
    if (isApiError(error)) {
        return error.message
    }
    if (error instanceof Error) {
        return error.message
    }
    return 'An unexpected error occurred'
}
