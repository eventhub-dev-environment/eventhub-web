import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { bookingsApi } from '@/api/bookings'
import { Icon } from '@/components/Icon'
import { Spinner } from '@/components/ui'
import { readQr } from '@/lib/qrReader'
import type { Ticket, TicketStatus } from '@/types/booking'

const TICKET_STATUS: Record<TicketStatus, string> = {
  ISSUED: 'Emitida',
  USED: 'Usada',
  CANCELLED: 'Cancelada',
}

/** El QR del correo trae una URL con ticketId y qrCodeHash. */
function codesFromQr(raw: string): { ticketId: string; qrCodeHash: string } | null {
  try {
    const url = new URL(raw.trim())
    const ticketId = url.searchParams.get('ticketId')?.trim()
    const qrCodeHash = url.searchParams.get('qrCodeHash')?.trim()
    if (ticketId && qrCodeHash) return { ticketId, qrCodeHash }
  } catch {
    /* el texto leído no es una URL */
  }
  return null
}

function rejection(message: string): string {
  const text = message.toLowerCase()
  if (text.includes('utilizado') || text.includes('usada')) return 'Entrada ya usada'
  if (text.includes('cancel')) return 'Entrada cancelada'
  return 'Entrada no válida'
}

/** Brave y Safari no exponen la cámara en vivo en http:// de la red local. */
function canUseLiveCamera(): boolean {
  return window.isSecureContext && !!navigator.mediaDevices?.getUserMedia
}

export function CheckInPage() {
  const [ticketId, setTicketId] = useState('')
  const [qrCodeHash, setQrCodeHash] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [confirm, setConfirm] = useState(false)
  const [result, setResult] = useState<Ticket | null>(null)
  const [scanning, setScanning] = useState(false)
  const [scanError, setScanError] = useState('')
  const liveCamera = canUseLiveCamera()
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const stopScan = useRef<() => void>(() => {})
  const validate = useMutation({
    mutationFn: () => bookingsApi.validateTicket(ticketId.trim(), qrCodeHash.trim()),
  })

  useEffect(() => () => stopScan.current(), [])

  useEffect(() => {
    const video = videoRef.current
    const stream = streamRef.current
    if (!scanning || !video || !stream) return
    video.srcObject = stream
    void video.play()
    let frame = 0
    let active = true
    let busy = false
    const stop = () => {
      active = false
      cancelAnimationFrame(frame)
      stream.getTracks().forEach((track) => track.stop())
      streamRef.current = null
      video.srcObject = null
      setScanning(false)
    }
    stopScan.current = stop
    // La lectura es asíncrona: no se lanza otra mientras la anterior sigue en curso.
    const tick = () => {
      frame = requestAnimationFrame(tick)
      if (busy || video.readyState < 2) return
      busy = true
      readQr(video)
        .then((raw) => {
          if (!raw || !active) return
          stop()
          applyCode(raw)
        })
        .catch(() => {
          if (!active) return
          stop()
          setScanError('No se pudo iniciar el lector de QR. Revisa tu conexión e inténtalo de nuevo.')
        })
        .finally(() => {
          busy = false
        })
    }
    tick()
    return () => {
      active = false
      cancelAnimationFrame(frame)
    }
  }, [scanning])

  const applyCode = (raw: string) => {
    const parsed = codesFromQr(raw)
    if (!parsed) {
      setScanError('Ese QR no es una entrada de EventHub.')
      return
    }
    setTicketId(parsed.ticketId)
    setQrCodeHash(parsed.qrCodeHash)
    setErrors({})
    setResult(null)
    setScanError('')
    validate.reset()
  }

  const onPhoto = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (file) void readImage(file)
  }

  const readImage = async (file: File) => {
    setScanError('')
    try {
      const raw = await readQr(file)
      if (!raw) {
        setScanError('No se encontró un QR en la foto. Acerca el código y toma otra.')
        return
      }
      applyCode(raw)
    } catch {
      setScanError('No se pudo leer esa foto. Toma otra con el QR bien enfocado.')
    }
  }

  const startCamera = async () => {
    setScanError('')
    try {
      stopScan.current()
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: 'environment' } },
      })
      streamRef.current = stream
      setScanning(true)
    } catch {
      setScanning(false)
      setScanError('No se pudo abrir la cámara. Revisa el permiso del navegador o usa Tomar foto.')
    }
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const next: Record<string, string> = {}
    if (!ticketId.trim()) next.ticketId = 'El identificador de la entrada es obligatorio'
    if (!qrCodeHash.trim()) next.qrCodeHash = 'El código de la entrada es obligatorio'
    setErrors(next)
    setResult(null)
    if (Object.keys(next).length === 0) setConfirm(true)
  }

  const accept = async () => {
    try {
      const ticket = await validate.mutateAsync()
      setResult(ticket)
      setConfirm(false)
      setTicketId('')
      setQrCodeHash('')
    } catch {
      setConfirm(false)
    }
  }

  const failure = validate.error instanceof Error ? validate.error.message : ''

  return (
    <>
      <header className="admin-head">
        <div className="admin-title">
          <span className="mark"><Icon name="ticket" size={22} /></span>
          <div>
            <p className="eyebrow">Staff</p>
            <h1>Check-in</h1>
            <p className="lede">Marca una entrada como usada. Esta acción no se puede deshacer.</p>
          </div>
        </div>
      </header>

      <div className="roles-layout">
        <form className="panel" onSubmit={submit}>
          <Link to="/staff" className="text-link">Volver al listado</Link>
          <div className="check-actions">
            {liveCamera && !scanning && <button type="button" className="btn" onClick={() => { void startCamera() }}>Escanear QR</button>}
            {liveCamera && scanning && <button type="button" className="btn ghost" onClick={() => stopScan.current()}>Cerrar cámara</button>}
            {!liveCamera && (
              <label className="btn">
                Escanear QR
                <input className="check-capture" type="file" accept="image/*" capture="environment" onChange={onPhoto} />
              </label>
            )}
            <label className="btn ghost">
              Tomar foto
              <input className="check-capture" type="file" accept="image/*" capture="environment" onChange={onPhoto} />
            </label>
          </div>
          {!liveCamera && <p className="hint"></p>}
          {scanning && (
            <div className="check-scan">
              <video ref={videoRef} muted playsInline autoPlay />
            </div>
          )}
          {scanError && <p className="note check-result is-bad" role="alert">{scanError}</p>}
          <label className="plain-field">
            <span>Identificador de la entrada</span>
            <input className="mono" value={ticketId} spellCheck={false} autoComplete="off" aria-invalid={!!errors.ticketId} onChange={(event) => setTicketId(event.target.value)} />
          </label>
          {errors.ticketId && <p className="field-error">{errors.ticketId}</p>}
          <label className="plain-field">
            <span>Código del QR</span>
            <input className="mono" value={qrCodeHash} spellCheck={false} autoComplete="off" aria-invalid={!!errors.qrCodeHash} onChange={(event) => setQrCodeHash(event.target.value)} />
          </label>
          {errors.qrCodeHash && <p className="field-error">{errors.qrCodeHash}</p>}
          
          {result && (
            <p className="note check-result" role="status">
              <strong>Acceso concedido.</strong>
              <span>La entrada quedó {TICKET_STATUS[result.status].toLowerCase()}.</span>
            </p>
          )}
          {failure && (
            <div className="error" role="alert">
              <strong>{rejection(failure)}</strong>
              <div>{failure}</div>
            </div>
          )}
          <button className="btn" disabled={validate.isPending}>
            {validate.isPending && <Spinner />}
            Validar entrada
          </button>
        </form>
      </div>

      {confirm && createPortal(
        <div className="confirm-backdrop" onClick={() => { if (!validate.isPending) setConfirm(false) }}>
          <div className="confirm" role="alertdialog" aria-modal="true" aria-labelledby="checkin-title" onClick={(event) => event.stopPropagation()}>
            <h2 id="checkin-title">Validar entrada</h2>
            <p>¿Seguro que quieres marcar esta entrada como usada? No se puede revertir.</p>
            <div className="confirm-actions">
              <button type="button" className="btn ghost" disabled={validate.isPending} onClick={() => setConfirm(false)}>Cancelar</button>
              <button type="button" className="btn" disabled={validate.isPending} onClick={() => { void accept() }}>
                {validate.isPending && <Spinner />}
                Validar
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}
