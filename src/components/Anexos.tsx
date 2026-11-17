import { useEffect, useRef, useState } from 'react'
import { useTabela } from '../hooks/useTabela'
import { exec, meuId, supabase } from '../lib/supabase'
import { nomeSeguro, prepararArquivo, tamanhoLegivel } from '../lib/anexos'
import type { Anexo } from '../lib/types'

const BUCKET = 'anexos'

/**
 * Anexos (fotos e PDFs) de qualquer registro: pendência, conta da casa, etc.
 * `origem` diz de que tipo de registro é e `origemId` qual registro.
 * Os arquivos ficam num bucket privado; para mostrar, geramos links
 * temporários (válidos por 1 hora) que só funcionam para quem está logado.
 */
export default function Anexos({ origem, origemId }: { origem: string; origemId: string }) {
  const { dados, recarregar } = useTabela<Anexo>('anexos', {
    coluna: 'origem_id',
    valor: origemId,
    ordem: 'created_at',
  })
  const [links, setLinks] = useState<Record<string, string>>({})
  const [enviando, setEnviando] = useState(false)
  const campo = useRef<HTMLInputElement>(null)

  const chave = dados.map((a) => a.id).join(',')
  useEffect(() => {
    let vivo = true
    async function gerar() {
      if (dados.length === 0) {
        setLinks({})
        return
      }
      const { data } = await supabase.storage
        .from(BUCKET)
        .createSignedUrls(
          dados.map((a) => a.caminho),
          3600,
        )
      if (!vivo || !data) return
      const mapa: Record<string, string> = {}
      for (const r of data) if (r.path && r.signedUrl) mapa[r.path] = r.signedUrl
      setLinks(mapa)
    }
    void gerar()
    return () => {
      vivo = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chave])

  async function enviar(lista: FileList | null) {
    if (!lista || lista.length === 0) return
    setEnviando(true)
    const autor = await meuId()
    for (const arquivo of Array.from(lista)) {
      const { blob, tipo, nome } = await prepararArquivo(arquivo)
      const caminho = `${origem}/${origemId}/${crypto.randomUUID()}-${nomeSeguro(nome)}`
      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(caminho, blob, { contentType: tipo, upsert: false })
      if (error) {
        alert(`Não foi possível enviar “${arquivo.name}”: ${error.message}`)
        continue
      }
      await exec(
        supabase.from('anexos').insert({
          origem,
          origem_id: origemId,
          caminho,
          nome,
          tipo,
          tamanho: blob.size,
          enviado_por: autor,
        }),
      )
    }
    setEnviando(false)
    if (campo.current) campo.current.value = ''
    void recarregar()
  }

  async function remover(a: Anexo) {
    if (!window.confirm(`Apagar o anexo “${a.nome}”?`)) return
    await supabase.storage.from(BUCKET).remove([a.caminho])
    if (await exec(supabase.from('anexos').delete().eq('id', a.id))) void recarregar()
  }

  const ehImagem = (a: Anexo) => (a.tipo ?? '').startsWith('image/')

  return (
    <section className="card space-y-3 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-brand-600">
          Anexos{dados.length > 0 ? ` (${dados.length})` : ''}
        </h2>
        <button
          type="button"
          className="btn-soft px-4 py-2"
          disabled={enviando}
          onClick={() => campo.current?.click()}
        >
          {enviando ? 'Enviando…' : '+ Anexar'}
        </button>
        <input
          ref={campo}
          type="file"
          multiple
          accept="image/*,application/pdf"
          className="hidden"
          onChange={(e) => void enviar(e.target.files)}
        />
      </div>

      {dados.length === 0 ? (
        <p className="text-sm text-brand-500">
          Nenhum arquivo ainda. Toque em “Anexar” para escolher uma foto, tirar uma foto na hora ou
          enviar um PDF (até 10 MB).
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-3">
          {dados.map((a) => (
            <li key={a.id} className="relative overflow-hidden rounded-2xl border border-brand-100">
              <a
                href={links[a.caminho]}
                target="_blank"
                rel="noreferrer"
                className="block"
                aria-label={`Abrir ${a.nome}`}
              >
                {ehImagem(a) && links[a.caminho] ? (
                  <img
                    src={links[a.caminho]}
                    alt={a.nome}
                    loading="lazy"
                    className="h-28 w-full bg-teal-50 object-cover"
                  />
                ) : (
                  <div className="flex h-28 w-full items-center justify-center bg-teal-50 text-4xl">
                    {ehImagem(a) ? '🖼️' : '📄'}
                  </div>
                )}
                <div className="px-3 py-2">
                  <p className="truncate text-xs font-semibold">{a.nome}</p>
                  <p className="text-[11px] text-brand-500">{tamanhoLegivel(a.tamanho)}</p>
                </div>
              </a>
              <button
                type="button"
                onClick={() => void remover(a)}
                className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-xs text-brand-600 shadow-soft"
                aria-label={`Apagar ${a.nome}`}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
