import { useMutation } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { authApi } from '@/api/auth'
import { Spinner } from '@/components/ui'
import { ApiError } from '@/lib/http'
import { useAuthStore } from '@/store/auth'
import type { AuthResponse } from '@/types/auth'

function useAuthSubmit(call: () => Promise<AuthResponse>) {
  const setSession = useAuthStore((s) => s.setSession)
  const navigate = useNavigate()
  const from = (useLocation().state as { from?: string } | null)?.from ?? '/'
  return useMutation({ mutationFn: call, onSuccess: (a) => { setSession(a); navigate(from, { replace: true }) } })
}

function ErrorBox({ error }: { error: unknown }) {
  if (!(error instanceof ApiError)) return null
  return (
    <div className="error" role="alert">
      {error.message}
      {error.fieldErrors && <ul>{Object.entries(error.fieldErrors).map(([f, m]) => <li key={f}>{f}: {m}</li>)}</ul>}
    </div>
  )
}

function Field({ label, ...p }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return <div className="field"><input placeholder=" " {...p} /><label>{label}</label></div>
}

function AuthShell({ children, art }: { children: React.ReactNode; art: [string, string] }) {
  return (
    <div className="auth">
      <aside className="auth-art"><h2>{art[0]}</h2><p>{art[1]}</p></aside>
      {children}
    </div>
  )
}

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const m = useAuthSubmit(() => authApi.login({ email, password }))
  const submit = (e: FormEvent) => { e.preventDefault(); m.mutate() }
  return (
    <AuthShell art={['Tu próximo plan empieza aquí.', 'Reserva entradas, paga seguro y lleva tu QR en el celular.']}>
      <form onSubmit={submit}>
        <h1>Bienvenido de vuelta</h1>
        <p>Ingresa para ver tus reservas y comprar entradas.</p>
        <Field label="Correo" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <Field label="Contraseña" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <ErrorBox error={m.error} />
        <button className="btn" disabled={m.isPending}>{m.isPending && <Spinner />}Ingresar</button>
        <p>¿Aún no tienes cuenta? <Link to="/register">Crear cuenta</Link></p>
      </form>
    </AuthShell>
  )
}

export function RegisterPage() {
  const [f, setF] = useState({ firstName: '', lastName: '', email: '', password: '' })
  const m = useAuthSubmit(() => authApi.register(f))
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value })
  const submit = (e: FormEvent) => { e.preventDefault(); m.mutate() }
  return (
    <AuthShell art={['Organiza o asiste. Todo en un solo lugar.', 'Crea tu cuenta en menos de un minuto.']}>
      <form onSubmit={submit}>
        <h1>Crea tu cuenta</h1>
        <Field label="Nombre" value={f.firstName} onChange={set('firstName')} required />
        <Field label="Apellido" value={f.lastName} onChange={set('lastName')} required />
        <Field label="Correo" type="email" value={f.email} onChange={set('email')} required />
        <Field label="Contraseña (mínimo 6)" type="password" minLength={6} value={f.password} onChange={set('password')} required />
        <ErrorBox error={m.error} />
        <button className="btn" disabled={m.isPending}>{m.isPending && <Spinner />}Crear cuenta</button>
        <p>¿Ya tienes cuenta? <Link to="/login">Ingresar</Link></p>
      </form>
    </AuthShell>
  )
}
