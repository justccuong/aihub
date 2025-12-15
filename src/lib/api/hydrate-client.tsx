/* eslint-disable @typescript-eslint/no-explicit-any */
import "server-only" // <-- ensure this file cannot be imported from the client

import { getQueryClient } from "./query-client"
import { HydrationBoundary, dehydrate, InfiniteQueryPageParamsOptions, FetchQueryOptions } from "@tanstack/react-query"

/**
 * Prefetch a query on the server for hydration
 * Works with query options from Hono-based query-options files
 * @param queryOptions - Query options object from queryOptions() or infiniteQueryOptions()
 */
export function prefetch<
	TQueryFnData = unknown,
	TError = Error,
	TData = TQueryFnData,
	TQueryKey extends readonly unknown[] = readonly unknown[],
>(
	queryOptions: FetchQueryOptions<TQueryFnData, TError, TData, TQueryKey> | InfiniteQueryPageParamsOptions<TQueryFnData, TError>
) {
	const queryClient = getQueryClient()

	// Check if it's an infinite query by looking for infinite query specific properties
	const isInfiniteQuery = 'initialPageParam' in queryOptions ||
		'getNextPageParam' in queryOptions ||
		'getPreviousPageParam' in queryOptions

	if (isInfiniteQuery) {
		void queryClient.prefetchInfiniteQuery(queryOptions as any)
	} else {
		void queryClient.prefetchQuery(queryOptions as any)
	}
}


export function HydrateClient(props: { children: React.ReactNode }) {
	const queryClient = getQueryClient()
	return (
		<HydrationBoundary state={dehydrate(queryClient)}>
			{props.children}
		</HydrationBoundary>
	)
}