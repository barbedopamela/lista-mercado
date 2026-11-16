export default function Configurar() {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <div className="card p-6">
        <h1 className="text-xl font-bold text-brand-600">Falta conectar o banco de dados</h1>
        <p className="mt-2 text-sm">
          O app ainda não encontrou as chaves do Supabase. Crie um arquivo{' '}
          <code className="rounded bg-teal-50 px-1">.env</code> (ou configure as variáveis no
          serviço de hospedagem) com:
        </p>
        <pre className="mt-3 overflow-x-auto rounded-2xl bg-brand-900 p-4 text-xs text-teal-100">
          {`VITE_SUPABASE_URL=...\nVITE_SUPABASE_ANON_KEY=...`}
        </pre>
        <p className="mt-3 text-sm">O passo a passo completo está no README do projeto.</p>
      </div>
    </div>
  )
}
