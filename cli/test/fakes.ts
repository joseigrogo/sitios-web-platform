import { contenidoFase2Vacio, estadoFase2Vacio } from '../src/types.js';
import type {
  Cliente,
  ClientesRepo,
  ConstruccionEstado,
  EntregableFase2,
  EstadoContenidoFase2,
  FaseActual,
  NuevoClienteInput,
  NuevoSitioInput,
  Sitio,
  SitiosRepo,
} from '../src/types.js';
import type { ChecklistFase3Resultado } from '../src/lib/checklistFase3.js';

let contador = 0;
function idFalso(prefijo: string): string {
  contador += 1;
  return `${prefijo}-${contador}`;
}

export function crearClientesRepoFalso(iniciales: Cliente[] = []): ClientesRepo {
  const clientes = [...iniciales];
  return {
    async buscarPorSlug(slug) {
      return clientes.find((c) => c.slug === slug) ?? null;
    },
    async buscarPorNombreSimilar(nombre) {
      const objetivo = nombre.toLowerCase();
      return clientes.filter((c) => c.nombre.toLowerCase().includes(objetivo));
    },
    async crear(input: NuevoClienteInput) {
      const cliente: Cliente = { id: idFalso('cliente'), ...input };
      clientes.push(cliente);
      return cliente;
    },
  };
}

export function crearSitiosRepoFalso(iniciales: Sitio[] = []): SitiosRepo {
  const sitios = [...iniciales];
  const gatesFase2 = new Map<string, ReturnType<typeof estadoFase2Vacio>>();
  const contenidoFase2 = new Map<string, EstadoContenidoFase2>();

  return {
    async crear(input: NuevoSitioInput) {
      const sitio: Sitio = {
        id: idFalso('sitio'),
        faseActual: 'encuadre',
        referenciaUrl: null,
        repoGithub: null,
        construccionEstado: null,
        construccionReporte: null,
        checklistFase3Url: null,
        checklistFase3Resultado: null,
        ...input,
      };
      sitios.push(sitio);
      return sitio;
    },
    async obtenerPorId(id) {
      return sitios.find((s) => s.id === id) ?? null;
    },
    async actualizarFaseActual(id: string, fase: FaseActual) {
      const sitio = sitios.find((s) => s.id === id);
      if (sitio) sitio.faseActual = fase;
    },
    async actualizarReferenciaUrl(id: string, url: string) {
      const sitio = sitios.find((s) => s.id === id);
      if (sitio) sitio.referenciaUrl = url;
    },
    async actualizarEstadoConstruccion(id: string, estado: ConstruccionEstado) {
      const sitio = sitios.find((s) => s.id === id);
      if (sitio) sitio.construccionEstado = estado;
    },
    async finalizarConstruccion(id: string, reporte: string, repoGithub: string) {
      const sitio = sitios.find((s) => s.id === id);
      if (sitio) {
        sitio.construccionEstado = 'terminada';
        sitio.construccionReporte = reporte;
        sitio.repoGithub = repoGithub;
      }
    },
    async guardarResultadoChecklistFase3(id: string, url: string, resultado: ChecklistFase3Resultado) {
      const sitio = sitios.find((s) => s.id === id);
      if (sitio) {
        sitio.checklistFase3Url = url;
        sitio.checklistFase3Resultado = resultado;
      }
    },
    async listarPorCliente(clienteId: string) {
      return sitios.filter((s) => s.clienteId === clienteId);
    },
    async obtenerEstadoEntregablesFase2(sitioId: string) {
      return { ...(gatesFase2.get(sitioId) ?? estadoFase2Vacio()) };
    },
    async marcarEntregableFase2(sitioId: string, entregable: EntregableFase2) {
      const actual = gatesFase2.get(sitioId) ?? estadoFase2Vacio();
      actual[entregable] = true;
      gatesFase2.set(sitioId, actual);
    },
    async obtenerContenidoFase2(sitioId: string) {
      return { ...(contenidoFase2.get(sitioId) ?? contenidoFase2Vacio()) };
    },
    async guardarContenidoFase2(sitioId: string, entregable: EntregableFase2, contenido: string) {
      const actual = contenidoFase2.get(sitioId) ?? contenidoFase2Vacio();
      actual[entregable] = contenido;
      contenidoFase2.set(sitioId, actual);
    },
  };
}
