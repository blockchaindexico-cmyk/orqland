import { flexRender, getCoreRowModel, useReactTable, type ColumnDef } from '@tanstack/react-table';

/** Minimal TanStack Table renderer shared by the delivery-agent and support tables. */
export function DataTable<T>({ data, columns, onRowClick, empty }: { data: T[]; columns: ColumnDef<T>[]; onRowClick?: (row: T) => void; empty: string }) {
  const table = useReactTable({ data, columns, getCoreRowModel: getCoreRowModel() });
  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-card">
      <table className="w-full min-w-[900px] text-sm">
        <thead>
          {table.getHeaderGroups().map((g) => (
            <tr key={g.id} className="border-b border-border text-left text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
              {g.headers.map((h) => (
                <th key={h.id} className="px-4 py-2.5 font-medium">
                  {flexRender(h.column.columnDef.header, h.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="px-4 py-10 text-center text-muted-foreground">
                {empty}
              </td>
            </tr>
          )}
          {table.getRowModel().rows.map((r) => (
            <tr key={r.id} onClick={() => onRowClick?.(r.original)} className="cursor-pointer border-b border-border align-top last:border-0 hover:bg-muted/50">
              {r.getVisibleCells().map((c) => (
                <td key={c.id} className="px-4 py-3">
                  {flexRender(c.column.columnDef.cell, c.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
