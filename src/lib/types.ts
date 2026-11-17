export type Perfil = {
  id: string
  nome: string
  avatar_url: string | null
  email: string | null
}

export type Categoria = {
  id: string
  nome: string
  emoji: string | null
  ordem: number
}

export type Forma = {
  id: string
  nome: string
  ordem: number
}

export type Status = 'planejando' | 'no_mercado' | 'finalizada'

export type Compra = {
  id: string
  nome: string
  data: string // 'YYYY-MM-DD'
  mercado: string | null
  orcamento: number
  status: Status
  criado_por: string | null
  created_at: string
}

export type Item = {
  id: string
  compra_id: string
  nome: string
  categoria_id: string | null
  quantidade: number
  preco: number // preço de 1 unidade
  no_carrinho: boolean
  adicionado_por: string | null
  created_at: string
}

export type Pagamento = {
  id: string
  compra_id: string
  forma_id: string | null
  valor: number
  created_at: string
}

export type OrcamentoMes = {
  mes: string // 'YYYY-MM-01'
  valor: number
}

export const NOME_STATUS: Record<Status, string> = {
  planejando: 'Planejando',
  no_mercado: 'No mercado',
  finalizada: 'Finalizada',
}

export type CategoriaResolver = {
  id: string
  nome: string
  emoji: string | null
  ordem: number
}

export type StatusPendencia = 'pendente' | 'feita'

export type Pendencia = {
  id: string
  titulo: string
  descricao: string | null
  categoria_id: string | null
  responsavel_id: string | null
  para_ambos: boolean
  prazo: string | null // 'YYYY-MM-DD'
  status: StatusPendencia
  concluida_em: string | null
  concluida_por: string | null
  criado_por: string | null
  created_at: string
}

export type Anexo = {
  id: string
  origem: string
  origem_id: string
  caminho: string
  nome: string
  tipo: string | null
  tamanho: number | null
  enviado_por: string | null
  created_at: string
}
