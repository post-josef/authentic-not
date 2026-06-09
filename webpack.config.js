import path from "path";
import HtmlWebpackPlugin from "html-webpack-plugin";
import MiniCssExtractPlugin from "mini-css-extract-plugin";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default (_env, argv) => {
    const isDevelopment = argv.mode === "development";

    return {
        mode: argv.mode ?? "development",
        entry: "./src/index.ts",

        devtool: isDevelopment ? "eval-source-map" : false,

        output: {
            path: path.resolve(__dirname, "dist"),
            filename: isDevelopment ? "[name].js" : "[name].[contenthash:8].js",
            clean: true,
        },

        module: {
            rules: [
                {
                    test: /\.ts$/,
                    use: "ts-loader",
                    exclude: /node_modules/,
                },
                {
                    test: /\.css$/,
                    use: [MiniCssExtractPlugin.loader, "css-loader"],
                },
            ],
        },

        devServer: {
            port: 3000,
            hot: true,
            open: true,
        },

        resolve: {
            extensions: [".ts", ".js"],
        },

        plugins: [
            new MiniCssExtractPlugin({
                filename: isDevelopment ? "[name].css" : "[name].[contenthash:8].css",
            }),
            new HtmlWebpackPlugin({
                template: "./public/index.html",
                minify: !isDevelopment,
            }),
        ],

        performance: {
            hints: false,
        },
    };
};
