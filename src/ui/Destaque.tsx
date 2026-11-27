import { partesDestacadas } from '../lib/texto'

/** Escreve o texto com o trecho que bateu na consulta dentro de <mark>, ignorando acento. */
export function Destaque({ texto, consulta }: { texto: string; consulta: string }) {
  return <>{partesDestacadas(texto, consulta).map((p, i) => (p.bate ? <mark key={i}>{p.texto}</mark> : <span key={i}>{p.texto}</span>))}</>
}
