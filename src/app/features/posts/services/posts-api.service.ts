import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { ApiClientService } from '../../../core/api/api-client.service';
import { environment } from '../../../../environments/environment';
import { GenericResponse, JsonRecord } from '../../../core/api/api.models';
import {
  ChangePostStatusRequest,
  GeneratedPostTextDto,
  GeneratePostTextRequest,
  PostDto,
  PostListQuery,
  SavePostRequest,
} from '../models/posts.models';

/**
 * @description Servicio de API encargado de realizar las peticiones HTTP del módulo de publicaciones.
 * Ofrece métodos para crear, listar, actualizar y eliminar posts, además de interactuar
 * con archivos multimedia, dar "me gusta", comentar, retuitear y generar textos mediante IA.
 */
@Injectable({ providedIn: 'root' })
export class PostsApiService {
  private readonly api = inject(ApiClientService);
  private readonly http = inject(HttpClient);

  /**
   * @description Sube un archivo multimedia (imagen, video, audio) al servidor.
   * @param file El archivo binario a subir.
   * @returns Un Observable con el identificador único y la URL pública de la media subida.
   */
  uploadMedia(file: File): Observable<{ mediaId: string; url: string }> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http
      .post<GenericResponse<{ mediaId: string; url: string }>>(`${environment.apiBaseUrl}/api/Media/upload`, formData)
      .pipe(map((response) => response.data));
  }

  /**
   * @description Crea una nueva publicación en la plataforma.
   * @param payload Datos de la publicación.
   * @returns Un Observable con la publicación creada.
   */
  createPost(payload: SavePostRequest): Observable<PostDto> {
    return this.api.post<PostDto, SavePostRequest>('/api/post/create', payload);
  }

  /**
   * @description Obtiene el listado de publicaciones del feed general.
   * @param query Filtros de búsqueda opcionales.
   * @returns Un Observable con el array de publicaciones.
   */
  listPosts(query?: PostListQuery): Observable<PostDto[]> {
    return this.api.get<PostDto[], PostListQuery>('/api/post/list', query);
  }

  /**
   * @description Obtiene los detalles de una publicación específica por su ID.
   * @param id ID único de la publicación a buscar.
   * @returns Un Observable con los detalles de la publicación.
   */
  getPostById(id: string): Observable<PostDto> {
    return this.api.get<PostDto>(`/api/post/${id}`);
  }

  /**
   * @description Modifica el contenido de una publicación existente.
   * @param id ID único de la publicación.
   * @param payload Datos actualizados para la publicación.
   * @returns Un Observable con la publicación editada.
   */
  updatePost(id: string, payload: SavePostRequest): Observable<PostDto> {
    return this.api.put<PostDto, SavePostRequest>(`/api/post/${id}/update`, payload);
  }

  /**
   * @description Solicita la generación de texto inteligente asistida por IA para una publicación.
   * @param payload Indicaciones (prompt) e idioma de preferencia.
   * @returns Un Observable con el texto generado sugerido.
   */
  generateText(payload: GeneratePostTextRequest): Observable<GeneratedPostTextDto> {
    return this.api.post<GeneratedPostTextDto, GeneratePostTextRequest>('/api/post/generate-text', payload);
  }

  /**
   * @description Cambia el estado de una publicación (de borrador a publicada o viceversa).
   * @param id ID único de la publicación.
   * @param payload El nuevo estado de publicación deseado.
   * @returns Un Observable con la publicación modificada.
   */
  changeStatus(id: string, payload: ChangePostStatusRequest): Observable<PostDto> {
    return this.api.patch<PostDto, ChangePostStatusRequest>(`/api/post/${id}/change-status`, payload);
  }

  /**
   * @description Alterna el estado de "me gusta" de una publicación para el usuario en sesión.
   * @param id ID único de la publicación.
   * @returns Un Observable con la publicación modificada.
   */
  toggleLike(id: string): Observable<PostDto> {
    return this.api.post<PostDto, {}>(`/api/post/${id}/like`, {});
  }

  /**
   * @description Crea un comentario o respuesta asociado a una publicación específica.
   * @param id ID único de la publicación padre.
   * @param payload Objeto que contiene el texto del comentario.
   * @returns Un Observable con el comentario creado.
   */
  createComment(id: string, payload: { content: string }): Observable<PostDto> {
    return this.api.post<PostDto, { content: string }>(`/api/post/${id}/comment`, payload);
  }

  /**
   * @description Crea un retweet o una cita compartida de una publicación original.
   * @param id ID de la publicación original a compartir.
   * @param payload Contenido opcional de la cita.
   * @returns Un Observable con el post de retweet generado.
   */
  createRetweet(id: string, payload: { content?: string }): Observable<PostDto> {
    // Omitir el campo 'content' por completo para retweets simples y evitar fallos de validación en el backend.
    const body = payload.content ? { content: payload.content } : {};
    return this.api.post<PostDto, { content?: string }>(`/api/post/${id}/retweet`, body);
  }

  /**
   * @description Elimina de forma definitiva una publicación específica.
   * @param id ID único de la publicación a eliminar.
   * @returns Un Observable con un registro JSON de confirmación de borrado.
   */
  deletePost(id: string): Observable<JsonRecord> {
    return this.api.delete<JsonRecord>(`/api/post/${id}/delete`);
  }
}
