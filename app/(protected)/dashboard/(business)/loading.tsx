import { DashboardRouteLoading } from '../components/DashboardRouteLoading'

// Límite de carga dentro del layout compartido para que el resumen (/dashboard)
// también tenga un estado de carga prefetcheable desde las demás secciones.
export default function Loading() {
    return <DashboardRouteLoading />
}
