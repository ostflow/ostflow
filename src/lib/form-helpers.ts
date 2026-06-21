export function blockEnter(e: { key: string; preventDefault(): void }) {
  if (e.key === 'Enter') e.preventDefault()
}
