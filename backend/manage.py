import os
import sys
from dotenv import load_dotenv  # Make sure to install python-dotenv

def main():
    """Run administrative tasks."""
    
    # 1. Look for the "switch" (defaults to development)
    env = os.getenv("APP_ENV", "development")
    
    # 2. Decide and load the specific file
    env_path = f".env.{env}"
    load_dotenv(env_path)
    
    # 3. Standard Django setup continues
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django..."
        ) from exc
    execute_from_command_line(sys.argv)

if __name__ == '__main__':
    main()
