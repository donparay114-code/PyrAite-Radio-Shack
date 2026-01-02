# PYrte Radio Shack - AWS Infrastructure
# Terraform >= 1.0

terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.5"
    }
  }

  # Recommended: Use S3 backend for state
  # backend "s3" {
  #   bucket = "pyrte-radio-terraform-state"
  #   key    = "production/terraform.tfstate"
  #   region = "us-east-1"
  # }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "PYrte-Radio-Shack"
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}

# =============================================================================
# NETWORKING
# =============================================================================

# VPC
resource "aws_vpc" "radio_vpc" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "radio-vpc-${var.environment}"
  }
}

# Internet Gateway
resource "aws_internet_gateway" "radio_igw" {
  vpc_id = aws_vpc.radio_vpc.id

  tags = {
    Name = "radio-igw-${var.environment}"
  }
}

# Public Subnets
resource "aws_subnet" "public_subnet_a" {
  vpc_id                  = aws_vpc.radio_vpc.id
  cidr_block              = "10.0.1.0/24"
  availability_zone       = "${var.aws_region}a"
  map_public_ip_on_launch = true

  tags = {
    Name = "radio-public-subnet-a"
  }
}

resource "aws_subnet" "public_subnet_b" {
  vpc_id                  = aws_vpc.radio_vpc.id
  cidr_block              = "10.0.2.0/24"
  availability_zone       = "${var.aws_region}b"
  map_public_ip_on_launch = true

  tags = {
    Name = "radio-public-subnet-b"
  }
}

# Private Subnets
resource "aws_subnet" "private_subnet_a" {
  vpc_id            = aws_vpc.radio_vpc.id
  cidr_block        = "10.0.10.0/24"
  availability_zone = "${var.aws_region}a"

  tags = {
    Name = "radio-private-subnet-a"
  }
}

resource "aws_subnet" "private_subnet_b" {
  vpc_id            = aws_vpc.radio_vpc.id
  cidr_block        = "10.0.11.0/24"
  availability_zone = "${var.aws_region}b"

  tags = {
    Name = "radio-private-subnet-b"
  }
}

# Route Table for Public Subnets
resource "aws_route_table" "public_rt" {
  vpc_id = aws_vpc.radio_vpc.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.radio_igw.id
  }

  tags = {
    Name = "radio-public-rt"
  }
}

resource "aws_route_table_association" "public_a" {
  subnet_id      = aws_subnet.public_subnet_a.id
  route_table_id = aws_route_table.public_rt.id
}

resource "aws_route_table_association" "public_b" {
  subnet_id      = aws_subnet.public_subnet_b.id
  route_table_id = aws_route_table.public_rt.id
}

# =============================================================================
# SECURITY GROUPS
# =============================================================================

# RDS Security Group
resource "aws_security_group" "rds_sg" {
  name        = "radio-rds-sg-${var.environment}"
  description = "Security group for RDS PostgreSQL"
  vpc_id      = aws_vpc.radio_vpc.id

  ingress {
    description     = "PostgreSQL from application"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.app_sg.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "radio-rds-sg"
  }
}

# Application Security Group
resource "aws_security_group" "app_sg" {
  name        = "radio-app-sg-${var.environment}"
  description = "Security group for application servers"
  vpc_id      = aws_vpc.radio_vpc.id

  ingress {
    description = "HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "Icecast"
    from_port   = 8000
    to_port     = 8000
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "radio-app-sg"
  }
}

# Redis Security Group
resource "aws_security_group" "redis_sg" {
  name        = "radio-redis-sg-${var.environment}"
  description = "Security group for ElastiCache Redis"
  vpc_id      = aws_vpc.radio_vpc.id

  ingress {
    description     = "Redis from application"
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [aws_security_group.app_sg.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "radio-redis-sg"
  }
}

# =============================================================================
# RDS POSTGRESQL
# =============================================================================

resource "aws_db_subnet_group" "radio_db_subnet" {
  name       = "radio-db-subnet-${var.environment}"
  subnet_ids = [aws_subnet.private_subnet_a.id, aws_subnet.private_subnet_b.id]

  tags = {
    Name = "radio-db-subnet-group"
  }
}

resource "aws_db_instance" "radio_db" {
  identifier     = "radio-db-${var.environment}"
  engine         = "postgres"
  engine_version = "14.10"
  instance_class = var.db_instance_class

  allocated_storage     = 100
  max_allocated_storage = 500
  storage_type          = "gp3"
  storage_encrypted     = true

  multi_az = var.environment == "production" ? true : false

  db_name  = var.db_name
  username = var.db_username
  password = var.db_password

  backup_retention_period = 7
  backup_window           = "03:00-04:00"
  maintenance_window      = "Mon:04:00-Mon:05:00"

  vpc_security_group_ids = [aws_security_group.rds_sg.id]
  db_subnet_group_name   = aws_db_subnet_group.radio_db_subnet.name

  skip_final_snapshot       = var.environment != "production"
  final_snapshot_identifier = var.environment == "production" ? "radio-db-final-${formatdate("YYYY-MM-DD-hhmm", timestamp())}" : null

  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]

  tags = {
    Name = "radio-postgresql"
  }
}

# =============================================================================
# ELASTICACHE REDIS
# =============================================================================

resource "aws_elasticache_subnet_group" "redis_subnet" {
  name       = "radio-redis-subnet-${var.environment}"
  subnet_ids = [aws_subnet.private_subnet_a.id, aws_subnet.private_subnet_b.id]
}

resource "aws_elasticache_cluster" "n8n_redis" {
  cluster_id           = "radio-redis-${var.environment}"
  engine               = "redis"
  node_type            = var.redis_node_type
  num_cache_nodes      = 1
  parameter_group_name = "default.redis7"
  port                 = 6379

  subnet_group_name  = aws_elasticache_subnet_group.redis_subnet.name
  security_group_ids = [aws_security_group.redis_sg.id]

  tags = {
    Name = "radio-redis"
  }
}

# =============================================================================
# S3 BUCKET FOR AUDIO FILES
# =============================================================================

resource "random_id" "bucket_suffix" {
  byte_length = 4
}

resource "aws_s3_bucket" "audio_storage" {
  bucket = "radio-audio-${var.environment}-${random_id.bucket_suffix.hex}"

  tags = {
    Name = "radio-audio-storage"
  }
}

resource "aws_s3_bucket_versioning" "audio_versioning" {
  bucket = aws_s3_bucket.audio_storage.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "audio_lifecycle" {
  bucket = aws_s3_bucket.audio_storage.id

  rule {
    id     = "audio-lifecycle"
    status = "Enabled"

    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }

    transition {
      days          = 90
      storage_class = "GLACIER_IR"
    }

    noncurrent_version_expiration {
      noncurrent_days = 90
    }
  }
}

# =============================================================================
# CLOUDFRONT DISTRIBUTION
# =============================================================================

resource "aws_cloudfront_origin_access_identity" "hls_oai" {
  comment = "OAI for HLS CDN"
}

resource "aws_s3_bucket_policy" "cloudfront_access" {
  bucket = aws_s3_bucket.audio_storage.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "CloudFrontAccess"
        Effect = "Allow"
        Principal = {
          AWS = aws_cloudfront_origin_access_identity.hls_oai.iam_arn
        }
        Action   = "s3:GetObject"
        Resource = "${aws_s3_bucket.audio_storage.arn}/*"
      }
    ]
  })
}

resource "aws_cloudfront_distribution" "hls_cdn" {
  enabled = true
  comment = "HLS CDN Distribution - ${var.environment}"

  origin {
    domain_name = aws_s3_bucket.audio_storage.bucket_regional_domain_name
    origin_id   = "S3-Audio"

    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.hls_oai.cloudfront_access_identity_path
    }
  }

  default_cache_behavior {
    target_origin_id       = "S3-Audio"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    min_ttl     = 0
    default_ttl = 4
    max_ttl     = 300

    compress = true
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }

  tags = {
    Name = "radio-hls-cdn"
  }
}

# =============================================================================
# OUTPUTS
# =============================================================================

output "rds_endpoint" {
  description = "RDS PostgreSQL endpoint"
  value       = aws_db_instance.radio_db.endpoint
}

output "redis_endpoint" {
  description = "ElastiCache Redis endpoint"
  value       = aws_elasticache_cluster.n8n_redis.cache_nodes[0].address
}

output "s3_bucket_name" {
  description = "S3 bucket for audio files"
  value       = aws_s3_bucket.audio_storage.id
}

output "cloudfront_domain" {
  description = "CloudFront distribution domain"
  value       = aws_cloudfront_distribution.hls_cdn.domain_name
}
