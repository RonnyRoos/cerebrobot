type TiktokenEncoder = {
  encode: (text: string) => number[];
};

type TiktokenModule = {
  encodingForModel: (model: string) => TiktokenEncoder;
  getEncoding: (name: string) => TiktokenEncoder;
};

const tokenizerModuleCache = {
  promise: null as Promise<TiktokenModule | null> | null,
};

const TOKENIZER_CACHE = new Map<string, TiktokenEncoder | null>();
const FALLBACK_ENCODING = 'cl100k_base';

async function ensureTiktokenModule(): Promise<TiktokenModule | null> {
  if (tokenizerModuleCache.promise) {
    return tokenizerModuleCache.promise;
  }

  tokenizerModuleCache.promise = (async () => {
    try {
      const mod = await import(/* @vite-ignore */ 'js-tiktoken');
      return {
        encodingForModel: (model: string) => mod.encodingForModel(model as never),
        getEncoding: (name: string) => mod.getEncoding(name as never),
      } as TiktokenModule;
    } catch {
      // js-tiktoken is optional dependency - fall back to heuristic estimation
      // This is expected in some environments and not an error condition
      return null;
    }
  })();

  return tokenizerModuleCache.promise;
}

async function getTokenizer(model: string): Promise<TiktokenEncoder | null> {
  if (TOKENIZER_CACHE.has(model)) {
    return TOKENIZER_CACHE.get(model) ?? null;
  }

  const module = await ensureTiktokenModule();
  if (!module) {
    TOKENIZER_CACHE.set(model, null);
    return null;
  }

  let tokenizer: TiktokenEncoder;
  try {
    tokenizer = module.encodingForModel(model);
  } catch (error) {
    tokenizer = module.getEncoding(FALLBACK_ENCODING);
  }

  TOKENIZER_CACHE.set(model, tokenizer);
  return tokenizer;
}

export { ensureTiktokenModule, getTokenizer };
export type { TiktokenEncoder, TiktokenModule };
