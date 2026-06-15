/// <reference types="astro/client" />

declare namespace App {
  interface Locals {
    user?: {
      id: number;
      nombre_real: string;
      username: string;
      rol: string;
    }
  }
}
