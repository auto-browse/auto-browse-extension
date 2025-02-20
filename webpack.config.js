const path = require("path");
const CopyPlugin = require("copy-webpack-plugin");

module.exports = {
	mode: "production",
	entry: {
		background: "./src/background/index.ts",
		content: "./src/content/index.ts",
		popup: "./src/popup/index.tsx",
		sidepanel: "./src/sidepanel/index.tsx"
	},
	output: {
		path: path.resolve(__dirname, "dist"),
		filename: "[name].js",
		clean: true
	},
	module: {
		rules: [
			{
				test: /\.tsx?$/,
				use: [
					{
						loader: "ts-loader",
						options: {
							compilerOptions: {
								noEmit: false
							}
						}
					}
				],
				exclude: /node_modules/
			},
			{
				test: /\.css$/,
				use: [
					"style-loader",
					{
						loader: "css-loader",
						options: {
							importLoaders: 1
						}
					},
					{
						loader: "postcss-loader",
						options: {
							postcssOptions: {
								config: path.resolve(__dirname, "postcss.config.js")
							}
						}
					}
				]
			}
		]
	},
	resolve: {
		extensions: [".tsx", ".ts", ".js"],
		alias: {
			"@": path.resolve(__dirname, "src")
		}
	},
	plugins: [
		new CopyPlugin({
			patterns: [
				{
					from: "public",
					to: ".",
					globOptions: {
						ignore: ["**/manifest.json"]
					}
				},
				{
					from: "public/manifest.json",
					to: "manifest.json"
				}
			]
		})
	]
};
