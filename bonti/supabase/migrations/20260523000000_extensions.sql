-- Enable required extensions for Bonti's RAG + search pipeline.
create extension if not exists "vector";   -- pgvector for embeddings
create extension if not exists "pg_trgm";  -- trigram for fuzzy full-text matching
