import { inject } from '@angular/core';
import { Router } from '@angular/router';

import { SignalRService } from './signalr.service';
import { SessionService } from '../auth/session.service';

/**
 * @description Inicializador de SignalR.
 * Conecta automáticamente el servicio cuando el usuario está autenticado y
 * maneja la desconexión segura en caso de cerrar sesión o cambiar de estado.
 */
export function initializeSignalR() {
    const signalRService = inject(SignalRService);
    const sessionService = inject(SessionService);
    const router = inject(Router);

    return async () => {
        console.log('Inicializando SignalR...');

        // Si el usuario está autenticado al cargar la aplicación, inicia la conexión
        if (sessionService.isAuthenticated()) {
            try {
                await signalRService.startConnection();
                console.log('SignalR inicializado correctamente');
            } catch (error) {
                console.error('Error al inicializar SignalR:', error);
            }
        }

        // Escucha eventos de navegación y cambios de sesión para conectar o desconectar dinámicamente
        router.events.subscribe(() => {
            const isAuthenticated = sessionService.isAuthenticated();
            const isConnected = signalRService.isConnectionActive();

            // Conectar si el usuario está autenticado pero no hay conexión activa
            if (isAuthenticated && !isConnected) {
                signalRService.startConnection().catch(console.error);
            }
            // Desconectar si la sesión expiró o se cerró, pero la conexión sigue activa
            else if (!isAuthenticated && isConnected) {
                signalRService.stopConnection().catch(console.error);
            }
        });
    };
}
