import * as React from 'react';
import { cn } from '@/lib/utils';

export function Table({ className, ...props }: React.TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="w-full overflow-auto">
      <table className={cn('w-full caption-bottom text-sm', className)} {...props} />
    </div>
  );
}
export function THead(props: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className="bg-secondary/40 text-left text-xs uppercase tracking-wide text-muted-foreground" {...props} />;
}
export function TBody(props: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className="[&_tr:last-child]:border-0" {...props} />;
}
export function TR(props: React.HTMLAttributes<HTMLTableRowElement>) {
  return <tr className="border-b border-border hover:bg-secondary/30" {...props} />;
}
export function TH(props: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return <th className="px-3 py-2 font-medium" {...props} />;
}
export function TD(props: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className="px-3 py-2 align-middle" {...props} />;
}
