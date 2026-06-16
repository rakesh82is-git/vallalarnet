import { useState } from "react";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export type ComboboxOption = {
  value: string;
  label: string;
  keywords?: string;
};

type Props = {
  options: ComboboxOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  loading?: boolean;
  loadingText?: string;
  onSearchChange?: (search: string) => void;
  disabled?: boolean;
  /**
   * When true, the user can commit a typed value that isn't in `options`.
   * Useful for free-form fields like postal codes where dropdown coverage
   * is incomplete.
   */
  allowCustomValue?: boolean;
};

export function Combobox({
  options,
  value,
  onChange,
  placeholder = "Select...",
  searchPlaceholder = "Search...",
  emptyText = "No results",
  loading = false,
  loadingText = "Loading…",
  onSearchChange,
  disabled,
  allowCustomValue = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const selected = options.find((o) => o.value === value);
  const trimmed = search.trim();
  const hasExact =
    !!trimmed && options.some((o) => o.value.toLowerCase() === trimmed.toLowerCase());
  const showCustom = allowCustomValue && !!trimmed && !hasExact;
  const commit = (v: string) => {
    onChange(v);
    setOpen(false);
    setSearch("");
  };
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-between font-normal"
        >
          <span className={cn("truncate", !selected && "text-muted-foreground")}>
            {selected ? selected.label : value ? value : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command
          filter={(itemValue, search) => {
            if (itemValue === "__custom__") return 1;
            const opt = options.find((o) => o.value === itemValue);
            const hay = `${opt?.label ?? itemValue} ${opt?.keywords ?? ""}`.toLowerCase();
            return hay.includes(search.toLowerCase()) ? 1 : 0;
          }}
        >
          <CommandInput
            placeholder={searchPlaceholder}
            value={search}
            onValueChange={(v) => {
              setSearch(v);
              onSearchChange?.(v);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && allowCustomValue && trimmed && !hasExact) {
                e.preventDefault();
                commit(trimmed);
              }
            }}
          />
          <CommandList>
            <CommandEmpty>{loading ? loadingText : emptyText}</CommandEmpty>
            {showCustom && (
              <CommandGroup>
                <CommandItem
                  key="__custom__"
                  value="__custom__"
                  onSelect={() => commit(trimmed)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Use "{trimmed}"
                </CommandItem>
              </CommandGroup>
            )}
            <CommandGroup>
              {options.map((o) => (
                <CommandItem
                  key={o.value}
                  value={o.value}
                  onSelect={() => commit(o.value)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === o.value ? "opacity-100" : "opacity-0",
                    )}
                  />
                  {o.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}