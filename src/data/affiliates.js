// A resolução de afiliadas públicas acontece no backend futuramente; as páginas de produto
// recebem os dados pela rota dinâmica. Este arquivo permanece apenas para compatibilidade.
export const AFFILIATES = {}
export function getAffiliateBySlug(slug) {
  if (!slug) return null
  return { id: null, slug: String(slug).toLowerCase(), name: String(slug), active: true, commissionRate: 0.10 }
}
