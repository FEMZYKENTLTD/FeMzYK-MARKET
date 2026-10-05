"use client";

export default function SortSelect({ value }: { value: string }) {
  return (
    <select
      id="sort"
      name="sort"
      aria-label="Sort products"
      className="input w-auto py-1.5 text-xs"
      defaultValue={value}
      onChange={(e) => (e.target as HTMLSelectElement).form?.requestSubmit()}
    >
      <option value="featured">Featured</option>
      <option value="new">Newest</option>
      <option value="bestselling">Bestselling</option>
      <option value="price-asc">Price: low to high</option>
      <option value="price-desc">Price: high to low</option>
      <option value="name">Name A–Z</option>
    </select>
  );
}
