import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	// typedRoutes requires a build to generate route types; re-enable after initial build if desired
	images: {
		remotePatterns: [
			{
				protocol: "https",
				hostname: "**",
			},
		],
	},
};

export default nextConfig;
