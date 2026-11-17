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

export type CategoriaFinanca = {
  id: string
  nome: string
  emoji: string | null
  ordem: number
  tipo: 'entrada' | 'saida'
}

export type Lancamento = {
  id: string
  tipo: 'entrada' | 'saida'
  valor: number
  data: string
  descricao: string
  categoria_id: string | null
  conta_pessoal_de: string | null
  criado_por: string | null
  created_at: string
}

export type SaldoConjunta = {
  id: number
  valor: number
  data: string
  atualizado_por: string | null
  updated_at: string
}

export type ContaFixa = {
  id: string
  nome: string
  valor: number
  dia_vencimento: number
  categoria_id: string | null
  conta_pessoal_de: string | null // null = conta conjunta
  primeiro_mes: string // 'YYYY-MM-DD' (dia 1)
  parcelas: number | null // null = todo mês, sem fim
  ativa: boolean
  criado_por: string | null
  created_at: string
}

export type ContaMes = {
  id: string
  conta_id: string | null // null = conta avulsa
  mes: string // 'YYYY-MM-01'
  nome: string
  valor: number
  vencimento: string // 'YYYY-MM-DD'
  categoria_id: string | null
  conta_pessoal_de: string | null // null = conta conjunta
  parcela_n: number | null
  parcela_total: number | null
  ajustada: boolean
  pulada: boolean
  paga: boolean
  pago_em: string | null
  pago_por: string | null
  criado_por: string | null
  created_at: string
}
