import type { Sitio, SitiosRepo } from '../types.js';

// Vive en lib/, no en commands/sitioGateFase0.ts -- mismo motivo que
// clienteAlta.ts y gateFase2.ts (ese archivo importa 'commander').

export interface GateFase0Resultado {
  sitio: Sitio;
  camposFaltantes: string[];
  pasaGate: boolean;
  flipeado: boolean;
}

export async function ejecutarGateFase0(
  sitioId: string,
  confirmar: boolean,
  repos: { sitios: SitiosRepo }
): Promise<GateFase0Resultado> {
  const sitio = await repos.sitios.obtenerPorId(sitioId);
  if (!sitio) {
    throw new Error(`No existe un sitio con id ${sitioId}`);
  }

  const camposFaltantes: string[] = [];
  if (!sitio.nombreMarca?.trim()) camposFaltantes.push('nombre_marca');
  if (!sitio.arquetipo?.trim()) camposFaltantes.push('arquetipo');
  if (!sitio.segmento?.trim()) camposFaltantes.push('segmento');

  const pasaGate = camposFaltantes.length === 0;
  let flipeado = false;

  if (pasaGate && confirmar && sitio.faseActual === 'encuadre') {
    await repos.sitios.actualizarFaseActual(sitioId, 'investigacion');
    flipeado = true;
  }

  return { sitio, camposFaltantes, pasaGate, flipeado };
}
