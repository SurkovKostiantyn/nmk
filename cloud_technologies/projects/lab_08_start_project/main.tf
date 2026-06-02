terraform {
  required_providers {
    docker = {
      source  = "kreuzwerker/docker"
      version = "~> 3.0"
    }
  }
}

provider "docker" {
  # За замовчуванням Terraform знайде локальний Docker сокет
}

# Мережа для контейнерів
resource "docker_network" "lab_net" {
  name = "lab08-net-${var.student_name}"
}

# Образ Nginx
resource "docker_image" "nginx" {
  name         = "nginx:1.25-alpine"
  keep_locally = false
}

# Образ Redis
resource "docker_image" "redis" {
  name         = "redis:alpine"
  keep_locally = false
}

# Контейнер Nginx
resource "docker_container" "nginx_container" {
  image = docker_image.nginx.image_id
  name  = "lab08-nginx-${var.student_name}"

  ports {
    internal = 80
    external = 8080
  }

  networks_advanced {
    name = docker_network.lab_net.name
  }
}

# Контейнер Redis
resource "docker_container" "redis_container" {
  image = docker_image.redis.image_id
  name  = "lab08-redis-${var.student_name}"

  networks_advanced {
    name = docker_network.lab_net.name
  }
}
