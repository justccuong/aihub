import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	/* config options here */
	experimental: {
		optimizePackageImports: ["shiki", "lucide-react", "@radix-ui/react-icons"],
	},
	eslint: {
		ignoreDuringBuilds: true,
	},
	devIndicators: false,
	async redirects() {
		return [
			{
				source: "/",
				destination: "/llms",
				permanent: false,
			},
		]
	},
};

export default nextConfig;

// Enable calling `getCloudflareContext()` in `next dev`.
// See https://opennext.js.org/cloudflare/bindings#local-access-to-bindings.
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
initOpenNextCloudflareForDev();
