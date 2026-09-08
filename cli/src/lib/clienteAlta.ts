import type { Cliente, ClientesRepo, Modelo, Sitio, SitiosRepo } from '../types.js';

// Vive en lib/, no en commands/clienteAlta.ts: ese archivo importa
// 'commander' para el wiring del CLI, que no existe en dashboard/node_modules
// -- mismo gotcha ya encontrado con gateFase2.ts (CONTEXT.md §10/12).
//
// ValidationError local, no importada de ./errors.js: Turbopack tampoco
// resuelve un import de VALOR entre dos archivos hermanos de lib/ (mismo
// gotcha, otra variante) -- errors.ts reconoce este error por duck-typing
// (name + errores), no por instanceof, así que una clase local funciona
// igual de bien del lado del CLI real.
class ValidationError extends Error {
  errores: string[];
  constructor(errores: string[]) {
    super(errores.join('; '));
    this.name = 'ValidationError';
    this.errores = errores;
  }
}

export interface ClienteAltaInputCrudo {
  cliente: {
    nombre?: string;
    slug: string;
    vertical?: string;
    modelo?: string;
    marcaOculta: boolean;
    crossLinkingExcepcion: boolean;
    respaldoLegalTipo?: string;
  };
  sitio: {
    nombreMarca: string;
    arquetipo: string;
    segmento: string;
    dominio: string | null;
  };
}

export interface ClienteAltaResultado {
  cliente: Cliente;
  clienteYaExistia: boolean;
  sitio: Sitio;
  advertenciaNombreSimilar?: string;
}

function validarSitio(sitio: ClienteAltaInputCrudo['sitio']): string[] {
  const errores: string[] = [];
  if (!sitio.nombreMarca?.trim()) errores.push('sitio.nombreMarca es obligatorio');
  if (!sitio.arquetipo?.trim()) errores.push('sitio.arquetipo es obligatorio');
  if (!sitio.segmento?.trim()) errores.push('sitio.segmento es obligatorio (con evidencia real, nunca inventado)');
  return errores;
}

function validarClienteNuevo(cliente: ClienteAltaInputCrudo['cliente']): string[] {
  const errores: string[] = [];
  if (!cliente.nombre?.trim()) errores.push('cliente.nombre es obligatorio para un cliente nuevo');
  if (!cliente.vertical?.trim()) errores.push('cliente.vertical es obligatorio para un cliente nuevo');
  if (cliente.modelo !== 'red' && cliente.modelo !== 'unico') {
    errores.push("cliente.modelo debe ser 'red' o 'unico' para un cliente nuevo");
  }
  if (!cliente.respaldoLegalTipo?.trim()) {
    errores.push(
      'cliente.respaldoLegalTipo es obligatorio para un cliente nuevo — usar algo como ' +
        '"Ninguno — confirmado sin X vigente" si no aplica; un valor vacío no distingue ' +
        '"no se preguntó" de "se preguntó y no hay"'
    );
  }
  return errores;
}

// Lo que se puede verificar sin consultar la base — se corre antes de abrir
// conexión, para que un flag faltante no se reporte como un error de conexión.
export function validarSinConexion(input: ClienteAltaInputCrudo): void {
  const errores: string[] = [];
  if (!input.cliente.slug?.trim()) {
    errores.push('cliente.slug es obligatorio (se usa para detectar si el cliente ya existe)');
  }
  errores.push(...validarSitio(input.sitio));
  if (errores.length > 0) throw new ValidationError(errores);
}

export async function ejecutarClienteAlta(
  input: ClienteAltaInputCrudo,
  repos: { clientes: ClientesRepo; sitios: SitiosRepo }
): Promise<ClienteAltaResultado> {
  validarSinConexion(input);

  const existente = await repos.clientes.buscarPorSlug(input.cliente.slug);

  let cliente: Cliente;
  let clienteYaExistia: boolean;
  let advertenciaNombreSimilar: string | undefined;

  if (existente) {
    cliente = existente;
    clienteYaExistia = true;
  } else {
    const erroresCliente = validarClienteNuevo(input.cliente);
    if (erroresCliente.length > 0) throw new ValidationError(erroresCliente);

    if (input.cliente.nombre) {
      const similares = await repos.clientes.buscarPorNombreSimilar(input.cliente.nombre);
      const distintos = similares.filter((c) => c.slug !== input.cliente.slug);
      if (distintos.length > 0) {
        advertenciaNombreSimilar =
          'Existen clientes con nombre similar pero slug distinto — verificar que no sea el mismo ' +
          `negocio con otro slug antes de continuar: ${distintos
            .map((c) => `"${c.nombre}" (slug: ${c.slug})`)
            .join(', ')}`;
      }
    }

    cliente = await repos.clientes.crear({
      nombre: input.cliente.nombre!,
      slug: input.cliente.slug,
      vertical: input.cliente.vertical!,
      modelo: input.cliente.modelo as Modelo,
      reglaMarcaOculta: input.cliente.marcaOculta,
      reglaNoCrossLinking: !input.cliente.crossLinkingExcepcion,
      respaldoLegalTipo: input.cliente.respaldoLegalTipo!,
    });
    clienteYaExistia = false;
  }

  const sitio = await repos.sitios.crear({
    clienteId: cliente.id,
    nombreMarca: input.sitio.nombreMarca,
    arquetipo: input.sitio.arquetipo,
    segmento: input.sitio.segmento,
    dominio: input.sitio.dominio,
  });

  return { cliente, clienteYaExistia, sitio, advertenciaNombreSimilar };
}
