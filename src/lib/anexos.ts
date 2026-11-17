/** Deixa o nome do arquivo seguro para usar como caminho no Storage. */
export function nomeSeguro(nome: string): string {
  return (
    nome
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-zA-Z0-9._-]+/g, '-')
      .replace(/-+/g, '-')
      .slice(-80) || 'arquivo'
  )
}

export function tamanhoLegivel(bytes: number | null): string {
  if (!bytes) return ''
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`
}

/**
 * Fotos de celular são grandes (vários MB). Antes de enviar, reduzimos para no
 * máximo 1800 px e convertemos para JPEG: continua legível (dá para ler um
 * comprovante) e o espaço gratuito do Supabase dura muito mais.
 * PDFs e qualquer coisa que falhe na conversão vão como estão.
 */
export async function prepararArquivo(
  arquivo: File,
): Promise<{ blob: Blob; tipo: string; nome: string }> {
  const original = { blob: arquivo as Blob, tipo: arquivo.type || 'application/octet-stream', nome: arquivo.name }
  if (!arquivo.type.startsWith('image/') || arquivo.type === 'image/gif') return original

  try {
    const bmp = await createImageBitmap(arquivo)
    const escala = Math.min(1, 1800 / Math.max(bmp.width, bmp.height))
    const largura = Math.round(bmp.width * escala)
    const altura = Math.round(bmp.height * escala)

    const canvas = document.createElement('canvas')
    canvas.width = largura
    canvas.height = altura
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('sem canvas')
    ctx.drawImage(bmp, 0, 0, largura, altura)
    bmp.close()

    const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, 'image/jpeg', 0.82))
    if (!blob) throw new Error('falha ao converter')
    // só vale a pena se realmente ficou menor
    if (blob.size >= arquivo.size && arquivo.type === 'image/jpeg') return original
    return { blob, tipo: 'image/jpeg', nome: arquivo.name.replace(/\.[^.]+$/, '') + '.jpg' }
  } catch {
    return original
  }
}
