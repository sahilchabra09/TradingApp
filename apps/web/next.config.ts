import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const nextConfig: NextConfig = {
	// Produces a self-contained .next/standalone/ output for Docker.
	// The standalone directory includes a minimal node_modules and a
	// server.js entry point — no full node_modules copy needed in the image.
	output: "standalone",

	// Tell Next.js to trace files from the monorepo root so it correctly
	// resolves any shared packages that live outside apps/web/.
	outputFileTracingRoot: path.join(__dirname, "../../"),

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
