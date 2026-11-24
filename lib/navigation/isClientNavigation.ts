import { headers } from 'next/headers'

/**
 * true cuando el render viene de una navegación del cliente (<Link>, router.push) y no
 * de una carga completa del documento.
 *
 * Usa la cabecera estándar Fetch Metadata `sec-fetch-dest`: el navegador envía
 * `document` al cargar una página y `empty` en los fetch RSC de una navegación interna.
 * (Las cabeceras propias de Next, como `next-router-state-tree`, no sirven: Next 16 las
 * elimina de `headers()` antes de renderizar.) Si la cabecera falta (navegador antiguo o
 * un proxy que la quite) se asume carga completa, que es el comportamiento seguro.
 *
 * Sirve para no pedir al backend, en el servidor, datos que el cliente ya tiene en
 * caché: en una navegación interna el JS ya está cargado y React Query decide.
 */
export async function isClientNavigation() {
    const destination = (await headers()).get('sec-fetch-dest')
    return destination !== null && destination !== 'document'
}
