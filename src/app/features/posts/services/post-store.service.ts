import { computed, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { getErrorMessage } from '../../../core/api/api.utils';
import { SessionService } from '../../../core/auth/session.service';
import { FeedbackService } from '../../../core/ui/feedback.service';
import { PostsApiService } from './posts-api.service';
import { PostDto, SavePostRequest } from '../models/posts.models';
import { ReportStoreService } from '../../reports/services/report-store.service';

/**
 * @description Almacén central de datos (Store) para la gestión de las publicaciones.
 * Controla el feed de posts, la creación, edición, eliminación, likes, retweets y
 * comentarios. Además, implementa un caché centralizado para los posts originales compartidos.
 */
@Injectable({ providedIn: 'root' })
export class PostStoreService {
  private readonly postsApi = inject(PostsApiService);
  private readonly sessionService = inject(SessionService);
  private readonly feedback = inject(FeedbackService);
  private readonly reportsStore = inject(ReportStoreService);

  private readonly postsState = signal<PostDto[]>([]);
  private readonly loadingState = signal(false);
  private readonly savingState = signal(false);
  private readonly errorState = signal<string | null>(null);
  private readonly likedPostsState = signal<Record<string, boolean>>({});
  private readonly retweetedPostsState = signal<Record<string, boolean>>({});
  private readonly retweetIdsState = signal<Record<string, string>>({});

  /**
   * Caché compartido de "publicaciones originales" referidas por retweets o respuestas
   * cuando NO se encuentran en el feed cargado actualmente. Centralizado aquí para
   * evitar peticiones duplicadas: si varios componentes apuntan al mismo postId,
   * solo se realiza UNA petición al servidor.
   *
   * Mantiene marcadores de posición ("Cargando..." / "No disponible") para que la interfaz
   * tenga algo que renderizar mientras se realiza la descarga, o si el post fue borrado.
   */
  private readonly originalPostsCacheState = signal<Record<string, PostDto>>({});
  readonly originalPosts = this.originalPostsCacheState.asReadonly();

  /**
   * IDs de publicaciones originales que están actualmente en proceso de descarga.
   * Funciona como una defensa adicional contra llamadas de red duplicadas.
   */
  private readonly inFlightOriginalPostIds = new Set<string>();

  /** Señal reactiva que expone la lista de publicaciones en el feed. */
  readonly posts = this.postsState.asReadonly();
  /** Señal reactiva que indica si se está cargando el feed. */
  readonly loading = this.loadingState.asReadonly();
  /** Señal reactiva que indica si se está guardando o realizando una acción asíncrona. */
  readonly saving = this.savingState.asReadonly();
  /** Señal reactiva que expone el error de la última operación. */
  readonly error = this.errorState.asReadonly();
  /** Señal reactiva que asocia cada postId con un booleano indicando si el usuario le dio "me gusta". */
  readonly likedPosts = this.likedPostsState.asReadonly();
  /** Señal reactiva que asocia cada postId con un booleano indicando si el usuario lo compartió. */
  readonly retweetedPosts = this.retweetedPostsState.asReadonly();
  /** Señal reactiva computada que filtra únicamente las publicaciones del usuario en sesión. */
  readonly myPosts = computed(() => this.postsState().filter((post) => post.userId === this.sessionService.userId()));

  /**
   * @description Carga las publicaciones principales para el feed y la información de reportes del usuario.
   */
  async loadPosts(): Promise<void> {
    try {
      this.loadingState.set(true);
      this.errorState.set(null);
      this.loadPersistedInteractions();
      const [posts] = await Promise.all([
        firstValueFrom(this.postsApi.listPosts()),
        this.reportsStore.loadMyReports(),
      ]);
      this.postsState.set(posts);
    } catch (error) {
      this.errorState.set(getErrorMessage(error, 'No pudimos cargar el feed todavía.'));
    } finally {
      this.loadingState.set(false);
    }
  }

  // ============================================================
  //  CACHÉ DE PUBLICACIONES ORIGINALES (Retweets y Respuestas)
  // ============================================================

  /**
   * @description Búsqueda sincrónica de una publicación por su ID.
   * Busca primero en el feed cargado y luego en el caché de publicaciones originales.
   * No realiza peticiones de red (usar `ensureOriginalPostLoaded` para eso).
   * @param postId ID de la publicación a buscar.
   * @returns El objeto `PostDto` encontrado, o `null` si no está en memoria.
   */
  getOriginalPost(postId: string | null | undefined): PostDto | null {
    if (!postId) return null;
    const inFeed = this.postsState().find((p) => p.postId === postId);
    if (inFeed) return inFeed;
    return this.originalPostsCacheState()[postId] ?? null;
  }

  /**
   * @description Garantiza que una publicación original esté cargada en memoria.
   * Método idempotente: si ya está en el feed, en el caché o hay una descarga en vuelo,
   * no realiza ninguna acción. Esto optimiza el rendimiento evitando peticiones concurrentes.
   * @param postId ID del post original a asegurar.
   */
  ensureOriginalPostLoaded(postId: string | null | undefined): void {
    if (!postId) return;

    // ¿Ya lo tenemos en el feed?
    if (this.postsState().some((p) => p.postId === postId)) return;

    // ¿Ya está en el caché (incluso como marcador de posición)?
    if (postId in this.originalPostsCacheState()) return;

    // ¿Hay otra petición idéntica en vuelo?
    if (this.inFlightOriginalPostIds.has(postId)) return;

    this.inFlightOriginalPostIds.add(postId);

    // Marcador de posición temporal mientras se completa la descarga
    this.originalPostsCacheState.update((cache) => ({
      ...cache,
      [postId]: this.buildLoadingPlaceholder(postId),
    }));

    firstValueFrom(this.postsApi.getPostById(postId))
      .then((original) => {
        if (original) {
          this.originalPostsCacheState.update((cache) => ({ ...cache, [postId]: original }));
        } else {
          this.markOriginalPostUnavailable(postId);
        }
      })
      .catch(() => {
        // Maneja errores de red y publicaciones privadas o eliminadas (404)
        this.markOriginalPostUnavailable(postId);
      })
      .finally(() => {
        this.inFlightOriginalPostIds.delete(postId);
      });
  }

  /**
   * @description Agrega o actualiza de forma explícita un post original en el caché de compartidos.
   * Útil tras realizar descargas de detalle específicas para que toda la interfaz las aproveche.
   * @param post Publicación original a almacenar.
   */
  setOriginalPost(post: PostDto): void {
    if (!post?.postId) return;
    this.originalPostsCacheState.update((cache) => ({ ...cache, [post.postId!]: post }));
  }

  /**
   * Crea un marcador de posición de carga para la UI mientras se descarga la publicación.
   */
  private buildLoadingPlaceholder(postId: string): PostDto {
    return {
      postId,
      userNickname: 'Autor original',
      username: 'original',
      content: 'Cargando detalles de la publicación compartida...',
      createdAt: new Date().toISOString(),
      isPublished: true,
      likesCount: 0,
      retweetsCount: 0,
      repliesCount: 0,
    } as PostDto;
  }

  /**
   * Registra en el caché que una publicación compartida no se encuentra disponible.
   */
  private markOriginalPostUnavailable(postId: string): void {
    this.originalPostsCacheState.update((cache) => ({
      ...cache,
      [postId]: {
        postId,
        userNickname: 'No disponible',
        username: 'no-disponible',
        content: 'Esta publicación compartida no se pudo cargar (puede ser privada o estar eliminada).',
        createdAt: new Date().toISOString(),
        isPublished: true,
        likesCount: 0,
        retweetsCount: 0,
        repliesCount: 0,
      } as PostDto,
    }));
  }

  /**
   * @description Crea una nueva publicación en el servidor y la inserta al inicio del feed local.
   * @param payload Datos de la publicación a crear.
   * @returns Un Observable con la publicación creada o `null` si falló.
   */
  async createPost(payload: SavePostRequest): Promise<PostDto | null> {
    return this.save(async () => {
      const userId = this.sessionService.userId();
      if (!userId) {
        throw new Error('No se encontró la sesión del usuario. Inicia sesión nuevamente.');
      }
      const post = await firstValueFrom(this.postsApi.createPost({ ...payload, userId }));
      this.postsState.update((posts) => [post, ...posts]);
      this.feedback.success('Tu publicación está visible en el feed.', { title: 'Publicación creada' });
      return post;
    }, 'No pudimos crear la publicación.');
  }

  /**
   * @description Actualiza el contenido o configuración de una publicación existente.
   * @param id ID único de la publicación.
   * @param payload Campos nuevos a actualizar.
   * @returns La publicación modificada, o `null` en caso de error.
   */
  async updatePost(id: string, payload: SavePostRequest): Promise<PostDto | null> {
    return this.save(async () => {
      const userId = this.sessionService.userId();
      const post = await firstValueFrom(this.postsApi.updatePost(id, { ...payload, userId: userId ?? undefined }));
      this.patchPost(post);
      this.feedback.success('La publicación se actualizó correctamente.', { title: 'Publicación actualizada' });
      return post;
    }, 'No pudimos actualizar la publicación.');
  }

  /**
   * @description Sube un archivo multimedia (imagen, video, audio) para ser adjuntado a un post.
   * @param file Archivo binario de media.
   * @returns Objeto con el ID asignado y la URL pública de acceso.
   */
  async uploadMedia(file: File): Promise<{ mediaId: string; url: string } | null> {
    try {
      this.savingState.set(true);
      this.errorState.set(null);
      const result = await firstValueFrom(this.postsApi.uploadMedia(file));
      this.feedback.success('Archivo adjunto subido correctamente.', { title: 'Archivo subido' });
      return result;
    } catch (error) {
      const message = getErrorMessage(error, 'La subida del archivo adjunto falló.');
      this.errorState.set(message);
      this.feedback.error(message, { title: 'Error al subir' });
      return null;
    } finally {
      this.savingState.set(false);
    }
  }

  /**
   * @description Alterna el estado de publicación de un post (pasa de borrador a publicado y viceversa).
   * @param post Publicación a modificar.
   */
  async togglePublished(post: PostDto): Promise<PostDto | null> {
    const postId = post.postId;

    if (!postId) {
      this.errorState.set('La publicación seleccionada no tiene identificador.');
      this.feedback.error('La publicación seleccionada no tiene identificador.', { title: 'Error al cambiar estado' });
      return null;
    }

    return this.save(async () => {
      const response = await firstValueFrom(
        this.postsApi.changeStatus(postId, { isPublished: !Boolean(post.isPublished) }),
      );
      // El servidor podría retornar vacío; en ese caso se fusiona optimistamente.
      const updated: PostDto = response ?? { ...post, isPublished: !Boolean(post.isPublished) };
      this.patchPost(updated);
      this.feedback.info(updated.isPublished ? 'La publicación ahora está publicada.' : 'La publicación volvió a borradores.', {
        title: updated.isPublished ? 'Publicada' : 'Guardada como borrador',
      });
      return updated;
    }, 'No pudimos cambiar el estado de publicación.');
  }

  /**
   * @description Elimina físicamente una publicación del servidor y del feed local.
   * @param id ID único de la publicación a eliminar.
   * @returns `true` si la eliminación fue exitosa, `false` en caso contrario.
   */
  async deletePost(id: string): Promise<boolean> {
    try {
      this.savingState.set(true);
      this.errorState.set(null);
      await firstValueFrom(this.postsApi.deletePost(id));
      this.postsState.update((posts) => posts.filter((post) => post.postId !== id));
      this.feedback.success('La publicación se quitó del feed.', { title: 'Publicación eliminada' });
      return true;
    } catch (error) {
      const message = getErrorMessage(error, 'No pudimos eliminar la publicación.');
      this.errorState.set(message);
      this.feedback.error(message, { title: 'Error al eliminar' });
      return false;
    } finally {
      this.savingState.set(false);
    }
  }

  /**
   * @description Registra o remueve el "me gusta" de una publicación de manera optimista.
   * Si la petición al servidor falla, revierte el estado local de forma transparente.
   * @param post Publicación sobre la cual alternar el "me gusta".
   */
  async toggleLike(post: PostDto): Promise<void> {
    const postId = post.postId;
    if (!postId) return;

    const wasLiked = Boolean(this.likedPostsState()[postId]);
    const originalLikesCount = post.likesCount ?? 0;

    // Actualización optimista de la interfaz
    this.likedPostsState.update(prev => ({ ...prev, [postId]: !wasLiked }));
    this.persistInteractions();

    this.postsState.update(posts =>
      posts.map(p => {
        if (p.postId === postId) {
          const nextCount = wasLiked ? Math.max(0, originalLikesCount - 1) : originalLikesCount + 1;
          return { ...p, likesCount: nextCount };
        }
        return p;
      })
    );

    try {
      const updated = await firstValueFrom(this.postsApi.toggleLike(postId));
      if (updated && updated.postId) {
        this.patchPost(updated);
      }
    } catch (error) {
      // Revertir el estado en caso de que falle la petición de red
      this.likedPostsState.update(prev => ({ ...prev, [postId]: wasLiked }));
      this.persistInteractions();

      this.postsState.update(posts =>
        posts.map(p => {
          if (p.postId === postId) {
            return { ...p, likesCount: originalLikesCount };
          }
          return p;
        })
      );
      this.feedback.error(getErrorMessage(error, 'No pudimos alternar el estado de "me gusta".'), { title: 'Error al dar me gusta' });
    }
  }

  /**
   * @description Añade una respuesta o comentario a una publicación y actualiza el contador localmente.
   * @param postId ID de la publicación padre.
   * @param content Texto de la respuesta.
   */
  async addComment(postId: string, content: string): Promise<PostDto | null> {
    return this.save(async () => {
      const response = await firstValueFrom(this.postsApi.createComment(postId, { content }));
      if (response) {
        this.postsState.update(posts => [response, ...posts]);

        // Incrementar el contador de respuestas del post padre de forma local
        this.postsState.update(posts =>
          posts.map(p => {
            if (p.postId === postId) {
              return { ...p, repliesCount: (p.repliesCount ?? 0) + 1 };
            }
            return p;
          })
        );
        this.feedback.success('Tu respuesta se publicó.', { title: 'Comentario creado' });
      }
      return response;
    }, 'No pudimos enviar el comentario.');
  }

  /**
   * @description Comparte una publicación (retweet) con un comentario opcional (cita).
   * @param postId ID de la publicación original a compartir.
   * @param content Texto de la cita o comentario personalizado (null para retweet simple).
   */
  async retweet(postId: string, content: string | null): Promise<PostDto | null> {
    return this.save(async () => {
      const response = await firstValueFrom(this.postsApi.createRetweet(postId, { content: content ?? undefined }));
      if (response) {
        this.postsState.update(posts => [response, ...posts]);
        this.retweetedPostsState.update(prev => ({ ...prev, [postId]: true }));
        if (response.postId) {
          this.retweetIdsState.update(prev => ({ ...prev, [postId]: response.postId! }));
        }
        this.persistInteractions();

        // Incrementar el contador de retweets del post original de forma local
        this.postsState.update(posts =>
          posts.map(p => {
            if (p.postId === postId) {
              return { ...p, retweetsCount: (p.retweetsCount ?? 0) + 1 };
            }
            return p;
          })
        );

        this.feedback.success(
          content ? 'Cita publicada correctamente.' : 'Publicación compartida correctamente.',
          { title: content ? 'Cita compartida' : 'Compartida' }
        );
      }
      return response;
    }, 'No pudimos compartir la publicación.');
  }

  /**
   * @description Elimina el retweet o la cita compartida de un post.
   * @param postId ID de la publicación original compartida.
   */
  async unretweet(postId: string): Promise<boolean> {
    const retweetId = this.retweetIdsState()[postId];
    if (!retweetId) {
      // Búsqueda de respaldo: intentar encontrar el retweet en las publicaciones locales
      const userId = this.sessionService.userId();
      const found = this.postsState().find(p =>
        p.retweetOfPostId === postId && p.userId === userId && !p.content
      );
      if (!found?.postId) {
        this.feedback.error('No se encontró la publicación compartida para eliminar.', { title: 'Error' });
        return false;
      }
    }

    const idToDelete = retweetId || this.postsState().find(p =>
      p.retweetOfPostId === postId && p.userId === this.sessionService.userId() && !p.content
    )?.postId;

    if (!idToDelete) return false;

    try {
      this.savingState.set(true);
      this.errorState.set(null);
      await firstValueFrom(this.postsApi.deletePost(idToDelete));

      this.postsState.update(posts => posts.filter(p => p.postId !== idToDelete));
      this.retweetedPostsState.update(prev => {
        const next = { ...prev };
        delete next[postId];
        return next;
      });
      this.retweetIdsState.update(prev => {
        const next = { ...prev };
        delete next[postId];
        return next;
      });
      this.persistInteractions();

      // Decrementar el contador de retweets en el post original de forma local
      this.postsState.update(posts =>
        posts.map(p => {
          if (p.postId === postId) {
            return { ...p, retweetsCount: Math.max(0, (p.retweetsCount ?? 0) - 1) };
          }
          return p;
        })
      );

      this.feedback.success('Se quitó la publicación compartida.', { title: 'Compartida eliminada' });
      return true;
    } catch (error) {
      const message = getErrorMessage(error, 'No pudimos quitar la publicación compartida.');
      this.errorState.set(message);
      this.feedback.error(message, { title: 'Error al quitar' });
      return false;
    } finally {
      this.savingState.set(false);
    }
  }

  /**
   * @description Actualiza el nombre, apodo y avatar del usuario en todas las publicaciones cacheadas.
   * Esto mantiene la consistencia visual tras un cambio de perfil sin requerir recargar todo el feed.
   */
  updateUserInPosts(userId: string, nickname: string, avatarUrl: string | null): void {
    // Actualizar publicaciones del feed principal
    this.postsState.update((posts) =>
      posts.map((post) => {
        if (post.userId === userId) {
          return {
            ...post,
            userNickname: nickname,
            userAvatar: avatarUrl ?? post.userAvatar,
          };
        }
        return post;
      })
    );

    // Actualizar publicaciones en el caché de originales compartidos
    this.originalPostsCacheState.update((cache) => {
      const next = { ...cache };
      let changed = false;
      for (const id in next) {
        if (next[id].userId === userId) {
          next[id] = {
            ...next[id],
            userNickname: nickname,
            userAvatar: avatarUrl ?? next[id].userAvatar,
          };
          changed = true;
        }
      }
      return changed ? next : cache;
    });
  }

  /**
   * Modifica o añade una sola publicación dentro del estado local del feed.
   */
  private patchPost(post: PostDto): void {
    this.postsState.update((posts) => {
      const next = posts.map((item) => (item.postId === post.postId ? post : item));
      return next.some((item) => item.postId === post.postId) ? next : [post, ...next];
    });
  }

  /**
   * Ejecutor auxiliar para peticiones asíncronas de guardado con manejo centralizado de feedback y errores.
   */
  private async save<T>(task: () => Promise<T>, fallbackMessage: string): Promise<T | null> {
    try {
      this.savingState.set(true);
      this.errorState.set(null);
      return await task();
    } catch (error) {
      const message = getErrorMessage(error, fallbackMessage);
      this.errorState.set(message);
      this.feedback.error(message, { title: 'Solicitud fallida' });
      return null;
    } finally {
      this.savingState.set(false);
    }
  }

  /**
   * Carga los estados de interacciones y compartidos guardados en localStorage para persistir entre recargas.
   */
  private loadPersistedInteractions(): void {
    const userId = this.sessionService.userId();
    if (!userId) return;

    try {
      const liked = localStorage.getItem(`liked_posts_${userId}`);
      if (liked) {
        this.likedPostsState.set(JSON.parse(liked));
      }
      const retweeted = localStorage.getItem(`retweeted_posts_${userId}`);
      if (retweeted) {
        this.retweetedPostsState.set(JSON.parse(retweeted));
      }
      const retweetIds = localStorage.getItem(`retweet_ids_${userId}`);
      if (retweetIds) {
        this.retweetIdsState.set(JSON.parse(retweetIds));
      }
    } catch {
      // Fallback si el almacenamiento local no está disponible
    }
  }

  /**
   * Persiste en localStorage los estados de likes y compartidos del usuario actual.
   */
  private persistInteractions(): void {
    const userId = this.sessionService.userId();
    if (!userId) return;

    try {
      localStorage.setItem(`liked_posts_${userId}`, JSON.stringify(this.likedPostsState()));
      localStorage.setItem(`retweeted_posts_${userId}`, JSON.stringify(this.retweetedPostsState()));
      localStorage.setItem(`retweet_ids_${userId}`, JSON.stringify(this.retweetIdsState()));
    } catch {
      // Fallback si el almacenamiento local no está disponible
    }
  }
}
