#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Command } from 'commander';
import { registrarComandoClienteAlta } from './commands/clienteAlta.js';
import { registrarComandoGuardarReporte } from './commands/investigacionGuardarReporte.js';
import { registrarComandoSitioGateFase0 } from './commands/sitioGateFase0.js';

// Resuelto contra la ubicación del módulo, no contra cwd, para que cargue
// cli/.env sin importar desde dónde se invoque el comando (dev vía tsx desde
// src/, build vía node desde dist/, o `cli` global después de npm link).
const rutaEnv = fileURLToPath(new URL('../.env', import.meta.url));
if (existsSync(rutaEnv)) {
  process.loadEnvFile(rutaEnv);
}

const program = new Command();
program.name('cli').description('CLI determinista de la plataforma de sitios (Base 4/8 de BASES_DEL_SISTEMA.md).');

const cliente = program.command('cliente').description('Comandos sobre clientes');
registrarComandoClienteAlta(cliente);

const sitio = program.command('sitio').description('Comandos sobre sitios');
registrarComandoSitioGateFase0(sitio);

const investigacion = program.command('investigacion').description('Comandos de Fase 1 (investigación)');
registrarComandoGuardarReporte(investigacion);

await program.parseAsync(process.argv);
