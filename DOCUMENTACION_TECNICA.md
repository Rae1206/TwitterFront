# Documentación Técnica del Proyecto

## 1. Resumen General

El proyecto se llama **`twitter`** y es un **frontend Angular** que implementa un **clon/red social tipo Twitter/X** con mensajería en tiempo real, feed de publicaciones, perfiles, seguimientos y consola administrativa.

**Objetivo principal:**  
Permitir que usuarios autenticados publiquen contenido, interactúen con otros usuarios y se comuniquen en tiempo real; además, ofrecer herramientas de moderación para administradores.

**Tipo de sistema:**  
Frontend SPA con consumo de API REST y comunicación en tiempo real con **SignalR**.

**Usuarios principales:**
- Usuarios públicos no autenticados: login y registro.
- Usuarios autenticados: feed, perfiles, follows, mensajes, configuración.
- Administradores/moderadores: dashboard, usuarios, posts, reportes, suspensiones.

**Funcionalidades principales:**
- Registro e inicio de sesión con JWT.
- Feed de posts con likes, comentarios, retweets y borradores.
- Subida de media y grabación de audio.
- Perfil editable con cambio de avatar y contraseña.
- Seguimiento entre usuarios.
- Mensajería privada en tiempo real.
- Presencia online/offline y typing indicators.
- Chatbot integrado.
- Reporte de publicaciones.
- Panel administrativo con moderación y métricas.

---

## 2. Tecnologías Utilizadas

### TypeScript

**Uso en el proyecto:**  
Lenguaje principal de toda la aplicación frontend. Se usa con tipado estricto para componentes, servicios, DTOs, stores, utilidades y guards.

**Archivos o zonas donde aparece:**  
Todo `src/app/**`, `tsconfig.json`.

### Angular 21

**Uso en el proyecto:**  
Framework principal del frontend. La app usa componentes standalone, routing lazy por `loadComponent`, signals, interceptores HTTP y formularios reactivos.

**Archivos o zonas donde aparece:**  
`package.json`, `angular.json`, `src/app/app.config.ts`, `src/app/app.routes.ts`, todos los `.component.ts` y `.page.ts`.

### Angular Router

**Uso en el proyecto:**  
Define layouts públicos, privados y administrativos; protege rutas con guards y usa navegación por parámetros y query params.

**Archivos o zonas donde aparece:**  
`src/app/app.routes.ts`, `src/app/core/auth/auth.guards.ts`, `messages.page.ts`, `follows-list.page.ts`, `send-message-button.component.ts`.

### Angular Signals

**Uso en el proyecto:**  
Manejo reactivo local y de estado compartido en servicios/store: sesión, tema, acento, SignalR, posts, usuarios, reportes, mensajes no leídos.

**Archivos o zonas donde aparece:**  
`session.service.ts`, `signalr.service.ts`, `brand.service.ts`, `theme.service.ts`, `post-store.service.ts`, `user-store.service.ts`, `report-store.service.ts`, múltiples páginas/componentes.

### Reactive Forms (`@angular/forms`)

**Uso en el proyecto:**  
Se usa para login, registro, publicación de posts, cambio de contraseña, formularios administrativos y mensajería.

**Archivos o zonas donde aparece:**  
`login.page.ts`, `register.page.ts`, `home.page.ts`, `profile.page.ts`, `settings-password.page.ts`, `admin-*.page.ts`, `messages.page.ts`, `home-chat-panel.component.ts`.

### RxJS

**Uso en el proyecto:**  
Se usa para `Observable`, `Subject`, `firstValueFrom`, operadores de transformación, control de ciclo de vida y puente entre HTTP/SignalR y componentes.

**Archivos o zonas donde aparece:**  
`signalr.service.ts`, `api-client.service.ts`, `auth.interceptor.ts`, `messages-api.service.ts`, `post-store.service.ts`, `user-store.service.ts`.

### HttpClient

**Uso en el proyecto:**  
Cliente HTTP base para consumir la API REST, tanto directamente como a través de `ApiClientService`.

**Archivos o zonas donde aparece:**  
`api-client.service.ts`, `auth-api.service.ts`, `posts-api.service.ts`, `users-api.service.ts`, `app.config.ts`.

### @microsoft/signalr

**Uso en el proyecto:**  
Comunicación en tiempo real para mensajería, presencia online/offline y typing indicators.

**Archivos o zonas donde aparece:**  
`package.json`, `src/app/core/realtime/signalr.service.ts`, `signalr.initializer.ts`, `messages.page.ts`, `home-chat-panel.component.ts`, `private-layout.component.ts`, `people.page.ts`, `unread-count.service.ts`.

### ApexCharts / ng-apexcharts

**Uso en el proyecto:**  
Visualización de métricas del dashboard administrativo.

**Archivos o zonas donde aparece:**  
`package.json`, `src/app/features/admin/dashboard/admin-dashboard.page.ts`.

### SCSS

**Uso en el proyecto:**  
Estilos principales de layouts, páginas y componentes.

**Archivos o zonas donde aparece:**  
Configurado en `angular.json`; usado en la mayoría de `*.scss`.

### Tailwind CSS 4

**Uso en el proyecto:**  
Está configurado globalmente en el build, pero en los archivos inspeccionados predominan SCSS y estilos inline/component-scoped. Su uso directo no fue evidente en los componentes principales revisados.

**Archivos o zonas donde aparece:**  
`package.json`, `angular.json` (`src/tailwind.css`), `devDependencies`.

### Angular Material / CDK

**Uso en el proyecto:**  
Las dependencias están instaladas, pero no se detectó uso relevante en los componentes principales inspeccionados.

**Archivos o zonas donde aparece:**  
`package.json`.

### Autenticación JWT

**Uso en el proyecto:**  
La sesión se hidrata desde `localStorage`, el interceptor adjunta `Bearer token`, y se soporta refresh token automático ante `401`.

**Archivos o zonas donde aparece:**  
`session.service.ts`, `auth.interceptor.ts`, `auth-api.service.ts`, `jwt-session.utils.ts`, `auth.guards.ts`.

### localStorage

**Uso en el proyecto:**  
Persistencia de sesión, preferencia de tema, color de acento y estados locales de likes/retweets.

**Archivos o zonas donde aparece:**  
`session.service.ts`, `theme.service.ts`, `brand.service.ts`, `post-store.service.ts`.

### Almacenamiento de archivos / CDN externo

**Uso en el proyecto:**  
El frontend sube media por multipart/form-data y además el interceptor detecta URLs de **DigitalOcean Spaces** para no adjuntar bearer ni disparar refresh.

**Archivos o zonas donde aparece:**  
`posts-api.service.ts`, `users-api.service.ts`, `auth.interceptor.ts`.

### Vitest / Playwright

**Uso en el proyecto:**  
Herramientas de testing instaladas. Hay tests unitarios reales para autenticación, session, brand service y password settings.

**Archivos o zonas donde aparece:**  
`package.json`, `src/app/**/*.spec.ts`.

### Backend / base de datos / ORM

**Uso en el proyecto:**  
**No existen archivos backend en este repositorio**, por lo que no se puede confirmar framework backend, base de datos ni ORM.  
**Posible:** por el uso de SignalR, `ProblemDetails` y convenciones de endpoints, el backend parece compatible con ecosistema .NET, pero queda **pendiente de confirmar**.

**Archivos o zonas donde aparece:**  
Solo por consumo desde frontend: `environment.ts`, servicios `*api.service.ts`, `signalr.service.ts`.

---

## 3. Arquitectura General

La aplicación está organizada con una mezcla de **arquitectura por capas ligeras** y **organización por features**.

### Estructura lógica

- **`core/`**: infraestructura transversal.
  - API base.
  - autenticación.
  - layouts.
  - SignalR.
  - UI global (tema, acento, toasts, confirmaciones).
- **`features/`**: funcionalidad de negocio por dominio.
  - `posts`
  - `users`
  - `messages`
  - `follows`
  - `reports`
  - `private`
  - `public`
  - `admin`
- **`shared/`**: componentes/utilidades reutilizables de presentación.

### Patrones visibles

- **Stores livianos con signals** para estado cliente:
  - `PostStoreService`
  - `UserStoreService`
  - `ReportStoreService`
  - `UnreadCountService`
- **Servicios API** separados de servicios de estado:
  - `PostsApiService` vs `PostStoreService`
  - `UsersApiService` vs `UserStoreService`
  - `ReportsApiService` vs `ReportStoreService`
- **Interceptor HTTP** para autenticación y refresh token.
- **Guards** para proteger rutas públicas, privadas y admin.
- **Componentes presentacionales reutilizables** para avatar, estados, media, acciones, reportes, audio, tema y color.

### Comunicación entre frontend y backend

1. Los componentes/páginas disparan acciones del usuario.
2. Los stores o servicios API consumen endpoints REST.
3. La respuesta actualiza signals/estado local.
4. La UI reacciona automáticamente por reactividad de Angular signals.
5. Para mensajería/presencia se usa un canal en tiempo real con SignalR.

### Comunicación en tiempo real

La app centraliza SignalR en `SignalRService`, que:
- mantiene el estado de conexión,
- expone eventos RxJS,
- mantiene `onlineUsers` como signal compartida,
- notifica typing,
- sincroniza snapshot inicial de usuarios online.

### Observación importante

El repositorio contiene páginas administrativas adicionales (`admin-audit.page.ts`, `admin-config.page.ts`) y componentes de mensajes legados (`messages-list.component.ts`, `chat.component.ts`) que **existen en código**, pero **no están conectados en `app.routes.ts` ni detectados como parte del flujo principal actual**.

---

## 4. Estructura de Carpetas

| Carpeta | Descripción |
|---|---|
| `src/app` | Núcleo de la aplicación Angular. |
| `src/app/core` | Infraestructura transversal: API, auth, layouts, realtime, UI global. |
| `src/app/core/api` | Cliente HTTP base, utilidades, tipos de respuesta y query params. |
| `src/app/core/auth` | Modelos de auth, guards, interceptor, sesión JWT y utilidades de claims. |
| `src/app/core/layouts` | Layouts público, privado y administrativo. |
| `src/app/core/realtime` | Inicialización y servicio central de SignalR. |
| `src/app/core/ui` | Servicios y componentes globales de tema, acento, feedback, confirmaciones y pipe de media. |
| `src/app/features` | Features del dominio agrupadas por módulo funcional. |
| `src/app/features/public` | Login y registro. |
| `src/app/features/private` | Home, perfil, people y settings del usuario autenticado. |
| `src/app/features/posts` | Modelos, store, API y componentes de publicaciones/audio. |
| `src/app/features/users` | Modelos, store, API, avatar y utilidades de usuario. |
| `src/app/features/messages` | Mensajería, chatbot, modelos y servicios relacionados. |
| `src/app/features/follows` | Seguimiento, listados de followers/following y botón follow. |
| `src/app/features/reports` | Reportes de publicaciones y modal de reporte. |
| `src/app/features/admin` | Dashboard y herramientas administrativas/moderación. |
| `src/app/features/shared` | Página not-found. |
| `src/app/shared` | Componentes y utilidades reutilizables no ligados a un feature único. |
| `src/app/shared/components` | Componentes de estado y miniaturas de tendencia. |
| `src/app/shared/utils` | Utilidades compartidas, por ejemplo tipo de media. |
| `src/environments` | Configuración por ambiente (`apiBaseUrl`, `production`). |
| `public` | Assets estáticos copiados al build. |

---

## 5. Servicios

### ApiClientService

**Archivo:** `src/app/core/api/api-client.service.ts`

**Responsabilidad:**  
Cliente HTTP base que construye URLs con `apiBaseUrl`, arma query params y desenvuelve respuestas genéricas.

**Qué problema resuelve:**  
Evita repetir lógica de `HttpClient` y normaliza el acceso a la API REST.

**Dependencias principales:**  
`HttpClient`, `environment`, `api.utils.ts`.

**Métodos principales:**

| Método | Descripción resumida | Parámetros importantes | Retorno |
|---|---|---|---|
| `get()` | Ejecuta GET con query opcional | `path`, `query` | `Observable<T>` |
| `post()` | Ejecuta POST y unwrap de respuesta | `path`, `body` | `Observable<TResponse>` |
| `put()` | Ejecuta PUT | `path`, `body` | `Observable<TResponse>` |
| `patch()` | Ejecuta PATCH | `path`, `body` | `Observable<TResponse>` |
| `delete()` | Ejecuta DELETE | `path` | `Observable<TResponse>` |

---

### AuthApiService

**Archivo:** `src/app/core/auth/auth-api.service.ts`

**Responsabilidad:**  
Consume los endpoints de login y renovación de tokens.

**Qué problema resuelve:**  
Aísla la comunicación con `/api/auth` del resto de la aplicación.

**Dependencias principales:**  
`HttpClient`, `environment`.

**Métodos principales:**

| Método | Descripción resumida | Parámetros importantes | Retorno |
|---|---|---|---|
| `login()` | Inicia sesión contra la API | `LoginRequest` | `Observable<AuthResponse>` |
| `renew()` | Renueva access token con refresh token | `RenewRequest` | `Observable<AuthResponse>` |

---

### SessionService

**Archivo:** `src/app/core/auth/session.service.ts`

**Responsabilidad:**  
Gestiona el estado de sesión del usuario, tokens, rol y userId.

**Qué problema resuelve:**  
Centraliza la autenticación cliente y la persistencia de tokens en `localStorage`.

**Dependencias principales:**  
`DOCUMENT`, `PLATFORM_ID`, `readJwtClaims()`.

**Métodos principales:**

| Método | Descripción resumida | Parámetros importantes | Retorno |
|---|---|---|---|
| `hydrate()` | Restaura sesión desde storage | — | `void` |
| `isAuthenticated()` | Indica si hay sesión válida | — | `boolean` |
| `getAccessToken()` | Devuelve access token actual | — | `string \| null` |
| `getRefreshToken()` | Devuelve refresh token actual | — | `string \| null` |
| `hasRole()` | Valida roles permitidos | `allowedRoles` | `boolean` |
| `startSession()` | Inicia sesión desde respuesta auth | `AuthResponse` | `void` |
| `clearSession()` | Limpia sesión y storage | — | `void` |

---

### SignalRService

**Archivo:** `src/app/core/realtime/signalr.service.ts`

**Responsabilidad:**  
Crea y mantiene la conexión en tiempo real con el hub de mensajes.

**Qué problema resuelve:**  
Concentra mensajería instantánea, presencia online/offline, typing indicators y reconexión automática.

**Dependencias principales:**  
`@microsoft/signalr`, `SessionService`, `environment`.

**Métodos principales:**

| Método | Descripción resumida | Parámetros importantes | Retorno |
|---|---|---|---|
| `startConnection()` | Inicia la conexión al hub `/hubs/message` | — | `Promise<void>` |
| `stopConnection()` | Cierra la conexión y limpia presencia | — | `Promise<void>` |
| `notifyTyping()` | Informa al hub que el usuario escribe | `receiverId` | `Promise<void>` |
| `notifyStopTyping()` | Informa que dejó de escribir | `receiverId` | `Promise<void>` |
| `isUserOnline()` | Consulta presencia usando signal local | `userId` | `boolean` |
| `isConnectionActive()` | Verifica si el hub está conectado | — | `boolean` |
| `getConnectionState()` | Expone estado actual del hub | — | `HubConnectionState` |

---

### ThemeService

**Archivo:** `src/app/core/ui/theme.service.ts`

**Responsabilidad:**  
Gestiona el tema claro/oscuro de la app.

**Qué problema resuelve:**  
Permite persistir la preferencia visual y aplicarla globalmente sobre `body`.

**Dependencias principales:**  
`localStorage`, `document.body`.

**Métodos principales:**

| Método | Descripción resumida | Parámetros importantes | Retorno |
|---|---|---|---|
| `toggleTheme()` | Alterna entre dark y light mode | — | `void` |

---

### BrandService

**Archivo:** `src/app/core/ui/brand.service.ts`

**Responsabilidad:**  
Gestiona el color de acento y los colores de borde derivados.

**Qué problema resuelve:**  
Permite personalizar la interfaz y persistir esa configuración sin backend.

**Dependencias principales:**  
`DOCUMENT`, `PLATFORM_ID`, `localStorage`, CSS custom properties.

**Métodos principales:**

| Método | Descripción resumida | Parámetros importantes | Retorno |
|---|---|---|---|
| `setAccent()` | Define un nuevo color de acento | `color` | `void` |
| `reset()` | Restablece colores por defecto | — | `void` |
| `toRgba()` | Convierte hex a rgba para bordes | `hex`, `alpha` | `string` |

---

### FeedbackService

**Archivo:** `src/app/core/ui/feedback.service.ts`

**Responsabilidad:**  
Maneja toasts globales de éxito, error e información.

**Qué problema resuelve:**  
Centraliza feedback visual consistente para toda la aplicación.

**Dependencias principales:**  
Signals.

**Métodos principales:**

| Método | Descripción resumida | Parámetros importantes | Retorno |
|---|---|---|---|
| `success()` | Muestra toast de éxito | `message`, `options` | `void` |
| `error()` | Muestra toast de error | `message`, `options` | `void` |
| `info()` | Muestra toast informativo | `message`, `options` | `void` |
| `dismiss()` | Cierra un toast activo | `id` | `void` |

---

### ConfirmService

**Archivo:** `src/app/core/ui/confirm.service.ts`

**Responsabilidad:**  
Muestra diálogos modales de confirmación programáticos.

**Qué problema resuelve:**  
Evita repetir modales de confirmación en páginas y servicios.

**Dependencias principales:**  
Signals y `ConfirmOutletComponent`.

**Métodos principales:**

| Método | Descripción resumida | Parámetros importantes | Retorno |
|---|---|---|---|
| `confirm()` | Abre un diálogo y devuelve respuesta | `ConfirmOptions` | `Promise<boolean>` |
| `approve()` | Confirma la acción | — | `void` |
| `cancel()` | Cancela la acción | — | `void` |

---

### TrendingService

**Archivo:** `src/app/core/ui/trending.service.ts`

**Responsabilidad:**  
Calcula una lista de posts “tendencia” según engagement.

**Qué problema resuelve:**  
Genera el panel lateral de “Qué está pasando” sin lógica duplicada en layouts.

**Dependencias principales:**  
`PostsApiService`.

**Métodos principales:**

| Método | Descripción resumida | Parámetros importantes | Retorno |
|---|---|---|---|
| `refresh()` | Carga hasta 50 posts y deja top 5 por engagement | — | `Promise<void>` |

---

### PostsApiService

**Archivo:** `src/app/features/posts/services/posts-api.service.ts`

**Responsabilidad:**  
Consume endpoints REST del dominio de publicaciones y media.

**Qué problema resuelve:**  
Agrupa toda la comunicación HTTP del módulo de posts.

**Dependencias principales:**  
`ApiClientService`, `HttpClient`, `environment`.

**Métodos principales:**

| Método | Descripción resumida | Parámetros importantes | Retorno |
|---|---|---|---|
| `uploadMedia()` | Sube imagen/video/audio | `File` | `Observable<{ mediaId; url }>` |
| `createPost()` | Crea un post | `SavePostRequest` | `Observable<PostDto>` |
| `listPosts()` | Lista posts del feed | `PostListQuery` | `Observable<PostDto[]>` |
| `getPostById()` | Obtiene detalle de post | `id` | `Observable<PostDto>` |
| `updatePost()` | Edita un post | `id`, `payload` | `Observable<PostDto>` |
| `generateText()` | Pide texto sugerido por IA | `GeneratePostTextRequest` | `Observable<GeneratedPostTextDto>` |
| `changeStatus()` | Publica o devuelve a borrador | `id`, `isPublished` | `Observable<PostDto>` |
| `toggleLike()` | Alterna like | `id` | `Observable<PostDto>` |
| `createComment()` | Crea comentario/respuesta | `id`, `content` | `Observable<PostDto>` |
| `createRetweet()` | Crea retweet o cita | `id`, `content?` | `Observable<PostDto>` |
| `deletePost()` | Elimina un post | `id` | `Observable<JsonRecord>` |

---

### PostStoreService

**Archivo:** `src/app/features/posts/services/post-store.service.ts`

**Responsabilidad:**  
Store principal del feed y de las interacciones con publicaciones.

**Qué problema resuelve:**  
Centraliza estado de posts, caché de posts originales compartidos, likes, retweets, errores y feedback.

**Dependencias principales:**  
`PostsApiService`, `SessionService`, `FeedbackService`, `ReportStoreService`, `localStorage`.

**Métodos principales:**

| Método | Descripción resumida | Parámetros importantes | Retorno |
|---|---|---|---|
| `loadPosts()` | Carga feed y reportes del usuario | — | `Promise<void>` |
| `getOriginalPost()` | Busca un post original en feed/caché | `postId` | `PostDto \| null` |
| `ensureOriginalPostLoaded()` | Descarga on-demand un post citado/retuiteado | `postId` | `void` |
| `createPost()` | Crea post y lo inserta en el feed | `payload` | `Promise<PostDto \| null>` |
| `updatePost()` | Edita un post y actualiza estado local | `id`, `payload` | `Promise<PostDto \| null>` |
| `uploadMedia()` | Sube media adjunta | `File` | `Promise<{ mediaId; url } \| null>` |
| `togglePublished()` | Cambia borrador/publicado | `post` | `Promise<PostDto \| null>` |
| `deletePost()` | Elimina post del backend y del store | `id` | `Promise<boolean>` |
| `toggleLike()` | Hace like/unlike optimista | `post` | `Promise<void>` |
| `addComment()` | Crea respuesta y actualiza contador | `postId`, `content` | `Promise<PostDto \| null>` |
| `retweet()` | Crea retweet/cita y persiste estado | `postId`, `content` | `Promise<PostDto \| null>` |
| `unretweet()` | Elimina retweet/cita y revierte contador | `postId` | `Promise<boolean>` |
| `updateUserInPosts()` | Sincroniza nickname/avatar en posts cacheados | `userId`, `nickname`, `avatarUrl` | `void` |

---

### UsersApiService

**Archivo:** `src/app/features/users/services/users-api.service.ts`

**Responsabilidad:**  
Consume endpoints del dominio de usuarios.

**Qué problema resuelve:**  
Agrupa registro, perfil, avatar, password, listado y email de prueba.

**Dependencias principales:**  
`ApiClientService`, `HttpClient`, `environment`.

**Métodos principales:**

| Método | Descripción resumida | Parámetros importantes | Retorno |
|---|---|---|---|
| `register()` | Registra usuario | `RegisterUserRequest` | `Observable<UserDto>` |
| `listUsers()` | Lista usuarios | `UserListQuery` | `Observable<UserDto[]>` |
| `getUserById()` | Obtiene perfil por ID | `id` | `Observable<UserDto>` |
| `updateUser()` | Actualiza usuario actual | `UpdateUserRequest` | `Observable<UserDto>` |
| `uploadAvatar()` | Sube avatar | `File` | `Observable<UserDto>` |
| `changePassword()` | Cambia contraseña | `ChangePasswordRequest` | `Observable<JsonRecord>` |
| `deleteUser()` | Elimina usuario | `id` | `Observable<JsonRecord>` |
| `getCurrentUser()` | Obtiene `/api/user/me` | — | `Observable<UserDto>` |
| `sendTestEmail()` | Envía correo de prueba | `TestEmailRequest` | `Observable<JsonRecord>` |

---

### UserStoreService

**Archivo:** `src/app/features/users/services/user-store.service.ts`

**Responsabilidad:**  
Store principal del usuario actual y del directorio de usuarios.

**Qué problema resuelve:**  
Evita dispersar el estado de perfil/usuarios y sincroniza cambios de avatar/nickname con el feed.

**Dependencias principales:**  
`UsersApiService`, `SessionService`, `FeedbackService`, `UserAvatarRevisionService`, `PostStoreService`.

**Métodos principales:**

| Método | Descripción resumida | Parámetros importantes | Retorno |
|---|---|---|---|
| `loadCurrentUser()` | Carga el usuario autenticado | `force?` | `Promise<void>` |
| `clearCurrentUser()` | Limpia usuario en memoria | — | `void` |
| `loadUsers()` | Carga el directorio de usuarios | — | `Promise<void>` |
| `updateCurrentUser()` | Guarda cambios del perfil | `UpdateUserRequest` | `Promise<UserDto \| null>` |
| `uploadCurrentUserAvatar()` | Sube avatar y actualiza revisiones | `File` | `Promise<UserDto \| null>` |

---

### UserAvatarRevisionService

**Archivo:** `src/app/features/users/services/user-avatar-revision.service.ts`

**Responsabilidad:**  
Mantiene un contador reactivo por usuario para invalidar caché del avatar.

**Qué problema resuelve:**  
Fuerza recarga del `<img>` cuando la URL canónica del avatar no cambia.

**Dependencias principales:**  
Signals.

**Métodos principales:**

| Método | Descripción resumida | Parámetros importantes | Retorno |
|---|---|---|---|
| `getRevision()` | Obtiene revisión reactiva de avatar | `userId` | `Signal<number>` |
| `bump()` | Incrementa revisión y fuerza `?v=` | `userId` | `void` |

---

### MessagesApiService

**Archivo:** `src/app/features/messages/services/messages-api.service.ts`

**Responsabilidad:**  
Consume endpoints REST de mensajería.

**Qué problema resuelve:**  
Aísla el CRUD de conversaciones y mensajes del resto de la UI.

**Dependencias principales:**  
`ApiClientService`.

**Métodos principales:**

| Método | Descripción resumida | Parámetros importantes | Retorno |
|---|---|---|---|
| `sendMessage()` | Envía mensaje directo | `SendMessageRequest` | `Observable<MessageDto>` |
| `getConversation()` | Trae historial con un usuario | `otherUserId`, `query` | `Observable<MessageDto[]>` |
| `getConversationsList()` | Trae lista de conversaciones | `query` | `Observable<MessageDto[]>` |
| `getUnreadCount()` | Cuenta global de no leídos | — | `Observable<number>` |
| `getUnreadCountInConversation()` | Cuenta por conversación | `otherUserId` | `Observable<number>` |
| `markAsRead()` | Marca un mensaje leído | `messageId` | `Observable<null>` |
| `markConversationAsRead()` | Marca toda una conversación | `otherUserId` | `Observable<null>` |
| `deleteMessage()` | Elimina mensaje | `messageId` | `Observable<null>` |

---

### UnreadCountService

**Archivo:** `src/app/features/messages/services/unread-count.service.ts`

**Responsabilidad:**  
Estado centralizado del contador de mensajes no leídos.

**Qué problema resuelve:**  
Reemplaza polling por actualizaciones dirigidas por eventos de SignalR y acciones locales optimistas.

**Dependencias principales:**  
`MessagesApiService`, `SignalRService`, `SessionService`.

**Métodos principales:**

| Método | Descripción resumida | Parámetros importantes | Retorno |
|---|---|---|---|
| `refresh()` | Sincroniza contador contra backend | — | `void` |
| `decrement()` | Resta no leídos localmente | `amount` | `void` |
| `reset()` | Reinicia contador | — | `void` |

---

### ChatbotApiService

**Archivo:** `src/app/features/messages/services/chatbot-api.service.ts`

**Responsabilidad:**  
Consume endpoints del chatbot.

**Qué problema resuelve:**  
Aísla el historial y envío de mensajes al bot.

**Dependencias principales:**  
`ApiClientService`.

**Métodos principales:**

| Método | Descripción resumida | Parámetros importantes | Retorno |
|---|---|---|---|
| `sendMessage()` | Envía mensaje al chatbot | `SendChatbotMessageRequest` | `Observable<ChatbotReplyDto>` |
| `getHistory()` | Recupera historial del bot | `PaginationQuery` | `Observable<ChatbotMessageDto[]>` |

---

### ChatbotService

**Archivo:** `src/app/features/messages/services/chatbot.service.ts`

**Responsabilidad:**  
Store de conversación con el bot Groq.

**Qué problema resuelve:**  
Maneja estado local del bot, busy states y mensajes sin mezclarlo con la mensajería entre usuarios.

**Dependencias principales:**  
`ChatbotApiService`.

**Métodos principales:**

| Método | Descripción resumida | Parámetros importantes | Retorno |
|---|---|---|---|
| `loadHistory()` | Carga historial del chatbot | — | `Promise<void>` |
| `sendMessage()` | Envía mensaje al bot | `content` | `Promise<void>` |
| `clearError()` | Limpia error visible | — | `void` |
| `reset()` | Reinicia estado del chatbot | — | `void` |

---

### FollowsApiService

**Archivo:** `src/app/features/follows/services/follows-api.service.ts`

**Responsabilidad:**  
Consume endpoints de follow/unfollow y listados de followers/following.

**Qué problema resuelve:**  
Centraliza la lógica HTTP social de seguimiento.

**Dependencias principales:**  
`ApiClientService`.

**Métodos principales:**

| Método | Descripción resumida | Parámetros importantes | Retorno |
|---|---|---|---|
| `followUser()` | Sigue a un usuario | `userId` | `Observable<null>` |
| `unfollowUser()` | Deja de seguir | `userId` | `Observable<null>` |
| `isFollowing()` | Verifica relación actual | `userId` | `Observable<IsFollowingResponse>` |
| `getFollowers()` | Lista seguidores | `userId`, `query` | `Observable<FollowUserDto[]>` |
| `getFollowing()` | Lista seguidos | `userId`, `query` | `Observable<FollowUserDto[]>` |
| `getFollowersCount()` | Cuenta seguidores | `userId` | `Observable<number>` |
| `getFollowingCount()` | Cuenta seguidos | `userId` | `Observable<number>` |

---

### ReportsApiService

**Archivo:** `src/app/features/reports/services/reports-api.service.ts`

**Responsabilidad:**  
Consume endpoints del sistema de reportes.

**Qué problema resuelve:**  
Permite crear reportes y consultar si una entidad ya fue reportada.

**Dependencias principales:**  
`ApiClientService`.

**Métodos principales:**

| Método | Descripción resumida | Parámetros importantes | Retorno |
|---|---|---|---|
| `createReport()` | Envía reporte | `CreateReportRequest` | `Observable<ReportDto>` |
| `checkReportStatus()` | Verifica si ya se reportó una entidad | `entityType`, `entityId` | `Observable<{ alreadyReported: boolean }>` |
| `getMyReports()` | Obtiene reportes del usuario actual | `limit?`, `offset?` | `Observable<ReportDto[]>` |

---

### ReportStoreService

**Archivo:** `src/app/features/reports/services/report-store.service.ts`

**Responsabilidad:**  
Store local de entidades ya reportadas.

**Qué problema resuelve:**  
Evita re-reportes y cachea el estado de reportes por publicación.

**Dependencias principales:**  
`ReportsApiService`, `FeedbackService`.

**Métodos principales:**

| Método | Descripción resumida | Parámetros importantes | Retorno |
|---|---|---|---|
| `isReported()` | Verifica reporte cacheado | `entityId` | `boolean` |
| `checkReportStatus()` | Consulta backend y actualiza caché | `entityType`, `entityId` | `Promise<boolean>` |
| `loadMyReports()` | Carga reportes del usuario | — | `Promise<void>` |
| `loadReportedStatus()` | Verifica un lote de posts | `postIds` | `Promise<void>` |
| `submitReport()` | Envía reporte y actualiza caché | `payload` | `Promise<boolean>` |

---

### AdminApiService

**Archivo:** `src/app/features/admin/services/admin-api.service.ts`

**Responsabilidad:**  
Gateway HTTP de toda la consola administrativa.

**Qué problema resuelve:**  
Centraliza operaciones de dashboard, usuarios, posts, reportes, suspensiones, config y auditoría.

**Dependencias principales:**  
`ApiClientService`.

**Métodos principales:**

| Método | Descripción resumida | Parámetros importantes | Retorno |
|---|---|---|---|
| `getDashboardStats()` | Trae métricas del panel | — | `Observable<AdminDashboardStats>` |
| `recalculateDashboard()` | Recalcula métricas | — | `Observable<JsonRecord>` |
| `listUsers()` / `listRoles()` | Lista usuarios y roles admin | — | `Observable<...>` |
| `changeUserRole()` | Cambia rol de usuario | `id`, `payload` | `Observable<JsonRecord>` |
| `deleteAdminUser()` / `restoreAdminUser()` | Moderación de usuarios | `id` | `Observable<JsonRecord>` |
| `verifyUser()` / `unverifyUser()` | Activa/desactiva usuario | `id` | `Observable<JsonRecord>` |
| `listPosts()` / `flagPost()` / `deleteAdminPost()` / `restoreAdminPost()` | Moderación de posts | `id`, `payload` | `Observable<JsonRecord>` |
| `getPendingReports()` / `getAllReports()` / `resolveReport()` / `dismissReport()` | Flujo de reportes | varios | `Observable<...>` |
| `suspendUser()` / `liftSuspension()` / `getSuspensionHistory()` | Suspensiones | varios | `Observable<...>` |
| `getAllConfig()` / `getConfigByKey()` / `updateConfig()` | Runtime config | varios | `Observable<...>` |
| `getAuditLogs()` | Auditoría | — | `Observable<AuditLogEntry[]>` |

---

### AudioRecorderService

**Archivo:** `src/app/features/posts/services/audio-recorder.service.ts`

**Responsabilidad:**  
Encapsula `MediaRecorder` y el ciclo completo de grabación de audio.

**Qué problema resuelve:**  
Aísla permisos, temporizador, errores, blob final y conversión a archivo listo para subir.

**Dependencias principales:**  
APIs del navegador: `navigator.mediaDevices`, `MediaRecorder`, `Blob`, `URL`.

**Métodos principales:**

| Método | Descripción resumida | Parámetros importantes | Retorno |
|---|---|---|---|
| `start()` | Solicita permiso e inicia grabación | — | `Promise<void>` |
| `stop()` | Detiene grabación actual | — | `void` |
| `reset()` | Descarta grabación y reinicia estado | — | `void` |
| `destroy()` | Libera streams y object URLs | — | `void` |
| `toFile()` | Convierte blob grabado a `File` | — | `File \| null` |

---

## 6. Componentes

### App

**Archivo:** `src/app/app.ts`

**Responsabilidad:**  
Componente raíz de la aplicación.

**Qué recibe:**  
No recibe inputs.

**Qué emite:**  
No emite eventos.

**Servicios que utiliza:**  
Ninguno directamente.

**Componentes hijos o reutilizados:**  
`RouterOutlet`, `FeedbackOutletComponent`, `ConfirmOutletComponent`.

**Métodos principales:**  
No tiene lógica propia.

---

### PublicLayoutComponent

**Archivo:** `src/app/core/layouts/public-layout/public-layout.component.ts`

**Responsabilidad:**  
Layout de pantallas públicas (login/registro) con tema, acento y modales informativos.

**Qué recibe:**  
Rutas hijas.

**Qué emite:**  
Acciones internas de apertura/cierre de about/contact.

**Servicios que utiliza:**  
No usa servicios de negocio.

**Componentes hijos o reutilizados:**  
`RouterOutlet`, `ThemeToggleComponent`, `AccentPickerComponent`.

**Métodos principales:**

| Método | Descripción resumida |
|---|---|
| `openAbout()` / `closeAbout()` | Controla modal About |
| `openContact()` / `closeContact()` | Controla modal Contact |
| `submitContact()` | Simula envío del formulario de contacto |

---

### PrivateLayoutComponent

**Archivo:** `src/app/core/layouts/private-layout/private-layout.component.ts`

**Responsabilidad:**  
Layout principal del usuario autenticado.

**Qué recibe:**  
Rutas privadas hijas.

**Qué emite:**  
Eventos de navegación/menú desde template.

**Servicios que utiliza:**  
`SessionService`, `UserStoreService`, `FeedbackService`, `TrendingService`, `SignalRService`, `UnreadCountService`, `FollowsApiService`.

**Componentes hijos o reutilizados:**  
`RouterOutlet`, `UserAvatarComponent`, `ThemeToggleComponent`, `AccentPickerComponent`, `TrendingMediaThumbComponent`.

**Métodos principales:**

| Método | Descripción resumida |
|---|---|
| `toggleMobileMenu()` | Abre/cierra menú móvil |
| `listenToSignalRNotifications()` | Muestra toasts por usuarios online y mensajes nuevos |
| `logout()` | Limpia sesión y redirige a login |

---

### AdminLayoutComponent

**Archivo:** `src/app/core/layouts/admin-layout/admin-layout.component.ts`

**Responsabilidad:**  
Layout de la consola administrativa.

**Qué recibe:**  
Rutas hijas admin.

**Qué emite:**  
Acciones de logout.

**Servicios que utiliza:**  
`SessionService`, `UserStoreService`, `FeedbackService`, `Router`.

**Componentes hijos o reutilizados:**  
`RouterOutlet`, `ThemeToggleComponent`, `AccentPickerComponent`.

**Métodos principales:**

| Método | Descripción resumida |
|---|---|
| `logout()` | Cierra sesión administrativa |

---

### LoginPage

**Archivo:** `src/app/features/public/login/login.page.ts`

**Responsabilidad:**  
Formulario de inicio de sesión.

**Qué recibe:**  
`returnUrl` como input.

**Qué emite:**  
No usa outputs; navega internamente.

**Servicios que utiliza:**  
`AuthApiService`, `SessionService`, `FeedbackService`, `Router`.

**Componentes hijos o reutilizados:**  
`RouterLink`.

**Métodos principales:**

| Método | Descripción resumida |
|---|---|
| `submit()` | Valida credenciales, llama login, crea sesión y redirige |
| `showControlError()` | Expone errores del formulario |

---

### RegisterPage

**Archivo:** `src/app/features/public/register/register.page.ts`

**Responsabilidad:**  
Registro de nuevos usuarios.

**Qué recibe:**  
No recibe inputs.

**Qué emite:**  
No usa outputs.

**Servicios que utiliza:**  
`UsersApiService`, `AuthApiService`, `SessionService`, `FeedbackService`, `Router`.

**Componentes hijos o reutilizados:**  
`RouterLink`.

**Métodos principales:**

| Método | Descripción resumida |
|---|---|
| `register()` | Registra usuario y luego hace auto-login |
| `showControlError()` | Expone errores del formulario |

---

### HomePage

**Archivo:** `src/app/features/private/home/home.page.ts`

**Responsabilidad:**  
Página principal del feed: composición, edición, carga de media, interacción con posts, detalle, chat lateral y reportes.

**Qué recibe:**  
Datos desde `PostStoreService`, `SessionService`, `TrendingService`.

**Qué emite:**  
Acciones del usuario contra componentes hijos.

**Servicios que utiliza:**  
`PostStoreService`, `PostsApiService`, `ConfirmService`, `FeedbackService`, `SessionService`, `ReportStoreService`, `TrendingService`.

**Componentes hijos o reutilizados:**  
`StateCardComponent`, `UserAvatarComponent`, `AudioRecorderModalComponent`, `AudioPlayerComponent`, `HomeComposerComponent`, `HomeChatPanelComponent`, `PostActionsComponent`, `PostMediaCarouselComponent`, `PostCardComponent`, `ReportModalComponent`.

**Métodos principales:**

| Método | Descripción resumida |
|---|---|
| `submit()` | Sube media local, arma payload y crea/edita post |
| `startEdit()` | Carga un post existente en el composer |
| `prevCarousel()` / `nextCarousel()` | Navega media de un post |
| `togglePostMenu()` | Abre/cierra menú contextual por post |
| `closeAllMenus()` | Cierra menús abiertos |

---

### ProfilePage

**Archivo:** `src/app/features/private/profile/profile.page.ts`

**Responsabilidad:**  
Visualiza un perfil y permite editar el propio perfil, avatar y contraseña.

**Qué recibe:**  
`id` por input desde la ruta.

**Qué emite:**  
Acciones contra follow, mensaje, reporte y posts.

**Servicios que utiliza:**  
`UsersApiService`, `PostsApiService`, `UserStoreService`, `PostStoreService`, `FeedbackService`, `ConfirmService`, `FollowsApiService`, `Router`, `ReportStoreService`.

**Componentes hijos o reutilizados:**  
`StateCardComponent`, `UserAvatarComponent`, `PostCardComponent`, `PostMediaCarouselComponent`, `FollowButtonComponent`, `SendMessageButtonComponent`, `ReportModalComponent`.

**Métodos principales:**

| Método | Descripción resumida |
|---|---|
| `loadProfile()` | Carga perfil, followers/following y posts necesarios |
| `saveProfile()` | Guarda perfil y, si corresponde, sube avatar |
| `stageAvatar()` | Prepara archivo de avatar para guardado |
| `savePassword()` | Cambia contraseña del usuario |
| `openEditProfile()` / `closeEditProfile()` | Controla modal/form de edición |
| `openChangePassword()` / `closeChangePassword()` | Controla cambio de contraseña |

---

### PeoplePage

**Archivo:** `src/app/features/private/people/people.page.ts`

**Responsabilidad:**  
Directorio de usuarios con búsqueda, filtros de roles y eliminación privilegiada.

**Qué recibe:**  
Usuarios desde `UserStoreService`.

**Qué emite:**  
Acciones de inspección y eliminación.

**Servicios que utiliza:**  
`UserStoreService`, `UsersApiService`, `SessionService`, `FeedbackService`, `ConfirmService`, `SignalRService`.

**Componentes hijos o reutilizados:**  
`StateCardComponent`, `UserAvatarComponent`, `SendMessageButtonComponent`, `RouterLink`.

**Métodos principales:**

| Método | Descripción resumida |
|---|---|
| `reload()` | Recarga el directorio |
| `deleteUser()` | Elimina usuario si el rol lo permite |
| `inspect()` | Selecciona usuario para detalle |
| `isUserOnline()` | Consulta presencia desde SignalR |

---

### MessagesPage

**Archivo:** `src/app/features/messages/pages/messages.page.ts`

**Responsabilidad:**  
Pantalla completa de mensajería entre usuarios y chatbot.

**Qué recibe:**  
Datos desde `MessagesApiService`, `SignalRService`, `UnreadCountService`, `ChatbotService`, query param `userId`.

**Qué emite:**  
Acciones de conversación, lectura, typing y envío.

**Servicios que utiliza:**  
`MessagesApiService`, `FeedbackService`, `SessionService`, `SignalRService`, `UnreadCountService`, `ChatbotService`.

**Componentes hijos o reutilizados:**  
`StateCardComponent`, `UserAvatarComponent`.

**Métodos principales:**

| Método | Descripción resumida |
|---|---|
| `connectToSignalR()` | Abre conexión realtime |
| `listenToNewMessages()` | Inserta mensajes entrantes y sincroniza UI |
| `listenToUserStatus()` | Maneja typing indicator |
| `startNewConversation()` | Abre conversación y carga historial |
| `selectConversation()` | Selecciona conversación desde la lista |
| `sendMessage()` | Envía mensaje al usuario activo |
| `sendChatbotMessage()` | Envía mensaje al bot |
| `markConversationAsReadLocally()` | Quita no leídos de forma optimista |
| `markConversationAsReadAndSync()` | Confirma lectura en backend |
| `onInputChange()` | Marca leído y notifica typing |

---

### FollowsPage

**Archivo:** `src/app/features/follows/pages/follows-list.page.ts`

**Responsabilidad:**  
Lista followers/following de un usuario.

**Qué recibe:**  
`id` y `tab` desde inputs/ruta.

**Qué emite:**  
Acciones de cambio de pestaña y navegación.

**Servicios que utiliza:**  
`FollowsApiService`, `SessionService`, `Router`.

**Componentes hijos o reutilizados:**  
`StateCardComponent`, `UserAvatarComponent`, `FollowButtonComponent`, `RouterLink`.

**Métodos principales:**

| Método | Descripción resumida |
|---|---|
| `loadData()` | Carga contadores y lista actual |
| `switchTab()` | Cambia pestaña vía query params |
| `navigateToProfile()` | Navega al perfil seleccionado |
| `toUserDto()` | Adapta FollowUserDto a UserDto |

---

### SettingsPasswordPage

**Archivo:** `src/app/features/private/settings/password/settings-password.page.ts`

**Responsabilidad:**  
Pantalla dedicada a cambio de contraseña.

**Qué recibe:**  
No recibe inputs.

**Qué emite:**  
No usa outputs.

**Servicios que utiliza:**  
`UsersApiService`, `FeedbackService`.

**Componentes hijos o reutilizados:**  
Ninguno relevante.

**Métodos principales:**

| Método | Descripción resumida |
|---|---|
| `save()` | Envía cambio de contraseña |
| `passwordMismatch()` | Valida confirmación |
| `resetForm()` | Reinicia formulario |

---

### AdminDashboardPage

**Archivo:** `src/app/features/admin/dashboard/admin-dashboard.page.ts`

**Responsabilidad:**  
Dashboard administrativo con métricas y gráficos.

**Qué recibe:**  
Estadísticas desde `AdminApiService`.

**Qué emite:**  
Acciones de recálculo.

**Servicios que utiliza:**  
`AdminApiService`, `FeedbackService`, `ThemeService`.

**Componentes hijos o reutilizados:**  
`StateCardComponent`, `ChartComponent`.

**Métodos principales:**

| Método | Descripción resumida |
|---|---|
| `load()` | Carga estadísticas |
| `recalculate()` | Fuerza recálculo del dashboard |
| `normalizeStats()` | Normaliza payload de métricas |

---

### AdminUsersPage

**Archivo:** `src/app/features/admin/users/admin-users.page.ts`

**Responsabilidad:**  
Moderación de usuarios y cambio de roles.

**Qué recibe:**  
Listado de usuarios y roles desde API admin.

**Qué emite:**  
Acciones de selección, borrado, restauración y cambio de rol.

**Servicios que utiliza:**  
`AdminApiService`, `FeedbackService`, `ConfirmService`, `SessionService`.

**Componentes hijos o reutilizados:**  
`StateCardComponent`.

**Métodos principales:**

| Método | Descripción resumida |
|---|---|
| `load()` | Carga usuarios |
| `loadRoles()` | Carga catálogo de roles |
| `submitRoleChange()` | Cambia rol de usuario |
| `deleteUser()` | Soft delete desde consola |
| `restoreUser()` | Restaura usuario |
| `verifyUser()` | Activa/desactiva cuenta |

---

### AdminPostsPage

**Archivo:** `src/app/features/admin/posts/admin-posts.page.ts`

**Responsabilidad:**  
Moderación de publicaciones.

**Qué recibe:**  
Posts administrativos desde API admin.

**Qué emite:**  
Acciones de flag, delete y restore.

**Servicios que utiliza:**  
`AdminApiService`, `FeedbackService`, `ConfirmService`.

**Componentes hijos o reutilizados:**  
`StateCardComponent`.

**Métodos principales:**

| Método | Descripción resumida |
|---|---|
| `load()` | Carga posts administrativos |
| `pick()` | Selecciona post para acción |
| `flagSelected()` | Marca post para revisión |
| `deletePost()` | Elimina post |
| `restorePost()` | Restaura post |

---

### AdminReportsPage

**Archivo:** `src/app/features/admin/reports/admin-reports.page.ts`

**Responsabilidad:**  
Cola y workspace de moderación de reportes.

**Qué recibe:**  
Reportes pendientes/históricos y preview de posts.

**Qué emite:**  
Acciones de resolución, descarte y creación.

**Servicios que utiliza:**  
`AdminApiService`, `PostsApiService`, `FeedbackService`, `ConfirmService`.

**Componentes hijos o reutilizados:**  
`StateCardComponent`, `PostMediaCarouselComponent`.

**Métodos principales:**

| Método | Descripción resumida |
|---|---|
| `load()` | Carga cola pendiente e historial |
| `pick()` | Selecciona reporte |
| `create()` | Crea reporte manual |
| `resolve()` | Resuelve reporte y opcionalmente flag/delete del post |
| `dismiss()` | Descarta reporte |
| `openPostPreview()` | Carga preview del post reportado |

---

### AdminSuspensionsPage

**Archivo:** `src/app/features/admin/suspensions/admin-suspensions.page.ts`

**Responsabilidad:**  
Gestión de suspensiones de usuarios y denuncias asociadas.

**Qué recibe:**  
Reportes pendientes de tipo usuario.

**Qué emite:**  
Acciones de suspender, descartar reporte y levantar suspensión.

**Servicios que utiliza:**  
`AdminApiService`, `UsersApiService`, `FeedbackService`, `ConfirmService`.

**Componentes hijos o reutilizados:**  
`StateCardComponent`, `RouterLink`.

**Métodos principales:**

| Método | Descripción resumida |
|---|---|
| `loadUserReports()` | Carga denuncias sobre usuarios |
| `fillSuspendForm()` | Prellena suspensión desde un reporte |
| `suspend()` | Ejecuta suspensión y resuelve el reporte |
| `dismissUserReport()` | Descarta denuncia |
| `lift()` | Levanta suspensión existente |

---

### HomeChatPanelComponent

**Archivo:** `src/app/features/private/home/components/home-chat-panel/home-chat-panel.component.ts`

**Responsabilidad:**  
Panel lateral compacto de chat dentro del home.

**Qué recibe:**  
Conversaciones desde API y eventos realtime.

**Qué emite:**  
`closeRequested`.

**Servicios que utiliza:**  
`MessagesApiService`, `Router`, `SessionService`, `SignalRService`, `FeedbackService`, `UnreadCountService`, `ChatbotService`.

**Componentes hijos o reutilizados:**  
`StateCardComponent`, `UserAvatarComponent`.

**Métodos principales:**

| Método | Descripción resumida |
|---|---|
| `openConversation()` | Abre thread de un usuario |
| `openChatbotConversation()` | Abre conversación con Groq |
| `sendMessage()` | Envía mensaje al usuario activo |
| `sendChatbotMessage()` | Envía mensaje al bot |
| `loadConversationThread()` | Carga historial del thread |
| `listenToIncomingMessages()` | Inserta mensajes realtime |
| `markConversationAsReadLocally()` | Limpia no leídos del panel |

---

### PostCardComponent

**Archivo:** `src/app/features/posts/components/post-card.component.ts`

**Responsabilidad:**  
Renderiza una publicación completa con avatar, quote, replies, acciones, media y reporte.

**Qué recibe:**  
`post`, flags de UI, índices de carrusel, estados de likes/retweets/reportes.

**Qué emite:**  
Múltiples outputs: click, edición, borrado, like, retweet, quote, comentario, navegación de carrusel, reporte.

**Servicios que utiliza:**  
`PostStoreService`.

**Componentes hijos o reutilizados:**  
`UserAvatarComponent`, `PostActionsComponent`, `PostMediaCarouselComponent`.

**Métodos principales:**

| Método | Descripción resumida |
|---|---|
| `getOriginalPost()` | Recupera post original de un retweet/reply |
| `getPostReplies()` | Obtiene replies de un post desde el store |
| `onAddComment()` | Emite nuevo comentario |
| `onReportClick()` | Abre flujo de reporte |

---

### Otros componentes importantes detectados

- `AccentPickerComponent`
- `ThemeToggleComponent`
- `FollowButtonComponent`
- `SendMessageButtonComponent`
- `UserAvatarComponent`
- `StateCardComponent`
- `ReportModalComponent`
- `AudioRecorderModalComponent`
- `AudioPlayerComponent`
- `PostMediaCarouselComponent`
- `PostActionsComponent`
- `TrendingMediaThumbComponent`
- `FeedbackOutletComponent`
- `ConfirmOutletComponent`

**Nota:**  
`MessagesListComponent` y `ChatComponent` existen como componentes standalone de mensajería, pero no se detectó uso real en rutas o plantillas principales actuales.

---

## 7. Componentes Reutilizables

| Componente | Se reutiliza en | Propósito | Inputs/Outputs importantes |
|---|---|---|---|
| `UserAvatarComponent` | layouts, home, profile, people, follows, messages, post-card, home-chat-panel | Mostrar avatar con fallback a iniciales y cache busting | `user`, `previewUrl` |
| `StateCardComponent` | home, profile, people, follows, messages, admin dashboard/users/posts/reports/suspensions/config/audit | Estados de loading/error/empty/info | `tone`, `title`, `message`, `actionLabel`, `action` |
| `PostCardComponent` | `home.page.html`, `profile.page.html` | Render estándar de publicación | múltiples inputs de estado y outputs de interacción |
| `PostMediaCarouselComponent` | `post-card`, home detail, profile detail, admin reports preview | Mostrar imágenes/audio/video y navegación | `mediaUrls`, `currentIndex`, `soundEnabled`; outputs de navegación/sonido |
| `AudioPlayerComponent` | composer, carrusel, grabador de audio, home | Reproductor custom de audio | `src` |
| `ReportModalComponent` | home, profile | Reportar una entidad/post | `isOpen`, `entityId`, `alreadyReported`; `reportSubmitted`, `closeModal` |
| `FollowButtonComponent` | profile, follows list | Seguir/dejar de seguir usuarios | `userId`, `followChange` |
| `SendMessageButtonComponent` | profile, people | Navegar a mensajes con `userId` preseleccionado | `userId` |
| `ThemeToggleComponent` | public/private/admin layouts | Alternar dark/light mode | sin inputs |
| `AccentPickerComponent` | public/private/admin layouts | Elegir color de acento y bordes | sin inputs |
| `FeedbackOutletComponent` | raíz `App` | Renderizar toasts globales | depende de `FeedbackService` |
| `ConfirmOutletComponent` | raíz `App` | Renderizar diálogos de confirmación globales | depende de `ConfirmService` |
| `TrendingMediaThumbComponent` | `private-layout` | Miniatura compacta de media en tendencias | `url`, `alt` |
| `HomeComposerComponent` | `home.page.ts` | UI de composición desacoplada de lógica de negocio | `form`, `attachments`, flags; outputs de submit/media/AI |
| `PostActionsComponent` | `post-card` | Barra de acciones del post | inputs de conteos/estado; outputs de comment/retweet/like |

**Ventaja principal de esta reutilización:**  
La app mantiene UI consistente y separa mejor la lógica del dominio de la presentación.

---

## 8. Métodos Principales

| Archivo | Método | Propósito | Flujo resumido |
|---|---|---|---|
| `signalr.service.ts` | `startConnection()` | Iniciar SignalR | Toma JWT, crea `HubConnection`, registra handlers, conecta, pide snapshot de usuarios online |
| `signalr.service.ts` | `setupEventHandlers()` | Registrar eventos del hub | Escucha `ReceiveMessage`, `UserOnline`, `UserOffline`, `UserTyping`, `UserStopTyping`, reconexión y cierre |
| `signalr.service.ts` | `notifyTyping()` | Avisar escritura | Invoca `NotifyTyping` al hub con `receiverId` |
| `signalr.service.ts` | `notifyStopTyping()` | Avisar fin de escritura | Invoca `NotifyStopTyping` |
| `signalr.initializer.ts` | `initializeSignalR()` | Autoarranque global de SignalR | Si hay sesión al boot conecta; luego observa navegación para conectar/desconectar |
| `auth.interceptor.ts` | `renewAccessToken()` | Renovar token expirado | Comparte un único refresh concurrente, actualiza sesión y reintenta request original |
| `session.service.ts` | `hydrate()` | Restaurar sesión | Lee tokens de `localStorage`, parsea claims y actualiza signals |
| `login.page.ts` | `submit()` | Login | Valida form, llama API, inicia sesión, redirige |
| `register.page.ts` | `register()` | Registro + autologin | Crea usuario, luego hace login y navega a home |
| `post-store.service.ts` | `loadPosts()` | Cargar feed | Llama API de posts y reportes del usuario |
| `post-store.service.ts` | `createPost()` | Crear post | Inserta el post al inicio del feed y muestra feedback |
| `post-store.service.ts` | `updatePost()` | Editar post | Envía PUT y parchea el post en estado local |
| `post-store.service.ts` | `toggleLike()` | Like optimista | Actualiza UI local, persiste en `localStorage`, revierte si falla |
| `post-store.service.ts` | `retweet()` | Compartir post | Crea retweet/cita, actualiza contadores y persistencia local |
| `post-store.service.ts` | `ensureOriginalPostLoaded()` | Cargar post original de citas/respuestas | Deduplica peticiones y cachea placeholders/resultados |
| `home.page.ts` | `submit()` | Crear/editar post con media | Sube adjuntos, arma `mediaIds`, crea o actualiza post |
| `profile.page.ts` | `saveProfile()` | Guardar perfil y avatar | Actualiza perfil, opcionalmente sube avatar y sincroniza UI |
| `profile.page.ts` | `savePassword()` | Cambio de contraseña | Valida y llama `usersApi.changePassword()` |
| `messages.page.ts` | `listenToNewMessages()` | Procesar mensajes realtime | Inserta mensajes, marca leídos si corresponde y actualiza preview |
| `messages.page.ts` | `markConversationAsReadLocally()` | Optimistic unread clear | Marca mensajes como leídos en lista/thread y decrementa contador global |
| `messages.page.ts` | `markConversationAsReadAndSync()` | Sincronizar lectura | Hace update local primero y luego PATCH al backend |
| `messages.page.ts` | `onInputChange()` | Typing + read | Marca como leído al empezar a escribir y notifica typing |
| `home-chat-panel.component.ts` | `listenToIncomingMessages()` | Realtime en panel lateral | Inserta mensaje, actualiza preview y marca leído si el chat activo coincide |
| `unread-count.service.ts` | `refresh()` | Sincronizar no leídos | Consulta backend cuando la conexión SignalR está activa |
| `brand.service.ts` | `setAccent()` | Cambiar color | Normaliza hex y actualiza signal |
| `brand.service.ts` | `applyAccent()` | Aplicar color a bordes | Escribe `--accent-color`, `--border-color`, `--border-strong` en `body` |
| `accent-picker.component.ts` | `apply()` | Aplicar swatch | Llama `brandService.setAccent()` |
| `accent-picker.component.ts` | `reset()` | Restablecer color | Llama `brandService.reset()` y cierra picker |
| `audio-recorder.service.ts` | `start()` | Iniciar grabación | Pide permisos, configura `MediaRecorder`, arranca timer |
| `audio-recorder.service.ts` | `toFile()` | Preparar archivo final | Convierte blob grabado a `File` con nombre/extensión apropiados |
| `follow-button.component.ts` | `toggleFollow()` | Seguir/dejar de seguir | Llama API, actualiza estado local y emite cambio |
| `admin-reports.page.ts` | `resolve()` | Resolver reporte | Opcionalmente flag/delete del post y luego resuelve reporte |
| `admin-suspensions.page.ts` | `suspend()` | Suspender usuario | Envía suspensión y opcionalmente resuelve denuncia asociada |

---

## 9. Funcionamiento de SignalR

### Servicio encargado

`src/app/core/realtime/signalr.service.ts`

### URL del hub

```text
${environment.apiBaseUrl}/hubs/message
```

En desarrollo, según `environment.ts`, esto equivale a:

```text
http://localhost:5063/hubs/message
```

### Cómo se crea la conexión

- Se usa `HubConnectionBuilder`.
- El token JWT se adjunta vía `accessTokenFactory`.
- Hay reconexión automática con tiempos:
  - `0`
  - `2000`
  - `5000`
  - `10000`
  - `30000`

### Transporte configurado

- **Desarrollo:** WebSockets + SSE + LongPolling.
- **Producción:** SSE + LongPolling.  
  No habilita WebSockets directos en producción según la configuración actual.

### Cómo se inicia

1. `app.config.ts` registra `initializeSignalR()` como `ENVIRONMENT_INITIALIZER`.
2. `signalr.initializer.ts` conecta si ya hay sesión activa.
3. Además, varias pantallas también llaman `startConnection()` defensivamente:
   - `messages.page.ts`
   - `home-chat-panel.component.ts`
   - componentes legados de mensajes

### Cómo se detiene

- `stopConnection()` detiene el hub, actualiza estado a disconnected y limpia `onlineUsers`.
- `signalr.initializer.ts` también desconecta si la sesión deja de estar autenticada.

### Estado y mecanismos reactivos usados

- **Signals**
  - `connectionState`
  - `isConnected`
  - `onlineUsers`
- **Subjects/Observables**
  - `messageReceived$` → `onMessageReceived`
  - `userOnline$` → `onUserOnline`
  - `userOffline$` → `onUserOffline`
  - `userTyping$` → `onUserTyping`
  - `userStopTyping$` → `onUserStopTyping`

### Flujo

1. El servicio recupera el token desde `SessionService`.
2. Construye la conexión al hub.
3. Registra listeners con `setupEventHandlers()`.
4. Ejecuta `start()`.
5. Si el backend soporta `GetOnlineUsers`, solicita snapshot inicial.
6. Los componentes consumen:
   - signals para presencia/estado,
   - observables para eventos puntuales.

### Eventos detectados

| Evento | Qué hace | Dónde se usa |
|---|---|---|
| `ReceiveMessage` | Emite mensaje recibido | `messages.page.ts`, `home-chat-panel.component.ts`, `private-layout.component.ts`, `UnreadCountService` |
| `UserOnline` | Agrega userId a `onlineUsers` y emite evento | `people.page.ts`, `messages.page.ts`, `private-layout.component.ts` |
| `UserOffline` | Quita userId de `onlineUsers` | `people.page.ts`, `messages.page.ts` |
| `UserTyping` | Emite typing del usuario | `messages.page.ts` |
| `UserStopTyping` | Emite fin de typing | `messages.page.ts` |

### Eventos enviados al hub

| Evento enviado | Método | Uso |
|---|---|---|
| `NotifyTyping` | `notifyTyping(receiverId)` | Indicar que el usuario escribe |
| `NotifyStopTyping` | `notifyStopTyping(receiverId)` | Indicar que dejó de escribir |
| `GetOnlineUsers` | `requestOnlineUsersSnapshot()` | Pedir snapshot inicial de presencia |

### Componentes/servicios consumidores

- `PrivateLayoutComponent`
  - muestra toasts por mensajes nuevos,
  - muestra toast cuando se conecta alguien que el usuario sigue.
- `MessagesPage`
  - actualiza lista de conversaciones,
  - actualiza thread activo,
  - marca mensajes como leídos,
  - muestra typing.
- `HomeChatPanelComponent`
  - replica flujo de mensajería en panel lateral.
- `PeoplePage`
  - consulta `isUserOnline()`.
- `UnreadCountService`
  - incrementa contador cuando llega un mensaje no leído.

### Cómo se actualiza la interfaz

- Presencia: por signal `onlineUsers`.
- Mensajes: por `onMessageReceived`.
- Typing: por `onUserTyping` / `onUserStopTyping`.
- No leídos: por `UnreadCountService.count`.

### Manejo de errores y reconexión

- `startConnection()` hace `throw` si falla la conexión inicial.
- `onreconnecting()` cambia el estado a `Reconnecting`.
- `onreconnected()` vuelve a `Connected` y repide snapshot de usuarios online.
- `onclose()` deja estado en `Disconnected`.
- Si `GetOnlineUsers` no existe en el backend, el servicio lo ignora y construye presencia solo con eventos.

---

## 10. Funcionamiento del Color Picker de Bordes

### Ubicación

- Componente UI: `src/app/core/ui/accent-picker.component.ts`
- Servicio que aplica/persiste el color: `src/app/core/ui/brand.service.ts`

### Tipo de implementación

No usa librería externa ni `input type="color"`.  
Usa un **picker propio basado en una paleta predefinida** (`palette`) y un botón desplegable.

### Variable que guarda el color

- Estado principal: `BrandService.accentColor = signal<string | null>(null)`
- En el picker:
  - `currentColor = computed(() => this.brandService.accentColor())`

### Funcionamiento resumido

El usuario abre el picker, elige un color predefinido y el `BrandService`:
1. normaliza el hex,
2. actualiza la signal,
3. persiste el valor en `localStorage`,
4. aplica variables CSS globales sobre `body`.

No solo cambia el acento visual; también recalcula **bordes suaves y bordes fuertes**.

### Cómo se aplica el color al borde

`BrandService.applyAccent()` escribe directamente estas variables CSS en `document.body`:

- `--accent-color`
- `--border-color`
- `--border-strong`

Valores:
- `--accent-color = accent`
- `--border-color = toRgba(accent, 0.32)`
- `--border-strong = toRgba(accent, 0.6)`

Luego múltiples estilos SCSS consumen esas variables, por ejemplo en layouts y cards:
- `border: 1px solid var(--border-color)`
- `border: 1.5px solid var(--border-strong)`

### Persistencia

Se persiste en `localStorage` con la clave:

```text
twitter.accent-color
```

No se persiste en backend ni en estado global remoto.

### Componentes donde se usa el picker

- `PublicLayoutComponent`
- `PrivateLayoutComponent`
- `AdminLayoutComponent`

### Componentes/zonas afectadas por el color

No está limitado a un único componente.  
Afecta toda la app donde se usen variables como:
- `var(--accent-color)`
- `var(--border-color)`
- `var(--border-strong)`

### Flujo técnico

1. El usuario abre `app-accent-picker`.
2. Selecciona una swatch.
3. `AccentPickerComponent.apply(color)` llama `brandService.setAccent(color)`.
4. `BrandService` normaliza y guarda el color en `accentColor`.
5. Un `effect()` detecta el cambio.
6. `applyAccent()` actualiza variables CSS sobre `body`.
7. `persist()` guarda el valor en `localStorage`.
8. Al recargar la app, `loadStored()` recupera el color y se reaplica.

### Métodos relacionados

| Método | Descripción |
|---|---|
| `AccentPickerComponent.toggle()` | Abre/cierra el selector |
| `AccentPickerComponent.apply()` | Aplica una swatch |
| `AccentPickerComponent.reset()` | Vuelve al color por defecto |
| `BrandService.setAccent()` | Normaliza y actualiza la signal |
| `BrandService.applyAccent()` | Escribe variables CSS globales |
| `BrandService.persist()` | Guarda en `localStorage` |
| `BrandService.loadStored()` | Recupera el color almacenado |
| `BrandService.toRgba()` | Deriva colores de borde translúcidos |

---

## 11. Flujo de Datos del Sistema

### Flujo general UI → servicio/store → API

1. El usuario interactúa con una página o componente.
2. El componente ejecuta un método local.
3. Ese método llama:
   - a un **API service** si solo necesita I/O,
   - o a un **store service** si además necesita estado local.
4. El store actualiza signals.
5. La vista reacciona automáticamente.

### Flujo de posts

- `HomePage` / `ProfilePage` disparan acciones.
- `PostStoreService` coordina creación, edición, likes, comentarios y retweets.
- `PostsApiService` consume `/api/post/...`.
- `PostStoreService` actualiza:
  - `posts`
  - `likedPosts`
  - `retweetedPosts`
  - `originalPosts`

### Flujo de usuarios/perfil

- `ProfilePage` o `PeoplePage` disparan acciones.
- `UserStoreService` centraliza:
  - `currentUser`
  - `users`
- `UsersApiService` consume `/api/user/...`.
- Si cambia avatar o nickname, `UserStoreService` sincroniza también el feed usando `PostStoreService.updateUserInPosts()`.

### Flujo de mensajes

- `MessagesPage` y `HomeChatPanelComponent` cargan historial vía `MessagesApiService`.
- Mensajes nuevos entran por `SignalRService.onMessageReceived`.
- La UI:
  - agrega el mensaje al thread activo,
  - actualiza el preview de conversación,
  - ajusta no leídos con `UnreadCountService`.

### Flujo SignalR → componentes

- `SignalRService` recibe eventos del hub.
- Publica:
  - signals (`onlineUsers`, `isConnected`)
  - observables (`onMessageReceived`, `onUserTyping`, etc.)
- Los consumidores reaccionan:
  - `PeoplePage`: presencia online
  - `MessagesPage`: thread, typing, lectura
  - `PrivateLayoutComponent`: toasts
  - `UnreadCountService`: contador global

### Flujo formularios → modelos

- Casi todos los formularios usan `ReactiveFormsModule`.
- El componente extrae `getRawValue()`.
- Construye payload DTO.
- Llama al servicio.
- El resultado actualiza state/signals.

### Flujo padre → hijo

Ejemplos reales:
- `HomePage` → `HomeComposerComponent`
- `HomePage` / `ProfilePage` → `PostCardComponent`
- `PostCardComponent` → `PostActionsComponent`
- layouts → `ThemeToggleComponent` / `AccentPickerComponent`

### Flujo hijo → padre

Se usan `output()` modernos:
- `PostCardComponent` emite acciones de like, retweet, comentario, edición, reporte.
- `HomeComposerComponent` emite submit, carga de archivos, paste de imagen, apertura del recorder.
- `ReportModalComponent` emite `reportSubmitted`.

---

## 12. Grafo de Conexión entre Componentes, Servicios y APIs

```mermaid

**Nota:**  
`AdminAuditPage`, `AdminConfigPage`, `MessagesListComponent` y `ChatComponent` existen, pero no se detectó conexión activa en el routing principal inspeccionado.

---

## 13. Dependencias Importantes

| Dependencia | Uso en el proyecto |
|---|---|
| `@angular/core` | Framework principal |
| `@angular/common` | Pipes/directivas base y utilidades comunes |
| `@angular/forms` | Formularios reactivos |
| `@angular/router` | Routing, layouts y guards |
| `@microsoft/signalr` | Comunicación en tiempo real |
| `rxjs` | Observables, Subjects, operators y puentes async |
| `ng-apexcharts` | Gráficos del dashboard admin |
| `apexcharts` | Motor de gráficos |
| `@angular/build` | Builder de la aplicación |
| `@angular/cli` | Tooling Angular |
| `typescript` | Compilación TypeScript |
| `tailwindcss` | Configuración de estilos globales, aunque el código revisado usa mayormente SCSS |
| `@tailwindcss/postcss` | Integración Tailwind/PostCSS |
| `postcss` | Pipeline de estilos |
| `vitest` | Testing unitario instalado |
| `@playwright/test` | Testing E2E instalado |
| `@angular/material` | Dependencia instalada; uso directo no confirmado en componentes inspeccionados |
| `@angular/cdk` | Dependencia instalada; uso directo no confirmado en componentes inspeccionados |

---

## 14. Buenas Prácticas Detectadas

- **Separación entre servicios API y stores de estado** (`PostsApiService` vs `PostStoreService`, etc.).
- **Uso intensivo de Angular signals** para estado reactivo local y global.
- **Routing lazy con `loadComponent()`**, útil para modularidad.
- **Interceptor centralizado** para bearer token y refresh automático.
- **Guards bien separados** para guest, auth y admin.
- **Persistencia defensiva** con `localStorage` en sesión, tema y branding.
- **Manejo de errores reusable** con `getErrorMessage()`.
- **Componentes reutilizables sólidos** para avatar, estados, reportes, media y acciones.
- **Optimistic UI** en likes, lectura de mensajes y retweets.
- **Caché explícita de posts originales compartidos** para evitar requests duplicadas.
- **Invalidación de caché de avatar con revisión `?v=`**, muy buena decisión técnica.
- **Reconexión automática de SignalR** con recuperación de snapshot online.
- **Tipado estricto de TypeScript** (`strict`, `strictTemplates`, etc. en `tsconfig.json`).
- **Tests unitarios reales** en auth, sesión, brand service y password settings.

---

## 15. Posibles Mejoras Técnicas

| Área | Mejora sugerida | Motivo |
|---|---|---|
| Home/Profile | Extraer más lógica de páginas muy grandes a servicios/facades | `home.page.ts` y `profile.page.ts` concentran demasiada responsabilidad |
| Mensajería | Consolidar componentes legados `MessagesListComponent` y `ChatComponent` o eliminarlos | Hoy parecen código no integrado que agrega ruido de mantenimiento |
| Admin routing | Agregar rutas para `AdminAuditPage` y `AdminConfigPage` o documentar que están fuera de uso | Existen archivos funcionales pero no están publicados en `app.routes.ts` |
| ThemeService | Proteger acceso a `localStorage` y `document` igual que en `SessionService`/`BrandService` | Actualmente asume navegador disponible |
| Feedback UI | Respetar `position` en `FeedbackOutletComponent` | `FeedbackService` soporta `top-right/bottom-right`, pero el outlet renderizado revisado no separa stacks por posición |
| SignalR | Considerar evitar múltiples llamadas defensivas a `startConnection()` desde varias pantallas | El initializer ya conecta; puede simplificarse el flujo |
| Home/Profile | Crear subcomponentes adicionales para modales y detalle de post | Reducir tamaño, complejidad y acoplamiento de las páginas |
| Administración | Unificar patrones `run()` entre páginas admin en un helper común | Hay repetición de manejo de loading/error/feedback |
| Estilos | Confirmar si Tailwind, Material y CDK siguen siendo necesarios | Hay dependencias instaladas con uso directo no evidente |
| Accesibilidad | Revisar a11y de modales, dropdowns y menús contextuales complejos | Hay buena base, pero conviene validar foco y navegación por teclado end-to-end |
| Color picker | Si se requiere experiencia multi-dispositivo, persistir el acento en backend | Hoy el color solo vive en `localStorage` del navegador actual |
| Contact form público | Reemplazar el envío simulado por integración real o aclararlo en UI | `PublicLayoutComponent.submitContact()` hoy solo hace `setTimeout` |
| Testing | Aumentar cobertura en mensajes, posts y SignalR | Son áreas críticas con mucha lógica reactiva y de sincronización |
| Backend contracts | Versionar contratos DTO o usar cliente tipado compartido | Ayudaría a reducir drift entre frontend y API |

---

## 16. Conclusión

El proyecto es una **SPA Angular moderna**, organizada por features, con **signals**, **stores livianos**, **API services** separados y un uso real de **SignalR** para mensajería y presencia en tiempo real.

Las piezas más importantes para entender antes de modificarlo son:

1. **`SessionService` + `auth.interceptor.ts`** para autenticación.
2. **`PostStoreService`** para el feed y las interacciones.
3. **`UserStoreService`** para usuario/perfil.
4. **`SignalRService` + `UnreadCountService`** para mensajería realtime.
5. **`BrandService` + `AccentPickerComponent`** para el color de acento y bordes.
6. **Layouts** (`public`, `private`, `admin`) porque ahí se conectan tema, acento, notificaciones y navegación global.

Un desarrollador nuevo debería empezar por:
- `app.routes.ts`
- `app.config.ts`
- `core/auth/*`
- `core/realtime/*`
- `features/posts/services/post-store.service.ts`
- `features/messages/pages/messages.page.ts`
- `core/ui/brand.service.ts`

