# Demo Environment Configuration
# Auto-generated for deployment

aws_region    = "us-east-1"
instance_type = "t3.micro"

# EC2 Key Pair
key_pair_name = "jonah-schulte-aws"

# SSH access restricted to your current IP
ssh_allowed_cidr = ["98.216.160.253/32"]

# No domain for now - will use IP with self-signed cert
# domain_name     = null
# route53_zone_id = null

# Admin email
admin_email = "jonah@example.com"

# Database password
db_password = "zYhWAeS2KY02H1Eas1kx6m4O"

# Git repo - will fail to clone (private), we'll deploy manually
app_repo = "https://github.com/jschulte/usmax-nda.git"
