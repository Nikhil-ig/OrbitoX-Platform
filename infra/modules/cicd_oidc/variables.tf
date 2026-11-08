variable "environment" {
  type        = string
  description = "Deployment environment name (e.g. staging, prod)"
}

variable "github_repository" {
  type        = string
  description = "GitHub repository (owner/repo) allowed to assume deploy roles via OIDC"
  default     = "Nikhil-ig/OrbitoX-Platform"
}

variable "tags" {
  type        = map(string)
  description = "Common tags for all CI/CD resources"
  default     = {}
}
