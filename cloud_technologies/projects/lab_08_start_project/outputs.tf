output "container_name" {
  description = "Name of the Docker container"
  value       = docker_container.nginx_container.name
}

output "application_url" {
  description = "URL to access the application"
  value       = "http://localhost:8080"
}
