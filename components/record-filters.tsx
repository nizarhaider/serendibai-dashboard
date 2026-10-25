import { Search } from "lucide-react";

export function RecordFilters({
  query,
  onQuery,
  status,
  onStatus,
  options,
  placeholder,
}: {
  query: string;
  onQuery: (value: string) => void;
  status: string;
  onStatus: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder: string;
}) {
  return (
    <div className="list-toolbar">
      <div className="search-input">
        <Search size={16} />
        <input
          aria-label={placeholder}
          placeholder={placeholder}
          value={query}
          onChange={(event) => onQuery(event.target.value)}
        />
      </div>
      <select
        aria-label="Filter records"
        value={status}
        onChange={(event) => onStatus(event.target.value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
