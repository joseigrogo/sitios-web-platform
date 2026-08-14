import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // El dashboard importa lógica real de ../cli/src (Base 8: un sustrato por
  // responsabilidad, no reimplementar reglas de negocio acá) -- esto le dice
  // al file tracer de Next/Vercel que el root real es el repo, no solo
  // dashboard/, para que esos archivos se incluyan en el bundle serverless.
  outputFileTracingRoot: path.join(__dirname, ".."),
};

export default nextConfig;
