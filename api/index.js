import handler from "./[...route].js";

export const config = { api: { bodyParser: false } };

export default function api(req, res) {
  const url = new URL(req.url, "http://localhost");
  const path = url.searchParams.get("__cbt_path");
  url.searchParams.delete("__cbt_path");

  // Vercel can pass the rewrite destination as the function's request URL.
  if (url.pathname === "/api/index" && path) {
    url.pathname = "/api/" + path.split("/").map(encodeURIComponent).join("/");
  }

  req.url = url.pathname + url.search;
  return handler(req, res);
}
