const path = require("path");
const TerserPlugin = require("terser-webpack-plugin");

const WEBPACK_DEV_SERVER_PORT = 8008;

const DIST_DIR = path.join(__dirname, "dist");

module.exports = (env) => {
	return {
		devServer: {
			hot: false,
			open: false,
			client: false,
			allowedHosts: "all",
			headers: {
				"Access-Control-Allow-Origin": "*",
				"Access-Control-Allow-Credentials": "true",
				"Access-Control-Allow-Methods": "GET,HEAD,PUT,PATCH,POST,DELETE",
				"Access-Control-Expose-Headers": "Content-Length",
				"Access-Control-Allow-Headers": "Accept, Authorization, Content-Type, X-Requested-With, Range",
			},
			port: WEBPACK_DEV_SERVER_PORT,
			compress: true,
			devMiddleware: {
				writeToDisk: true,
			},
		},
		devtool: false ? "source-map" : "inline-source-map",
		entry: "./src/index.ts",
		mode: "development",
		module: {
			rules: [{
				test: /\.tsx?$/i,
				exclude: /node_modules/,
				use: [{
					loader: "ts-loader",
					options: {
						configFile: "tsconfig.json",
					},
				}],
			}, {
				test: /\.mp3$/,
				type: 'asset/resource',
				generator: {
				filename: 'assets/[name].[hash][ext]',
				},
			}],
		},
		optimization: {
			minimize: true,
			minimizer: [new TerserPlugin()],
		},
		output: {
			path: DIST_DIR,
			filename: `${env.stable == "true" ? "stable" : "dev"}Bundle.js`,
		},
		plugins: [

		],
		resolve: {
			extensions: [".ts", ".tsx", ".js"],
		},
		performance: false
	};
};