import { defineConfig } from 'vite';
import obfuscatorPkg from 'javascript-obfuscator';

function obfuscateBuild() {
  return {
    name: 'obfuscate-build',
    apply: 'build',
    enforce: 'post',
    renderChunk(code, chunk) {
      // Dependencies are emitted separately and remain readable for stability.
      if (chunk.moduleIds.length === 0 || chunk.moduleIds.some(isDependencyModule)) {
        return null;
      }

      const result = obfuscatorPkg.obfuscate(code, {
        compact: true,
        identifierNamesGenerator: 'hexadecimal',
        renameGlobals: false,
        controlFlowFlattening: false,
        deadCodeInjection: false,
        stringArray: true,
        stringArrayThreshold: 0.4,
        selfDefending: false,
        debugProtection: false,
        disableConsoleOutput: false,
        sourceType: 'module'
      });
      return { code: result.getObfuscatedCode(), map: null };
    }
  };
}

function isDependencyModule(id) {
  return id.includes('/node_modules/') || id.includes('\\node_modules\\');
}

export default defineConfig(({ mode }) => ({
  base: '/',
  server: {
    proxy: {
      '/api': {
        target: process.env.AISENLENS_API_URL ?? 'http://127.0.0.1:3000',
        changeOrigin: true
      }
    }
  },
  build: {
    emptyOutDir: true,
    minify: 'esbuild',
    cssMinify: true,
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          return isDependencyModule(id) ? 'vendor' : undefined;
        }
      }
    }
  },
  plugins: mode === 'production' ? [obfuscateBuild()] : []
}));
