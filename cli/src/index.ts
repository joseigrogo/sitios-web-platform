#!/usr/bin/env node
import { Command } from 'commander';
import { registrarComandoClienteAlta } from './commands/clienteAlta.js';
import { registrarComandoSitioGateFase0 } from './commands/sitioGateFase0.js';

const program = new Command();
program.name('cli').description('CLI determinista de la plataforma de sitios (Base 4/8 de BASES_DEL_SISTEMA.md).');

const cliente = program.command('cliente').description('Comandos sobre clientes');
registrarComandoClienteAlta(cliente);

const sitio = program.command('sitio').description('Comandos sobre sitios');
registrarComandoSitioGateFase0(sitio);

await program.parseAsync(process.argv);
