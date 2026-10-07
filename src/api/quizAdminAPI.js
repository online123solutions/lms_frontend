// Admin quiz management (quizzes, questions, options)
import { apiClient } from "./apiservice";

const errorOf = (e, fallback) => {
  const d = e?.response?.data;
  if (!d) return fallback;
  if (typeof d === "string") return fallback;
  if (d.detail) return d.detail;
  // Field errors: {"field": ["msg", ...]} -> "msg; msg"
  return Object.values(d).flat().filter((m) => typeof m === "string").join(" ") || fallback;
};

const call = async (fn, fallback) => {
  try {
    const res = await fn();
    return { success: true, data: res.data, status: res.status };
  } catch (e) {
    return { success: false, error: errorOf(e, fallback), status: e?.response?.status, data: e?.response?.data };
  }
};

export const getQuizOptions = () =>
  call(() => apiClient.get("/quiz/manage/quizzes/options/"), "Failed to load form options.");

export const listManagedQuizzes = (params = {}) =>
  call(() => apiClient.get("/quiz/manage/quizzes/", { params }), "Failed to load quizzes.");

export const createQuiz = (payload) =>
  call(() => apiClient.post("/quiz/manage/quizzes/", payload), "Failed to create quiz.");

export const updateQuiz = (id, payload) =>
  call(() => apiClient.patch(`/quiz/manage/quizzes/${id}/`, payload), "Failed to update quiz.");

export const deleteQuiz = (id, force = false) =>
  call(
    () => apiClient.delete(`/quiz/manage/quizzes/${id}/`, { params: force ? { force: "true" } : {} }),
    "Failed to delete quiz."
  );

export const listQuestions = (quizId) =>
  call(() => apiClient.get("/quiz/manage/questions/", { params: { quiz: quizId } }), "Failed to load questions.");

// formData: multipart body built by the question editor
export const saveQuestion = (id, formData) =>
  call(
    () =>
      id
        ? apiClient.patch(`/quiz/manage/questions/${id}/`, formData, { headers: { "Content-Type": "multipart/form-data" } })
        : apiClient.post("/quiz/manage/questions/", formData, { headers: { "Content-Type": "multipart/form-data" } }),
    "Failed to save question."
  );

export const deleteQuestion = (id) =>
  call(() => apiClient.delete(`/quiz/manage/questions/${id}/`), "Failed to delete question.");
