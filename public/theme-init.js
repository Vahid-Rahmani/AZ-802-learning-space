try {
  document.documentElement.dataset.theme = localStorage.getItem("certpath-theme") === "fluent" ? "fluent" : "classic";
} catch {
  document.documentElement.dataset.theme = "classic";
}
