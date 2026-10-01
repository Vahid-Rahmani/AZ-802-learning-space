try {
  document.documentElement.dataset.theme = localStorage.getItem("certpath-theme") === "classic" ? "classic" : "fluent";
} catch {
  document.documentElement.dataset.theme = "fluent";
}
