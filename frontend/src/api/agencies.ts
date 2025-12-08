import { apiGet } from "./client";

export function listAgencies() {
  return apiGet("/agencies");
}
