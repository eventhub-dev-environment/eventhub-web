import type { BarcodeDetector } from 'barcode-detector/ponyfill'

/**
 * Lector de QR basado en ZXing (WebAssembly). A diferencia del BarcodeDetector nativo,
 * funciona sin HTTPS y en cualquier navegador, y lee mejor las fotos tomadas a una pantalla.
 * Se carga solo al usarlo para no sumar el .wasm (~1 MB) al resto de la app.
 */
let detector: Promise<BarcodeDetector> | null = null

function loadDetector(): Promise<BarcodeDetector> {
  detector ??= Promise.all([
    import('barcode-detector/ponyfill'),
    // Vite copia el .wasm al build y lo sirve desde el mismo origen, sin depender de un CDN.
    import('zxing-wasm/reader/zxing_reader.wasm?url'),
  ]).then(([{ BarcodeDetector, prepareZXingModule }, { default: wasmUrl }]) => {
    prepareZXingModule({
      overrides: {
        locateFile: (path: string, prefix: string) => (path.endsWith('.wasm') ? wasmUrl : prefix + path),
      },
    })
    return new BarcodeDetector({ formats: ['qr_code'] })
  })
  detector.catch(() => {
    detector = null // permite reintentar si falló la descarga
  })
  return detector
}

/** Devuelve el texto del primer QR encontrado en la imagen, el video o la foto, o null. */
export async function readQr(source: ImageBitmapSource): Promise<string | null> {
  const reader = await loadDetector()
  const [code] = await reader.detect(source)
  return code?.rawValue ?? null
}
