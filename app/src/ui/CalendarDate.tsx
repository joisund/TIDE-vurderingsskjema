export function CalendarDate({ value }: { value: string }) {
  const [year, month, day] = value.split('-')
  return <time dateTime={value}>{day}.{month}.{year}</time>
}

const confirmationDate = new Intl.DateTimeFormat('nb-NO', {
  dateStyle: 'short', timeStyle: 'short', timeZone: 'Europe/Oslo',
})

export function ConfirmationTime({ value }: { value: string }) {
  return <time dateTime={value}>{confirmationDate.format(new Date(value))}</time>
}
