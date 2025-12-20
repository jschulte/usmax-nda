import React, { useEffect, useState } from 'react';
import { Input } from '../../components/ui/AppInput';
import { Loader2, Search } from 'lucide-react';
import { ApiError } from '../services/api';
import {
  searchAccessContacts,
  type ContactSearchResult,
} from '../services/agencyAccessService';

interface UserAutocompleteProps {
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  onSelect: (contact: ContactSearchResult) => void;
}

export function UserAutocomplete({
  label,
  placeholder = 'Search by name or email',
  disabled,
  onSelect,
}: UserAutocompleteProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ContactSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (query.trim().length < 3) {
      setResults([]);
      setError(null);
      return;
    }

    let active = true;
    const timer = window.setTimeout(async () => {
      setIsLoading(true);
      try {
        const response = await searchAccessContacts(query.trim());
        if (!active) return;
        setResults(response.contacts ?? []);
        setError(null);
      } catch (err) {
        if (!active) return;
        const message = err instanceof ApiError ? err.message : 'Failed to search contacts';
        setError(message);
        setResults([]);
      } finally {
        if (active) setIsLoading(false);
      }
    }, 300);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [query]);

  const handleSelect = (contact: ContactSearchResult) => {
    onSelect(contact);
    setQuery('');
    setResults([]);
  };

  return (
    <div className="w-full">
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-[var(--color-text-muted)]" />
        <Input
          label={label}
          placeholder={placeholder}
          className="pl-9"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          disabled={disabled}
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-[var(--color-text-muted)]" />
        )}
      </div>

      {error && (
        <p className="mt-2 text-xs text-[var(--color-danger)]">{error}</p>
      )}

      {query.trim().length >= 3 && !isLoading && results.length === 0 && !error && (
        <p className="mt-2 text-xs text-[var(--color-text-secondary)]">No matches found.</p>
      )}

      {results.length > 0 && (
        <div className="mt-2 rounded-md border border-[var(--color-border)] bg-white shadow-sm max-h-56 overflow-auto">
          {results.map((contact) => (
            <button
              key={contact.id}
              type="button"
              onClick={() => handleSelect(contact)}
              className="w-full text-left px-3 py-2 hover:bg-slate-50"
            >
              <div className="text-sm font-medium text-[var(--color-text-primary)]">
                {[contact.firstName, contact.lastName].filter(Boolean).join(' ') || contact.email}
              </div>
              <div className="text-xs text-[var(--color-text-secondary)]">
                {contact.email}
                {contact.roles?.length ? ` · ${contact.roles.join(', ')}` : ''}
                {contact.jobTitle ? ` · ${contact.jobTitle}` : ''}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
