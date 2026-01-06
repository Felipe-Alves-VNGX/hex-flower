import { defineConfig } from 'vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import path from 'path';

export default defineConfig({
    build: {
        outDir: 'dist',
        emptyOutDir: true,
        sourcemap: true,
        lib: {
            entry: 'src/module/index.ts',
            name: 'hex-flower-engine',
            fileName: 'hex-flower-engine',
            formats: ['es']
        },
        rollupOptions: {
            output: {
                assetFileNames: "assets/[name].[ext]",
            },
        },
    },
    plugins: [
        viteStaticCopy({
            targets: [
                {
                    src: 'static/*',
                    dest: '.'
                }
            ]
        })
    ]
});
