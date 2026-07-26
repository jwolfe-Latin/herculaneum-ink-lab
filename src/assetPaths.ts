const BASE_PATH = import.meta.env.BASE_URL

/** Resolves files from public/ beneath Vite's configured deployment base. */
export function publicAssetUrl(path: string) {
  return `${BASE_PATH}${path.replace(/^\/+/, '')}`
}
