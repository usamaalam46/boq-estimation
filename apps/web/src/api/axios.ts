
import axios from "axios";

const api = axios.create({
  baseURL:import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000/api",
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
  timeout: 15000,
});

// Attach the latest token to each API request.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("boq_access_token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export default api;
