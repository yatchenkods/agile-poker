# Contributing to Agile Planning Poker

## Development Setup

1. Fork and clone the repository
2. Create a virtual environment
3. Install dependencies: `pip install -r requirements-dev.txt`
4. Create `.env` from `.env.example`
5. Run migrations: `alembic upgrade head`
6. Start development server: `uvicorn app.main:app --reload`

## Code Style

- Use Black for code formatting: `black app/`
- Use isort for import sorting: `isort app/`
- Run flake8 for linting: `flake8 app/`
- Use type hints for all functions

## Testing

Run tests with: `pytest`

Run with coverage: `pytest --cov=app`

## Pull Request Process

1. Create a feature branch
2. Make your changes
3. Add tests for new functionality
4. Ensure all tests pass
5. Update documentation if needed
6. Submit a pull request with a clear description

## Reporting Issues

Include:
- Python version
- Operating system
- Steps to reproduce
- Expected vs actual behavior
- Error logs
