import { estadoFase2Vacio } from '../src/types.js';
import type {
  Cliente,
  ClientesRepo,
  EntregableFase2,
  FaseActual,
  NuevoClienteInput,
  NuevoSitioInput,
  Sitio,
  SitiosRepo,
} from '../src/types.js';

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

  return {
    async crear(input: NuevoSitioInput) {
      const sitio: Sitio = { id: idFalso('sitio'), faseActual: 'encuadre', ...input };
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
  };
}
