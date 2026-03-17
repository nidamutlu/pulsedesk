import { http } from "./http";

export type SavedView = {
  id: number;
  name: string;
  filterJson: string;
  createdAt: string;
};

export async function fetchSavedViews(): Promise<SavedView[]> {
  return http<SavedView[]>("/saved-views");
}

export async function createSavedView(input: {
  name: string;
  filterJson: string;
}): Promise<SavedView> {
  return http<SavedView>("/saved-views", {
    method: "POST",
    body: input,
  });
}

export async function deleteSavedView(id: number): Promise<void> {
  return http<void>(`/saved-views/${id}`, {
    method: "DELETE",
  });
}