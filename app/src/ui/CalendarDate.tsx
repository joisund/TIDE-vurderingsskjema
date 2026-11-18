export function CalendarDate({ value }: { value: string }) {
  const [year, month, day] = value.split('-')
  return <time dateTime={value}>{day}.{month}.{year}</time>
}
