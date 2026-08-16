import axios, { type AxiosRequestConfig, type AxiosResponse } from "axios";
import type { IUser } from "@/models/User";
import { getHeaders } from "@/utils/auth";
import {
  forceRenewGlobalPenpencilToken,
  refreshUserPenpencilToken,
  resolvePenpencilToken,
} from "@/utils/penpencilToken";

export async function penpencilRequest<T = any>(
  config: AxiosRequestConfig,
  user: IUser | null | undefined
): Promise<AxiosResponse<T>> {
  const initialToken = await resolvePenpencilToken(user);
  try {
    return await axios.request<T>({
      ...config,
      headers: { ...getHeaders(initialToken), ...config.headers },
    });
  } catch (error: any) {
    if (error?.response?.status !== 401) throw error;

    let replacement = "";
    if (user && !user.isGuest && user._id) {
      replacement = await refreshUserPenpencilToken(String(user._id));
    }
    if (!replacement) replacement = await forceRenewGlobalPenpencilToken();
    if (!replacement || replacement === initialToken) throw error;

    return axios.request<T>({
      ...config,
      headers: { ...getHeaders(replacement), ...config.headers },
    });
  }
}