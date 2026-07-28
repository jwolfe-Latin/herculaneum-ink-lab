const BASE_PATH = import.meta.env.BASE_URL

/** Resolves files from public/ beneath Vite's configured deployment base. */
export function publicAssetUrl(path: string) {
  const encodedPath = path
    .replace(/^\/+/, '')
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/')

  return `${BASE_PATH}${encodedPath}`
}
