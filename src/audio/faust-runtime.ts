import { instantiateFaustModuleFromFile, LibFaust, FaustCompiler } from '@grame/faustwasm';
import faustJsUrl from '@grame/faustwasm/libfaust-wasm/libfaust-wasm.js?url';
import faustWasmUrl from '@grame/faustwasm/libfaust-wasm/libfaust-wasm.wasm?url';
import faustDataUrl from '@grame/faustwasm/libfaust-wasm/libfaust-wasm.data?url';

/**
 * Lazy singleton FaustCompiler. The libfaust WASM is ~3MB so we set it
 * up exactly once per session and reuse it across every instrument's
 * .dsp compile.
 *
 * Faust assets are imported via `?url` so Vite emits them as static
 * assets (hashed in production, served verbatim in dev) and gives us
 * runtime URLs to pass into instantiateFaustModuleFromFile.
 */
let compilerPromise: Promise<FaustCompiler> | null = null;

export function getFaustCompiler(): Promise<FaustCompiler> {
  if (!compilerPromise) {
    compilerPromise = (async () => {
      const faustModule = await instantiateFaustModuleFromFile(
        faustJsUrl,
        faustDataUrl,
        faustWasmUrl
      );
      const libFaust = new LibFaust(faustModule);
      return new FaustCompiler(libFaust);
    })();
  }
  return compilerPromise;
}
